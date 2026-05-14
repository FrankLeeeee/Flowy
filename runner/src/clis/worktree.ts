import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const WORKTREE_PARENT = path.join('.flowy', 'worktrees');

async function runGit(cwd: string, args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd });
}

/**
 * Create (or reuse) a git worktree for `name` under `<workspace>/.flowy/worktrees/<name>`.
 *
 * Reused when the path already exists so repeated task runs share the same workspace.
 * The branch name matches the worktree name; if the branch already exists in the repo
 * it is checked out rather than recreated, preserving any prior commits.
 *
 * Throws when `workspace` is missing or is not a git repository — callers are
 * expected to surface that error back to the hub so the user can fix the config.
 */
export async function ensureCodexWorktree(workspace: string | undefined, name: string): Promise<string> {
  if (!workspace) {
    throw new Error('codex worktree requires a workspace to be set');
  }
  if (!fs.existsSync(workspace)) {
    throw new Error(`workspace does not exist: ${workspace}`);
  }
  if (!fs.existsSync(path.join(workspace, '.git'))) {
    throw new Error(`workspace is not a git repository: ${workspace}`);
  }

  const worktreePath = path.join(workspace, WORKTREE_PARENT, name);

  if (fs.existsSync(worktreePath)) {
    return worktreePath;
  }

  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });

  try {
    await runGit(workspace, ['worktree', 'add', '-b', name, worktreePath]);
  } catch {
    // Branch likely already exists — check it out into the new worktree path instead.
    await runGit(workspace, ['worktree', 'add', worktreePath, name]);
  }

  return worktreePath;
}
