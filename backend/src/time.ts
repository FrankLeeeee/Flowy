export function utcNow(): string {
  return new Date().toISOString();
}

/** Format a Date as YYYY-MM-DD. */
export function formatDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Format a Date as HH:MM. */
export function formatTimeHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Return today's date as YYYY-MM-DD in local time. */
export function todayDateISO(): string {
  return formatDateISO(new Date());
}

/** Return the current local time as HH:MM. */
export function currentTimeHHMM(): string {
  return formatTimeHHMM(new Date());
}

const TIMEZONE_SUFFIX_RE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

export function parseUtcTimestamp(value: string): number {
  const timestamp = value.trim();
  const withTimezone = TIMEZONE_SUFFIX_RE.test(timestamp) ? timestamp : `${timestamp}Z`;
  return new Date(withTimezone.replace(' ', 'T')).getTime();
}
