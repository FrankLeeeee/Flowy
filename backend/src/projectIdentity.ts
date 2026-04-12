export function normalizeProjectName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function formatTaskKey(projectName: string, taskNumber: number): string {
  return `${normalizeProjectName(projectName)} #${taskNumber}`;
}
