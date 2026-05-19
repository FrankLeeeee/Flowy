import { asRecord, getString } from 'flowy-shared';

type RecordLike = Record<string, unknown>;

function pruneObject<T extends Record<string, unknown>>(value: T): T | undefined {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) as T : undefined;
}

function normalizeConfigObject(input: unknown): RecordLike {
  const root = asRecord(input);
  if (!root) return {};

  const codex = asRecord(root.codex);
  const claudeCode = asRecord(root.claudeCode);
  const cursorAgent = asRecord(root.cursorAgent);
  const gemini = asRecord(root.gemini);

  return pruneObject({
    codex: codex ? pruneObject({
      workspace: getString(codex.workspace),
      model: getString(codex.model),
      sandbox: getString(codex.sandbox),
      worktree: getString(codex.worktree),
    }) : undefined,
    claudeCode: claudeCode ? pruneObject({
      workspace: getString(claudeCode.workspace),
      model: getString(claudeCode.model),
      mode: getString(claudeCode.mode),
      worktree: getString(claudeCode.worktree),
      useInteractiveMode: typeof claudeCode.useInteractiveMode === 'boolean' ? claudeCode.useInteractiveMode : undefined,
    }) : undefined,
    cursorAgent: cursorAgent ? pruneObject({
      workspace: getString(cursorAgent.workspace),
      model: getString(cursorAgent.model),
      mode: getString(cursorAgent.mode),
      sandbox: getString(cursorAgent.sandbox),
      worktree: getString(cursorAgent.worktree),
    }) : undefined,
    gemini: gemini ? pruneObject({
      workspace: getString(gemini.workspace),
      model: getString(gemini.model),
      sandbox: typeof gemini.sandbox === 'boolean' ? gemini.sandbox : undefined,
      worktree: getString(gemini.worktree),
    }) : undefined,
  }) ?? {};
}

/** Normalize raw harness config input into a clean JSON string. */
export function normalizeHarnessConfig(input: unknown): string {
  return JSON.stringify(normalizeConfigObject(input));
}
