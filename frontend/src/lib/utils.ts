import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parseUtcTimestamp } from 'flowy-shared';

export { parseUtcTimestamp } from 'flowy-shared';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
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
