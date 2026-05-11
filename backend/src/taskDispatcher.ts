import { getDb } from './db';
import { Task } from './types';
import { utcNow } from './time';

const DISPATCH_INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | null = null;

function localDateTime(now: Date): { date: string; time: string } {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

// Backlog tasks that have a runner+provider+time and whose scheduled time has
// arrived (or already passed — e.g. missed while the runner was offline). These
// are stuck without the dispatcher because runners only poll for `'todo'` tasks.
export function findDispatchableTasks(now: Date = new Date()): Task[] {
  const { date, time } = localDateTime(now);
  return getDb().prepare(`
    SELECT * FROM tasks
    WHERE status = 'backlog'
      AND runner_id IS NOT NULL
      AND ai_provider IS NOT NULL
      AND scheduled_time IS NOT NULL
      AND (
        scheduled_date < ?
        OR (scheduled_date = ? AND scheduled_time <= ?)
      )
    ORDER BY scheduled_date ASC, scheduled_time ASC
  `).all(date, date, time) as Task[];
}

// Status guard prevents racing with concurrent transitions (e.g. user clicks "Run").
function promoteToTodo(taskId: string): boolean {
  const result = getDb().prepare(`
    UPDATE tasks SET status = 'todo', updated_at = ?
    WHERE id = ? AND status = 'backlog'
  `).run(utcNow(), taskId);
  return result.changes > 0;
}

export function dispatchDueTasks(now: Date = new Date()): { promoted: string[] } {
  const tasks = findDispatchableTasks(now);
  const promoted: string[] = [];
  for (const task of tasks) {
    if (promoteToTodo(task.id)) {
      promoted.push(task.id);
    }
  }
  if (promoted.length > 0) {
    console.log(`[task-dispatcher] promoted ${promoted.length} due task(s) to todo: ${promoted.join(', ')}`);
  }
  return { promoted };
}

export function startTaskDispatcher(): void {
  dispatchDueTasks();
  timer = setInterval(() => {
    try {
      dispatchDueTasks();
    } catch (err) {
      console.error('[task-dispatcher] tick failed:', err);
    }
  }, DISPATCH_INTERVAL_MS);
}

export function stopTaskDispatcher(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
