import { describe, expect, it } from 'vitest';
import { buildCommand } from '../src/executor';

describe('buildCommand', () => {
  it('builds the Claude Code command with streaming enabled', () => {
    expect(buildCommand('claude-code', 'Write a test')).toEqual({
      cmd: 'claude',
      args: ['-p', 'Write a test', '--tools', 'all'],
      streamOutput: true,
    });
  });

  it('builds the Codex command with workspace-write sandboxing', () => {
    expect(buildCommand('codex', 'Fix CI')).toEqual({
      cmd: 'codex',
      args: ['exec', 'Fix CI', '--sandbox', 'workspace-write', '--color', 'never'],
      streamOutput: true,
    });
  });

  it('builds the Cursor Agent command with streaming enabled', () => {
    expect(buildCommand('cursor-agent', 'Refactor module')).toEqual({
      cmd: 'agent',
      args: ['-p', 'Refactor module'],
      streamOutput: true,
    });
  });

  it('throws for unsupported providers', () => {
    expect(() => buildCommand('unknown', 'Prompt')).toThrow('Unknown AI provider: unknown');
  });
});
