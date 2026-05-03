import { CLICommand, CLIProvider } from './index';
import { asRecord, getString, parseRootConfig } from './utils';

export interface CursorAgentConfig {
  workspace?: string;
  model?: string;
  mode?: 'plan' | 'ask';
  sandbox?: 'enabled' | 'disabled';
  worktree?: string;
}

function parseConfig(raw: string | null | undefined): CursorAgentConfig {
  const root = parseRootConfig(raw);
  const section = asRecord(root.cursorAgent);
  if (!section) return {};
  return {
    workspace: getString(section.workspace),
    model: getString(section.model),
    mode: getString(section.mode) as CursorAgentConfig['mode'],
    sandbox: getString(section.sandbox) as CursorAgentConfig['sandbox'],
    worktree: getString(section.worktree),
  };
}

export const cursorAgentProvider: CLIProvider = {
  id: 'cursor-agent',

  buildCommand(prompt: string, rawHarnessConfig: string | null | undefined): CLICommand {
    const config = parseConfig(rawHarnessConfig);
    const args = ['--print', '--force'];

    if (config.workspace) args.push('--workspace', config.workspace);
    if (config.model) args.push('--model', config.model);
    if (config.mode) args.push('--mode', config.mode);
    if (config.sandbox) args.push('--sandbox', config.sandbox);
    if (config.worktree) args.push('--worktree', config.worktree);

    args.push(prompt);

    return {
      cmd: 'agent',
      args,
      cwd: config.workspace,
      streamOutput: true,
    };
  },
};
