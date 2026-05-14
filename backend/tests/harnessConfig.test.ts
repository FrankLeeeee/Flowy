import { describe, expect, it } from 'vitest';
import { normalizeHarnessConfig } from '../src/harnessConfig';

describe('normalizeHarnessConfig', () => {
  it('returns "{}" for null input', () => {
    expect(normalizeHarnessConfig(null)).toBe('{}');
  });

  it('returns "{}" for undefined input', () => {
    expect(normalizeHarnessConfig(undefined)).toBe('{}');
  });

  it('normalizes codex config', () => {
    const result = JSON.parse(normalizeHarnessConfig({
      codex: { workspace: '/path', model: 'gpt-4', sandbox: 'read-only', worktree: 'feat' },
    }));
    expect(result.codex).toEqual({
      workspace: '/path',
      model: 'gpt-4',
      sandbox: 'read-only',
      worktree: 'feat',
    });
  });

  it('strips whitespace-only string values', () => {
    const result = JSON.parse(normalizeHarnessConfig({
      codex: { workspace: '  ', model: 'gpt-4' },
    }));
    expect(result.codex).toEqual({ model: 'gpt-4' });
  });

  it('strips undefined fields from output', () => {
    const result = JSON.parse(normalizeHarnessConfig({
      codex: { model: 'gpt-4' },
    }));
    expect(Object.keys(result)).toEqual(['codex']);
    expect(Object.keys(result.codex)).toEqual(['model']);
  });

  it('omits empty provider sections', () => {
    const result = JSON.parse(normalizeHarnessConfig({
      codex: { workspace: '  ' },
    }));
    expect(result).toEqual({});
  });

  it('preserves boolean sandbox for gemini', () => {
    const result = JSON.parse(normalizeHarnessConfig({
      gemini: { sandbox: true },
    }));
    expect(result.gemini.sandbox).toBe(true);
  });

  it('handles multiple providers', () => {
    const result = JSON.parse(normalizeHarnessConfig({
      codex: { model: 'gpt-4' },
      claudeCode: { workspace: '/path' },
    }));
    expect(result.codex.model).toBe('gpt-4');
    expect(result.claudeCode.workspace).toBe('/path');
  });
});
