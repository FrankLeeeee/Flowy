import axios, { AxiosInstance } from 'axios';
import { Task, RegisterResponse, HeartbeatResponse, SkillCommand, SkillInventoryEntry } from './types';

export class RunnerApi {
  private client: AxiosInstance;
  private token: string = '';

  constructor(baseUrl: string) {
    this.client = axios.create({ baseURL: baseUrl + '/api' });
  }

  setToken(token: string): void {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async register(name: string, aiProviders: string[], deviceInfo: string, secret?: string): Promise<RegisterResponse> {
    const { data } = await this.client.post<RegisterResponse>('/runners/register', {
      name, aiProviders, deviceInfo, secret,
    });
    return data;
  }

  async heartbeat(aiProviders: string[], lastCliScanAt?: string): Promise<HeartbeatResponse> {
    const { data } = await this.client.post<HeartbeatResponse>('/runners/heartbeat', { aiProviders, lastCliScanAt });
    return data;
  }

  async poll(): Promise<Task | null> {
    const resp = await this.client.get('/runners/poll');
    if (resp.status === 204) return null;
    return resp.data;
  }

  async pickTask(taskId: string): Promise<void> {
    await this.client.post(`/runners/tasks/${taskId}/pick`);
  }

  async sendOutput(taskId: string, data: string): Promise<void> {
    await this.client.post(`/runners/tasks/${taskId}/output`, { data });
  }

  async completeTask(taskId: string, success: boolean, data?: string): Promise<void> {
    await this.client.post(`/runners/tasks/${taskId}/complete`, { success, data });
  }

  async fetchBrowseRequests(): Promise<{ requestId: string; path: string }[]> {
    const { data } = await this.client.get<{ requestId: string; path: string }[]>('/runners/browse-requests');
    return data;
  }

  async submitBrowseResult(requestId: string, entries: { name: string; isDirectory: boolean }[]): Promise<void> {
    await this.client.post('/runners/browse-result', { requestId, entries });
  }

  async submitBrowseError(requestId: string, error: string): Promise<void> {
    await this.client.post('/runners/browse-result', { requestId, error });
  }

  async fetchSkillCommands(): Promise<SkillCommand[]> {
    const { data } = await this.client.get<SkillCommand[]>('/runners/skill-commands');
    return data;
  }

  async submitSkillResult(commandId: string, error?: string): Promise<void> {
    await this.client.post('/runners/skill-result', { commandId, error });
  }

  async fetchSkillInventoryRequests(): Promise<{ requestId: string }[]> {
    const { data } = await this.client.get<{ requestId: string }[]>('/runners/skill-inventory-requests');
    return data;
  }

  async submitSkillInventoryResult(requestId: string, skills: SkillInventoryEntry[]): Promise<void> {
    await this.client.post('/runners/skill-inventory-result', { requestId, skills });
  }

  async submitSkillInventoryError(requestId: string, error: string): Promise<void> {
    await this.client.post('/runners/skill-inventory-result', { requestId, error });
  }

  async fetchSessionCommands(): Promise<SessionCommand[]> {
    const { data } = await this.client.get<SessionCommand[]>('/runners/session-commands');
    return data;
  }

  async sendSessionOutput(sessionId: string, messageId: string, data: string): Promise<void> {
    await this.client.post(`/runners/sessions/${sessionId}/output`, { messageId, data });
  }

  async completeSessionTurn(sessionId: string, messageId: string, success: boolean, data?: string): Promise<void> {
    await this.client.post(`/runners/sessions/${sessionId}/complete`, { messageId, success, data });
  }
}

export interface SessionCommand {
  id: string;
  sessionId: string;
  kind: 'send-prompt' | 'stop';
  payload: {
    aiProvider?: string;
    harnessConfig?: string;
    history?: { role: 'user' | 'assistant' | 'system'; content: string }[];
    prompt?: string;
    assistantMessageId?: string;
  };
}
