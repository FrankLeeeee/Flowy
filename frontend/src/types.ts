export type {
  TaskStatus,
  TaskPriority,
  AiProvider,
  RunnerStatus,
  CodexHarnessConfig,
  ClaudeCodeHarnessConfig,
  CursorAgentHarnessConfig,
  GeminiHarnessConfig,
  HarnessConfig,
  List,
  Workspace,
  Template,
  RecurrenceFrequency,
  RecurrenceRule,
  Task,
  LabelColor,
  Label,
  Skill,
  SessionStatus,
  SessionMessageRole,
  Session,
  SessionMessage,
  TaskLog,
} from 'flowy-shared';

// ── Frontend-only types ───────────────────────────────────────────────────

export interface Settings {
  runner: { registrationSecret: string };
}

export interface Runner {
  id: string;
  name: string;
  status: import('flowy-shared').RunnerStatus;
  ai_providers: string;
  last_heartbeat: string | null;
  last_cli_scan_at: string | null;
  cli_versions: string | null;
  cli_refresh_requested_at: string | null;
  cli_update_requested_at: string | null;
  device_info: string;
  created_at: string;
  updated_at: string;
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
  tasksByList: Array<{ list_name: string; total: number; done: number }>;
  tasksByProvider: Array<{ ai_provider: string; count: number; total_minutes: number | null }>;
  tasksByPriority: Array<{ priority: string; count: number }>;
  tasksByRunner: Array<{ runner_name: string; count: number; runner_status: string; total_minutes: number | null }>;
  avgCompletionMinutes: number | null;
  dailyCompleted: Array<{ date: string; count: number }>;
  topLabels: Array<{ name: string; color: string; count: number }>;
}
