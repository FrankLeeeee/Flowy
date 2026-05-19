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
  homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-version-'));
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
  const { requireUserAuth } = await import('../src/middleware/userAuth');
  const versionRouter = (await import('../src/routes/version')).default;

  db.getDb()
    .prepare(`INSERT INTO user_sessions (token, expires_at) VALUES (?, datetime('now','+1 day'))`)
    .run(SESSION_TOKEN);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/version', requireUserAuth, versionRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to bind test server');
  baseUrl = `http://127.0.0.1:${address.port}`;
}

function asUser(extra: Record<string, string> = {}) {
  return { Cookie: `flowy_session=${SESSION_TOKEN}`, ...extra };
}

describe('version endpoint', () => {
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

  it('GET /version returns current version info', async () => {
    const res = await fetch(`${baseUrl}/version`, { headers: asUser() });
    expect(res.status).toBe(200);
    const body = await res.json() as { current: string; latest: string | null; updateAvailable: boolean };
    expect(body.current).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typeof body.updateAvailable).toBe('boolean');
  });

  it('requires authentication', async () => {
    const res = await fetch(`${baseUrl}/version`);
    expect(res.status).toBe(401);
  });
});
