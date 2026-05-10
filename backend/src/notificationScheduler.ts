import { getDb } from './db';
import { sendPushToAll } from './pushService';
import { Task } from './types';

const CHECK_INTERVAL_MS = 60_000; // check every minute

let timer: ReturnType<typeof setInterval> | null = null;

function ensureNotificationTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS sent_notifications (
      task_id    TEXT NOT NULL,
      kind       TEXT NOT NULL,
      sent_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      PRIMARY KEY (task_id, kind)
    );
  `);
}

function alreadySent(taskId: string, kind: string): boolean {
  const row = getDb()
    .prepare('SELECT 1 FROM sent_notifications WHERE task_id = ? AND kind = ?')
    .get(taskId, kind);
  return !!row;
}

function markSent(taskId: string, kind: string): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO sent_notifications (task_id, kind) VALUES (?, ?)')
    .run(taskId, kind);
}

export function cleanupSentNotification(taskId: string): void {
  getDb()
    .prepare('DELETE FROM sent_notifications WHERE task_id = ?')
    .run(taskId);
}

function getDueTasks(): Task[] {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return getDb()
    .prepare(`
      SELECT * FROM tasks
      WHERE status IN ('backlog', 'todo')
        AND scheduled_time IS NOT NULL
        AND (
          scheduled_date < ?
          OR (scheduled_date = ? AND scheduled_time <= ?)
        )
    `)
    .all(todayStr, todayStr, timeStr) as Task[];
}

function formatDateTime(d: Date): string {
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${date} ${time}`;
}

function getUpcomingTasks(): Task[] {
  const now = new Date();
  const nowDt = formatDateTime(now);
  const futureDt = formatDateTime(new Date(now.getTime() + 15 * 60_000));

  return getDb()
    .prepare(`
      SELECT * FROM tasks
      WHERE status IN ('backlog', 'todo')
        AND scheduled_time IS NOT NULL
        AND (scheduled_date || ' ' || scheduled_time) > ?
        AND (scheduled_date || ' ' || scheduled_time) <= ?
    `)
    .all(nowDt, futureDt) as Task[];
}

function checkAndNotify(): void {
  // 1. Tasks that are now due (at or past their scheduled time)
  const dueTasks = getDueTasks();
  for (const task of dueTasks) {
    if (alreadySent(task.id, 'due')) continue;
    markSent(task.id, 'due');
    void sendPushToAll({
      title: 'Task due',
      body: task.title,
      tag: `task-due-${task.id}`,
      requireInteraction: true,
      data: { url: task.list_id ? `/list/${task.list_id}` : '/inbox' },
    });
  }

  // 2. Tasks coming up in the next 15 minutes
  const upcomingTasks = getUpcomingTasks();
  for (const task of upcomingTasks) {
    if (alreadySent(task.id, 'upcoming')) continue;
    markSent(task.id, 'upcoming');
    void sendPushToAll({
      title: 'Task coming up',
      body: `${task.title} — scheduled at ${task.scheduled_time}`,
      tag: `task-upcoming-${task.id}`,
      data: { url: task.list_id ? `/list/${task.list_id}` : '/inbox' },
    });
  }
}

export function startNotificationScheduler(): void {
  ensureNotificationTable();
  checkAndNotify();
  timer = setInterval(checkAndNotify, CHECK_INTERVAL_MS);
}

export function stopNotificationScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
