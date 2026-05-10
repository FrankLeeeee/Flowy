import { Task } from './types';
import { CLICommand, getProvider } from './clis';
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
 * Execute a task using the specified AI CLI tool.
 * Calls `onOutput` with buffered chunks every ~2 seconds.
 */
export function executeTask(
  task: Task,
  onOutput: (chunk: string) => void,
): { promise: Promise<ExecutionResult>; kill: () => void } {
  const command = buildCommandWithConfig(
    task.ai_provider!,
    task.description || task.title,
    task.harness_config,
  );

  const handle = spawnCliProcess({
    command,
    onOutput,
    flushIntervalMs: 2000,
    captureFullOutput: true,
    gateFlushOnStream: true,
  });

  const promise = handle.promise.then(({ success, output }) => ({
    success,
    output,
    sendOnComplete: !command.streamOutput || !success,
  }));

  return { promise, kill: handle.kill };
}
