import { formatWallClock } from 'flowy-shared';
import type { TaskStatus } from '../types';

export interface TaskRunnerActionStateInput {
  status: TaskStatus;
  hasRunnerAssignment: boolean;
  hasAiProvider: boolean;
  running?: boolean;
  /** YYYY-MM-DD wall-clock date the task is scheduled for. */
  scheduledDate?: string | null;
  /** HH:MM wall-clock time the task is scheduled for, or null if unscheduled. */
  scheduledTime?: string | null;
  /** Override "now" — accepted for testing. */
  now?: Date;
}

// Mirrors backend/src/taskDispatcher.ts: a backlog task with a runner, provider,
// and future scheduled_time is owned by the dispatcher until its time arrives.
// Letting users click "Run" in that window bypasses the schedule they just set.
function isScheduledForFuture(
  scheduledDate: string | null | undefined,
  scheduledTime: string | null | undefined,
  now: Date,
): boolean {
  if (!scheduledDate || !scheduledTime) return false;
  const { date, time } = formatWallClock(now);
  if (scheduledDate > date) return true;
  if (scheduledDate < date) return false;
  return scheduledTime > time;
}

export function getTaskRunnerActionState({
  status,
  hasRunnerAssignment,
  hasAiProvider,
  running = false,
  scheduledDate = null,
  scheduledTime = null,
  now = new Date(),
}: TaskRunnerActionStateInput) {
  const isQueuedForRunner = status === 'todo' && hasRunnerAssignment && hasAiProvider;
  const isAwaitingSchedule =
    status === 'backlog'
    && hasRunnerAssignment
    && hasAiProvider
    && isScheduledForFuture(scheduledDate, scheduledTime, now);
  const isRunnerProcessing =
    running || status === 'in_progress' || isQueuedForRunner || isAwaitingSchedule;

  return {
    isRunnerProcessing,
    canRun: hasRunnerAssignment && hasAiProvider && !isRunnerProcessing,
    canAssignRunner: !isRunnerProcessing,
  };
}
