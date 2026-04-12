import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a human-readable relative time string for a UTC ISO timestamp.
 * Normalizes timestamps that lack a timezone suffix before parsing.
 */
export function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  // Append 'Z' if no timezone indicator is present (SQLite stores UTC without 'Z')
  const normalized = /[zZ]$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const timestamp = new Date(normalized).getTime();
  if (Number.isNaN(timestamp)) return 'unknown';
  const ms = Date.now() - timestamp;
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function parseUtcTimestamp(iso: string): number {
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`).getTime();
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
