import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, nextInboxTaskNumber } from '../db';
import { Task, List, TaskLog } from '../types';
import { normalizeHarnessConfig } from '../harnessConfig';
import { formatTaskKey } from '../listIdentity';
import { utcNow } from '../time';

const router = Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function todayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function isValidDateInput(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseSchedule(body: { scheduledDate?: string; scheduledTime?: string | null }, fallbackDate = todayDate(), fallbackTime: string | null = null): { scheduledDate: string; scheduledTime: string | null; error?: string } {
  const scheduledDate = (body.scheduledDate ?? fallbackDate).trim();
  const scheduledTime = body.scheduledTime === undefined ? fallbackTime : (body.scheduledTime?.trim() || null);

  if (!isValidDateInput(scheduledDate)) {
    return { scheduledDate, scheduledTime, error: 'scheduledDate must be a date in YYYY-MM-DD format' };
  }
  if (scheduledTime && !TIME_RE.test(scheduledTime)) {
    return { scheduledDate, scheduledTime, error: 'scheduledTime must be a time in HH:MM format' };
  }

  return { scheduledDate, scheduledTime };
}

function shouldAutoQueue(scheduledTime: string | null, runnerId: string | null, aiProvider: string | null): boolean {
  return Boolean(scheduledTime && runnerId && aiProvider);
}

// GET /api/tasks?list=&inbox=1&status=&priority=&runner=&search=
router.get('/', (req: Request, res: Response) => {
  const { list, inbox, status, priority, runner, search } = req.query as Record<string, string | undefined>;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (inbox === '1' || inbox === 'true') {
    conditions.push('t.list_id IS NULL');
  } else if (list) {
    conditions.push('t.list_id = ?');
    params.push(list);
  }
  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (priority) { conditions.push('t.priority = ?'); params.push(priority); }
  if (runner) { conditions.push('t.runner_id = ?'); params.push(runner); }
  if (search) { conditions.push('(t.title LIKE ? OR t.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = getDb().prepare(`SELECT t.* FROM tasks t ${where} ORDER BY t.updated_at DESC`).all(...params) as Task[];
  res.json(rows);
});

// POST /api/tasks
router.post('/', (req: Request, res: Response) => {
  const { listId, title, description, priority, labels, scheduledDate, scheduledTime, runnerId, aiProvider, harnessConfig } = req.body as {
    listId?: string | null; title?: string; description?: string; priority?: string; labels?: string[];
    scheduledDate?: string; scheduledTime?: string | null;
    runnerId?: string | null; aiProvider?: string | null; harnessConfig?: unknown;
  };
  if (!title) { res.status(400).json({ error: 'title is required' }); return; }
  const schedule = parseSchedule({ scheduledDate, scheduledTime });
  if (schedule.error) { res.status(400).json({ error: schedule.error }); return; }

  const db = getDb();

  let resolvedListId: string | null = null;
  let taskNumber: number;
  let listName: string | null = null;

  if (listId) {
    const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(listId) as List | undefined;
    if (!list) { res.status(404).json({ error: 'List not found' }); return; }
    resolvedListId = list.id;
    taskNumber = list.next_task_num;
    listName = list.name;
  } else {
    taskNumber = nextInboxTaskNumber();
  }

  if (runnerId) {
    const runner = db.prepare('SELECT id FROM runners WHERE id = ?').get(runnerId);
    if (!runner) { res.status(404).json({ error: 'Runner not found' }); return; }
  }

  const taskKey = formatTaskKey(listName, taskNumber);
  const id = uuid();
  const resolvedRunnerId = runnerId ?? null;
  const resolvedAiProvider = aiProvider ?? null;
  const initialStatus = shouldAutoQueue(schedule.scheduledTime, resolvedRunnerId, resolvedAiProvider) ? 'todo' : 'backlog';
  const normalizedHarness = harnessConfig !== undefined ? normalizeHarnessConfig(harnessConfig) : '{}';

  const now = utcNow();
  const insertTask = db.transaction(() => {
    db.prepare(`
      INSERT INTO tasks (id, list_id, task_number, task_key, title, description, priority, labels, scheduled_date, scheduled_time, status, runner_id, ai_provider, harness_config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, resolvedListId, taskNumber, taskKey, title, description ?? '', priority ?? 'none',
      JSON.stringify(labels ?? []), schedule.scheduledDate, schedule.scheduledTime, initialStatus,
      resolvedRunnerId, resolvedAiProvider, normalizedHarness, now, now,
    );

    if (resolvedListId) {
      db.prepare('UPDATE lists SET next_task_num = next_task_num + 1, updated_at = ? WHERE id = ?').run(now, resolvedListId);
    }
  });

  insertTask();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
  res.status(201).json(task);
});

// GET /api/tasks/:id
router.get('/:id', (req: Request, res: Response) => {
  const task = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as Task | undefined;
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  res.json(task);
});

// PUT /api/tasks/:id
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as Task | undefined;
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const { title, description, status, priority, labels, runnerId, aiProvider, harnessConfig, scheduledDate, scheduledTime } = req.body as {
    title?: string; description?: string; status?: string; priority?: string;
    labels?: string[]; runnerId?: string | null; aiProvider?: string | null; harnessConfig?: unknown;
    scheduledDate?: string; scheduledTime?: string | null;
  };
  const schedule = parseSchedule({ scheduledDate, scheduledTime }, task.scheduled_date, task.scheduled_time);
  if (schedule.error) { res.status(400).json({ error: schedule.error }); return; }

  const resolvedRunnerId = runnerId !== undefined ? runnerId : task.runner_id;
  const resolvedAiProvider = aiProvider !== undefined ? aiProvider : task.ai_provider;
  let resolvedStatus = status ?? task.status;
  const canAutoQueue = shouldAutoQueue(schedule.scheduledTime, resolvedRunnerId, resolvedAiProvider);
  if (status === undefined && (task.status === 'backlog' || task.status === 'todo')) {
    resolvedStatus = canAutoQueue ? 'todo' : 'backlog';
  } else if (resolvedStatus === 'todo' && !canAutoQueue) {
    resolvedStatus = shouldAutoQueue(schedule.scheduledTime, resolvedRunnerId, resolvedAiProvider) ? 'todo' : 'backlog';
  }

  db.prepare(`
    UPDATE tasks SET
      title = ?, description = ?, status = ?, priority = ?,
      labels = ?, scheduled_date = ?, scheduled_time = ?,
      runner_id = ?, ai_provider = ?, harness_config = ?, updated_at = ?
    WHERE id = ?
  `).run(
    title ?? task.title,
    description ?? task.description,
    resolvedStatus,
    priority ?? task.priority,
    labels ? JSON.stringify(labels) : task.labels,
    schedule.scheduledDate,
    schedule.scheduledTime,
    resolvedRunnerId,
    resolvedAiProvider,
    harnessConfig !== undefined ? normalizeHarnessConfig(harnessConfig) : task.harness_config,
    utcNow(),
    req.params.id,
  );

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as Task;
  res.json(updated);
});

// DELETE /api/tasks/:id
router.delete('/:id', (req: Request, res: Response) => {
  const result = getDb().prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) { res.status(404).json({ error: 'Task not found' }); return; }
  res.json({ ok: true });
});

// POST /api/tasks/:id/assign — attach runner/provider/harness without starting the job.
// Tasks with a date, time, runner, and provider move to 'todo' so the runner can
// pick them up when due; date-only tasks stay in backlog until explicitly run.
router.post('/:id/assign', (req: Request, res: Response) => {
  const { runnerId, aiProvider, harnessConfig } = req.body as {
    runnerId?: string; aiProvider?: string; harnessConfig?: unknown;
  };
  if (!runnerId || !aiProvider) { res.status(400).json({ error: 'runnerId and aiProvider are required' }); return; }

  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as Task | undefined;
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const runner = db.prepare('SELECT id FROM runners WHERE id = ?').get(runnerId);
  if (!runner) { res.status(404).json({ error: 'Runner not found' }); return; }

  const nextStatus = task.status === 'backlog' && task.scheduled_time
    ? 'todo'
    : task.status === 'todo' && !task.scheduled_time
      ? 'backlog'
      : task.status;

  db.prepare(`
    UPDATE tasks SET runner_id = ?, ai_provider = ?, harness_config = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(runnerId, aiProvider, harnessConfig !== undefined ? normalizeHarnessConfig(harnessConfig) : task.harness_config, nextStatus, utcNow(), req.params.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as Task;
  res.json(updated);
});

// POST /api/tasks/:id/run — explicitly trigger task execution.
// Promotes the task to 'todo' so the assigned runner picks it up. For tasks in
// terminal states (done/failed/cancelled), this acts as a "rerun" and clears
// the prior output and timestamps. The task gets the current local date/time so
// the runner can execute it immediately through the same due-task path.
router.post('/:id/run', (req: Request, res: Response) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as Task | undefined;
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  if (!task.runner_id || !task.ai_provider) {
    res.status(400).json({ error: 'Task must have a runner and AI provider assigned before running' });
    return;
  }
  if (task.status === 'in_progress') { res.status(409).json({ error: 'Task is already running' }); return; }

  db.prepare(`
    UPDATE tasks SET status = 'todo', output = '', started_at = NULL, completed_at = NULL,
      scheduled_date = ?, scheduled_time = ?, updated_at = ?
    WHERE id = ?
  `).run(todayDate(), currentTime(), utcNow(), req.params.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as Task;
  res.json(updated);
});

// GET /api/tasks/:id/logs
router.get('/:id/logs', (req: Request, res: Response) => {
  const logs = getDb().prepare('SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at ASC').all(req.params.id) as TaskLog[];
  res.json(logs);
});

export default router;
