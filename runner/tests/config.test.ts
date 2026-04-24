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
  });
});
