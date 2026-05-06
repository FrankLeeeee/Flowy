import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TIMEZONE_SUFFIX_RE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

function normalizeUtcTimestamp(value: string): string {
  const timestamp = value.trim();
  const withTimezone = TIMEZONE_SUFFIX_RE.test(timestamp) ? timestamp : `${timestamp}Z`;
  return withTimezone.replace(' ', 'T');
}

/**
 * Returns a human-readable relative time string for a UTC ISO timestamp.
 * Legacy SQLite timestamps are UTC but may lack a timezone suffix.
 */
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

export function parseUtcTimestamp(iso: string): number {
  return new Date(normalizeUtcTimestamp(iso)).getTime();
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
