export const INBOX_PREFIX = 'INBOX';

export function normalizeListName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function formatTaskKey(listName: string | null | undefined, taskNumber: number): string {
  const prefix = listName ? normalizeListName(listName) : INBOX_PREFIX;
  return `${prefix} #${taskNumber}`;
}
