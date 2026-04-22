import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { RegisterResponse, RunnerConfig } from './types';
import { RunnerApi, SessionCommand } from './api';
import { deleteToken, detectAvailableProviders, saveToken } from './config';
import { executeTask } from './executor';
import { executeSessionTurn } from './sessionExecutor';
import { getRunnerTokenPath } from './configDir';
import {
  MAX_RECONNECT_DURATION_MS,
  ReconnectTimeoutError,
  retryWithReconnectBackoff,
} from './reconnect';

export async function startDaemon(config: RunnerConfig): Promise<void> {
  const api = new RunnerApi(config.url);
  let availableProviders = [...config.providers];
  let lastCliScanAt = config.lastCliScanAt;

  let executing = false;
  let killCurrent: (() => void) | null = null;
  let reconnecting = false;
  let reconnectPromise: Promise<void> | null = null;
  let shuttingDown = false;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let browsePollTimer: ReturnType<typeof setInterval> | undefined;
  let sessionPollTimer: ReturnType<typeof setInterval> | undefined;
  const activeSessions = new Map<string, () => void>(); // sessionId → kill
  let sessionPolling = false;

  const errorMessage = (error: unknown): string => (
    error instanceof Error ? error.message : String(error)
  );

  const httpStatus = (error: unknown): number | undefined => (
    axios.isAxiosError(error) ? error.response?.status : undefined
  );

  const isInvalidTokenError = (error: unknown): boolean => (
    httpStatus(error) === 401 || errorMessage(error).includes('401')
  );

  const isRetryableHubError = (error: unknown): boolean => {
    if (!axios.isAxiosError(error)) return false;
    const status = error.response?.status;
    return status === undefined || status === 408 || status === 429 || status >= 500;
  };

  const formatDelay = (ms: number): string => `${Math.round(ms / 1000)}s`;

  const clearTimers = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (pollTimer) clearInterval(pollTimer);
    if (browsePollTimer) clearInterval(browsePollTimer);
    if (sessionPollTimer) clearInterval(sessionPollTimer);
    heartbeatTimer = undefined;
    pollTimer = undefined;
    browsePollTimer = undefined;
    sessionPollTimer = undefined;
  };

  const handleInvalidToken = (): never => {
    deleteToken(config.name);
    console.error('Runner token rejected (401). Deleted local runner token; restart to register again.');
    process.exit(1);
  };

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\nReceived ${signal}, shutting down...`);
    clearTimers();

    if (killCurrent) {
      console.log('Killing running task...');
      killCurrent();
    }

    for (const [sessionId, kill] of activeSessions) {
      console.log(`Killing active session ${sessionId.slice(0, 8)}...`);
      kill();
    }
    activeSessions.clear();

    // Give a moment for cleanup.
    setTimeout(() => process.exit(0), 500);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // ── Reconnection ──────────────────────────────────────────────────────

  const waitForHub = async <T>(operation: () => Promise<T>, successMessage: string): Promise<T> => {
    try {
      const result = await retryWithReconnectBackoff(operation, {
        shouldRetry: (error) => {
          if (isInvalidTokenError(error)) handleInvalidToken();
          return isRetryableHubError(error);
        },
        onScheduledAttempt: ({ delayMs }) => {
          console.log(`  Retrying in ${formatDelay(delayMs)}...`);
        },
        onFailedAttempt: ({ error }) => {
          console.warn(`  Reconnection attempt failed: ${errorMessage(error)}`);
        },
      });
      console.log(`  ${successMessage}`);
      return result;
    } catch (error) {
      if (error instanceof ReconnectTimeoutError) {
        console.error(`\nFailed to reconnect after ${formatDelay(MAX_RECONNECT_DURATION_MS)}. Shutting down.`);
        process.exit(1);
      }

      if (isInvalidTokenError(error)) handleInvalidToken();
      throw error;
    }
  };

  const sendHeartbeat = async () => {
    const response = await api.heartbeat(availableProviders, lastCliScanAt);
    if (response.refreshCli) {
      availableProviders = detectAvailableProviders();
      lastCliScanAt = new Date().toISOString();
      console.log(`Refreshing available CLIs: ${availableProviders.join(', ') || '(none)'}`);
      await api.heartbeat(availableProviders, lastCliScanAt);
    }
  };

  const reconnectAfterFailure = (error: unknown): Promise<void> => {
    if (shuttingDown) return Promise.resolve();
    if (isInvalidTokenError(error)) handleInvalidToken();
    if (!isRetryableHubError(error)) return Promise.reject(error);
    if (reconnectPromise) return reconnectPromise;

    reconnecting = true;
    clearTimers();

    console.log('\nConnection to Flowy hub lost. Attempting to reconnect...');
    reconnectPromise = waitForHub(() => sendHeartbeat(), 'Reconnected successfully!')
      .then(() => {
        if (shuttingDown) return;
        reconnecting = false;
        startIntervals();
        console.log(`\nRunner "${config.name}" is back online and polling every ${config.pollInterval}s\n`);
      })
      .catch((reconnectError) => {
        if (isInvalidTokenError(reconnectError)) handleInvalidToken();
        console.error(`\nReconnect failed: ${errorMessage(reconnectError)}`);
        process.exit(1);
      })
      .finally(() => {
        reconnectPromise = null;
        if (shuttingDown) reconnecting = false;
      });

    return reconnectPromise;
  };

  // ── Heartbeat ───────────────────────────────────────────────────────────

  const heartbeat = async () => {
    if (reconnecting || shuttingDown) return;

    try {
      await sendHeartbeat();
    } catch (error: unknown) {
      console.warn('Heartbeat failed:', errorMessage(error));
      void reconnectAfterFailure(error).catch((reconnectError) => {
        console.error('Heartbeat reconnect failed:', errorMessage(reconnectError));
      });
    }
  };

  // ── Polling ─────────────────────────────────────────────────────────────

  const poll = async () => {
    if (executing || reconnecting || shuttingDown) return;

    try {
      const task = await api.poll();
      if (!task) return;

      console.log(`\nPicked up task: ${task.task_key} - ${task.title}`);
      console.log(`  AI Provider: ${task.ai_provider}`);
      console.log(`  Description: ${(task.description || task.title).slice(0, 100)}...`);

      await api.pickTask(task.id);
      executing = true;

      const { promise, kill } = executeTask(task, async (chunk) => {
        try {
          await api.sendOutput(task.id, chunk);
        } catch (error) {
          console.warn('Failed to send output chunk:', errorMessage(error));
        }
      });

      killCurrent = kill;

      const result = await promise;
      killCurrent = null;
      executing = false;

      console.log(`\nTask ${task.task_key} ${result.success ? 'completed' : 'failed'}`);
      try {
        await api.completeTask(task.id, result.success, result.sendOnComplete ? result.output : '');
      } catch (error) {
        await reconnectAfterFailure(error);
        if (!shuttingDown) {
          await api.completeTask(task.id, result.success, result.sendOnComplete ? result.output : '');
        }
      }
    } catch (error) {
      executing = false;
      killCurrent = null;
      console.error('Poll/execute error:', errorMessage(error));
      void reconnectAfterFailure(error).catch((reconnectError) => {
        console.error('Poll reconnect failed:', errorMessage(reconnectError));
      });
    }
  };

  // ── Browse-request polling ───────────────────────────────────────────────

  const browsePoll = async () => {
    if (reconnecting || shuttingDown) return;

    try {
      const requests = await api.fetchBrowseRequests();
      for (const { requestId, path: browsePath } of requests) {
        try {
          const resolved = path.resolve(browsePath);
          const dirents = fs.readdirSync(resolved, { withFileTypes: true });
          const entries = dirents
            .filter((dirent) => !dirent.name.startsWith('.'))
            .map((dirent) => ({ name: dirent.name, isDirectory: dirent.isDirectory() }))
            .sort((a, b) => {
              if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
              return a.name.localeCompare(b.name);
            });
          await api.submitBrowseResult(requestId, entries);
        } catch (error) {
          await api.submitBrowseError(requestId, errorMessage(error));
        }
      }
    } catch (error) {
      console.warn('Browse poll failed:', errorMessage(error));
      void reconnectAfterFailure(error).catch((reconnectError) => {
        console.error('Browse poll reconnect failed:', errorMessage(reconnectError));
      });
    }
  };

  // ── Session command polling ──────────────────────────────────────────────

  const runSessionCommand = async (cmd: SessionCommand): Promise<void> => {
    if (cmd.kind === 'stop') {
      const kill = activeSessions.get(cmd.sessionId);
      if (kill) {
        console.log(`  [session ${cmd.sessionId.slice(0, 8)}] Stop requested.`);
        kill();
      }
      return;
    }

    if (cmd.kind !== 'send-prompt') return;

    const { aiProvider, harnessConfig, history, prompt, assistantMessageId } = cmd.payload;
    if (!aiProvider || !assistantMessageId || !prompt) {
      console.warn('  [session] Skipping malformed send-prompt command');
      return;
    }

    console.log(`\n[session ${cmd.sessionId.slice(0, 8)}] Running turn with ${aiProvider}`);

    const { promise, kill } = executeSessionTurn(
      {
        aiProvider,
        harnessConfig,
        history: history ?? [],
        prompt,
      },
      async (chunk) => {
        try {
          await api.sendSessionOutput(cmd.sessionId, assistantMessageId, chunk);
        } catch (error) {
          console.warn('  [session] Failed to send output chunk:', errorMessage(error));
        }
      },
    );

    activeSessions.set(cmd.sessionId, kill);

    try {
      const result = await promise;
      await api.completeSessionTurn(cmd.sessionId, assistantMessageId, result.success);
      console.log(`[session ${cmd.sessionId.slice(0, 8)}] Turn ${result.success ? 'completed' : 'failed'}`);
    } catch (error) {
      console.warn('  [session] Completion failed:', errorMessage(error));
    } finally {
      activeSessions.delete(cmd.sessionId);
    }
  };

  const sessionPoll = async () => {
    if (reconnecting || shuttingDown || sessionPolling) return;
    sessionPolling = true;
    try {
      const commands = await api.fetchSessionCommands();
      for (const cmd of commands) {
        // Run sequentially per runner to avoid spawning parallel CLIs.
        await runSessionCommand(cmd);
      }
    } catch (error) {
      console.warn('Session poll failed:', errorMessage(error));
    } finally {
      sessionPolling = false;
    }
  };

  // ── Intervals ─────────────────────────────────────────────────────────

  const startIntervals = () => {
    clearTimers();
    heartbeatTimer = setInterval(heartbeat, 30_000);
    pollTimer = setInterval(poll, config.pollInterval * 1000);
    browsePollTimer = setInterval(browsePoll, 2_000);
    sessionPollTimer = setInterval(sessionPoll, 2_000);
  };

  // ── Registration ────────────────────────────────────────────────────────

  if (config.token) {
    console.log(`Using existing token for runner "${config.name}"`);
    api.setToken(config.token);
  } else {
    console.log(`Registering runner "${config.name}" at ${config.url}...`);
    let registration: RegisterResponse;
    try {
      registration = await api.register(config.name, availableProviders, config.device, config.secret);
    } catch (error) {
      if (!isRetryableHubError(error)) throw error;
      console.warn('Registration failed:', errorMessage(error));
      console.log('\nCould not reach Flowy hub. Attempting to reconnect...');
      registration = await waitForHub(
        () => api.register(config.name, availableProviders, config.device, config.secret),
        'Connected to Flowy hub.',
      );
    }

    api.setToken(registration.token);
    saveToken(config.name, registration.id, registration.token);
    console.log(`Registered! Runner ID: ${registration.id}`);
    console.log(`Token saved to ${getRunnerTokenPath(config.name)}`);
  }

  // ── Initial connection ────────────────────────────────────────────────

  try {
    await sendHeartbeat();
  } catch (error) {
    if (isInvalidTokenError(error)) handleInvalidToken();
    if (!isRetryableHubError(error)) throw error;
    console.warn('Initial heartbeat failed:', errorMessage(error));
    console.log('\nCould not reach Flowy hub. Attempting to reconnect...');
    await waitForHub(() => sendHeartbeat(), 'Connected to Flowy hub.');
  }

  startIntervals();

  console.log(`\nRunner "${config.name}" is online and polling every ${config.pollInterval}s`);
  console.log(`Providers: ${availableProviders.join(', ') || '(none)'}`);
  console.log('Press Ctrl+C to stop.\n');
}
