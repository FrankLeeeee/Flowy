import { describe, expect, it } from 'vitest';
import { resolveDrawerRunner } from '../src/components/runners/runnerDrawerState';
import type { Runner } from '../src/types';

function makeRunner(id: string): Runner {
  return {
    id,
    name: `runner-${id}`,
    status: 'online',
    ai_providers: '[]',
    last_heartbeat: null,
    last_cli_scan_at: null,
    cli_versions: null,
    cli_models: null,
    cli_refresh_requested_at: null,
    cli_update_requested_at: null,
    device_info: '',
    created_at: '2026-05-18T00:00:00Z',
    updated_at: '2026-05-18T00:00:00Z',
  };
}

describe('resolveDrawerRunner', () => {
  it('returns null before any runner has been opened', () => {
    expect(resolveDrawerRunner(null, null)).toBeNull();
  });

  it('uses the incoming runner when one is selected', () => {
    const a = makeRunner('a');
    expect(resolveDrawerRunner(null, a)).toBe(a);
  });

  it('keeps the previous runner while the drawer animates closed', () => {
    // Parent drops its selection (incoming = null) the moment it closes; the
    // drawer must keep painting the last runner until the slide-out finishes.
    const a = makeRunner('a');
    expect(resolveDrawerRunner(a, null)).toBe(a);
  });

  it('switches to the new runner when a different one is opened', () => {
    const a = makeRunner('a');
    const b = makeRunner('b');
    expect(resolveDrawerRunner(a, b)).toBe(b);
  });

  it('prefers the incoming runner even when it matches the previous one', () => {
    const a1 = makeRunner('a');
    const a2 = makeRunner('a'); // same id, fresh object (e.g. refreshed list)
    expect(resolveDrawerRunner(a1, a2)).toBe(a2);
  });
});
