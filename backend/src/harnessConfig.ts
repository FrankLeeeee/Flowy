type RecordLike = Record<string, unknown>;

function asRecord(value: unknown): RecordLike | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as RecordLike;
}

function getString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

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
    }) : undefined,
    claudeCode: claudeCode ? pruneObject({
      workspace: getString(claudeCode.workspace),
      model: getString(claudeCode.model),
      mode: getString(claudeCode.mode),
      worktree: getString(claudeCode.worktree),
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

export function normalizeHarnessConfig(input: unknown): string {
  return JSON.stringify(normalizeConfigObject(input));
}
