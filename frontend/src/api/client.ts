import axios from 'axios';
import { Settings, List, Task, TaskStatus, TaskPriority, Runner, TaskLog, HarnessConfig, Label, LabelColor, Skill, AiProvider, Stats, Session, SessionMessage } from '../types';
import { getCached, setCached } from '../lib/offlineStore';
import { isOnline, queueMutation } from '../lib/syncQueue';
import { patchSwCache, patchSwCacheByPathname, removeById, tempId, upsertById } from '../lib/optimisticCache';

const api = axios.create({ baseURL: '/api', withCredentials: true });

// Redirect to /login on any 401 (except auth endpoints themselves)
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? '';
      if (!url.startsWith('/auth/')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ── Offline-aware GET helper ─────────────────────────────────────────────────

async function cachedGet<T>(cacheKey: string, path: string, params?: Record<string, string | undefined>): Promise<T> {
  try {
    const { data } = await api.get<T>(path, { params });
    void setCached(cacheKey, data);
    return data;
  } catch (err) {
    if (!isOnline()) {
      const cached = await getCached<T>(cacheKey);
      if (cached !== null) return cached;
    }
    throw err;
  }
}

const nowIso = () => new Date().toISOString();

// ── Auth ──────────────────────────────────────────────────────────────────

export async function checkAuthStatus(): Promise<{ authenticated: boolean; setupRequired: boolean }> {
  const { data } = await api.get<{ authenticated: boolean; setupRequired: boolean }>('/auth/status');
  return data;
}

export async function login(password: string): Promise<void> {
  await api.post('/auth/login', { password });
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function setupPassword(password: string): Promise<void> {
  await api.post('/auth/setup', { password });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put('/auth/password', { currentPassword, newPassword });
}

export async function fetchSettings(): Promise<Settings> {
  return cachedGet<Settings>('settings', '/settings');
}

export async function fetchRunnerRegistrationSecret(): Promise<{ registrationSecret: string }> {
  const { data } = await api.get<{ registrationSecret: string }>('/settings/runner-secret');
  return data;
}

export async function updateRunnerRegistrationSecret(
  registrationSecret: string,
): Promise<Settings> {
  const { data } = await api.put<Settings>('/settings', {
    runner: { registrationSecret },
  });
  return data;
}

// ── Lists ─────────────────────────────────────────────────────────────────

export async function fetchLists(): Promise<List[]> {
  return cachedGet<List[]>('lists', '/lists');
}

export async function createList(body: { name: string; description?: string; icon?: string | null }): Promise<List> {
  if (isOnline()) {
    const { data } = await api.post<List>('/lists', body);
    return data;
  }

  const now = nowIso();
  const optimistic: List = {
    id: tempId(),
    name: body.name,
    description: body.description ?? '',
    icon: body.icon ?? null,
    position: Number.MAX_SAFE_INTEGER, // appended; reorder once synced
    next_task_num: 1,
    created_at: now,
    updated_at: now,
  };
  await patchSwCache<List[]>('/api/lists', (current) => [...(current ?? []), optimistic]);
  await queueMutation('/api/lists', 'POST', body);
  return optimistic;
}

export async function updateList(id: string, body: { name?: string; description?: string; icon?: string | null }): Promise<List> {
  if (isOnline()) {
    const { data } = await api.put<List>(`/lists/${id}`, body);
    return data;
  }

  let updated: List | null = null;
  await patchSwCache<List[]>('/api/lists', (current) => {
    const lists = current ?? [];
    return lists.map((list) => {
      if (list.id !== id) return list;
      updated = { ...list, ...body, icon: body.icon ?? list.icon, updated_at: nowIso() };
      return updated;
    });
  });
  await queueMutation(`/api/lists/${id}`, 'PUT', body);
  if (!updated) throw new Error('List not found in offline cache');
  return updated;
}

export async function deleteList(id: string): Promise<void> {
  if (isOnline()) {
    await api.delete(`/lists/${id}`);
    return;
  }

  await patchSwCache<List[]>('/api/lists', (current) => removeById(current ?? [], id));
  // Also drop tasks assigned to this list from cached task views.
  await patchSwCacheByPathname<Task>('/api/tasks', (tasks) => tasks.filter((t) => t.list_id !== id));
  await queueMutation(`/api/lists/${id}`, 'DELETE');
}

export async function reorderLists(ids: string[]): Promise<List[]> {
  if (isOnline()) {
    const { data } = await api.put<List[]>('/lists/reorder', { ids });
    return data;
  }

  const reordered = await patchSwCache<List[]>('/api/lists', (current) => {
    const byId = new Map((current ?? []).map((l) => [l.id, l]));
    const result: List[] = [];
    ids.forEach((id, i) => {
      const list = byId.get(id);
      if (list) result.push({ ...list, position: i + 1 });
    });
    return result;
  });
  await queueMutation('/api/lists/reorder', 'PUT', { ids });
  return reordered ?? [];
}

// ── Tasks ─────────────────────────────────────────────────────────────────

export async function fetchTasks(filters?: {
  list?: string; inbox?: '1'; status?: string; priority?: string; runner?: string; search?: string;
}): Promise<Task[]> {
  const cacheKey = `tasks:${JSON.stringify(filters ?? {})}`;
  return cachedGet<Task[]>(cacheKey, '/tasks', filters as Record<string, string | undefined>);
}

export async function createTask(body: {
  listId?: string | null; title: string; description?: string; priority?: string; labels?: string[];
  scheduledDate?: string; scheduledTime?: string | null;
  runnerId?: string | null; aiProvider?: string | null; harnessConfig?: HarnessConfig | null;
}): Promise<Task> {
  if (isOnline()) {
    const { data } = await api.post<Task>('/tasks', body);
    return data;
  }

  const now = nowIso();
  const optimistic: Task = {
    id: tempId(),
    list_id: body.listId ?? null,
    task_number: 0,
    task_key: 'PENDING',
    title: body.title,
    description: body.description ?? '',
    status: 'backlog',
    priority: ((body.priority as TaskPriority | undefined) ?? 'none'),
    runner_id: body.runnerId ?? null,
    ai_provider: (body.aiProvider as AiProvider | null | undefined) ?? null,
    harness_config: JSON.stringify(body.harnessConfig ?? {}),
    labels: JSON.stringify(body.labels ?? []),
    output: null,
    scheduled_date: body.scheduledDate ?? new Date().toISOString().slice(0, 10),
    scheduled_time: body.scheduledTime ?? null,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
  await patchSwCacheByPathname<Task>('/api/tasks', (tasks) => [...tasks, optimistic]);
  await queueMutation('/api/tasks', 'POST', body);
  return optimistic;
}

export async function getTask(id: string): Promise<Task> {
  return cachedGet<Task>(`task:${id}`, `/tasks/${id}`);
}

export async function updateTask(id: string, body: {
  title?: string; description?: string; status?: string; priority?: string;
  labels?: string[]; scheduledDate?: string; scheduledTime?: string | null;
  runnerId?: string | null; aiProvider?: string | null; harnessConfig?: HarnessConfig | null;
}): Promise<Task> {
  if (isOnline()) {
    const { data } = await api.put<Task>(`/tasks/${id}`, body);
    return data;
  }

  let updated: Task | null = null;
  const apply = (task: Task): Task => {
    const next: Task = {
      ...task,
      title: body.title ?? task.title,
      description: body.description ?? task.description,
      status: ((body.status as TaskStatus | undefined) ?? task.status),
      priority: ((body.priority as TaskPriority | undefined) ?? task.priority),
      runner_id: body.runnerId !== undefined ? body.runnerId : task.runner_id,
      ai_provider: body.aiProvider !== undefined ? (body.aiProvider as AiProvider | null) : task.ai_provider,
      harness_config: body.harnessConfig !== undefined ? JSON.stringify(body.harnessConfig ?? {}) : task.harness_config,
      labels: body.labels !== undefined ? JSON.stringify(body.labels) : task.labels,
      scheduled_date: body.scheduledDate !== undefined ? body.scheduledDate : task.scheduled_date,
      scheduled_time: body.scheduledTime !== undefined ? body.scheduledTime : task.scheduled_time,
      updated_at: nowIso(),
    };
    updated = next;
    return next;
  };

  await patchSwCacheByPathname<Task>('/api/tasks', (tasks) =>
    tasks.map((t) => (t.id === id ? apply(t) : t)),
  );
  // Single-resource cache, if it has been populated by a prior visit
  await patchSwCache<Task | null>(`/api/tasks/${id}`, (current) =>
    current ? apply(current) : current,
  );

  await queueMutation(`/api/tasks/${id}`, 'PUT', body);
  if (!updated) throw new Error('Task not found in offline cache');
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  if (isOnline()) {
    await api.delete(`/tasks/${id}`);
    return;
  }

  await patchSwCacheByPathname<Task>('/api/tasks', (tasks) => removeById(tasks, id));
  await queueMutation(`/api/tasks/${id}`, 'DELETE');
}

// Runner-dependent task operations (network only)
export async function assignTask(id: string, body: { runnerId: string; aiProvider: string; harnessConfig?: HarnessConfig }): Promise<Task> {
  const { data } = await api.post<Task>(`/tasks/${id}/assign`, body);
  return data;
}

export async function runTask(id: string): Promise<Task> {
  const { data } = await api.post<Task>(`/tasks/${id}/run`);
  return data;
}

export async function fetchTaskLogs(id: string): Promise<TaskLog[]> {
  const { data } = await api.get<TaskLog[]>(`/tasks/${id}/logs`);
  return data;
}

// ── Labels ───────────────────────────────────────────────────────────────

export async function fetchLabels(): Promise<Label[]> {
  return cachedGet<Label[]>('labels', '/labels');
}

export async function createLabel(body: { name: string; color: string }): Promise<Label> {
  if (isOnline()) {
    const { data } = await api.post<Label>('/labels', body);
    return data;
  }

  const now = nowIso();
  const optimistic: Label = {
    id: tempId(),
    name: body.name,
    color: body.color as LabelColor,
    created_at: now,
    updated_at: now,
  };
  await patchSwCache<Label[]>('/api/labels', (current) => upsertById(current ?? [], optimistic));
  await queueMutation('/api/labels', 'POST', body);
  return optimistic;
}

export async function updateLabel(id: string, body: { name?: string; color?: string }): Promise<Label> {
  if (isOnline()) {
    const { data } = await api.put<Label>(`/labels/${id}`, body);
    return data;
  }

  let updated: Label | null = null;
  await patchSwCache<Label[]>('/api/labels', (current) =>
    (current ?? []).map((label) => {
      if (label.id !== id) return label;
      updated = {
        ...label,
        name: body.name ?? label.name,
        color: (body.color as LabelColor | undefined) ?? label.color,
        updated_at: nowIso(),
      };
      return updated;
    }),
  );
  await queueMutation(`/api/labels/${id}`, 'PUT', body);
  if (!updated) throw new Error('Label not found in offline cache');
  return updated;
}

export async function deleteLabel(id: string): Promise<void> {
  if (isOnline()) {
    await api.delete(`/labels/${id}`);
    return;
  }

  await patchSwCache<Label[]>('/api/labels', (current) => removeById(current ?? [], id));
  await queueMutation(`/api/labels/${id}`, 'DELETE');
}

// ── Runners (network only) ───────────────────────────────────────────────────

export async function fetchRunners(): Promise<Runner[]> {
  const { data } = await api.get<Runner[]>('/runners');
  return data;
}

export async function deleteRunner(id: string): Promise<void> {
  await api.delete(`/runners/${id}`);
}

export async function refreshRunnerProviders(id: string): Promise<void> {
  await api.post(`/runners/${id}/refresh-providers`);
}

export async function updateRunnerProviders(id: string): Promise<void> {
  await api.post(`/runners/${id}/update-providers`);
}

export interface BrowseEntry {
  name: string;
  isDirectory: boolean;
}

// ── Skills ────────────────────────────────────────────────────────────────

export async function fetchSkills(filters?: { runner?: string; cli?: AiProvider }): Promise<Skill[]> {
  const cacheKey = `skills:${JSON.stringify(filters ?? {})}`;
  return cachedGet<Skill[]>(cacheKey, '/skills', filters as Record<string, string | undefined>);
}

export async function fetchSkill(id: string): Promise<Skill> {
  return cachedGet<Skill>(`skill:${id}`, `/skills/${id}`);
}

export async function createOrUpdateSkill(body: {
  runnerId: string; name: string;
}): Promise<Skill> {
  const { data } = await api.post<Skill>('/skills', body);
  return data;
}

export async function deleteSkill(id: string): Promise<void> {
  await api.delete(`/skills/${id}`);
}

export async function broadcastSkill(id: string, runnerIds?: string[]): Promise<{
  broadcast: number;
  results: { runnerId: string; skillId: string; created: boolean }[];
}> {
  const { data } = await api.post(`/skills/${id}/broadcast`, runnerIds ? { runnerIds } : {});
  return data;
}

export async function browseRunnerDirectory(runnerId: string, path: string): Promise<BrowseEntry[]> {
  const { data } = await api.get<{ entries: BrowseEntry[] }>(`/runners/${runnerId}/browse`, {
    params: { path },
    timeout: 12_000,
  });
  return data.entries;
}

// ── Stats ─────────────────────────────────────────────────────────────────

export async function fetchStats(): Promise<Stats> {
  return cachedGet<Stats>('stats', '/stats');
}

// ── Sessions ─────────────────────────────────────────────────────────────

export async function fetchSessions(): Promise<Session[]> {
  return cachedGet<Session[]>('sessions', '/sessions');
}

export async function createSession(body: {
  title: string;
  runnerId: string;
  aiProvider: string;
  harnessConfig?: HarnessConfig;
}): Promise<Session> {
  const { data } = await api.post<Session>('/sessions', body);
  return data;
}

export async function fetchSession(id: string): Promise<{ session: Session; messages: SessionMessage[] }> {
  return cachedGet<{ session: Session; messages: SessionMessage[] }>(`session:${id}`, `/sessions/${id}`);
}

export async function sendSessionInput(id: string, content: string): Promise<Session> {
  const { data } = await api.post<Session>(`/sessions/${id}/input`, { content });
  return data;
}

export async function stopSession(id: string): Promise<Session> {
  const { data } = await api.post<Session>(`/sessions/${id}/stop`);
  return data;
}

export async function deleteSession(id: string): Promise<void> {
  await api.delete(`/sessions/${id}`);
}

// ── Push Notification Subscription ───────────────────────────────────────────

export async function subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
  await api.post('/push/subscribe', subscription);
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await api.post('/push/unsubscribe', { endpoint });
}
