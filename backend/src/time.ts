import { formatWallClock, wallClockToUtcMs } from 'flowy-shared';

export { utcNow, parseUtcTimestamp } from 'flowy-shared';

/**
 * IANA timezone in which scheduled task date/time strings are interpreted.
 * Scheduled tasks store naive wall-clock strings (e.g. `"11:10"`), so the
 * backend has to know which zone they belong to or it will fire them at the
 * wrong moment when the server runs in a different zone than its users.
 * Set `FLOWY_SCHEDULE_TZ` (e.g. `"Asia/Singapore"`) for cross-zone setups;
 * an empty/missing value falls back to the host's local zone.
 */
export function scheduleTimezone(): string | undefined {
  const raw = process.env.FLOWY_SCHEDULE_TZ;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Current wall-clock date/time strings in the configured schedule timezone. */
export function nowAsScheduledWallClock(now: Date = new Date()): { date: string; time: string } {
  return formatWallClock(now, scheduleTimezone());
}

/** Convert a stored `(scheduled_date, scheduled_time)` pair to UTC epoch ms. */
export function scheduledWallClockToMs(date: string, time: string): number {
  return wallClockToUtcMs(date, time, scheduleTimezone());
}
