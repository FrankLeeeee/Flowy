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
  homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-runner-update-'));
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

describe('runner self-update', () => {
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

  it('POST /runners/:id/update-runner sets runner_update_requested_at', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1', status: 'online' });

    const res = await postJson('/runners/r1/update-runner', asUser());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });

    const runner = db.getDb().prepare('SELECT runner_update_requested_at FROM runners WHERE id = ?').get('r1') as { runner_update_requested_at: string | null };
    expect(runner.runner_update_requested_at).toBeTruthy();
  });

  it('rejects update request for offline runner', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1', status: 'offline' });

    const res = await postJson('/runners/r1/update-runner', asUser());
    expect(res.status).toBe(409);
  });

  it('returns 404 for unknown runner', async () => {
    const res = await postJson('/runners/nope/update-runner', asUser());
    expect(res.status).toBe(404);
  });

  it('heartbeat returns updateRunner=true when flag is set', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1', status: 'online' });

    await postJson('/runners/r1/update-runner', asUser());

    const hb = await postJson('/runners/heartbeat', { Authorization: 'Bearer tok-r1' }, {
      aiProviders: ['claude-code'],
      lastCliScanAt: '2026-05-18T10:00:00.000Z',
      cliVersions: {},
      packageVersion: '1.0.12',
    });
    expect(hb.status).toBe(200);
    expect(hb.body).toMatchObject({ ok: true, updateRunner: true });

    const runner = db.getDb().prepare('SELECT runner_update_requested_at FROM runners WHERE id = ?').get('r1') as { runner_update_requested_at: string | null };
    expect(runner.runner_update_requested_at).toBeNull();
  });

  it('heartbeat returns updateRunner=false when no flag is set', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1', status: 'online' });

    const hb = await postJson('/runners/heartbeat', { Authorization: 'Bearer tok-r1' }, {
      aiProviders: ['claude-code'],
      lastCliScanAt: '2026-05-18T10:00:00.000Z',
      cliVersions: {},
    });
    expect(hb.status).toBe(200);
    expect(hb.body).toMatchObject({ ok: true, updateRunner: false });
  });

  it('heartbeat stores packageVersion on the runner row', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1', status: 'online' });

    await postJson('/runners/heartbeat', { Authorization: 'Bearer tok-r1' }, {
      aiProviders: ['claude-code'],
      lastCliScanAt: '2026-05-18T10:00:00.000Z',
      cliVersions: {},
      packageVersion: '1.2.3',
    });

    const runner = db.getDb().prepare('SELECT package_version FROM runners WHERE id = ?').get('r1') as { package_version: string | null };
    expect(runner.package_version).toBe('1.2.3');
  });

  it('GET /runners lists runner with package_version and runner_update_requested_at', async () => {
    insertRunner({ id: 'r1', token: 'tok-r1', status: 'online' });

    await postJson('/runners/heartbeat', { Authorization: 'Bearer tok-r1' }, {
      aiProviders: [], packageVersion: '2.0.0',
    });

    const { status, body } = await getJson('/runners', asUser());
    expect(status).toBe(200);
    const runners = body as Array<{ id: string; package_version: string | null }>;
    const r1 = runners.find((r) => r.id === 'r1');
    expect(r1?.package_version).toBe('2.0.0');
  });
});
