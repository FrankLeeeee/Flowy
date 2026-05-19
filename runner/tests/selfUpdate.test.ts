import { afterEach, describe, expect, it, vi } from 'vitest';
import * as config from '../src/config';

describe('getPackageVersion', () => {
  it('returns the version from package.json', () => {
    const version = config.getPackageVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('updateSelf', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs npm install -g @frankleeeee/flowy-runner@latest', () => {
    const spawnSyncMock = vi.spyOn(config.childProcess, 'spawnSync')
      .mockReturnValue({ status: 0, stdout: 'updated', stderr: '' } as ReturnType<typeof config.childProcess.spawnSync>);

    const result = config.updateSelf();

    expect(result).toBe(true);
    expect(spawnSyncMock).toHaveBeenCalledWith(
      'npm',
      ['i', '-g', '@frankleeeee/flowy-runner@latest'],
      expect.objectContaining({ encoding: 'utf-8', timeout: 120_000 }),
    );
  });

  it('returns false when npm update fails', () => {
    vi.spyOn(config.childProcess, 'spawnSync')
      .mockReturnValue({ status: 1, stdout: '', stderr: 'permission denied' } as ReturnType<typeof config.childProcess.spawnSync>);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = config.updateSelf();

    expect(result).toBe(false);
  });
});
