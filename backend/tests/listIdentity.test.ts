import { describe, expect, it } from 'vitest';
import { formatTaskKey, normalizeListName } from '../src/listIdentity';

describe('list identity helpers', () => {
  it('normalizes spacing in list names', () => {
    expect(normalizeListName('  My   Hub  ')).toBe('My Hub');
  });

  it('formats task keys from the list name and task number', () => {
    expect(formatTaskKey('My Hub', 4)).toBe('My Hub #4');
  });

  it('formats inbox task keys when no list is provided', () => {
    expect(formatTaskKey(null, 7)).toBe('INBOX #7');
  });
});
