import { describe, it, expect } from 'vitest';
import { composeSessionPrompt } from '../src/sessionExecutor';

describe('composeSessionPrompt', () => {
  it('returns the raw prompt when there is no prior history', () => {
    expect(composeSessionPrompt([], 'Hello')).toBe('Hello');
  });

  it('skips prior history when only the trailing user turn is present', () => {
    // The input's last user turn is dropped by the composer (it is added as the new prompt).
    const history = [{ role: 'user' as const, content: 'Hello' }];
    expect(composeSessionPrompt(history, 'Hello')).toBe('Hello');
  });

  it('includes previous user and assistant turns', () => {
    const history = [
      { role: 'user' as const, content: 'First question' },
      { role: 'assistant' as const, content: 'First answer' },
      { role: 'user' as const, content: 'Follow up' },
    ];
    const composed = composeSessionPrompt(history, 'Follow up');
    expect(composed).toContain('User:\nFirst question');
    expect(composed).toContain('Assistant:\nFirst answer');
    expect(composed).toContain('New user message:\nFollow up');
  });

  it('drops empty turns', () => {
    const history = [
      { role: 'user' as const, content: 'Q1' },
      { role: 'assistant' as const, content: '' },
      { role: 'user' as const, content: 'Q2' },
    ];
    const composed = composeSessionPrompt(history, 'Q2');
    expect(composed).toContain('User:\nQ1');
    expect(composed).not.toContain('Assistant:');
  });
});
