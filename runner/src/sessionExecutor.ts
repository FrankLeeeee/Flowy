import { AiProvider } from './types';
import { buildCommandWithConfig } from './executor';
import { spawnBuffered } from './spawnBuffered';

export interface SessionMessageHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SessionTurnParams {
  aiProvider: AiProvider;
  harnessConfig?: string;
  history: SessionMessageHistory[];
  prompt: string;
}

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
  const { cmd, args, cwd } = buildCommandWithConfig(params.aiProvider, fullPrompt, params.harnessConfig);

  return spawnBuffered(
    {
      cmd,
      args,
      cwd,
      flushIntervalMs: 1500,
      logPrefix: '[session] ',
      onFlush: onOutput,
    },
    (code, error) => ({ success: !error && code === 0 }),
  );
}
