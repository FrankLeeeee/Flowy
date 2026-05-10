import { buildCommandWithConfig } from './executor';
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
  const command = buildCommandWithConfig(params.aiProvider, fullPrompt, params.harnessConfig);

  const handle = spawnCliProcess({
    command,
    onOutput,
    flushIntervalMs: 1500,
    captureFullOutput: false,
    gateFlushOnStream: false,
  });

  return { promise: handle.promise, kill: handle.kill };
}
