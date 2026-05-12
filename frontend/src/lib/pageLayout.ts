import { cn } from './utils';

/**
 * Desktop pages live inside `<main className="overflow-y-auto">` whose height is
 * derived from the viewport minus chrome (sidebar/banner). Sizing the page with
 * viewport units (`h-screen` / `min-h-screen`) overshoots `main` and breaks
 * scrolling — using `*-full` keeps the page bounded by its actual scroll parent.
 */
export function getDesktopPageContainerClassName(options: {
  lockToViewport?: boolean;
} = {}): string {
  const { lockToViewport = false } = options;
  return cn(
    'flex flex-col p-6',
    lockToViewport ? 'h-full min-h-0 overflow-hidden' : 'min-h-full pb-10',
  );
}

/**
 * Mobile pages scroll vertically inside a container whose width is bound to the
 * viewport. `overflow-x-hidden` is explicit because `overflow-y: auto` alone
 * computes `overflow-x` to `auto`, which would let a wider child (e.g. a task
 * card with a long unbroken title) introduce horizontal scrolling.
 */
export function getMobileScrollContainerClassName(): string {
  return cn(
    'flex-1 min-h-0',
    'overflow-y-auto overflow-x-hidden overscroll-contain',
    '[-webkit-overflow-scrolling:touch]',
  );
}
