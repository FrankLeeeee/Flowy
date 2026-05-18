import type { Runner } from '../../types';

/**
 * Decides which runner the detail drawer should paint.
 *
 * The parent page clears its runner selection the instant the drawer starts
 * closing, but the drawer still needs to render the last runner while it slides
 * out (the Radix exit animation). So while `incoming` is null we hold onto the
 * previously displayed runner; once a runner is selected again we switch to it.
 *
 * Returns null only before a runner has ever been opened, which lets the drawer
 * skip mounting (and its activity polling) entirely until first use.
 */
export function resolveDrawerRunner(
  previous: Runner | null,
  incoming: Runner | null,
): Runner | null {
  return incoming ?? previous;
}
