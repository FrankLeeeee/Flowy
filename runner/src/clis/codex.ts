import { BuildCommandOptions, CLICommand, CLIProvider } from './index';
import { resolveWithinRoots } from '../paths';
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

  buildCommand(
    prompt: string,
    rawHarnessConfig: string | null | undefined,
    options: BuildCommandOptions,
  ): CLICommand {
    const config = parseConfig(rawHarnessConfig);
    const args = ['exec'];

    const workspace = config.workspace
      ? resolveWithinRoots(config.workspace, options.workspaceRoots)
      : undefined;

    if (workspace) args.push('--cd', workspace);
    if (config.model) args.push('--model', config.model);
    args.push('--sandbox', config.sandbox ?? 'workspace-write');
    args.push('--color', 'never', prompt);

    return {
      cmd: 'codex',
      args,
      cwd: workspace,
      streamOutput: true,
    };
  },
};
