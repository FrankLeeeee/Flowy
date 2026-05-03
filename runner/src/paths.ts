import fs from 'fs';
import path from 'path';

/**
 * Realpath the deepest existing ancestor of `target`, then re-attach the
 * not-yet-existing tail. This prevents symlinks anywhere in the existing
 * portion from masking the canonical location, while still letting callers
 * pass a path before they create it.
 */
function canonicalize(target: string): string {
  const absolute = path.resolve(target);

  let existing = absolute;
  const tail: string[] = [];
  while (existing !== path.dirname(existing)) {
    if (fs.existsSync(existing)) break;
    tail.unshift(path.basename(existing));
    existing = path.dirname(existing);
  }

  let real: string;
  try {
    real = fs.realpathSync(existing);
  } catch {
    real = existing;
  }
  return tail.length === 0 ? real : path.join(real, ...tail);
}

/**
 * Resolve `target` to an absolute path and verify it lies within one of
 * `roots`. Throws if the path escapes (including via symlinks). Returns the
 * canonical resolved path on success.
 */
export function resolveWithinRoots(target: string, roots: string[]): string {
  if (!target) throw new Error('Path is empty');

  const canonical = canonicalize(target);

  for (const root of roots) {
    const canonicalRoot = canonicalize(root);
    if (canonical === canonicalRoot || canonical.startsWith(canonicalRoot + path.sep)) {
      return canonical;
    }
  }

  throw new Error(`Path is outside the allowed workspace roots: ${target}`);
}
