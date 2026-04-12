import { describe, expect, it } from 'vitest';
import { formatTaskKey, normalizeProjectName } from '../src/projectIdentity';

describe('project identity helpers', () => {
  it('normalizes spacing in project names', () => {
    expect(normalizeProjectName('  My   Hub  ')).toBe('My Hub');
  });

  it('formats task keys from the project name and task number', () => {
    expect(formatTaskKey('My Hub', 4)).toBe('My Hub #4');
  });
});
