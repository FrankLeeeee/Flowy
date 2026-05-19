import { CLICommand, CLIProvider } from './index';
import { asRecord, getPositiveNumber, getString, parseRootConfig } from './utils';
import { spawnInteractiveClaude } from './ptyExecutor';

export interface ClaudeCodeConfig {
  workspace?: string;
  model?: string;
  worktree?: string;
  useInteractiveMode?: boolean;
  interactiveIdleTimeoutMs?: number;
  interactiveMaxSessionMs?: number;
}

function parseConfig(raw: string | null | undefined): ClaudeCodeConfig {
  const root = parseRootConfig(raw);
  const section = asRecord(root.claudeCode);
  if (!section) return {};
  return {
    workspace: getString(section.workspace),
    model: getString(section.model),
    worktree: getString(section.worktree),
    useInteractiveMode:
      typeof section.useInteractiveMode === 'boolean'
        ? section.useInteractiveMode
        : undefined,
    interactiveIdleTimeoutMs: getPositiveNumber(section.interactiveIdleTimeoutMs),
    interactiveMaxSessionMs: getPositiveNumber(section.interactiveMaxSessionMs),
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
      // Claude refuses --permission-mode bypassPermissions when running as
      // root/sudo unless IS_SANDBOX=1 signals an opted-in sandboxed environment.
      env: { IS_SANDBOX: '1' },
    };
  },

  execute(
    prompt: string,
    rawHarnessConfig: string | null | undefined,
    _onOutput: (chunk: string) => void,
  ) {
    const config = parseConfig(rawHarnessConfig);
    if (!config.useInteractiveMode) return null;

    // Interactive mode intentionally ignores `onOutput`: the raw PTY
    // transcript is noisy TUI chrome, so nothing is streamed back. The task
    // receives only Claude's final reply, captured via `/copy` on completion.
    return spawnInteractiveClaude({
      prompt,
      model: config.model,
      cwd: config.workspace,
      worktree: config.worktree,
      idleTimeoutMs: config.interactiveIdleTimeoutMs,
      maxSessionMs: config.interactiveMaxSessionMs,
    });
  },
};
