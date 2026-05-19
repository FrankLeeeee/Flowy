import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Pre-trusting the Claude Code workspace.
 *
 * When Claude Code runs interactively (a real/pseudo TTY, as our PTY executor
 * provides via `script`), it shows a one-time "Do you trust the files in this
 * folder?" dialog the first time it sees a directory. In `-p`/non-TTY mode that
 * dialog is skipped entirely (see `claude --help`). There is no CLI flag to
 * skip it for interactive sessions — the accepted state is persisted per
 * directory in `~/.claude.json` under `projects["<dir>"].hasTrustDialogAccepted`.
 *
 * The runner is an opted-in automation context (it already runs with
 * `IS_SANDBOX=1` and `--permission-mode bypassPermissions`), so we mark the
 * working directory as trusted before spawning. This makes interactive mode
 * behave like `-p`: it never blocks on the trust prompt.
 */

const TRUST_KEY = 'hasTrustDialogAccepted';

/**
 * Default location of the Claude Code global config. Mirrors Claude Code's own
 * resolution: `$CLAUDE_CONFIG_DIR/.claude.json` when that env var is set,
 * otherwise `~/.claude.json`. Writing where Claude actually reads is what makes
 * the pre-trust take effect.
 */
export function defaultClaudeConfigPath(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR;
  const base = configDir && configDir.trim() ? configDir : os.homedir();
  return path.join(base, '.claude.json');
}

/**
 * Resolve a directory to the canonical absolute path Claude keys projects by.
 * Claude reads `process.cwd()`, which is symlink-resolved, so we mirror that
 * with `realpathSync` and fall back to a plain resolve when the path does not
 * exist yet.
 */
export function resolveWorkspaceDir(dir?: string): string {
  const resolved = dir ? path.resolve(dir) : process.cwd();
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

/**
 * Return a copy of `config` with `dir` marked as a trusted project. Pure (no
 * I/O) so the merge logic can be unit-tested in isolation. Existing project
 * settings are preserved; only the trust flag is forced on.
 */
export function markWorkspaceTrusted(
  config: Record<string, unknown>,
  dir: string,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...config };
  const projects: Record<string, unknown> =
    typeof next.projects === 'object' && next.projects !== null
      ? { ...(next.projects as Record<string, unknown>) }
      : {};

  const existing =
    typeof projects[dir] === 'object' && projects[dir] !== null
      ? (projects[dir] as Record<string, unknown>)
      : {};

  projects[dir] = { ...existing, [TRUST_KEY]: true };
  next.projects = projects;
  return next;
}

/**
 * Ensure `dir` is recorded as a trusted Claude workspace in the global config.
 *
 * Best-effort: any failure (missing/corrupt config, unwritable home) is logged
 * and swallowed rather than thrown — a failed pre-trust just means the
 * interactive block detector becomes the fallback, never a crashed spawn. The
 * write is atomic (temp file + rename) so a kill mid-write cannot corrupt the
 * user's `~/.claude.json`.
 *
 * @returns `true` when the config was updated (or already trusted), else `false`.
 */
export function trustClaudeWorkspace(
  dir?: string,
  configPath: string = defaultClaudeConfigPath(),
): boolean {
  const target = resolveWorkspaceDir(dir);

  let config: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        // Unexpected shape — don't risk clobbering a file Claude owns.
        console.warn('  Skipping workspace pre-trust: unexpected ~/.claude.json shape');
        return false;
      }
      config = parsed as Record<string, unknown>;
    } catch {
      console.warn('  Skipping workspace pre-trust: ~/.claude.json is not valid JSON');
      return false;
    }
  }

  const projects = config.projects as Record<string, unknown> | undefined;
  const current = projects?.[target] as Record<string, unknown> | undefined;
  if (current?.[TRUST_KEY] === true) return true; // already trusted, nothing to write

  const updated = markWorkspaceTrusted(config, target);

  try {
    const tmpPath = `${configPath}.flowy-${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(updated, null, 2), { mode: 0o600 });
    fs.renameSync(tmpPath, configPath);
    console.log(`  Pre-trusted Claude workspace: ${target}`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`  Skipping workspace pre-trust: ${message}`);
    return false;
  }
}
