import { prepareCommandWithConfig } from './executor';
import { CLICommand } from './clis';
import { spawnCliProcess } from './spawnCli';

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
    .slice(0, -1)
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

  let killed = false;
  let activeKill: (() => void) | null = null;

  const promise = (async (): Promise<{ success: boolean; output: string }> => {
    let command: CLICommand;
    try {
      command = await prepareCommandWithConfig(params.aiProvider, fullPrompt, params.harnessConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errMsg = `\n[Error preparing command: ${message}]`;
      onOutput(errMsg);
      return { success: false, output: errMsg };
    }

    if (killed) return { success: false, output: '' };

    const handle = spawnCliProcess({
      command,
      onOutput,
      flushIntervalMs: 1500,
      captureFullOutput: false,
      gateFlushOnStream: false,
    });
    activeKill = handle.kill;
    return handle.promise;
  })();

  const kill = () => {
    killed = true;
    if (activeKill) activeKill();
  };

  return { promise, kill };
}
