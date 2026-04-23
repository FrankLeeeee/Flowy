import { CLICommand, CLIProvider } from './index';
import { asRecord, getString, parseRootConfig } from './utils';

export interface ClaudeCodeConfig {
  workspace?: string;
  model?: string;
  worktree?: string;
}

function parseConfig(raw: string | null | undefined): ClaudeCodeConfig {
  const root = parseRootConfig(raw);
  const section = asRecord(root.claudeCode);
  if (!section) return {};
  return {
    workspace: getString(section.workspace),
    model: getString(section.model),
    worktree: getString(section.worktree),
  };
}

export const claudeCodeProvider: CLIProvider = {
  id: 'claude-code',

  buildCommand(prompt: string, rawHarnessConfig: string | null | undefined): CLICommand {
    const config = parseConfig(rawHarnessConfig);
    const args = ['-p'];

    if (config.model) args.push('--model', config.model);
    args.push('--permission-mode', 'bypassPermissions');
    if (config.worktree) args.push('--worktree', config.worktree);

    args.push(prompt);

    return {
      cmd: 'claude',
      args,
      cwd: config.workspace,
      streamOutput: true,
    };
  },
};
