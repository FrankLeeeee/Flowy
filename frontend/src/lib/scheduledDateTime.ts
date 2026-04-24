const DEFAULT_TIME = '00:00';

function isUTCString(value: string): boolean {
  return value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value);
}

export function splitScheduledDateTime(value: string | null | undefined): { date: string; time: string } {
  if (!value) return { date: '', time: '' };

  if (isUTCString(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return {
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      };
    }
  }

  const [date = '', timePart = ''] = value.split('T');
  const time = timePart.slice(0, 5);

  return { date, time };
}

export function combineScheduledDateTime(date: string, time: string): string {
  if (!date) return '';
  const [year, month, day] = date.split('-').map(Number);
  const [hours = 0, minutes = 0] = (time || DEFAULT_TIME).split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

export function updateScheduledDate(currentValue: string, nextDate: string): string {
  const { time } = splitScheduledDateTime(currentValue);
  return combineScheduledDateTime(nextDate, time);
}

export function updateScheduledTime(currentValue: string, nextTime: string): string {
  const { date } = splitScheduledDateTime(currentValue);
  if (!date) return '';
  return combineScheduledDateTime(date, nextTime);
}

export function normalizeTimeInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const colonMatch = trimmed.match(/^(\d{1,2})(?::(\d{0,2}))?$/);
  if (colonMatch) {
    const hours = Number(colonMatch[1]);
    const minutes = Number(colonMatch[2] || '0');
    if (hours <= 23 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  const compactMatch = trimmed.match(/^\d{3,4}$/);
  if (compactMatch) {
    const hours = Number(trimmed.slice(0, -2));
    const minutes = Number(trimmed.slice(-2));
    if (hours <= 23 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  return value;
}

export function formatScheduledDateTime(value: string | null | undefined): string {
  if (!value) return '-';

  if (isUTCString(value)) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleString();
  }

  // Legacy naive local datetime
  const { date, time } = splitScheduledDateTime(value);
  if (!date) return value;
  const [year, month, day] = date.split('-').map(Number);
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day, hours, minutes).toLocaleString();
}
