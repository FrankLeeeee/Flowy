import { AiProvider, Task } from './types';
import { CLICommand, getProvider } from './clis';
import { spawnBuffered } from './spawnBuffered';

export interface ExecutionResult {
  success: boolean;
  output: string;
  sendOnComplete: boolean;
}

export function buildCommandWithConfig(
  aiProvider: AiProvider,
  prompt: string,
  rawHarnessConfig?: string,
): CLICommand {
  return getProvider(aiProvider).buildCommand(prompt, rawHarnessConfig);
}

export function executeTask(
  task: Task,
  onOutput: (chunk: string) => void,
): { promise: Promise<ExecutionResult>; kill: () => void } {
  const { cmd, args, cwd, streamOutput } = buildCommandWithConfig(
    task.ai_provider!,
    task.description || task.title,
    task.harness_config,
  );

  let fullOutput = '';

  return spawnBuffered(
    {
      cmd,
      args,
      cwd,
      flushIntervalMs: 2000,
      onFlush: (chunk) => {
        if (streamOutput) onOutput(chunk);
      },
      onData: (text) => {
        fullOutput += text;
      },
    },
    (code, error) => {
      if (error) {
        fullOutput += `\n[Error: ${error.message}]`;
        return { success: false, output: fullOutput, sendOnComplete: true };
      }
      const success = code === 0;
      return { success, output: fullOutput, sendOnComplete: !streamOutput || !success };
    },
  );
}
