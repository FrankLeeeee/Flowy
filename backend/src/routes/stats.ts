import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

// GET /api/stats
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();

  // Summary totals
  const totals = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN status = 'backlog' THEN 1 ELSE 0 END) as backlog
    FROM tasks
  `).get() as {
    total: number; done: number; failed: number;
    in_progress: number; cancelled: number; todo: number; backlog: number;
  };

  // Runner summary
  const runnerCounts = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
      SUM(CASE WHEN status = 'busy' THEN 1 ELSE 0 END) as busy,
      SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline
    FROM runners
  `).get() as { total: number; online: number; busy: number; offline: number };

  // Task status distribution
  const tasksByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks GROUP BY status ORDER BY count DESC
  `).all() as Array<{ status: string; count: number }>;

  // Tasks per project (total and done)
  const tasksByProject = db.prepare(`
    SELECT
      p.name as project_name,
      COUNT(t.id) as total,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    GROUP BY t.project_id, p.name
    ORDER BY total DESC
    LIMIT 10
  `).all() as Array<{ project_name: string; total: number; done: number }>;

  // AI provider preference and elapsed task time by provider
  const tasksByProvider = db.prepare(`
    SELECT
      ai_provider,
      COUNT(*) as count,
      SUM(
        CASE
          WHEN started_at IS NOT NULL AND completed_at IS NOT NULL
            THEN (julianday(completed_at) - julianday(started_at)) * 24 * 60
          ELSE 0
        END
      ) as total_minutes
    FROM tasks
    WHERE ai_provider IS NOT NULL
    GROUP BY ai_provider
    ORDER BY count DESC
  `).all() as Array<{ ai_provider: string; count: number; total_minutes: number | null }>;

  // Priority distribution
  const tasksByPriority = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM tasks
    GROUP BY priority
    ORDER BY count DESC
  `).all() as Array<{ priority: string; count: number }>;

  // Runner usage and elapsed task time by runner
  const tasksByRunner = db.prepare(`
    SELECT
      r.name as runner_name,
      COUNT(t.id) as count,
      r.status as runner_status,
      SUM(
        CASE
          WHEN t.started_at IS NOT NULL AND t.completed_at IS NOT NULL
            THEN (julianday(t.completed_at) - julianday(t.started_at)) * 24 * 60
          ELSE 0
        END
      ) as total_minutes
    FROM tasks t
    JOIN runners r ON r.id = t.runner_id
    WHERE t.runner_id IS NOT NULL
    GROUP BY t.runner_id, r.name, r.status
    ORDER BY count DESC
    LIMIT 10
  `).all() as Array<{ runner_name: string; count: number; runner_status: string; total_minutes: number | null }>;

  // Average completion time in minutes (done tasks only)
  const avgCompletionRow = db.prepare(`
    SELECT AVG((julianday(completed_at) - julianday(started_at)) * 24 * 60) as avg_minutes
    FROM tasks
    WHERE status = 'done' AND started_at IS NOT NULL AND completed_at IS NOT NULL
  `).get() as { avg_minutes: number | null };

  // Daily completed tasks (last 30 days)
  const dailyCompleted = db.prepare(`
    SELECT DATE(completed_at) as date, COUNT(*) as count
    FROM tasks
    WHERE status = 'done'
      AND completed_at IS NOT NULL
      AND completed_at >= datetime('now', '-30 days')
    GROUP BY DATE(completed_at)
    ORDER BY date ASC
  `).all() as Array<{ date: string; count: number }>;

  // Top labels used on tasks
  const allTaskLabels = db.prepare(`
    SELECT labels FROM tasks WHERE labels != '[]' AND labels != ''
  `).all() as Array<{ labels: string }>;

  const labelCounts: Record<string, number> = {};
  for (const row of allTaskLabels) {
    try {
      const ids: string[] = JSON.parse(row.labels);
      for (const id of ids) {
        labelCounts[id] = (labelCounts[id] ?? 0) + 1;
      }
    } catch { /* skip malformed */ }
  }

  const labelRows = db.prepare(`SELECT id, name, color FROM labels`).all() as Array<{ id: string; name: string; color: string }>;
  const topLabels = labelRows
    .map((l) => ({ name: l.name, color: l.color, count: labelCounts[l.id] ?? 0 }))
    .filter((l) => l.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  res.json({
    totals,
    runnerCounts,
    tasksByStatus,
    tasksByProject,
    tasksByProvider,
    tasksByPriority,
    tasksByRunner,
    avgCompletionMinutes: avgCompletionRow.avg_minutes,
    dailyCompleted,
    topLabels,
  });
});

export default router;
