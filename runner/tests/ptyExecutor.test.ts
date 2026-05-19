import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getProvider } from '../src/clis';
import { buildInteractiveClaudeArgs } from '../src/clis/ptyExecutor';

// These tests spawn the real `claude` binary in interactive mode, which now
// pre-trusts its workspace in `$CLAUDE_CONFIG_DIR/.claude.json`. Point that at
// a throwaway dir so the suite never mutates the developer's real config.
let prevConfigDir: string | undefined;
let tmpConfigDir: string;

beforeAll(() => {
  prevConfigDir = process.env.CLAUDE_CONFIG_DIR;
  tmpConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-pty-cfg-'));
  process.env.CLAUDE_CONFIG_DIR = tmpConfigDir;
});

afterAll(() => {
  if (prevConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = prevConfigDir;
  fs.rmSync(tmpConfigDir, { recursive: true, force: true });
});

describe('claudeCode provider execute method', () => {
  it('returns null when useInteractiveMode is not set', () => {
    const provider = getProvider('claude-code');
    const result = provider.execute!(
      'Hello',
      JSON.stringify({ claudeCode: {} }),
      () => {},
    );
    expect(result).toBeNull();
  });

  it('returns null when useInteractiveMode is false', () => {
    const provider = getProvider('claude-code');
    const result = provider.execute!(
      'Hello',
      JSON.stringify({ claudeCode: { useInteractiveMode: false } }),
      () => {},
    );
    expect(result).toBeNull();
  });

  it('returns a handle when useInteractiveMode is true', () => {
    const provider = getProvider('claude-code');
    const handle = provider.execute!(
      'Hello',
      JSON.stringify({ claudeCode: { useInteractiveMode: true } }),
      () => {},
    );
    expect(handle).not.toBeNull();
    expect(handle).toHaveProperty('promise');
    expect(handle).toHaveProperty('kill');
    // Clean up the spawned process immediately.
    handle!.kill();
  });

  it('passes model and workspace from config', () => {
    const provider = getProvider('claude-code');
    const handle = provider.execute!(
      'Test prompt',
      JSON.stringify({
        claudeCode: { model: 'opus', workspace: '/tmp', useInteractiveMode: true },
      }),
      () => {},
    );
    expect(handle).not.toBeNull();
    handle!.kill();
  });
});

describe('buildInteractiveClaudeArgs', () => {
  it('pre-accepts the bypass permissions disclaimer via inline --settings', () => {
    const args = buildInteractiveClaudeArgs({ sessionId: 'sid', prompt: 'hi' });

    const idx = args.indexOf('--settings');
    expect(idx).toBeGreaterThanOrEqual(0);
    const settings = JSON.parse(args[idx + 1]);
    expect(settings).toEqual({ skipDangerousModePermissionPrompt: true });
  });

  it('runs in bypassPermissions mode with the prompt last', () => {
    const args = buildInteractiveClaudeArgs({ sessionId: 'sid', prompt: 'do the thing' });

    const modeIdx = args.indexOf('--permission-mode');
    expect(args[modeIdx + 1]).toBe('bypassPermissions');
    expect(args[args.length - 1]).toBe('do the thing');
  });

  it('omits optional model/worktree flags when not provided', () => {
    const args = buildInteractiveClaudeArgs({ sessionId: 'sid', prompt: 'hi' });
    expect(args).not.toContain('--model');
    expect(args).not.toContain('--worktree');
  });

  it('includes model and worktree when provided', () => {
    const args = buildInteractiveClaudeArgs({
      sessionId: 'sid',
      prompt: 'hi',
      model: 'opus',
      worktree: '/tmp/wt',
    });
    expect(args[args.indexOf('--model') + 1]).toBe('opus');
    expect(args[args.indexOf('--worktree') + 1]).toBe('/tmp/wt');
  });
});

describe('JSONL session file reading', () => {
  function writeJsonl(dir: string, sessionId: string, events: object[]): string {
    const jsonlPath = path.join(dir, `${sessionId}.jsonl`);
    fs.writeFileSync(jsonlPath, events.map((e) => JSON.stringify(e)).join('\n') + '\n');
    return jsonlPath;
  }

  it('should parse well-formed JSONL from a session file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-jsonl-'));
    try {
      const sessionId = 'test-session-123';
      writeJsonl(tmpDir, sessionId, [
        { type: 'user', message: { content: [{ type: 'text', text: 'Hello' }] } },
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Hi there!' }] },
          stop_reason: 'end_turn',
        },
      ]);

      const jsonlPath = path.join(tmpDir, `${sessionId}.jsonl`);
      const content = fs.readFileSync(jsonlPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      let lastText = '';
      for (const line of lines) {
        const event = JSON.parse(line);
        if (event.type !== 'assistant') continue;
        const stopReason = event.stop_reason ?? event.message?.stop_reason;
        if (stopReason === 'tool_use') continue;
        const parts = (event.message?.content ?? [])
          .filter((c: { type: string }) => c.type === 'text')
          .map((c: { text: string }) => c.text);
        if (parts.length > 0) lastText = parts.join('\n');
      }

      expect(lastText).toBe('Hi there!');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should skip tool_use messages and pick the terminal one', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-jsonl-'));
    try {
      const sessionId = 'test-session-456';
      writeJsonl(tmpDir, sessionId, [
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Let me check...' }] },
          stop_reason: 'tool_use',
        },
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Here is the result.' }] },
          stop_reason: 'end_turn',
        },
      ]);

      const jsonlPath = path.join(tmpDir, `${sessionId}.jsonl`);
      const content = fs.readFileSync(jsonlPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      let lastText = '';
      for (const line of lines) {
        const event = JSON.parse(line);
        if (event.type !== 'assistant') continue;
        const stopReason = event.stop_reason ?? event.message?.stop_reason;
        if (stopReason === 'tool_use' || stopReason === 'pause_turn') continue;
        const parts = (event.message?.content ?? [])
          .filter((c: { type: string }) => c.type === 'text')
          .map((c: { text: string }) => c.text);
        if (parts.length > 0) lastText = parts.join('\n');
      }

      expect(lastText).toBe('Here is the result.');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
