import { RunnerConfig } from './types';
import { RunnerApi } from './api';
import { deleteToken, detectAvailableProviders, saveToken } from './config';
import { executeTask } from './executor';
import { getRunnerTokenPath } from './configDir';

export async function startDaemon(config: RunnerConfig): Promise<void> {
  const api = new RunnerApi(config.url);
  let availableProviders = [...config.providers];
  let lastCliScanAt = config.lastCliScanAt;

  // ── Registration ────────────────────────────────────────────────────────
  if (config.token) {
    console.log(`Using existing token for runner "${config.name}"`);
    api.setToken(config.token);
  } else {
    console.log(`Registering runner "${config.name}" at ${config.url}...`);
    const { id, token } = await api.register(config.name, availableProviders, config.device, config.secret);
    api.setToken(token);
    saveToken(config.name, id, token);
    console.log(`Registered! Runner ID: ${id}`);
    console.log(`Token saved to ${getRunnerTokenPath(config.name)}`);
  }

  let executing = false;
  let killCurrent: (() => void) | null = null;

  const handleInvalidToken = () => {
    deleteToken(config.name);
    console.error('Runner token rejected (401). Deleted local runner token; restart to register again.');
    process.exit(1);
  };

  // ── Heartbeat ───────────────────────────────────────────────────────────
  const heartbeat = async () => {
    try {
      const response = await api.heartbeat(availableProviders, lastCliScanAt);
      if (response.refreshCli) {
        availableProviders = detectAvailableProviders();
        lastCliScanAt = new Date().toISOString();
        console.log(`Refreshing available CLIs: ${availableProviders.join(', ') || '(none)'}`);
        await api.heartbeat(availableProviders, lastCliScanAt);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401')) {
        handleInvalidToken();
      }
      console.warn('Heartbeat failed:', msg);
    }
  };

  // Send initial heartbeat, then every 30 seconds
  await heartbeat();
  const heartbeatInterval = setInterval(heartbeat, 30_000);

  // ── Polling ─────────────────────────────────────────────────────────────
  const poll = async () => {
    if (executing) return;

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
        } catch (err) {
          console.warn('Failed to send output chunk:', err instanceof Error ? err.message : err);
        }
      });

      killCurrent = kill;

      const result = await promise;
      killCurrent = null;
      executing = false;

      console.log(`\nTask ${task.task_key} ${result.success ? 'completed' : 'failed'}`);
      await api.completeTask(task.id, result.success, result.sendOnComplete ? result.output : '');

    } catch (err) {
      executing = false;
      killCurrent = null;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401')) {
        handleInvalidToken();
      }
      console.error('Poll/execute error:', err instanceof Error ? err.message : err);
    }
  };

  const pollInterval = setInterval(poll, config.pollInterval * 1000);

  console.log(`\nRunner "${config.name}" is online and polling every ${config.pollInterval}s`);
  console.log(`Providers: ${availableProviders.join(', ') || '(none)'}`);
  console.log('Press Ctrl+C to stop.\n');

  // ── Graceful Shutdown ───────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    clearInterval(heartbeatInterval);
    clearInterval(pollInterval);

    if (killCurrent) {
      console.log('Killing running task...');
      killCurrent();
    }

    // Give a moment for cleanup
    setTimeout(() => process.exit(0), 500);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
