import { ChildProcess, spawn } from 'child_process';
import { buildCommandWithConfig } from './executor';

export interface SessionMessageHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SessionTurnParams {
  aiProvider: string;
  harnessConfig?: string;
  history: SessionMessageHistory[];
  prompt: string;
}

/**
 * Compose the full prompt sent to the one-shot CLI by interleaving prior turns.
 * Keeps the transcript human-readable so the model can follow the conversation.
 */
export function composeSessionPrompt(history: SessionMessageHistory[], prompt: string): string {
  const previous = history
    .slice(0, -1) // exclude the trailing user turn (we add it below)
    .filter((m) => m.content.trim().length > 0)
    .map((m) => {
      const tag = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
      return `${tag}:\n${m.content.trim()}`;
    })
    .join('\n\n');

  if (!previous) return prompt;

  return [
    'You are continuing an interactive conversation with the user.',
    'Previous turns of this session:',
    '',
    previous,
    '',
    'New user message:',
    prompt,
  ].join('\n');
}

export interface SessionExecution {
  promise: Promise<{ success: boolean }>;
  kill: () => void;
}

export function executeSessionTurn(
  params: SessionTurnParams,
  onOutput: (chunk: string) => void,
): SessionExecution {
  const fullPrompt = composeSessionPrompt(params.history, params.prompt);
  const { cmd, args, cwd } = buildCommandWithConfig(params.aiProvider, fullPrompt, params.harnessConfig);

  let child: ChildProcess;
  let buffer = '';
  let flushTimer: ReturnType<typeof setInterval>;

  const promise = new Promise<{ success: boolean }>((resolve) => {
    console.log(`  [session] Spawning: ${cmd} ${args.slice(0, 6).join(' ')} …`);

    child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd,
      env: { ...process.env },
    });

    const flush = () => {
      if (buffer.length > 0) {
        onOutput(buffer);
        buffer = '';
      }
    };

    flushTimer = setInterval(flush, 1500);

    child.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      buffer += data.toString();
    });

    child.on('error', (err) => {
      clearInterval(flushTimer);
      buffer += `\n[Error: ${err.message}]`;
      flush();
      resolve({ success: false });
    });

    child.on('close', (code) => {
      clearInterval(flushTimer);
      flush();
      resolve({ success: code === 0 });
    });
  });

  const kill = () => {
    clearInterval(flushTimer!);
    child?.kill('SIGTERM');
  };

  return { promise, kill };
}
