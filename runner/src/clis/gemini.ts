import { CLICommand, CLIProvider } from './index';
import { asRecord, getString, parseRootConfig } from './utils';

export interface GeminiConfig {
  workspace?: string;
  model?: 'auto' | 'pro' | 'flash' | 'flash-lite';
  sandbox?: boolean;
  worktree?: string;
}

function parseConfig(raw: string | null | undefined): GeminiConfig {
  const root = parseRootConfig(raw);
  const section = asRecord(root.gemini);
  if (!section) return {};
  return {
    workspace: getString(section.workspace),
    model: getString(section.model) as GeminiConfig['model'],
    sandbox: typeof section.sandbox === 'boolean' ? section.sandbox : undefined,
    worktree: getString(section.worktree),
  };
}

export const geminiProvider: CLIProvider = {
  id: 'gemini-cli',

  buildCommand(prompt: string, rawHarnessConfig: string | null | undefined): CLICommand {
    const config = parseConfig(rawHarnessConfig);
    const args = ['--prompt', prompt];

    if (config.model) args.push('--model', config.model);
    if (config.sandbox) args.push('--sandbox');
    if (config.worktree) args.push('--worktree', config.worktree);

    return {
      cmd: 'gemini',
      args,
      cwd: config.workspace,
      streamOutput: true,
    };
  },
};
