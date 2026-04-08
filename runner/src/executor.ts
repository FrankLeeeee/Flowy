import { spawn, ChildProcess } from 'child_process';
import { Task } from './types';

export interface ExecutionResult {
  success: boolean;
  output: string;
  sendOnComplete: boolean;
}

/** Build the CLI command + args for a given AI provider. */
export function buildCommand(aiProvider: string, prompt: string): {
  cmd: string;
  args: string[];
  streamOutput: boolean;
} {
  switch (aiProvider) {
    case 'claude-code':
      return { cmd: 'claude', args: ['-p', prompt, "--tools", "all"], streamOutput: true };
    case 'codex':
      return {
        cmd: 'codex',
        args: ['exec', prompt, '--sandbox', 'workspace-write', '--color', 'never'],
        streamOutput: true,
      };
    default:
      throw new Error(`Unknown AI provider: ${aiProvider}`);
  }
}

/**
 * Execute a task using the specified AI CLI tool.
 * Calls `onOutput` with buffered chunks every ~2 seconds.
 * Returns when the process exits.
 */
export function executeTask(
  task: Task,
  onOutput: (chunk: string) => void,
): { promise: Promise<ExecutionResult>; kill: () => void } {
  const { cmd, args, streamOutput } = buildCommand(task.ai_provider!, task.description || task.title);

  let child: ChildProcess;
  let fullOutput = '';
  let buffer = '';
  let flushTimer: ReturnType<typeof setInterval>;

  const promise = new Promise<ExecutionResult>((resolve) => {
    console.log(`  Spawning: ${cmd} ${args.join(' ')}`);

    child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    const flush = () => {
      if (streamOutput && buffer.length > 0) {
        onOutput(buffer);
        buffer = '';
      }
    };

    flushTimer = setInterval(flush, 2000);

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      fullOutput += text;
      buffer += text;
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      fullOutput += text;
      buffer += text;
    });

    child.on('error', (err) => {
      clearInterval(flushTimer);
      flush();
      fullOutput += `\n[Error: ${err.message}]`;
      resolve({ success: false, output: fullOutput, sendOnComplete: true });
    });

    child.on('close', (code) => {
      clearInterval(flushTimer);
      flush();
      const success = code === 0;
      resolve({ success, output: fullOutput, sendOnComplete: !streamOutput || !success });
    });
  });

  const kill = () => {
    clearInterval(flushTimer!);
    child?.kill('SIGTERM');
  };

  return { promise, kill };
}
