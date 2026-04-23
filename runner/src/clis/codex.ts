import { CLICommand, CLIProvider } from './index';
import { asRecord, getString, parseRootConfig } from './utils';

export interface CodexConfig {
  workspace?: string;
  model?: string;
  sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
}

function parseConfig(raw: string | null | undefined): CodexConfig {
  const root = parseRootConfig(raw);
  const section = asRecord(root.codex);
  if (!section) return {};
  return {
    workspace: getString(section.workspace),
    model: getString(section.model),
    sandbox: getString(section.sandbox) as CodexConfig['sandbox'],
  };
}

export const codexProvider: CLIProvider = {
  id: 'codex',

  buildCommand(prompt: string, rawHarnessConfig: string | null | undefined): CLICommand {
    const config = parseConfig(rawHarnessConfig);
    const args = ['exec'];

    if (config.workspace) args.push('--cd', config.workspace);
    if (config.model) args.push('--model', config.model);
    args.push('--sandbox', config.sandbox ?? 'workspace-write');
    args.push('--color', 'never', prompt);

    return {
      cmd: 'codex',
      args,
      cwd: config.workspace,
      streamOutput: true,
    };
  },
};
