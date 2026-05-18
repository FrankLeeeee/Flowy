import { afterEach, describe, expect, it, vi } from 'vitest';
import * as config from '../src/config';

describe('detectAvailableProviders', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns only providers whose commands are available', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
    const spawnSyncMock = vi.spyOn(config.childProcess, 'spawnSync');

    spawnSyncMock
      .mockReturnValueOnce({ status: 0 } as ReturnType<typeof config.childProcess.spawnSync>)                              // which claude → found
      .mockReturnValueOnce({ status: 0, stdout: '1.2.3', stderr: '' } as ReturnType<typeof config.childProcess.spawnSync>) // claude --version
      .mockReturnValueOnce({ status: 1 } as ReturnType<typeof config.childProcess.spawnSync>)                              // which codex → not found
      .mockReturnValueOnce({ status: 1 } as ReturnType<typeof config.childProcess.spawnSync>)                              // which agent → not found
      .mockReturnValueOnce({ status: 1 } as ReturnType<typeof config.childProcess.spawnSync>);                             // which gemini → not found

    expect(config.detectAvailableProviders()).toEqual(['claude-code']);
    expect(spawnSyncMock).toHaveBeenNthCalledWith(1, 'which', ['claude'], { stdio: 'ignore' });
    expect(spawnSyncMock).toHaveBeenNthCalledWith(2, 'claude', ['--version'], { encoding: 'utf-8', timeout: 5_000 });
    expect(spawnSyncMock).toHaveBeenNthCalledWith(3, 'which', ['codex'], { stdio: 'ignore' });
    expect(spawnSyncMock).toHaveBeenNthCalledWith(4, 'which', ['agent'], { stdio: 'ignore' });
    expect(spawnSyncMock).toHaveBeenNthCalledWith(5, 'which', ['gemini'], { stdio: 'ignore' });
  });

  it('uses the Windows command resolver on win32', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    const spawnSyncMock = vi
      .spyOn(config.childProcess, 'spawnSync')
      .mockReturnValue({ status: 0 } as ReturnType<typeof config.childProcess.spawnSync>);

    config.detectAvailableProviders();

    expect(spawnSyncMock).toHaveBeenCalledWith('where', ['claude'], { stdio: 'ignore' });
  });
});

describe('parseArgs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires a secret when registering without an existing token', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as typeof process.exit);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => config.parseArgs(['node', 'flowy-runner', '--name', 'runner-1', '--url', 'http://localhost:3001'])).toThrow('exit:1');
    expect(error).toHaveBeenCalledWith('A registration secret is required the first time a runner connects.');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('allows startup without a secret when an existing token is provided', () => {
    vi.spyOn(config.childProcess, 'spawnSync')
      .mockReturnValue({ status: 0 } as ReturnType<typeof config.childProcess.spawnSync>);

    const parsed = config.parseArgs([
      'node',
      'flowy-runner',
      '--name',
      'runner-1',
      '--url',
      'http://localhost:3001',
      '--token',
      'existing-token',
    ]);

    expect(parsed.token).toBe('existing-token');
    expect(parsed.secret).toBeUndefined();
    expect(parsed.providers).toEqual(['claude-code', 'codex', 'cursor-agent', 'gemini-cli']);
    expect(parsed.cliModels).toEqual({});
  });
});

describe('parseModelLines', () => {
  it('extracts model ids, tolerating bullets, headers and ANSI codes', () => {
    const output = [
      '[1mAvailable models:[0m',
      '  - gpt-5',
      '* auto (default)',
      '  claude-sonnet-4.5',
      '',
      'gpt-5-codex',
    ].join('\n');

    expect(config.parseModelLines(output)).toEqual([
      'gpt-5',
      'auto',
      'claude-sonnet-4.5',
      'gpt-5-codex',
    ]);
  });

  it('handles interactive selector arrows and Unicode bullets', () => {
    const output = [
      '❯ claude-sonnet-4-6 (current)',
      '  claude-opus-4-6',
      '► claude-haiku-4-5-20251001',
      '→ claude-sonnet-4-5-20250514',
    ].join('\n');

    expect(config.parseModelLines(output)).toEqual([
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-5-20250514',
    ]);
  });

  it('dedupes and ignores prose lines without a model-like token', () => {
    expect(config.parseModelLines('gpt-5\ngpt-5\n!! pick one !!')).toEqual(['gpt-5']);
  });
});

