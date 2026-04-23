import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../db';
import { Runner, Task, TaskLog } from '../types';
import { authenticateRunner } from '../middleware/runnerAuth';
import { loadSettings } from '../storage';
import { drainSkillCommandsFor } from '../skillQueue';

const router = Router();

// ── In-memory browse-request store ────────────────────────────────────────
interface PendingBrowseRequest {
  requestId: string;
  runnerId: string;
  path: string;
  resolve: (entries: { name: string; isDirectory: boolean }[]) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// requestId → pending request
const pendingBrowse = new Map<string, PendingBrowseRequest>();

// runnerId → list of requestIds waiting for that runner
const runnerBrowseQueue = new Map<string, string[]>();

function enqueueBrowse(runnerId: string, requestId: string): void {
  const list = runnerBrowseQueue.get(runnerId) ?? [];
  list.push(requestId);
  runnerBrowseQueue.set(runnerId, list);
}

function dequeueBrowseForRunner(runnerId: string): PendingBrowseRequest[] {
  const ids = runnerBrowseQueue.get(runnerId) ?? [];
  runnerBrowseQueue.delete(runnerId);
  return ids.map((id) => pendingBrowse.get(id)).filter(Boolean) as PendingBrowseRequest[];
}

const BROWSE_TIMEOUT_MS = 10_000;

// ── Public endpoints ──────────────────────────────────────────────────────

// GET /api/runners — list all runners (token omitted)
router.get('/', (_req: Request, res: Response) => {
  const rows = getDb().prepare('SELECT * FROM runners ORDER BY created_at DESC').all() as Runner[];
  const safe = rows.map(({ token: _t, ...rest }) => rest);
  res.json(safe);
});

// POST /api/runners/register — register a new runner
router.post('/register', (req: Request, res: Response) => {
  const { name, aiProviders, deviceInfo, secret } = req.body as {
    name?: string; aiProviders?: string[]; deviceInfo?: string; secret?: string;
  };
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  // Check registration secret
  const settings = loadSettings();
  const requiredSecret = settings.runner.registrationSecret;
  if (!secret || secret !== requiredSecret) {
    res.status(403).json({ error: 'Invalid registration secret. Contact the admin to get the correct secret.' });
    return;
  }

  const id = uuid();
  const token = crypto.randomBytes(32).toString('hex');

  getDb().prepare(`
    INSERT INTO runners (id, name, token, ai_providers, device_info, last_cli_scan_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(id, name, token, JSON.stringify(aiProviders ?? []), deviceInfo ?? '');

  res.status(201).json({ id, token });
});

// DELETE /api/runners/:id — remove a runner
router.delete('/:id', (req: Request, res: Response) => {
  const result = getDb().prepare('DELETE FROM runners WHERE id = ?').run(req.params.id);
  if (result.changes === 0) { res.status(404).json({ error: 'Runner not found' }); return; }
  res.json({ ok: true });
});

// GET /api/runners/:id/browse?path=... — long-poll: ask a runner to list a directory
router.get('/:id/browse', (req: Request, res: Response) => {
  const { id } = req.params;
  const browsePath = (req.query.path as string) || '/';

  const runner = getDb().prepare('SELECT id, status FROM runners WHERE id = ?').get(id) as { id: string; status: string } | undefined;
  if (!runner) { res.status(404).json({ error: 'Runner not found' }); return; }
  if (runner.status === 'offline') { res.status(409).json({ error: 'Runner is offline' }); return; }

  const requestId = uuid();

  const timer = setTimeout(() => {
    pendingBrowse.delete(requestId);
    if (!res.headersSent) res.status(408).json({ error: 'Runner did not respond in time' });
  }, BROWSE_TIMEOUT_MS);

  const pending: PendingBrowseRequest = {
    requestId,
    runnerId: id,
    path: browsePath,
    resolve: (entries) => {
      clearTimeout(timer);
      pendingBrowse.delete(requestId);
      if (!res.headersSent) res.json({ entries });
    },
    reject: (err) => {
      clearTimeout(timer);
      pendingBrowse.delete(requestId);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    },
    timer,
  };

  pendingBrowse.set(requestId, pending);
  enqueueBrowse(id, requestId);
});

// POST /api/runners/:id/refresh-providers — ask a live runner to rescan installed CLIs
router.post('/:id/refresh-providers', (req: Request, res: Response) => {
  const db = getDb();
  const runner = db.prepare('SELECT id, status FROM runners WHERE id = ?').get(req.params.id) as { id: string; status: string } | undefined;
  if (!runner) { res.status(404).json({ error: 'Runner not found' }); return; }
  if (runner.status === 'offline') {
    res.status(409).json({ error: 'Runner is offline and cannot refresh CLI availability right now' });
    return;
  }

  db.prepare(`
    UPDATE runners
    SET cli_refresh_requested_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(runner.id);

  res.json({ ok: true });
});

// ── Authenticated runner endpoints ────────────────────────────────────────

// POST /api/runners/heartbeat
router.post('/heartbeat', authenticateRunner, (req: Request, res: Response) => {
  const db = getDb();
  const { aiProviders, lastCliScanAt } = req.body as { aiProviders?: string[]; lastCliScanAt?: string };
  const runner = req.runner!;
  const current = db.prepare(`
    SELECT status, cli_refresh_requested_at, last_cli_scan_at
    FROM runners
    WHERE id = ?
  `).get(runner.id) as { status: string; cli_refresh_requested_at: string | null; last_cli_scan_at: string | null } | undefined;
  const currentStatus = current?.status;
  const newStatus = currentStatus === 'busy' ? 'busy' : 'online';

  // Build the UPDATE dynamically — only include optional columns when provided
  const sets = [
    'status = ?',
    "last_heartbeat = datetime('now')",
    "updated_at = datetime('now')",
  ];
  const params: unknown[] = [newStatus];
  if (aiProviders) { sets.push('ai_providers = ?'); params.push(JSON.stringify(aiProviders)); }
  if (lastCliScanAt) { sets.push('last_cli_scan_at = ?'); params.push(lastCliScanAt); }
  params.push(runner.id);
  db.prepare(`UPDATE runners SET ${sets.join(', ')} WHERE id = ?`).run(...params);

  const refreshCli = Boolean(
    current?.cli_refresh_requested_at &&
    (!lastCliScanAt || new Date(current.cli_refresh_requested_at).getTime() > new Date(lastCliScanAt).getTime())
  );

  if (!refreshCli && current?.cli_refresh_requested_at) {
    db.prepare(`
      UPDATE runners
      SET cli_refresh_requested_at = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(runner.id);
  }

  res.json({ ok: true, status: newStatus, refreshCli });
});

// GET /api/runners/browse-requests — runner fetches pending browse requests assigned to it
router.get('/browse-requests', authenticateRunner, (req: Request, res: Response) => {
  const runner = req.runner!;
  const requests = dequeueBrowseForRunner(runner.id);
  const payload = requests.map(({ requestId, path }) => ({ requestId, path }));
  res.json(payload);
});

// POST /api/runners/browse-result — runner submits a directory listing result
router.post('/browse-result', authenticateRunner, (req: Request, res: Response) => {
  const { requestId, entries, error } = req.body as {
    requestId?: string;
    entries?: { name: string; isDirectory: boolean }[];
    error?: string;
  };

  if (!requestId) { res.status(400).json({ error: 'requestId is required' }); return; }

  const pending = pendingBrowse.get(requestId);
  if (!pending) { res.status(404).json({ error: 'Browse request not found or already resolved' }); return; }

  if (error) {
    pending.reject(new Error(error));
  } else {
    pending.resolve(entries ?? []);
  }

  res.json({ ok: true });
});

// GET /api/runners/skill-commands — runner fetches pending skill sync commands
router.get('/skill-commands', authenticateRunner, (req: Request, res: Response) => {
  const runner = req.runner!;
  const commands = drainSkillCommandsFor(runner.id);
  res.json(commands.map(({ commandId, action, cli, name, description, content }) => ({
    commandId, action, cli, name, description, content,
  })));
});

// POST /api/runners/skill-result — runner reports sync result (ack only, for logging)
router.post('/skill-result', authenticateRunner, (req: Request, res: Response) => {
  const { commandId, error } = req.body as { commandId?: string; error?: string };
  if (!commandId) { res.status(400).json({ error: 'commandId is required' }); return; }
  if (error) {
    console.warn(`Runner ${req.runner!.id} failed skill command ${commandId}: ${error}`);
  }
  res.json({ ok: true });
});

// GET /api/runners/poll — get next assigned task
router.get('/poll', authenticateRunner, (req: Request, res: Response) => {
  const runner = req.runner!;
  const task = getDb().prepare(`
    SELECT * FROM tasks
    WHERE runner_id = ? AND status = 'todo'
    ORDER BY
      CASE priority
        WHEN 'urgent' THEN 0
        WHEN 'high'   THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low'    THEN 3
        ELSE 4
      END,
      created_at ASC
    LIMIT 1
  `).get(runner.id) as Task | undefined;

  if (!task) { res.status(204).send(); return; }
  res.json(task);
});

// POST /api/runners/tasks/:taskId/pick — mark task as in_progress
router.post('/tasks/:taskId/pick', authenticateRunner, (req: Request, res: Response) => {
  const db = getDb();
  const runner = req.runner!;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND runner_id = ?').get(req.params.taskId, runner.id) as Task | undefined;
  if (!task) { res.status(404).json({ error: 'Task not found or not assigned to this runner' }); return; }
  if (task.status !== 'todo') { res.status(409).json({ error: `Task status is "${task.status}", expected "todo"` }); return; }

  db.transaction(() => {
    db.prepare(`
      UPDATE tasks SET status = 'in_progress', started_at = datetime('now'), output = '', updated_at = datetime('now')
      WHERE id = ?
    `).run(task.id);

    db.prepare('UPDATE runners SET status = \'busy\', updated_at = datetime(\'now\') WHERE id = ?').run(runner.id);

    db.prepare('INSERT INTO task_logs (id, task_id, runner_id, event, data) VALUES (?, ?, ?, ?, ?)').run(
      uuid(), task.id, runner.id, 'picked_up', '',
    );
  })();

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id) as Task;
  res.json(updated);
});

// POST /api/runners/tasks/:taskId/output — append output chunk
router.post('/tasks/:taskId/output', authenticateRunner, (req: Request, res: Response) => {
  const db = getDb();
  const runner = req.runner!;
  const { data } = req.body as { data?: string };
  if (data === undefined) { res.status(400).json({ error: 'data is required' }); return; }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND runner_id = ?').get(req.params.taskId, runner.id) as Task | undefined;
  if (!task) { res.status(404).json({ error: 'Task not found or not assigned to this runner' }); return; }

  db.prepare(`UPDATE tasks SET output = COALESCE(output, '') || ?, updated_at = datetime('now') WHERE id = ?`).run(data, task.id);
  db.prepare('INSERT INTO task_logs (id, task_id, runner_id, event, data) VALUES (?, ?, ?, ?, ?)').run(
    uuid(), task.id, runner.id, 'output', data,
  );

  res.json({ ok: true });
});

// POST /api/runners/tasks/:taskId/complete — mark task done/failed
router.post('/tasks/:taskId/complete', authenticateRunner, (req: Request, res: Response) => {
  const db = getDb();
  const runner = req.runner!;
  const { success, data } = req.body as { success?: boolean; data?: string };

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND runner_id = ?').get(req.params.taskId, runner.id) as Task | undefined;
  if (!task) { res.status(404).json({ error: 'Task not found or not assigned to this runner' }); return; }

  const newStatus = success ? 'done' : 'failed';
  const event = success ? 'completed' : 'failed';

  db.transaction(() => {
    if (data) {
      db.prepare(`UPDATE tasks SET output = COALESCE(output, '') || ? WHERE id = ?`).run(data, task.id);
    }
    db.prepare(`
      UPDATE tasks SET status = ?, completed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, task.id);

    db.prepare('UPDATE runners SET status = \'online\', updated_at = datetime(\'now\') WHERE id = ?').run(runner.id);

    db.prepare('INSERT INTO task_logs (id, task_id, runner_id, event, data) VALUES (?, ?, ?, ?, ?)').run(
      uuid(), task.id, runner.id, event, data ?? '',
    );
  })();

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id) as Task;
  res.json(updated);
});

export default router;
