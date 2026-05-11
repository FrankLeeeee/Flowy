import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let homeDir: string;
let db: typeof import('../src/db');
let dispatcher: typeof import('../src/taskDispatcher');

async function setupTempHome() {
  homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowy-dispatcher-'));
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
  dispatcher = await import('../src/taskDispatcher');
}

function insertRunner(id: string) {
  db.getDb().prepare(`
    INSERT INTO runners (id, name, token, ai_providers, status)
    VALUES (?, ?, ?, '[]', 'online')
  `).run(id, `runner-${id}`, `token-${id}`);
}

interface TaskOverrides {
  id: string;
  status?: string;
  runnerId?: string | null;
  aiProvider?: string | null;
  scheduledDate: string;
  scheduledTime?: string | null;
}

function insertTask(opts: TaskOverrides) {
  db.getDb().prepare(`
    INSERT INTO tasks (
      id, list_id, task_number, task_key, title, description, status, priority,
      runner_id, ai_provider, harness_config, labels, scheduled_date, scheduled_time
    ) VALUES (?, NULL, ?, ?, ?, '', ?, 'none', ?, ?, '{}', '[]', ?, ?)
  `).run(
    opts.id,
    1,
    `INBOX-${opts.id}`,
    `Task ${opts.id}`,
    opts.status ?? 'backlog',
    opts.runnerId ?? null,
    opts.aiProvider ?? null,
    opts.scheduledDate,
    opts.scheduledTime ?? null,
  );
}

function getStatus(id: string): string | undefined {
  const row = db.getDb().prepare('SELECT status FROM tasks WHERE id = ?').get(id) as { status?: string } | undefined;
  return row?.status;
}

