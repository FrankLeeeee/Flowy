import express from 'express';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let homeDir: string;
let server: http.Server;
let baseUrl: string;
let db: typeof import('../src/db');

async function setupApp() {
  homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-tasks-route-'));
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
  const tasksRouter = (await import('../src/routes/tasks')).default;

  const app = express();
  app.use(express.json());
  app.use('/tasks', tasksRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to bind test server');
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function postTask(body: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return {
    status: res.status,
    body: await res.json() as Record<string, unknown>,
  };
}

describe('tasks route', () => {
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

  it('returns the existing task when a create request is replayed with the same client mutation id', async () => {
    const body = {
      title: 'Do not duplicate me',
      scheduledDate: '2026-05-12',
      clientMutationId: 'mutation-1',
    };

    const first = await postTask(body);
    const second = await postTask(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.task_key).toBe(first.body.task_key);

    const rows = db.getDb().prepare('SELECT id, client_mutation_id FROM tasks').all() as Array<{ id: string; client_mutation_id: string | null }>;
    expect(rows).toEqual([{ id: first.body.id, client_mutation_id: 'mutation-1' }]);
  });

  it('does not consume an extra list task number for an idempotent replay', async () => {
    db.getDb().prepare(`
      INSERT INTO lists (id, name, description, next_task_num)
      VALUES ('list-1', 'Roadmap', '', 1)
    `).run();

    const body = {
      listId: 'list-1',
      title: 'List task',
      scheduledDate: '2026-05-12',
      clientMutationId: 'mutation-2',
    };

    const first = await postTask(body);
    const second = await postTask(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);

    const task = db.getDb().prepare('SELECT task_number, task_key FROM tasks WHERE client_mutation_id = ?').get('mutation-2') as { task_number: number; task_key: string };
    const list = db.getDb().prepare('SELECT next_task_num FROM lists WHERE id = ?').get('list-1') as { next_task_num: number };
    expect(task).toEqual({ task_number: 1, task_key: 'Roadmap #1' });
    expect(list.next_task_num).toBe(2);
  });
});
