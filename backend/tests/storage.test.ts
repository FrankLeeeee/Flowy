import { describe, expect, it } from 'vitest';
import { isMasked, maskKey } from '../src/storage';

describe('storage helpers', () => {
  it('treats undefined and star-masked values as masked', () => {
    expect(isMasked(undefined)).toBe(true);
    expect(isMasked('sk-1234****5678')).toBe(true);
  });

  it('does not treat plain keys as masked', () => {
    expect(isMasked('sk-live-12345678')).toBe(false);
  });

  it('masks short keys defensively', () => {
    expect(maskKey('short')).toBe('****');
  });

  it('keeps the start and end of longer keys visible', () => {
    expect(maskKey('abcdefghijklmnop')).toBe('abcd****mnop');
  });
});
