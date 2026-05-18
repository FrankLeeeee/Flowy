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

// ── Backend-only types ────────────────────────────────────────────────────

export interface RunnerSettings {
  registrationSecret: string;
}

export interface Settings {
  runner: RunnerSettings;
}

/** Backend Runner row includes the token column (not exposed to frontend). */
export interface Runner {
  id: string;
  name: string;
  token: string;
  status: import('flowy-shared').RunnerStatus;
  ai_providers: string;
  last_heartbeat: string | null;
  last_cli_scan_at: string | null;
  cli_refresh_requested_at: string | null;
  cli_versions: string | null;
  cli_models: string | null;
  device_info: string;
  created_at: string;
  updated_at: string;
}
