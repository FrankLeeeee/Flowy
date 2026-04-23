export interface RunnerConfig {
  name: string;
  url: string;
  providers: string[];
  lastCliScanAt: string;
  pollInterval: number;  // seconds
  token?: string;
  secret?: string;
  device: string;
}

export interface Task {
  id: string;
  project_id: string;
  task_number: number;
  task_key: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  runner_id: string | null;
  ai_provider: string | null;
  harness_config: string;
  labels: string;
  output: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterResponse {
  id: string;
  token: string;
}

export interface HeartbeatResponse {
  ok: boolean;
  status: string;
  refreshCli?: boolean;
}
