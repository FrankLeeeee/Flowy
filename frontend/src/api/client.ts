import axios from 'axios';
import { Settings, Project, Task, Runner, TaskLog, HarnessConfig, Label, Stats } from '../types';

const api = axios.create({ baseURL: '/api' });

export async function fetchSettings(): Promise<Settings> {
  const { data } = await api.get<Settings>('/settings');
  return data;
}

export async function fetchRunnerSecret(): Promise<{ registrationSecret: string }> {
  const { data } = await api.get<{ registrationSecret: string }>('/settings/runner-secret');
  return data;
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  const { data } = await api.put<Settings>('/settings', partial);
  return data;
}

// ── Projects ──────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await api.get<Project[]>('/projects');
  return data;
}

export async function createProject(body: { name: string; description?: string }): Promise<Project> {
  const { data } = await api.post<Project>('/projects', body);
  return data;
}

export async function updateProject(id: string, body: { name?: string; description?: string }): Promise<Project> {
  const { data } = await api.put<Project>(`/projects/${id}`, body);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}

// ── Tasks ─────────────────────────────────────────────────────────────────

export async function fetchTasks(filters?: {
  project?: string; status?: string; priority?: string; runner?: string; search?: string;
}): Promise<Task[]> {
  const { data } = await api.get<Task[]>('/tasks', { params: filters });
  return data;
}

export async function createTask(body: {
  projectId: string; title: string; description?: string; priority?: string; labels?: string[];
}): Promise<Task> {
  const { data } = await api.post<Task>('/tasks', body);
  return data;
}

export async function getTask(id: string): Promise<Task> {
  const { data } = await api.get<Task>(`/tasks/${id}`);
  return data;
}

export async function updateTask(id: string, body: {
  title?: string; description?: string; status?: string; priority?: string;
  labels?: string[]; runnerId?: string | null; aiProvider?: string | null; harnessConfig?: HarnessConfig | null;
}): Promise<Task> {
  const { data } = await api.put<Task>(`/tasks/${id}`, body);
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}

export async function assignTask(id: string, body: { runnerId: string; aiProvider: string; harnessConfig?: HarnessConfig }): Promise<Task> {
  const { data } = await api.post<Task>(`/tasks/${id}/assign`, body);
  return data;
}

export async function fetchTaskLogs(id: string): Promise<TaskLog[]> {
  const { data } = await api.get<TaskLog[]>(`/tasks/${id}/logs`);
  return data;
}

// ── Labels ───────────────────────────────────────────────────────────────

export async function fetchLabels(): Promise<Label[]> {
  const { data } = await api.get<Label[]>('/labels');
  return data;
}

export async function createLabel(body: { name: string; color: string }): Promise<Label> {
  const { data } = await api.post<Label>('/labels', body);
  return data;
}

export async function updateLabel(id: string, body: { name?: string; color?: string }): Promise<Label> {
  const { data } = await api.put<Label>(`/labels/${id}`, body);
  return data;
}

export async function deleteLabel(id: string): Promise<void> {
  await api.delete(`/labels/${id}`);
}

// ── Runners ───────────────────────────────────────────────────────────────

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

export interface BrowseEntry {
  name: string;
  isDirectory: boolean;
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
  const { data } = await api.get<Stats>('/stats');
  return data;
}
