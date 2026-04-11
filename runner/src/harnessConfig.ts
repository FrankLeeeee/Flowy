import { HarnessConfig } from './types';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function getString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseHarnessConfig(raw: string | null | undefined): HarnessConfig {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    const root = asRecord(parsed);
    if (!root) return {};

    const codex = asRecord(root.codex);
    const claudeCode = asRecord(root.claudeCode);
    const cursorAgent = asRecord(root.cursorAgent);

    return {
      codex: codex ? {
        workspace: getString(codex.workspace),
        model: getString(codex.model),
        sandbox: getString(codex.sandbox) as 'read-only' | 'workspace-write' | 'danger-full-access' | undefined,
      } : undefined,
      claudeCode: claudeCode ? {
        workspace: getString(claudeCode.workspace),
        model: getString(claudeCode.model),
        mode: getString(claudeCode.mode) as
          | 'acceptEdits'
          | 'auto'
          | 'bypassPermissions'
          | 'default'
          | 'dontAsk'
          | 'plan'
          | undefined,
        worktree: getString(claudeCode.worktree),
      } : undefined,
      cursorAgent: cursorAgent ? {
        workspace: getString(cursorAgent.workspace),
        model: getString(cursorAgent.model),
        mode: getString(cursorAgent.mode) as 'plan' | 'ask' | undefined,
        sandbox: getString(cursorAgent.sandbox) as 'enabled' | 'disabled' | undefined,
        worktree: getString(cursorAgent.worktree),
      } : undefined,
    };
  } catch {
    return {};
  }
}
