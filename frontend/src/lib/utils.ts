import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parseUtcTimestamp } from 'flowy-shared';
import type { Task } from '@/types';

export { parseUtcTimestamp } from 'flowy-shared';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Sort completed tasks so the most recently completed appears first.
 * Falls back to `updated_at` for legacy rows where `completed_at` is null
 * (older manually-completed tasks predating the completed_at stamp).
 */
export function sortByCompletedAtDesc<T extends Pick<Task, 'completed_at' | 'updated_at'>>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const aTime = parseUtcTimestamp(a.completed_at ?? a.updated_at);
    const bTime = parseUtcTimestamp(b.completed_at ?? b.updated_at);
    const aValid = Number.isFinite(aTime);
    const bValid = Number.isFinite(bTime);
    if (!aValid && !bValid) return 0;
    if (!aValid) return 1;
    if (!bValid) return -1;
    return bTime - aTime;
  });
}

/**
 * Apply a status change to a task in local state, mirroring the backend's
 * completed_at lifecycle: stamp completed_at when entering 'done', clear it
 * on transitions back to non-terminal statuses. Keeps optimistic UI ordering
 * consistent with the server's view.
 */
export function applyStatusChange<T extends Pick<Task, 'status' | 'completed_at'>>(
  task: T,
  newStatus: Task['status'],
): T {
  if (newStatus === 'done' && task.status !== 'done') {
    return { ...task, status: newStatus, completed_at: new Date().toISOString() };
  }
  if (task.status === 'done' && newStatus !== 'done' && newStatus !== 'failed') {
    return { ...task, status: newStatus, completed_at: null };
  }
  return { ...task, status: newStatus };
}

/** Human-readable relative time string for a UTC ISO timestamp. */
export function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const timestamp = parseUtcTimestamp(iso);
  if (Number.isNaN(timestamp)) return 'unknown';
  const ms = Date.now() - timestamp;
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export function formatLocalDateTime(iso: string | null): string {
  if (!iso) return '-';
  const timestamp = parseUtcTimestamp(iso);
  if (Number.isNaN(timestamp)) return 'Invalid date';
  return new Date(timestamp).toLocaleString();
}

export function formatElapsedTime(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt || !completedAt) return null;

  const elapsedMs = parseUtcTimestamp(completedAt) - parseUtcTimestamp(startedAt);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return null;

  const totalSeconds = Math.round(elapsedMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