describe('taskDispatcher', () => {
  const originalTz = process.env.FLOWY_SCHEDULE_TZ;

  beforeEach(async () => {
    await setupTempHome();
    insertRunner('r1');
  });

  afterEach(() => {
    dispatcher.stopTaskDispatcher();
    vi.resetModules();
    vi.doUnmock('os');
    fs.rmSync(homeDir, { recursive: true, force: true });
    if (originalTz === undefined) delete process.env.FLOWY_SCHEDULE_TZ;
    else process.env.FLOWY_SCHEDULE_TZ = originalTz;
  });

  it('promotes a backlog task whose scheduled time has just arrived', () => {
    const now = new Date('2026-04-16T09:30:00');
    insertTask({
      id: 't1',
      runnerId: 'r1',
      aiProvider: 'claude-code',
      scheduledDate: '2026-04-16',
      scheduledTime: '09:30',
    });

    const result = dispatcher.dispatchDueTasks(now);

    expect(result.promoted).toEqual(['t1']);
    expect(getStatus('t1')).toBe('todo');
  });

  it('promotes a backlog task that was scheduled in the past (missed run)', () => {
    const now = new Date('2026-04-16T09:30:00');
    insertTask({
      id: 't2',
      runnerId: 'r1',
      aiProvider: 'claude-code',
      scheduledDate: '2026-04-15',
      scheduledTime: '08:00',
    });

    const result = dispatcher.dispatchDueTasks(now);

    expect(result.promoted).toEqual(['t2']);
    expect(getStatus('t2')).toBe('todo');
  });

  it('does not promote a task whose scheduled time has not yet arrived', () => {
    const now = new Date('2026-04-16T09:30:00');
    insertTask({
      id: 't3',
      runnerId: 'r1',
      aiProvider: 'claude-code',
      scheduledDate: '2026-04-16',
      scheduledTime: '10:00',
    });

    const result = dispatcher.dispatchDueTasks(now);

    expect(result.promoted).toEqual([]);
    expect(getStatus('t3')).toBe('backlog');
  });

  it('does not promote tasks without a runner assigned', () => {
    const now = new Date('2026-04-16T09:30:00');
    insertTask({
      id: 't4',
      runnerId: null,
      aiProvider: 'claude-code',
      scheduledDate: '2026-04-16',
      scheduledTime: '09:00',
    });

    const result = dispatcher.dispatchDueTasks(now);

    expect(result.promoted).toEqual([]);
    expect(getStatus('t4')).toBe('backlog');
  });

  it('does not promote tasks without an ai_provider assigned', () => {
    const now = new Date('2026-04-16T09:30:00');
    insertTask({
      id: 't5',
      runnerId: 'r1',
      aiProvider: null,
      scheduledDate: '2026-04-16',
      scheduledTime: '09:00',
    });

    const result = dispatcher.dispatchDueTasks(now);

    expect(result.promoted).toEqual([]);
    expect(getStatus('t5')).toBe('backlog');
  });

  it('does not promote date-only tasks (no scheduled_time)', () => {
    const now = new Date('2026-04-16T23:59:00');
    insertTask({
      id: 't6',
      runnerId: 'r1',
      aiProvider: 'claude-code',
      scheduledDate: '2026-04-15',
      scheduledTime: null,
    });

    const result = dispatcher.dispatchDueTasks(now);

    expect(result.promoted).toEqual([]);
    expect(getStatus('t6')).toBe('backlog');
  });

  it('leaves tasks already in todo / in_progress / done untouched', () => {
    const now = new Date('2026-04-16T09:30:00');
    insertTask({
      id: 'todo1',
      status: 'todo',
      runnerId: 'r1',
      aiProvider: 'claude-code',
      scheduledDate: '2026-04-16',
      scheduledTime: '09:00',
    });
    insertTask({
      id: 'inprog1',
      status: 'in_progress',
      runnerId: 'r1',
      aiProvider: 'claude-code',
      scheduledDate: '2026-04-16',
      scheduledTime: '09:00',
    });
    insertTask({
      id: 'done1',
      status: 'done',
      runnerId: 'r1',
      aiProvider: 'claude-code',
      scheduledDate: '2026-04-16',
      scheduledTime: '09:00',
    });

    const result = dispatcher.dispatchDueTasks(now);

    expect(result.promoted).toEqual([]);
    expect(getStatus('todo1')).toBe('todo');
    expect(getStatus('inprog1')).toBe('in_progress');
    expect(getStatus('done1')).toBe('done');
  });

  it('promotes a Singapore-scheduled task when FLOWY_SCHEDULE_TZ is set even though the server runs in UTC', async () => {
    // Re-import the dispatcher with FLOWY_SCHEDULE_TZ set so it picks up the
    // env. The dispatcher reads the env each call, but tests run after the
    // first module load, so set before reloading to keep the production
    // behaviour realistic.
    process.env.FLOWY_SCHEDULE_TZ = 'Asia/Singapore';

    insertTask({
      id: 'sg1',
      runnerId: 'r1',
      aiProvider: 'claude-code',
      scheduledDate: '2026-05-11',
      scheduledTime: '11:10',
    });

    // 03:10 UTC on 2026-05-11 == 11:10 Singapore time. Before the fix this
    // would have left the task in backlog until 11:10 UTC (19:10 SGT).
    const utcInstant = new Date('2026-05-11T03:10:00Z');
    const result = dispatcher.dispatchDueTasks(utcInstant);

    expect(result.promoted).toEqual(['sg1']);
    expect(getStatus('sg1')).toBe('todo');
  });

  it('does not promote a Singapore-scheduled task before its SGT wall-clock arrives', () => {
    process.env.FLOWY_SCHEDULE_TZ = 'Asia/Singapore';

    insertTask({
      id: 'sg2',
      runnerId: 'r1',
      aiProvider: 'claude-code',
      scheduledDate: '2026-05-11',
      scheduledTime: '11:10',
    });

    // 03:09 UTC == 11:09 SGT — one minute before the scheduled time.
    const result = dispatcher.dispatchDueTasks(new Date('2026-05-11T03:09:00Z'));

    expect(result.promoted).toEqual([]);
    expect(getStatus('sg2')).toBe('backlog');
  });

  it('promotes multiple due tasks ordered by scheduled date/time', () => {
    const now = new Date('2026-04-16T12:00:00');
    insertTask({
      id: 'newer',
      runnerId: 'r1',
      aiProvider: 'claude-code',
      scheduledDate: '2026-04-16',
      scheduledTime: '11:00',
    });
    insertTask({
      id: 'older',
      runnerId: 'r1',
      aiProvider: 'claude-code',
      scheduledDate: '2026-04-15',
      scheduledTime: '08:00',
    });

    const result = dispatcher.dispatchDueTasks(now);

    expect(result.promoted).toEqual(['older', 'newer']);
    expect(getStatus('older')).toBe('todo');
    expect(getStatus('newer')).toBe('todo');
  });
});
