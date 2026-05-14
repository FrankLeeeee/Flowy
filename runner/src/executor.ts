import { Task } from './types';
import { CLICommand, getProvider, prepareProviderCommand } from './clis';
import { spawnCliProcess } from './spawnCli';

export type { CLICommand };

export interface ExecutionResult {
  success: boolean;
  output: string;
  sendOnComplete: boolean;
}

/** Build the CLI command + args for a given AI provider and optional harness config. */
export function buildCommandWithConfig(
  aiProvider: string,
  prompt: string,
  rawHarnessConfig?: string,
): CLICommand {
  return getProvider(aiProvider).buildCommand(prompt, rawHarnessConfig);
}

/**
 * Resolve the CLI command for a provider, awaiting any async preparation
 * (e.g. provisioning a git worktree for codex).
 */
export function prepareCommandWithConfig(
  aiProvider: string,
  prompt: string,
  rawHarnessConfig?: string,
): Promise<CLICommand> {
  return prepareProviderCommand(getProvider(aiProvider), prompt, rawHarnessConfig);
}

/**
 * Execute a task using the specified AI CLI tool.
 * Calls `onOutput` with buffered chunks every ~2 seconds.
 */
export function executeTask(
  task: Task,
  onOutput: (chunk: string) => void,
): { promise: Promise<ExecutionResult>; kill: () => void } {
  let killed = false;
  let activeKill: (() => void) | null = null;

  const promise = (async (): Promise<ExecutionResult> => {
    let command: CLICommand;
    try {
      command = await prepareCommandWithConfig(
        task.ai_provider!,
        task.description || task.title,
        task.harness_config,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errMsg = `\n[Error preparing command: ${message}]`;
      onOutput(errMsg);
      return { success: false, output: errMsg, sendOnComplete: true };
    }

    if (killed) {
      return { success: false, output: '', sendOnComplete: true };
    }

    const handle = spawnCliProcess({
      command,
      onOutput,
      flushIntervalMs: 2000,
      captureFullOutput: true,
      gateFlushOnStream: true,
    });
    activeKill = handle.kill;

    const { success, output } = await handle.promise;
    return {
      success,
      output,
      sendOnComplete: !command.streamOutput || !success,
    };
  })();

  const kill = () => {
    killed = true;
    if (activeKill) activeKill();
  };

  return { promise, kill };
}
