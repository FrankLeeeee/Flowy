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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Format a Date as wall-clock `YYYY-MM-DD` and `HH:MM` strings in the given
 * IANA timezone (e.g. `"Asia/Singapore"`). When `timeZone` is omitted, the
 * system's local zone is used. Used to compare against scheduled tasks
 * stored as naive wall-clock strings.
 */
export function formatWallClock(date: Date, timeZone?: string): { date: string; time: string } {
  if (!timeZone) {
    return {
      date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
      time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
    };
  }
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  // Intl can render midnight as hour="24" in some runtimes; normalize to "00".
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}`,
  };
}

/**
 * Resolve a naive wall-clock date (`YYYY-MM-DD`) and time (`HH:MM`) in the
 * given IANA timezone to the corresponding UTC epoch milliseconds. When
 * `timeZone` is omitted the system's local zone is used. Returns `NaN` if
 * the inputs cannot be parsed.
 */
export function wallClockToUtcMs(date: string, time: string, timeZone?: string): number {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  if (![y, mo, d, h, mi].every(Number.isFinite)) return NaN;

  if (!timeZone) {
    const local = new Date(y, mo - 1, d, h, mi).getTime();
    return Number.isFinite(local) ? local : NaN;
  }

  // Pretend the wall-clock is UTC, then ask the target zone how that
  // instant reads. The drift between the two is the zone's offset for
  // this specific instant (so DST is handled correctly).
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const part of fmt.formatToParts(new Date(utcGuess))) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  const hour = parts.hour === '24' ? 0 : Number(parts.hour);
  const wallInZone = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    hour, Number(parts.minute), Number(parts.second),
  );
  const offset = wallInZone - utcGuess;
  return utcGuess - offset;
}
