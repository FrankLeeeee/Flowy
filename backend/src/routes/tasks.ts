import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, nextInboxTaskNumber } from '../db';
import { Task, List, TaskLog } from '../types';
import { normalizeHarnessConfig } from '../harnessConfig';
import { formatTaskKey } from '../listIdentity';

const router = Router();

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
  const { listId, title, description, priority, labels, scheduledAt } = req.body as {
    listId?: string | null; title?: string; description?: string; priority?: string; labels?: string[]; scheduledAt?: string | null;
  };
  if (!title) { res.status(400).json({ error: 'title is required' }); return; }

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

  const taskKey = formatTaskKey(listName, taskNumber);
  const id = uuid();
  // Tasks with a scheduled date start as 'todo'; unscheduled tasks go to backlog.
  const initialStatus = scheduledAt ? 'todo' : 'backlog';

  const insertTask = db.transaction(() => {
    db.prepare(`
      INSERT INTO tasks (id, list_id, task_number, task_key, title, description, priority, labels, scheduled_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, resolvedListId, taskNumber, taskKey, title, description ?? '', priority ?? 'none', JSON.stringify(labels ?? []), scheduledAt ?? null, initialStatus);

    if (resolvedListId) {
      db.prepare('UPDATE lists SET next_task_num = next_task_num + 1, updated_at = datetime(\'now\') WHERE id = ?').run(resolvedListId);
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

  const { title, description, status, priority, labels, runnerId, aiProvider, harnessConfig, scheduledAt } = req.body as {
    title?: string; description?: string; status?: string; priority?: string;
    labels?: string[]; runnerId?: string | null; aiProvider?: string | null; harnessConfig?: unknown; scheduledAt?: string | null;
  };

  // When clearing a scheduled date, move back to backlog (unless already in a non-todo active status)
  let resolvedStatus = status ?? task.status;
  if (scheduledAt !== undefined) {
    if (scheduledAt && task.status === 'backlog') {
      resolvedStatus = status ?? 'todo';
    } else if (!scheduledAt && resolvedStatus === 'todo' && !task.runner_id) {
      resolvedStatus = 'backlog';
    }
  }

  db.prepare(`
    UPDATE tasks SET
      title = ?, description = ?, status = ?, priority = ?,
      labels = ?, runner_id = ?, ai_provider = ?, harness_config = ?, scheduled_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title ?? task.title,
    description ?? task.description,
    resolvedStatus,
    priority ?? task.priority,
    labels ? JSON.stringify(labels) : task.labels,
    runnerId !== undefined ? runnerId : task.runner_id,
    aiProvider !== undefined ? aiProvider : task.ai_provider,
    harnessConfig !== undefined ? normalizeHarnessConfig(harnessConfig) : task.harness_config,
    scheduledAt !== undefined ? scheduledAt : task.scheduled_at,
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

// POST /api/tasks/:id/assign
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

  db.prepare(`
    UPDATE tasks SET runner_id = ?, ai_provider = ?, harness_config = ?, status = 'todo', updated_at = datetime('now')
    WHERE id = ?
  `).run(runnerId, aiProvider, harnessConfig !== undefined ? normalizeHarnessConfig(harnessConfig) : task.harness_config, req.params.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as Task;
  res.json(updated);
});

// GET /api/tasks/:id/logs
router.get('/:id/logs', (req: Request, res: Response) => {
  const logs = getDb().prepare('SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at ASC').all(req.params.id) as TaskLog[];
  res.json(logs);
});

export default router;
