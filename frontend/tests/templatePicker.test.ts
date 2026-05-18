import { describe, expect, it } from 'vitest';
import {
  shouldLoadTemplates,
  getAvailableTemplates,
  getTemplatePickerHint,
} from '../src/lib/templatePicker';
import type { Template } from '../src/types';

function makeTemplate(id: string, listId: string | null): Template {
  return {
    id,
    name: `template-${id}`,
    description: '',
    list_id: listId,
    content: `content-${id}`,
    created_at: '2026-05-18T00:00:00Z',
    updated_at: '2026-05-18T00:00:00Z',
  };
}

describe('shouldLoadTemplates', () => {
  it('loads when nothing has been fetched yet', () => {
    expect(shouldLoadTemplates(false, false)).toBe(true);
  });

  it('skips while a fetch is in flight', () => {
    expect(shouldLoadTemplates(false, true)).toBe(false);
  });

  it('skips once templates have already loaded', () => {
    expect(shouldLoadTemplates(true, false)).toBe(false);
  });
});

describe('getAvailableTemplates', () => {
  const global1 = makeTemplate('g1', null);
  const listA = makeTemplate('a', 'list-a');
  const listB = makeTemplate('b', 'list-b');

  it('includes global templates regardless of the current list', () => {
    expect(getAvailableTemplates([global1], null)).toEqual([global1]);
    expect(getAvailableTemplates([global1], 'list-a')).toEqual([global1]);
  });

  it('includes only list-scoped templates matching the current list', () => {
    expect(getAvailableTemplates([global1, listA, listB], 'list-a')).toEqual([global1, listA]);
  });

  it('excludes list-scoped templates when no list is selected (inbox)', () => {
    expect(getAvailableTemplates([global1, listA], null)).toEqual([global1]);
  });
});

describe('getTemplatePickerHint', () => {
  it('shows a loading hint while fetching', () => {
    expect(getTemplatePickerHint(true, false, 0)).toBe('loading');
  });

  it('shows an empty hint once loaded with no available templates', () => {
    expect(getTemplatePickerHint(false, true, 0)).toBe('empty');
  });

  it('shows no hint before the dropdown has ever been opened', () => {
    expect(getTemplatePickerHint(false, false, 0)).toBeNull();
  });

  it('shows no hint when templates are available', () => {
    expect(getTemplatePickerHint(false, true, 3)).toBeNull();
  });

  it('prefers the loading hint even if a stale count is present', () => {
    expect(getTemplatePickerHint(true, true, 0)).toBe('loading');
  });
});
