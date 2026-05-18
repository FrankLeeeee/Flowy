import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let homeDir: string;
let server: http.Server;
let baseUrl: string;
let db: typeof import('../src/db');

const SESSION_TOKEN = 'test-user-session';

async function setupApp() {
  homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-runners-route-'));
  vi.resetModules();
  vi.doMock('os', async () => {
    const actual = await vi.importActual<typeof import('os')>('os');
    return {
      ...actual,
      default: { ...actual, homedir: () => homeDir },
      homedir: () => homeDir,
    };
  });

  db = await import('../src/db');
  db.initDb();
  const runnersRouter = (await import('../src/routes/runners')).default;

  // A valid user session so requireUserAuth passes for dashboard endpoints.
  db.getDb()
    .prepare(`INSERT INTO user_sessions (token, expires_at) VALUES (?, datetime('now','+1 day'))`)
    .run(SESSION_TOKEN);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/runners', runnersRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to bind test server');
  baseUrl = `http://127.0.0.1:${address.port}`;
}

function insertRunner(opts: { id: string; token: string; status?: string }) {
  db.getDb()
    .prepare(`
      INSERT INTO runners (id, name, token, status, ai_providers, device_info, created_at, updated_at)
      VALUES (?, ?, ?, ?, '[]', 'test device', datetime('now'), datetime('now'))
    `)
    .run(opts.id, `runner-${opts.id}`, opts.token, opts.status ?? 'online');
}

function insertTask(opts: { id: string; runnerId: string | null; key: string; updatedAt: string }) {
  db.getDb()
    .prepare(`
      INSERT INTO tasks (id, task_number, task_key, title, status, priority, runner_id, scheduled_date, created_at, updated_at)
      VALUES (?, 1, ?, ?, 'done', 'none', ?, '2026-05-12', ?, ?)
    `)
    .run(opts.id, opts.key, `Title ${opts.key}`, opts.runnerId, opts.updatedAt, opts.updatedAt);
}

function asUser(extra: Record<string, string> = {}) {
  return { Cookie: `flowy_session=${SESSION_TOKEN}`, ...extra };
}

async function getJson(pathname: string, headers: Record<string, string>) {
  const res = await fetch(`${baseUrl}${pathname}`, { headers });
  return { status: res.status, body: await res.json() as unknown };
}

async function postJson(pathname: string, headers: Record<string, string>, body?: unknown) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() as unknown };
}

describe('runners route — detail endpoints', () => {
  beforeEach(async () => {
    await setupApp();
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    vi.resetModules();
    vi.doUnmock('os');
    fs.rmSync(homeDir, { recursive: true, force: true });
  });

  it('rejects unauthenticated requests', async () => {
    const res = await getJson('/runners/missing/tasks', {});
    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown runner', async () => {
    const tasks = await getJson('/runners/nope/tasks', asUser());
    const logs = await getJson('/runners/nope/cli-logs', asUser());
    expect(tasks.status).toBe(404);
    expect(logs.status).toBe(404);
  });

  it('returns the 10 most recent tasks for the runner, newest first', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1' });
    insertRunner({ id: 'r2', token: 'tok-r2' });
    // 12 tasks for r1 with increasing updated_at, plus one for another runner.
    for (let i = 1; i <= 12; i++) {
      const stamp = `2026-05-12T10:${String(i).padStart(2, '0')}:00.000Z`;
      insertTask({ id: `t${i}`, runnerId: 'r1', key: `R1 #${i}`, updatedAt: stamp });
    }
    insertTask({ id: 'other', runnerId: 'r2', key: 'R2 #1', updatedAt: '2026-05-12T23:00:00.000Z' });

    const { status, body } = await getJson('/runners/r1/tasks', asUser());
    expect(status).toBe(200);
    const rows = body as Array<{ id: string; task_key: string; runner_id: string }>;
    expect(rows).toHaveLength(10);
    expect(rows[0].task_key).toBe('R1 #12');
    expect(rows[9].task_key).toBe('R1 #3');
    expect(rows.every((t) => t.runner_id === 'r1')).toBe(true);
  });

  it('logs a manual refresh request and exposes it via cli-logs', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1', status: 'online' });

    const refresh = await postJson('/runners/r1/refresh-providers', asUser());
    expect(refresh.status).toBe(200);

    const { status, body } = await getJson('/runners/r1/cli-logs', asUser());
    expect(status).toBe(200);
    const logs = body as Array<{ event: string; source: string }>;
    expect(logs).toHaveLength(1);
    expect(logs[0].event).toBe('refresh_requested');
    expect(logs[0].source).toBe('manual');
  });

  it('logs a manual update request', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1', status: 'online' });

    await postJson('/runners/r1/update-providers', asUser());

    const { body } = await getJson('/runners/r1/cli-logs', asUser());
    const logs = body as Array<{ event: string; source: string }>;
    expect(logs[0].event).toBe('update_requested');
    expect(logs[0].source).toBe('manual');
  });

  it('records a periodic scan when the heartbeat reports a newer scan time', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1', status: 'online' });

    const hb = await postJson('/runners/heartbeat', { Authorization: 'Bearer tok-r1' }, {
      aiProviders: ['claude-code'],
      lastCliScanAt: '2026-05-18T10:00:00.000Z',
      cliVersions: { 'claude-code': '1.2.3' },
    });
    expect(hb.status).toBe(200);

    const { body } = await getJson('/runners/r1/cli-logs', asUser());
    const logs = body as Array<{ event: string; source: string; data: string }>;
    expect(logs).toHaveLength(1);
    expect(logs[0].event).toBe('scan_completed');
    expect(logs[0].source).toBe('periodic');
    expect(JSON.parse(logs[0].data)).toEqual({
      providers: ['claude-code'],
      versions: { 'claude-code': '1.2.3' },
    });
  });

  it('attributes a scan to a manual refresh when one was pending', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1', status: 'online' });

    await postJson('/runners/r1/refresh-providers', asUser());
    // Scan timestamp safely after the refresh request so it satisfies it.
    const future = new Date(Date.now() + 60_000).toISOString();
    await postJson('/runners/heartbeat', { Authorization: 'Bearer tok-r1' }, {
      aiProviders: ['codex'],
      lastCliScanAt: future,
      cliVersions: { codex: '0.9.0' },
    });

    const { body } = await getJson('/runners/r1/cli-logs', asUser());
    const logs = body as Array<{ event: string; source: string }>;
    // Newest first: scan_completed (refresh) then the refresh_requested entry.
    expect(logs[0]).toMatchObject({ event: 'scan_completed', source: 'refresh' });
    expect(logs[1]).toMatchObject({ event: 'refresh_requested', source: 'manual' });
  });

  it('does not record a scan when the heartbeat scan time is unchanged', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1', status: 'online' });
    const stamp = '2026-05-18T10:00:00.000Z';

    await postJson('/runners/heartbeat', { Authorization: 'Bearer tok-r1' }, {
      aiProviders: ['claude-code'], lastCliScanAt: stamp, cliVersions: {},
    });
    await postJson('/runners/heartbeat', { Authorization: 'Bearer tok-r1' }, {
      aiProviders: ['claude-code'], lastCliScanAt: stamp, cliVersions: {},
    });

    const { body } = await getJson('/runners/r1/cli-logs', asUser());
    expect(body as unknown[]).toHaveLength(1);
  });
});
