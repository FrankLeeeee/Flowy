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

export interface RegisterResponse {
  id: string;
  token: string;
}

export interface HeartbeatResponse {
  ok: boolean;
  status: string;
  refreshCli?: boolean;
}
