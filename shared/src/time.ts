const TIMEZONE_SUFFIX_RE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/** Ensure a timestamp string has a UTC timezone suffix and ISO 8601 `T` separator. */
function normalizeUtcTimestamp(value: string): string {
  const timestamp = value.trim();
  const withTimezone = TIMEZONE_SUFFIX_RE.test(timestamp) ? timestamp : `${timestamp}Z`;
  return withTimezone.replace(' ', 'T');
}

/** Parse a UTC ISO timestamp string to epoch milliseconds. */
export function parseUtcTimestamp(value: string): number {
  return new Date(normalizeUtcTimestamp(value)).getTime();
}

/** Return the current time as an ISO 8601 UTC string. */
export function utcNow(): string {
  return new Date().toISOString();
}
