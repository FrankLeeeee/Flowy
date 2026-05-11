import { describe, expect, it } from 'vitest';
import { normalizeWorkspaces } from '../src/routes/lists';

describe('normalizeWorkspaces', () => {
  it('returns "[]" when input is not an array', () => {
    expect(normalizeWorkspaces(undefined)).toBe('[]');
    expect(normalizeWorkspaces(null)).toBe('[]');
    expect(normalizeWorkspaces('not-an-array')).toBe('[]');
    expect(normalizeWorkspaces({ path: '/a' })).toBe('[]');
  });

  it('serializes name/path objects in order', () => {
    const json = normalizeWorkspaces([
      { name: 'Web', path: '/repo/web' },
      { name: 'API', path: '/repo/api' },
    ]);
    expect(JSON.parse(json)).toEqual([
      { name: 'Web', path: '/repo/web' },
      { name: 'API', path: '/repo/api' },
    ]);
  });

  it('promotes legacy string entries to { name: path, path } objects', () => {
    const json = normalizeWorkspaces(['/repo/web', '/repo/api']);
    expect(JSON.parse(json)).toEqual([
      { name: '/repo/web', path: '/repo/web' },
      { name: '/repo/api', path: '/repo/api' },
    ]);
  });

  it('falls back to the path when the name is missing or blank', () => {
    const json = normalizeWorkspaces([
      { path: '/no-name' },
      { name: '   ', path: '/blank-name' },
    ]);
    expect(JSON.parse(json)).toEqual([
      { name: '/no-name', path: '/no-name' },
      { name: '/blank-name', path: '/blank-name' },
    ]);
  });

  it('drops entries without a usable path', () => {
    const json = normalizeWorkspaces([
      '',
      '   ',
      { name: 'No path' },
      { name: 'Whitespace path', path: '   ' },
      { name: 'Good', path: '/ok' },
      null,
      42,
    ]);
    expect(JSON.parse(json)).toEqual([{ name: 'Good', path: '/ok' }]);
  });

  it('trims surrounding whitespace from name and path', () => {
    const json = normalizeWorkspaces([{ name: '  Web  ', path: '  /a/b  ' }]);
    expect(JSON.parse(json)).toEqual([{ name: 'Web', path: '/a/b' }]);
  });

  it('de-duplicates by path, keeping the first occurrence', () => {
    const json = normalizeWorkspaces([
      { name: 'First', path: '/dup' },
      { name: 'Second', path: '/dup' },
      { name: 'Unique', path: '/unique' },
    ]);
    expect(JSON.parse(json)).toEqual([
      { name: 'First', path: '/dup' },
      { name: 'Unique', path: '/unique' },
    ]);
  });
});
