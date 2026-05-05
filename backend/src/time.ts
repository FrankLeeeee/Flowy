export function utcNow(): string {
  return new Date().toISOString();
}

const TIMEZONE_SUFFIX_RE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

export function parseUtcTimestamp(value: string): number {
  const timestamp = value.trim();
  const withTimezone = TIMEZONE_SUFFIX_RE.test(timestamp) ? timestamp : `${timestamp}Z`;
  return new Date(withTimezone.replace(' ', 'T')).getTime();
}
