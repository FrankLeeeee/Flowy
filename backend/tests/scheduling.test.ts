import { describe, expect, it } from 'vitest';
import { isTaskDue } from '../src/routes/runners';

describe('scheduled task execution', () => {
  const now = new Date('2026-04-16T09:30:00').getTime();

  it('does not auto-run date-only tasks', () => {
    expect(isTaskDue({ scheduled_date: '2026-04-16', scheduled_time: null }, now)).toBe(false);
  });

  it('holds scheduled tasks until the scheduled local time arrives', () => {
    expect(isTaskDue({ scheduled_date: '2026-04-16', scheduled_time: '09:31' }, now)).toBe(false);
  });

  it('allows scheduled tasks once the scheduled local time has arrived', () => {
    expect(isTaskDue({ scheduled_date: '2026-04-16', scheduled_time: '09:30' }, now)).toBe(true);
    expect(isTaskDue({ scheduled_date: '2026-04-16', scheduled_time: '09:29' }, now)).toBe(true);
  });
});
