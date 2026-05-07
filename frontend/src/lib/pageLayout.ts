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
