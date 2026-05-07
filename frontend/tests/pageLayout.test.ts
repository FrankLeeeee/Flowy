import { describe, expect, it } from 'vitest';
import { getDesktopPageContainerClassName } from '../src/lib/pageLayout';

describe('getDesktopPageContainerClassName', () => {
  describe('default (scrollable content) mode', () => {
    const cls = getDesktopPageContainerClassName();

    it('lays the page out as a flex column with padding', () => {
      expect(cls).toContain('flex');
      expect(cls).toContain('flex-col');
      expect(cls).toContain('p-6');
    });

    it('does not size by viewport units, which would overshoot the scroll parent', () => {
      // The page lives inside <main className="overflow-y-auto"> whose height
      // can be smaller than 100vh once the offline banner shows. Sizing the
      // page with `min-h-screen` (or `h-screen`) makes the page extend past
      // main's scrollable area in an inconsistent way and breaks scrolling
      // when the user switches into the list/todo views.
      expect(cls).not.toMatch(/(?:^|\s)min-h-screen(?:\s|$)/);
      expect(cls).not.toMatch(/(?:^|\s)h-screen(?:\s|$)/);
    });

    it('grows to at least the scroll parent height so short pages fill the viewport', () => {
      expect(cls).toContain('min-h-full');
    });

    it('does not lock its own overflow, so the parent main can scroll long content', () => {
      expect(cls).not.toContain('overflow-hidden');
    });

    it('reserves bottom breathing room below the last task row', () => {
      expect(cls).toContain('pb-10');
    });
  });

  describe('viewport-locked mode (kanban)', () => {
    const cls = getDesktopPageContainerClassName({ lockToViewport: true });

    it('lays the page out as a flex column with padding', () => {
      expect(cls).toContain('flex');
      expect(cls).toContain('flex-col');
      expect(cls).toContain('p-6');
    });

    it('locks to the scroll parent height so kanban columns can scroll internally', () => {
      expect(cls).toContain('h-full');
      expect(cls).toContain('min-h-0');
      expect(cls).toContain('overflow-hidden');
    });

    it('does not use viewport units that would overshoot main', () => {
      expect(cls).not.toMatch(/(?:^|\s)min-h-screen(?:\s|$)/);
      expect(cls).not.toMatch(/(?:^|\s)h-screen(?:\s|$)/);
    });

    it('does not pad the bottom — kanban scrolls internally', () => {
      expect(cls).not.toContain('pb-10');
    });
  });

  it('returns the default (scrollable) classes when lockToViewport is explicitly false', () => {
    expect(getDesktopPageContainerClassName({ lockToViewport: false })).toBe(
      getDesktopPageContainerClassName(),
    );
  });
});
