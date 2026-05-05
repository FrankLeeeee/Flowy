export function getTodayDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTaskSchedule(date: string, time: string | null): string {
  const [year, month, day] = date.split('-').map(Number);
  const formattedDate = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : date;

  return time ? `${formattedDate} at ${time}` : formattedDate;
}

export function formatTaskScheduleCompact(date: string, time: string | null): string {
  const [year, month, day] = date.split('-').map(Number);
  const formattedDate = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : date;

  return time ? `${formattedDate} ${time}` : formattedDate;
}
