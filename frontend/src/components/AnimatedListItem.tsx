import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Wraps a single entry returned by `useAnimatedList`. When `leaving` flips
 * to true the row collapses its height (via animatable grid-template-rows)
 * and fades/slides out so siblings glide instead of snapping.
 *
 * Pass inter-row gaps via `gapClassName` (e.g. "pb-1.5 last:pb-0") instead of
 * `space-y-*` on the parent — those gaps need to animate to zero alongside
 * the height collapse, otherwise a row-height-sized residual stays during
 * exit. `:last-child` selectors must live on the wrapper itself, which is
 * what's a direct child of the list container.
 */
export default function AnimatedListItem({
  leaving,
  children,
  className,
  gapClassName,
}: {
  leaving: boolean;
  children: ReactNode;
  className?: string;
  gapClassName?: string;
}) {
  return (
    <div
      data-leaving={leaving || undefined}
      className={cn(
        // `grid-cols-[minmax(0,1fr)]` keeps the implicit column from inheriting
        // a child's max-content width — without it a non-wrapping title can
        // stretch the row past its container on mobile.
        'grid grid-cols-[minmax(0,1fr)] transition-[grid-template-rows,opacity,transform,padding,margin] duration-[280ms] ease-[var(--ease-out-quart)] motion-reduce:transition-none',
        leaving
          ? 'grid-rows-[0fr] opacity-0 -translate-x-1.5 scale-[0.985] pointer-events-none m-0 p-0'
          : cn('grid-rows-[1fr] opacity-100', gapClassName),
        className,
      )}
    >
      <div className={cn('min-h-0 min-w-0', leaving && 'overflow-hidden')}>{children}</div>
    </div>
  );
}
