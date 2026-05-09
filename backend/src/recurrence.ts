import { v4 as uuid } from 'uuid';
import { getDb, nextInboxTaskNumber } from './db';
import { Task, RecurrenceRule } from './types';
import { formatTaskKey } from './listIdentity';
import { utcNow } from './time';

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseRecurrenceRule(raw: string | null): RecurrenceRule | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RecurrenceRule;
  } catch {
    return null;
  }
}

export function computeNextDate(fromDate: string, rule: RecurrenceRule): string | null {
  const [year, month, day] = fromDate.split('-').map(Number);
  const base = new Date(year, month - 1, day);

  if (rule.frequency === 'day') {
    base.setDate(base.getDate() + rule.interval);
    return formatDate(base);
  }

  if (rule.frequency === 'week') {
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
      const currentDow = base.getDay();
      const sorted = [...rule.daysOfWeek].sort((a, b) => a - b);
      const nextInWeek = sorted.find((d) => d > currentDow);
      if (nextInWeek !== undefined) {
        base.setDate(base.getDate() + (nextInWeek - currentDow));
      } else {
        const daysToNextWeek = 7 * rule.interval - currentDow + sorted[0];
        base.setDate(base.getDate() + daysToNextWeek);
      }
    } else {
      base.setDate(base.getDate() + 7 * rule.interval);
    }
    return formatDate(base);
  }

  if (rule.frequency === 'month') {
    base.setMonth(base.getMonth() + rule.interval);
    return formatDate(base);
  }

  return null;
}

export function spawnNextRecurrence(task: Task): Task | null {
  const rule = parseRecurrenceRule(task.recurrence_rule);
  if (!rule) return null;

  const nextDate = computeNextDate(task.scheduled_date, rule);
  if (!nextDate) return null;

  if (rule.endDate && nextDate > rule.endDate) return null;

  const db = getDb();
  const now = utcNow();
  const id = uuid();

  let taskNumber: number;
  let listName: string | null = null;

  if (task.list_id) {
    const list = db.prepare('SELECT name, next_task_num FROM lists WHERE id = ?').get(task.list_id) as { name: string; next_task_num: number } | undefined;
    if (!list) return null;
    taskNumber = list.next_task_num;
    listName = list.name;
  } else {
    taskNumber = nextInboxTaskNumber();
  }

  const taskKey = formatTaskKey(listName, taskNumber);
  const scheduledTime = rule.time ?? task.scheduled_time;
  const canAutoQueue = !!(scheduledTime && task.runner_id && task.ai_provider);
  const initialStatus = canAutoQueue ? 'todo' : 'backlog';

  const spawn = db.transaction(() => {
    db.prepare(`
      INSERT INTO tasks (id, list_id, task_number, task_key, title, description, priority, labels,
        scheduled_date, scheduled_time, recurrence_rule, status, runner_id, ai_provider, harness_config,
        created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, task.list_id, taskNumber, taskKey, task.title, task.description, task.priority,
      task.labels, nextDate, scheduledTime, task.recurrence_rule, initialStatus,
      task.runner_id, task.ai_provider, task.harness_config, now, now,
    );

    if (task.list_id) {
      db.prepare('UPDATE lists SET next_task_num = next_task_num + 1, updated_at = ? WHERE id = ?').run(now, task.list_id);
    }
  });

  spawn();
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}
