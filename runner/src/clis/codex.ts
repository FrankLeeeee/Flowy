import { CLICommand, CLIProvider } from './index';
import { asRecord, getString, parseRootConfig } from './utils';
import { ensureCodexWorktree } from './worktree';

export interface CodexConfig {
  workspace?: string;
  model?: string;
  sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
  worktree?: string;
}

function parseConfig(raw: string | null | undefined): CodexConfig {
  const root = parseRootConfig(raw);
  const section = asRecord(root.codex);
  if (!section) return {};
  return {
    workspace: getString(section.workspace),
    model: getString(section.model),
    sandbox: getString(section.sandbox) as CodexConfig['sandbox'],
    worktree: getString(section.worktree),
  };
}

function buildCodexCommand(prompt: string, config: CodexConfig, workspaceOverride?: string): CLICommand {
  const args = ['exec'];

  const cwd = workspaceOverride ?? config.workspace;
  if (cwd) args.push('--cd', cwd);
  if (config.model) args.push('--model', config.model);
  args.push('--sandbox', config.sandbox ?? 'workspace-write');
  args.push('--color', 'never', prompt);

  return {
    cmd: 'codex',
    args,
    cwd,
    streamOutput: true,
  };
}

export const codexProvider: CLIProvider = {
  id: 'codex',

  buildCommand(prompt: string, rawHarnessConfig: string | null | undefined): CLICommand {
    return buildCodexCommand(prompt, parseConfig(rawHarnessConfig));
  },

  async prepareCommand(prompt: string, rawHarnessConfig: string | null | undefined): Promise<CLICommand> {
    const config = parseConfig(rawHarnessConfig);
    if (!config.worktree) return buildCodexCommand(prompt, config);

    // Codex has no native --worktree flag, so the runner provisions one explicitly
    // and points codex at the resulting path so its edits land in the worktree.
    const worktreePath = await ensureCodexWorktree(config.workspace, config.worktree);
    return buildCodexCommand(prompt, config, worktreePath);
  },
};
