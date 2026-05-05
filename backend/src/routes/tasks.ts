import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { Task, Project, TaskLog } from '../types';
import { normalizeHarnessConfig } from '../harnessConfig';
import { formatTaskKey } from '../projectIdentity';

const router = Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
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

// GET /api/tasks?project=&status=&priority=&runner=&search=
router.get('/', (req: Request, res: Response) => {
  const { project, status, priority, runner, search } = req.query as Record<string, string | undefined>;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (project) { conditions.push('t.project_id = ?'); params.push(project); }
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
  const { projectId, title, description, priority, labels, scheduledDate, scheduledTime } = req.body as {
    projectId?: string; title?: string; description?: string; priority?: string; labels?: string[];
    scheduledDate?: string; scheduledTime?: string | null;
  };
  if (!projectId || !title) { res.status(400).json({ error: 'projectId and title are required' }); return; }
  const schedule = parseSchedule({ scheduledDate, scheduledTime });
  if (schedule.error) { res.status(400).json({ error: schedule.error }); return; }

  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined;
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const taskNumber = project.next_task_num;
  const taskKey = formatTaskKey(project.name, taskNumber);
  const id = uuid();

  const insertTask = db.transaction(() => {
    db.prepare(`
      INSERT INTO tasks (id, project_id, task_number, task_key, title, description, priority, labels, scheduled_date, scheduled_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, projectId, taskNumber, taskKey, title, description ?? '', priority ?? 'none', JSON.stringify(labels ?? []), schedule.scheduledDate, schedule.scheduledTime);

    db.prepare('UPDATE projects SET next_task_num = next_task_num + 1, updated_at = datetime(\'now\') WHERE id = ?').run(projectId);
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

  db.prepare(`
    UPDATE tasks SET
      title = ?, description = ?, status = ?, priority = ?,
      labels = ?, scheduled_date = ?, scheduled_time = ?,
      runner_id = ?, ai_provider = ?, harness_config = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title ?? task.title,
    description ?? task.description,
    status ?? task.status,
    priority ?? task.priority,
    labels ? JSON.stringify(labels) : task.labels,
    schedule.scheduledDate,
    schedule.scheduledTime,
    runnerId !== undefined ? runnerId : task.runner_id,
    aiProvider !== undefined ? aiProvider : task.ai_provider,
    harnessConfig !== undefined ? normalizeHarnessConfig(harnessConfig) : task.harness_config,
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
