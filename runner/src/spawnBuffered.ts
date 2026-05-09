import { spawn, ChildProcess } from 'child_process';

export interface SpawnBufferedOptions {
  cmd: string;
  args: string[];
  cwd?: string;
  flushIntervalMs?: number;
  logPrefix?: string;
  onFlush: (chunk: string) => void;
  onData?: (text: string) => void;
}

export interface SpawnBufferedResult<T> {
  promise: Promise<T>;
  kill: () => void;
}

export function spawnBuffered(
  opts: SpawnBufferedOptions,
  resolveResult: (code: number | null, error?: Error) => any,
): SpawnBufferedResult<any> {
  const { cmd, args, cwd, flushIntervalMs = 2000, logPrefix = '', onFlush, onData } = opts;

  let child: ChildProcess;
  let buffer = '';
  let flushTimer: ReturnType<typeof setInterval>;

  const promise = new Promise((resolve) => {
    console.log(`  ${logPrefix}Spawning: ${cmd} (${args.length} args)`);

    child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd,
      env: { ...process.env },
    });

    const flush = () => {
      if (buffer.length > 0) {
        onFlush(buffer);
        buffer = '';
      }
    };

    flushTimer = setInterval(flush, flushIntervalMs);

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      buffer += text;
      onData?.(text);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      buffer += text;
      onData?.(text);
    });

    child.on('error', (err) => {
      clearInterval(flushTimer);
      buffer += `\n[Error: ${err.message}]`;
      flush();
      resolve(resolveResult(null, err));
    });

    child.on('close', (code) => {
      clearInterval(flushTimer);
      flush();
      resolve(resolveResult(code));
    });
  });

  const kill = () => {
    clearInterval(flushTimer!);
    child?.kill('SIGTERM');
  };

  return { promise, kill };
}
