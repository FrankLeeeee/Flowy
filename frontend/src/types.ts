export interface Settings {
  runner:     { registrationSecret: string };
}

// ── Task management types ─────────────────────────────────────────────────
export type TaskStatus   = 'backlog' | 'todo' | 'in_progress' | 'failed' | 'done' | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export type AiProvider   = 'claude-code' | 'codex' | 'cursor-agent';
export type RunnerStatus = 'online' | 'offline' | 'busy';

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  next_task_num: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  task_number: number;
  task_key: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  runner_id: string | null;
  ai_provider: AiProvider | null;
  labels: string;
  output: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Runner {
  id: string;
  name: string;
  status: RunnerStatus;
  ai_providers: string;
  last_heartbeat: string | null;
  last_cli_scan_at: string | null;
  cli_refresh_requested_at: string | null;
  device_info: string;
  created_at: string;
  updated_at: string;
}

export interface TaskLog {
  id: string;
  task_id: string;
  runner_id: string;
  event: string;
  data: string;
  created_at: string;
}