describe('detectPtyModels', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed models from the PTY script output', () => {
    vi.spyOn(config.childProcess, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: '  claude-sonnet-4-6\n  claude-opus-4-6\n  claude-haiku-4-5-20251001\n',
      stderr: '',
    } as ReturnType<typeof config.childProcess.spawnSync>);

    expect(config.detectPtyModels('claude', '/model')).toEqual([
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-haiku-4-5-20251001',
    ]);
  });

  it('passes command and slash command via environment variables', () => {
    const spy = vi.spyOn(config.childProcess, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: '  claude-sonnet-4-6\n',
      stderr: '',
    } as ReturnType<typeof config.childProcess.spawnSync>);

    config.detectPtyModels('claude', '/model');

    expect(spy).toHaveBeenCalledWith(
      process.execPath,
      ['-e', expect.any(String)],
      expect.objectContaining({
        env: expect.objectContaining({ FLOWY_PTY_CMD: 'claude', FLOWY_PTY_SLASH: '/model' }),
      }),
    );
  });

  it('returns [] when the node script fails', () => {
    vi.spyOn(config.childProcess, 'spawnSync').mockReturnValue({
      status: 1,
      stdout: '',
      stderr: 'script: not found',
    } as ReturnType<typeof config.childProcess.spawnSync>);

    expect(config.detectPtyModels('claude', '/model')).toEqual([]);
  });

  it('returns [] on Windows', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    const spawnSpy = vi.spyOn(config.childProcess, 'spawnSync');

    expect(config.detectPtyModels('claude', '/model')).toEqual([]);
    expect(spawnSpy).not.toHaveBeenCalled();
  });
});

describe('parseCodexModels', () => {
  it('parses a JSON array of objects with id fields', () => {
    const output = '[{"id":"gpt-5.4"},{"slug":"gpt-5.3-codex"},{"name":"gpt-5.2-mini"}]';
    expect(config.parseCodexModels(output)).toEqual(['gpt-5.4', 'gpt-5.3-codex', 'gpt-5.2-mini']);
  });

  it('parses a { models: [...] } wrapper and skips leading log noise', () => {
    const output = 'fetching catalog...\n{"models":["gpt-5.4","gpt-5.4"]}';
    expect(config.parseCodexModels(output)).toEqual(['gpt-5.4']);
  });

  it('returns [] when there is no JSON payload', () => {
    expect(config.parseCodexModels('no models found')).toEqual([]);
  });
});

describe('detectAvailableModels', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('queries CLIs via non-interactive flags and via PTY for interactive-only providers', () => {
    vi.spyOn(config.childProcess, 'spawnSync').mockImplementation(((cmd: string, args: string[]) => {
      if (cmd === 'agent' && args[0] === '--list-models') {
        return { status: 0, stdout: 'Available models:\n  gpt-5\n* auto\n', stderr: '' };
      }
      if (cmd === 'codex' && args.join(' ') === 'debug models') {
        return { status: 0, stdout: '[{"id":"gpt-5.4"}]', stderr: '' };
      }
      // PTY script for claude-code (spawned via node -e)
      if (cmd === process.execPath && args[0] === '-e') {
        return { status: 0, stdout: '  claude-sonnet-4-6\n  claude-opus-4-6\n', stderr: '' };
      }
      return { status: 1 };
    }) as unknown as typeof config.childProcess.spawnSync);

    expect(config.detectAvailableModels(['cursor-agent', 'codex', 'claude-code'])).toEqual({
      'cursor-agent': ['gpt-5', 'auto'],
      'codex': ['gpt-5.4'],
      'claude-code': ['claude-sonnet-4-6', 'claude-opus-4-6'],
    });
  });

  it('omits a provider when the CLI command fails or yields nothing parseable', () => {
    vi.spyOn(config.childProcess, 'spawnSync')
      .mockReturnValue({ status: 1 } as ReturnType<typeof config.childProcess.spawnSync>);

    expect(config.detectAvailableModels(['cursor-agent', 'codex', 'claude-code'])).toEqual({});
  });
});
