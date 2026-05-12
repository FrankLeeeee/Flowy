export const DURATION_MINUTE_STEP = 5;
export const DURATION_MAX_HOURS = 12;

export function splitDurationMinutes(total: number | null | undefined): { hours: number; minutes: number } {
  if (total == null || !Number.isFinite(total) || total <= 0) return { hours: 0, minutes: 0 };
  const safe = Math.max(0, Math.round(total));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

export function combineDurationMinutes(hours: number, minutes: number): number | null {
  const total = Math.max(0, Math.round(hours)) * 60 + Math.max(0, Math.round(minutes));
  return total > 0 ? total : null;
}

export function formatDurationMinutes(total: number | null | undefined): string {
  if (total == null || !Number.isFinite(total) || total <= 0) return '';
  const { hours, minutes } = splitDurationMinutes(total);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function getDurationHourOptions(maxHours = DURATION_MAX_HOURS): number[] {
  return Array.from({ length: maxHours + 1 }, (_, i) => i);
}

export function getDurationMinuteOptions(step = DURATION_MINUTE_STEP): number[] {
  const count = Math.floor(60 / step);
  return Array.from({ length: count }, (_, i) => i * step);
}
