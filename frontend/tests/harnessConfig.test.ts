import { describe, expect, it } from 'vitest';
import { parseHarnessConfig, getHarnessConfigBadges } from '../src/lib/harnessConfig';

describe('harnessConfig', () => {
  describe('parseHarnessConfig', () => {
    it('returns {} for null', () => {
      expect(parseHarnessConfig(null)).toEqual({});
    });

    it('returns {} for undefined', () => {
      expect(parseHarnessConfig(undefined)).toEqual({});
    });

    it('returns {} for empty string', () => {
      expect(parseHarnessConfig('')).toEqual({});
    });

    it('returns {} for invalid JSON', () => {
      expect(parseHarnessConfig('not json')).toEqual({});
    });

    it('parses codex config', () => {
      const result = parseHarnessConfig(JSON.stringify({
        codex: { workspace: '/path', model: 'gpt-4', sandbox: 'read-only', worktree: 'feat' },
      }));
      expect(result.codex).toEqual({
        workspace: '/path',
        model: 'gpt-4',
        sandbox: 'read-only',
        worktree: 'feat',
      });
    });

    it('parses claudeCode config', () => {
      const result = parseHarnessConfig(JSON.stringify({
        claudeCode: { workspace: '/path', model: 'opus', worktree: 'feature-branch' },
      }));
      expect(result.claudeCode).toEqual({
        workspace: '/path',
        model: 'opus',
        worktree: 'feature-branch',
        runWithPrint: undefined,
      });
    });

    it('parses claudeCode.runWithPrint=false (tmux mode)', () => {
      const result = parseHarnessConfig(JSON.stringify({
        claudeCode: { workspace: '/path', runWithPrint: false },
      }));
      expect(result.claudeCode?.runWithPrint).toBe(false);
    });

    it('ignores non-boolean runWithPrint values', () => {
      const result = parseHarnessConfig(JSON.stringify({
        claudeCode: { workspace: '/path', runWithPrint: 'no' },
      }));
      expect(result.claudeCode?.runWithPrint).toBeUndefined();
    });

    it('parses cursorAgent config with all fields', () => {
      const result = parseHarnessConfig(JSON.stringify({
        cursorAgent: { workspace: '/path', model: 'gpt-4', mode: 'plan', sandbox: 'enabled', worktree: 'branch' },
      }));
      expect(result.cursorAgent).toEqual({
        workspace: '/path',
        model: 'gpt-4',
        mode: 'plan',
        sandbox: 'enabled',
        worktree: 'branch',
      });
    });

    it('parses gemini config with boolean sandbox', () => {
      const result = parseHarnessConfig(JSON.stringify({
        gemini: { workspace: '/path', model: 'pro', sandbox: true, worktree: 'branch' },
      }));
      expect(result.gemini).toEqual({
        workspace: '/path',
        model: 'pro',
        sandbox: true,
        worktree: 'branch',
      });
    });

    it('strips whitespace-only values', () => {
      const result = parseHarnessConfig(JSON.stringify({
        codex: { workspace: '  ', model: 'gpt-4' },
      }));
      expect(result.codex?.workspace).toBeUndefined();
      expect(result.codex?.model).toBe('gpt-4');
    });

    it('returns undefined for missing provider sections', () => {
      const result = parseHarnessConfig('{}');
      expect(result.codex).toBeUndefined();
      expect(result.claudeCode).toBeUndefined();
      expect(result.cursorAgent).toBeUndefined();
      expect(result.gemini).toBeUndefined();
    });
  });

  describe('getHarnessConfigBadges', () => {
    it('returns [] for null provider', () => {
      expect(getHarnessConfigBadges(null, {})).toEqual([]);
    });

    it('returns [] when provider config is missing', () => {
      expect(getHarnessConfigBadges('codex', {})).toEqual([]);
    });

    it('builds codex badges', () => {
      const badges = getHarnessConfigBadges('codex', {
        codex: { workspace: '/path', model: 'gpt-4', sandbox: 'read-only', worktree: 'feat' },
      });
      expect(badges).toContain('Workspace: /path');
      expect(badges).toContain('Model: gpt-4');
      expect(badges).toContain('Sandbox: read-only');
      expect(badges).toContain('Worktree: feat');
    });

    it('builds claude-code badges', () => {
      const badges = getHarnessConfigBadges('claude-code', {
        claudeCode: { workspace: '/path', worktree: 'feat' },
      });
      expect(badges).toContain('Workspace: /path');
      expect(badges).toContain('Worktree: feat');
      expect(badges).not.toContain('Mode: tmux (no -p)');
    });

    it('adds the tmux-mode badge when claudeCode.runWithPrint is false', () => {
      const badges = getHarnessConfigBadges('claude-code', {
        claudeCode: { workspace: '/path', runWithPrint: false },
      });
      expect(badges).toContain('Mode: tmux (no -p)');
    });

    it('omits the tmux-mode badge when claudeCode.runWithPrint is true', () => {
      const badges = getHarnessConfigBadges('claude-code', {
        claudeCode: { workspace: '/path', runWithPrint: true },
      });
      expect(badges).not.toContain('Mode: tmux (no -p)');
    });

    it('builds cursor-agent badges', () => {
      const badges = getHarnessConfigBadges('cursor-agent', {
        cursorAgent: { mode: 'plan', sandbox: 'enabled' },
      });
      expect(badges).toContain('Mode: plan');
      expect(badges).toContain('Sandbox: enabled');
    });

    it('builds gemini-cli badges', () => {
      const badges = getHarnessConfigBadges('gemini-cli', {
        gemini: { model: 'pro', sandbox: true },
      });
      expect(badges).toContain('Model: pro');
      expect(badges).toContain('Sandbox: enabled');
    });

    it('omits badges for undefined fields', () => {
      const badges = getHarnessConfigBadges('codex', {
        codex: { model: 'gpt-4' },
      });
      expect(badges).toEqual(['Model: gpt-4']);
    });
  });
});
