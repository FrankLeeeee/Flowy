import axios from 'axios';
import { Settings, List, Task, Runner, TaskLog, HarnessConfig, Label, Skill, AiProvider, Stats, Session, SessionMessage } from '../types';
import { getCached, setCached, clearCacheByPrefix } from '../lib/offlineStore';
import { isOnline, queueMutation } from '../lib/syncQueue';

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

// ── Offline-aware mutation helper ────────────────────────────────────────────

async function offlineMutation<T>(
  method: 'post' | 'put' | 'delete',
  path: string,
  body?: unknown,
  opts?: { optimisticResult?: T; invalidatePrefix?: string },
): Promise<T> {
  if (isOnline()) {
    const { data } = method === 'delete'
      ? await api.delete<T>(path)
      : await api[method]<T>(path, body);
    if (opts?.invalidatePrefix) {
      void clearCacheByPrefix(opts.invalidatePrefix);
    }
    return data;
  }

  // Offline: queue the mutation for background sync
  const fullUrl = `/api${path}`;
  await queueMutation(fullUrl, method.toUpperCase(), body);

  if (opts?.invalidatePrefix) {
    void clearCacheByPrefix(opts.invalidatePrefix);
  }

  if (opts?.optimisticResult !== undefined) {
    return opts.optimisticResult;
  }
  return {} as T;
}

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

// ── Lists ─��───────────────────────────────────────────────────────────────

export async function fetchLists(): Promise<List[]> {
  return cachedGet<List[]>('lists', '/lists');
}

export async function createList(body: { name: string; description?: string; icon?: string | null }): Promise<List> {
  return offlineMutation<List>('post', '/lists', body, { invalidatePrefix: 'lists' });
}

export async function updateList(id: string, body: { name?: string; description?: string; icon?: string | null }): Promise<List> {
  return offlineMutation<List>('put', `/lists/${id}`, body, { invalidatePrefix: 'lists' });
}

export async function deleteList(id: string): Promise<void> {
  await offlineMutation<void>('delete', `/lists/${id}`, undefined, { invalidatePrefix: 'lists' });
}

export async function reorderLists(ids: string[]): Promise<List[]> {
  return offlineMutation<List[]>('put', '/lists/reorder', { ids }, { invalidatePrefix: 'lists' });
}

// ── Tasks ────────────────��────────────────────────────��───────────────────

export async function fetchTasks(filters?: {
  list?: string; inbox?: '1'; status?: string; priority?: string; runner?: string; search?: string;
}): Promise<Task[]> {
  const cacheKey = `tasks:${JSON.stringify(filters ?? {})}`;
  return cachedGet<Task[]>(cacheKey, '/tasks', filters as Record<string, string | undefined>);
}

export async function createTask(body: {
  listId?: string | null; title: string; description?: string; priority?: string; labels?: string[]; scheduledAt?: string | null;
  runnerId?: string | null; aiProvider?: string | null; harnessConfig?: HarnessConfig | null;
}): Promise<Task> {
  return offlineMutation<Task>('post', '/tasks', body, { invalidatePrefix: 'tasks' });
}

export async function getTask(id: string): Promise<Task> {
  return cachedGet<Task>(`task:${id}`, `/tasks/${id}`);
}

export async function updateTask(id: string, body: {
  title?: string; description?: string; status?: string; priority?: string;
  labels?: string[]; runnerId?: string | null; aiProvider?: string | null; harnessConfig?: HarnessConfig | null; scheduledAt?: string | null;
}): Promise<Task> {
  return offlineMutation<Task>('put', `/tasks/${id}`, body, { invalidatePrefix: 'tasks' });
}

export async function deleteTask(id: string): Promise<void> {
  await offlineMutation<void>('delete', `/tasks/${id}`, undefined, { invalidatePrefix: 'tasks' });
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

// ── Labels ─────────────────────────────────────���─────────────────────────

export async function fetchLabels(): Promise<Label[]> {
  return cachedGet<Label[]>('labels', '/labels');
}

export async function createLabel(body: { name: string; color: string }): Promise<Label> {
  return offlineMutation<Label>('post', '/labels', body, { invalidatePrefix: 'labels' });
}

export async function updateLabel(id: string, body: { name?: string; color?: string }): Promise<Label> {
  return offlineMutation<Label>('put', `/labels/${id}`, body, { invalidatePrefix: 'labels' });
}

export async function deleteLabel(id: string): Promise<void> {
  await offlineMutation<void>('delete', `/labels/${id}`, undefined, { invalidatePrefix: 'labels' });
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

// ── Stats ───────────────────────────���─────────────────────────────────────

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
