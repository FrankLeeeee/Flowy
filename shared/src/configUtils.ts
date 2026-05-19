/** Coerce an unknown value to a plain object, or return undefined. */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

/** Coerce an unknown value to a non-empty trimmed string, or return undefined. */
export function getString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Coerce an unknown value to a finite, strictly-positive number, or return
 * undefined. Accepts numeric strings (e.g. from form inputs) as well as raw
 * numbers so the same helper works for both JSON config and UI state.
 */
export function getPositiveNumber(value: unknown): number | undefined {
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN;
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

/** Parse a raw JSON string into a plain object, returning `{}` on any error. */
export function parseRootConfig(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return asRecord(JSON.parse(raw) as unknown) ?? {};
  } catch {
    return {};
  }
}

/**
 * Validate an arbitrary list of workspace inputs into trimmed `{ name, path }`
 * objects, de-duplicated by path (first occurrence wins).
 *
 * Tolerates the legacy shape where entries were plain path strings: those are
 * lifted into `{ name: path, path }` so the UI has something to display until
 * the user renames them. Entries without a usable path are dropped.
 */
export function normalizeWorkspaceList(input: unknown): Array<{ name: string; path: string }> {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: Array<{ name: string; path: string }> = [];
  for (const entry of input) {
    let path: string | undefined;
    let name: string | undefined;
    if (typeof entry === 'string') {
      path = getString(entry);
      name = path;
    } else {
      const record = asRecord(entry);
      if (record) {
        path = getString(record.path);
        name = getString(record.name);
      }
    }
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push({ name: name ?? path, path });
  }
  return out;
}

/** Parse the persisted `lists.workspaces` JSON column into `{ name, path }` objects. */
export function parseWorkspaces(raw: string | null | undefined): Array<{ name: string; path: string }> {
  if (!raw) return [];
  try {
    return normalizeWorkspaceList(JSON.parse(raw));
  } catch {
    return [];
  }
}
