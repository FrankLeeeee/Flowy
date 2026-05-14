import { CLICommand, CLIProvider } from './index';
import {
  CLAUDE_TMUX_IDLE_ENV,
  CLAUDE_TMUX_MODEL_ENV,
  CLAUDE_TMUX_PROMPT_ENV,
  CLAUDE_TMUX_WORKTREE_ENV,
  CLAUDE_TMUX_WRAPPER_SCRIPT,
} from './claudeTmux';
import { asRecord, getString, parseRootConfig } from './utils';

export interface ClaudeCodeConfig {
  workspace?: string;
  model?: string;
  worktree?: string;
  /**
   * When false, run `claude` inside a tmux session instead of `claude -p`.
   * Defaults to true so existing tasks keep their historical behaviour.
   */
  runWithPrint?: boolean;
}

function parseConfig(raw: string | null | undefined): ClaudeCodeConfig {
  const root = parseRootConfig(raw);
  const section = asRecord(root.claudeCode);
  if (!section) return {};
  return {
    workspace: getString(section.workspace),
    model: getString(section.model),
    worktree: getString(section.worktree),
    runWithPrint: typeof section.runWithPrint === 'boolean' ? section.runWithPrint : undefined,
  };
}

function buildPrintCommand(prompt: string, config: ClaudeCodeConfig): CLICommand {
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
}

function buildTmuxCommand(prompt: string, config: ClaudeCodeConfig): CLICommand {
  const env: Record<string, string> = {
    IS_SANDBOX: '1',
    [CLAUDE_TMUX_PROMPT_ENV]: prompt,
  };
  if (config.model) env[CLAUDE_TMUX_MODEL_ENV] = config.model;
  if (config.worktree) env[CLAUDE_TMUX_WORKTREE_ENV] = config.worktree;
  // Idle threshold stays externally tunable via the runner's own env so we
  // can dial it in without rebuilding the runner binary.
  if (process.env[CLAUDE_TMUX_IDLE_ENV]) {
    env[CLAUDE_TMUX_IDLE_ENV] = process.env[CLAUDE_TMUX_IDLE_ENV] as string;
  }

  return {
    cmd: 'bash',
    args: ['-c', CLAUDE_TMUX_WRAPPER_SCRIPT],
    cwd: config.workspace,
    streamOutput: true,
    env,
  };
}

export const claudeCodeProvider: CLIProvider = {
  id: 'claude-code',

  buildCommand(prompt: string, rawHarnessConfig: string | null | undefined): CLICommand {
    const config = parseConfig(rawHarnessConfig);
    // `runWithPrint` defaults to true — only the explicit `false` opts into tmux mode.
    if (config.runWithPrint === false) {
      return buildTmuxCommand(prompt, config);
    }
    return buildPrintCommand(prompt, config);
  },
};
