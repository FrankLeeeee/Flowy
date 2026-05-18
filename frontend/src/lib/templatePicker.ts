import type { Template } from '@/types';

// Templates are fetched lazily the first time the dropdown opens. Skip the
// fetch when it has already completed or is still in flight so reopening the
// dropdown within the same dialog session does not refetch.
export function shouldLoadTemplates(loaded: boolean, loading: boolean): boolean {
  return !loaded && !loading;
}

// A template with no list_id is global; a list-scoped one only shows up when
// its list matches the task's current list.
export function getAvailableTemplates(
  templates: Template[],
  currentListId: string | null,
): Template[] {
  return templates.filter((t) => !t.list_id || t.list_id === currentListId);
}

export type TemplatePickerHint = 'loading' | 'empty' | null;

export function getTemplatePickerHint(
  loading: boolean,
  loaded: boolean,
  availableCount: number,
): TemplatePickerHint {
  if (loading) return 'loading';
  if (loaded && availableCount === 0) return 'empty';
  return null;
}
