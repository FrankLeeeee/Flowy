/** Well-known ID for the non-deletable default project. */
export const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000000';

export interface Settings {
  runner:     { registrationSecret: string };
}

// ── Task management types ─────────────────────────────────────────────────
export type TaskStatus   = 'backlog' | 'todo' | 'in_progress' | 'failed' | 'done' | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export type AiProvider   = 'claude-code' | 'codex' | 'cursor-agent' | 'gemini-cli';
export type RunnerStatus = 'online' | 'offline' | 'busy';

export interface CodexHarnessConfig {
  workspace?: string;
  model?: string;
  sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
}

export interface ClaudeCodeHarnessConfig {
  workspace?: string;
  model?: string;
  worktree?: string;
}

export interface CursorAgentHarnessConfig {
  workspace?: string;
  model?: string;
  mode?: 'plan' | 'ask';
  sandbox?: 'enabled' | 'disabled';
  worktree?: string;
}

export interface GeminiHarnessConfig {
  workspace?: string;
  model?: 'auto' | 'pro' | 'flash' | 'flash-lite';
  sandbox?: boolean;
  worktree?: string;
}

export interface HarnessConfig {
  codex?: CodexHarnessConfig;
  claudeCode?: ClaudeCodeHarnessConfig;
  cursorAgent?: CursorAgentHarnessConfig;
  gemini?: GeminiHarnessConfig;
}

export interface Project {
  id: string;
  name: string;
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
  harness_config: string;
  labels: string;
  output: string | null;
  scheduled_at: string | null;
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

export type LabelColor =
  | 'red' | 'red-light' | 'red-dark'
  | 'orange' | 'orange-light' | 'orange-dark'
  | 'amber' | 'amber-light' | 'amber-dark'
  | 'yellow' | 'yellow-light' | 'yellow-dark'
  | 'lime' | 'lime-light' | 'lime-dark'
  | 'green' | 'green-light' | 'green-dark'
  | 'emerald' | 'emerald-light' | 'emerald-dark'
  | 'teal' | 'teal-light' | 'teal-dark'
  | 'cyan' | 'cyan-light' | 'cyan-dark'
  | 'blue' | 'blue-light' | 'blue-dark'
  | 'indigo' | 'indigo-light' | 'indigo-dark'
  | 'violet' | 'violet-light' | 'violet-dark'
  | 'purple' | 'purple-light' | 'purple-dark'
  | 'pink' | 'pink-light' | 'pink-dark'
  | 'rose' | 'rose-light' | 'rose-dark'
  | 'gray' | 'gray-light' | 'gray-dark'
  | 'slate' | 'zinc' | 'stone' | 'fuchsia' | 'sky';

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'idle' | 'busy' | 'stopped';
export type SessionMessageRole = 'user' | 'assistant' | 'system';

export interface Session {
  id: string;
  title: string;
  runner_id: string;
  ai_provider: AiProvider;
  harness_config: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface SessionMessage {
  id: string;
  session_id: string;
  role: SessionMessageRole;
  content: string;
  created_at: string;
}

export interface TaskLog {
  id: string;
  task_id: string;
  runner_id: string;
  event: string;
  data: string;
  created_at: string;
}

export interface Stats {
  totals: {
    total: number;
    done: number;
    failed: number;
    in_progress: number;
    cancelled: number;
    todo: number;
    backlog: number;
  };
  runnerCounts: {
    total: number;
    online: number;
    busy: number;
    offline: number;
  };
  tasksByStatus: Array<{ status: string; count: number }>;
  tasksByProject: Array<{ project_name: string; total: number; done: number }>;
  tasksByProvider: Array<{ ai_provider: string; count: number; total_minutes: number | null }>;
  tasksByPriority: Array<{ priority: string; count: number }>;
  tasksByRunner: Array<{ runner_name: string; count: number; runner_status: string; total_minutes: number | null }>;
  avgCompletionMinutes: number | null;
  dailyCompleted: Array<{ date: string; count: number }>;
  topLabels: Array<{ name: string; color: string; count: number }>;
}
