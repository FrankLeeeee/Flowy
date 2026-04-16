export const INITIAL_RECONNECT_DELAY_MS = 5_000;
export const MAX_RECONNECT_DURATION_MS = 5 * 60 * 1_000;

export class ReconnectTimeoutError extends Error {
  constructor(maxDurationMs: number) {
    super(`Unable to reconnect within ${Math.round(maxDurationMs / 1000)} seconds`);
    this.name = 'ReconnectTimeoutError';
  }
}

export interface ReconnectAttempt {
  attempt: number;
  delayMs: number;
  elapsedMs: number;
  remainingMs: number;
}

export interface ReconnectFailedAttempt {
  attempt: number;
  error: unknown;
  elapsedMs: number;
}

export interface ReconnectBackoffOptions {
  initialDelayMs?: number;
  maxDurationMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  shouldRetry?: (error: unknown) => boolean;
  onScheduledAttempt?: (attempt: ReconnectAttempt) => void;
  onFailedAttempt?: (attempt: ReconnectFailedAttempt) => void;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function retryWithReconnectBackoff<T>(
  operation: () => Promise<T>,
  options: ReconnectBackoffOptions = {},
): Promise<T> {
  const initialDelayMs = options.initialDelayMs ?? INITIAL_RECONNECT_DELAY_MS;
  const maxDurationMs = options.maxDurationMs ?? MAX_RECONNECT_DURATION_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const shouldRetry = options.shouldRetry ?? (() => true);

  const startedAt = now();
  let nextDelayMs = initialDelayMs;
  let attempt = 0;

  while (true) {
    const elapsedMs = now() - startedAt;
    const remainingMs = maxDurationMs - elapsedMs;
    if (remainingMs <= 0) {
      throw new ReconnectTimeoutError(maxDurationMs);
    }

    const delayMs = Math.min(nextDelayMs, remainingMs);
    attempt += 1;
    options.onScheduledAttempt?.({ attempt, delayMs, elapsedMs, remainingMs });

    await sleep(delayMs);

    try {
      return await operation();
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }

      const failedElapsedMs = now() - startedAt;
      options.onFailedAttempt?.({ attempt, error, elapsedMs: failedElapsedMs });

      if (failedElapsedMs >= maxDurationMs) {
        throw new ReconnectTimeoutError(maxDurationMs);
      }

      nextDelayMs *= 2;
    }
  }
}
