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
      .mockReturnValueOnce({ status: 0 } as ReturnType<typeof config.childProcess.spawnSync>)
      .mockReturnValueOnce({ status: 1 } as ReturnType<typeof config.childProcess.spawnSync>)
      .mockReturnValueOnce({ status: 1 } as ReturnType<typeof config.childProcess.spawnSync>);

    expect(config.detectAvailableProviders()).toEqual(['claude-code']);
    expect(spawnSyncMock).toHaveBeenNthCalledWith(1, 'which', ['claude'], { stdio: 'ignore' });
    expect(spawnSyncMock).toHaveBeenNthCalledWith(2, 'which', ['codex'], { stdio: 'ignore' });
    expect(spawnSyncMock).toHaveBeenNthCalledWith(3, 'which', ['agent'], { stdio: 'ignore' });
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
