import { ChildProcess, spawn } from 'child_process';
import { CLICommand } from './clis';

export interface SpawnOptions {
  command: CLICommand;
  onOutput: (chunk: string) => void;
  /** Interval in ms between output flushes. */
  flushIntervalMs: number;
  /** Whether to accumulate full output for the final result. */
  captureFullOutput: boolean;
  /** Whether flush should respect the streamOutput flag. */
  gateFlushOnStream: boolean;
}

export interface SpawnHandle {
  promise: Promise<{ success: boolean; output: string }>;
  kill: () => void;
}

/** Shared child-process spawning logic used by both task and session executors. */
export function spawnCliProcess(options: SpawnOptions): SpawnHandle {
  const { command, onOutput, flushIntervalMs, captureFullOutput, gateFlushOnStream } = options;
  const { cmd, args, cwd, streamOutput, env: extraEnv } = command;

  let child: ChildProcess;
  let fullOutput = '';
  let buffer = '';
  let flushTimer: ReturnType<typeof setInterval>;

  const promise = new Promise<{ success: boolean; output: string }>((resolve) => {
    console.log(`  Spawning: ${cmd} (${args.length} args)`);

    child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd,
      env: { ...process.env, ...extraEnv },
    });

    const flush = () => {
      const shouldFlush = gateFlushOnStream ? streamOutput && buffer.length > 0 : buffer.length > 0;
      if (shouldFlush) {
        onOutput(buffer);
        buffer = '';
      }
    };

    flushTimer = setInterval(flush, flushIntervalMs);

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      if (captureFullOutput) fullOutput += text;
      buffer += text;
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      if (captureFullOutput) fullOutput += text;
      buffer += text;
    });

    child.on('error', (err) => {
      clearInterval(flushTimer);
      const errMsg = `\n[Error: ${err.message}]`;
      if (captureFullOutput) fullOutput += errMsg;
      buffer += errMsg;
      flush();
      resolve({ success: false, output: fullOutput });
    });

    child.on('close', (code) => {
      clearInterval(flushTimer);
      flush();
      resolve({ success: code === 0, output: fullOutput });
    });
  });

  const kill = () => {
    clearInterval(flushTimer!);
    child?.kill('SIGTERM');
  };

  return { promise, kill };
}
