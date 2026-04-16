import { describe, expect, it, vi } from 'vitest';
import {
  MAX_RECONNECT_DURATION_MS,
  ReconnectTimeoutError,
  retryWithReconnectBackoff,
} from '../src/reconnect';

describe('retryWithReconnectBackoff', () => {
  it('retries with delays that double from 5 seconds', async () => {
    let now = 0;
    const sleeps: number[] = [];
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('down'))
      .mockRejectedValueOnce(new Error('still down'))
      .mockRejectedValueOnce(new Error('very down'))
      .mockResolvedValue('ok');

    const result = await retryWithReconnectBackoff(operation, {
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    });

    expect(result).toBe('ok');
    expect(sleeps).toEqual([5_000, 10_000, 20_000, 40_000]);
    expect(operation).toHaveBeenCalledTimes(4);
  });

  it('caps the final wait so the total retry window is 5 minutes', async () => {
    let now = 0;
    const sleeps: number[] = [];

    await expect(retryWithReconnectBackoff(
      () => Promise.reject(new Error('down')),
      {
        now: () => now,
        sleep: async (ms) => {
          sleeps.push(ms);
          now += ms;
        },
      },
    )).rejects.toBeInstanceOf(ReconnectTimeoutError);

    expect(sleeps).toEqual([5_000, 10_000, 20_000, 40_000, 80_000, 145_000]);
    expect(sleeps.reduce((total, ms) => total + ms, 0)).toBe(MAX_RECONNECT_DURATION_MS);
  });

  it('stops immediately when an error should not be retried', async () => {
    let now = 0;
    const expectedError = new Error('invalid token');
    const operation = vi.fn<() => Promise<void>>().mockRejectedValue(expectedError);

    await expect(retryWithReconnectBackoff(operation, {
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
      shouldRetry: () => false,
    })).rejects.toBe(expectedError);

    expect(operation).toHaveBeenCalledTimes(1);
  });
});
