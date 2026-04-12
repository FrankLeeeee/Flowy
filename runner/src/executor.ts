import { spawn, ChildProcess } from 'child_process';
import { Task } from './types';
import { parseHarnessConfig } from './harnessConfig';

export interface ExecutionResult {
  success: boolean;
  output: string;
  sendOnComplete: boolean;
}

/** Build the CLI command + args for a given AI provider and optional harness config. */
export function buildCommandWithConfig(aiProvider: string, prompt: string, rawHarnessConfig?: string): {
  cmd: string;
  args: string[];
  cwd?: string;
  streamOutput: boolean;
} {
  const harnessConfig = parseHarnessConfig(rawHarnessConfig);

  switch (aiProvider) {
    case 'claude-code': {
      const config = harnessConfig.claudeCode ?? {};
      const args = ['-p', '--tools', 'all'];

      if (config.model) args.push('--model', config.model);
      if (config.mode) args.push('--permission-mode', config.mode);
      if (config.worktree) args.push('--worktree', config.worktree);

      args.push(prompt);

      return {
        cmd: 'claude',
        args,
        cwd: config.workspace,
        streamOutput: true,
      };
    }
    case 'codex': {
      const config = harnessConfig.codex ?? {};
      const args = ['exec'];

      if (config.workspace) args.push('--cd', config.workspace);
      if (config.model) args.push('--model', config.model);
      if (config.sandbox) {
        args.push('--sandbox', config.sandbox);
      } else {
        args.push('--sandbox', 'workspace-write');
      }
      args.push('--color', 'never', prompt);

      return {
        cmd: 'codex',
        args,
        cwd: config.workspace,
        streamOutput: true,
      };
    }
    case 'cursor-agent': {
      const config = harnessConfig.cursorAgent ?? {};
      const args = ['--print', '--force'];

      if (config.workspace) args.push('--workspace', config.workspace);
      if (config.model) args.push('--model', config.model);
      if (config.mode) args.push('--mode', config.mode);
      if (config.sandbox) args.push('--sandbox', config.sandbox);
      if (config.worktree) args.push('--worktree', config.worktree);

      args.push(prompt);

      return {
        cmd: 'agent',
        args,
        cwd: config.workspace,
        streamOutput: true,
      };
    }
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
  const { cmd, args, cwd, streamOutput } = buildCommandWithConfig(
    task.ai_provider!,
    task.description || task.title,
    task.harness_config,
  );

  let child: ChildProcess;
  let fullOutput = '';
  let buffer = '';
  let flushTimer: ReturnType<typeof setInterval>;

  const promise = new Promise<ExecutionResult>((resolve) => {
    console.log(`  Spawning: ${cmd} ${args.join(' ')}`);

    child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd,
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
