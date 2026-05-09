export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function getString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseRootConfig(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return asRecord(JSON.parse(raw) as unknown) ?? {};
  } catch {
    return {};
  }
}
