import { describe, expect, it } from 'vitest';
import { isTaskDue } from '../src/routes/runners';

describe('scheduled task execution', () => {
  const now = new Date('2026-04-16T09:30:00').getTime();

  it('treats unscheduled tasks as immediately runnable', () => {
    expect(isTaskDue({ scheduled_at: null }, now)).toBe(true);
  });

  it('holds scheduled tasks until the scheduled local time arrives', () => {
    expect(isTaskDue({ scheduled_at: '2026-04-16T09:31' }, now)).toBe(false);
  });

  it('allows scheduled tasks once the scheduled local time has arrived', () => {
    expect(isTaskDue({ scheduled_at: '2026-04-16T09:30' }, now)).toBe(true);
    expect(isTaskDue({ scheduled_at: '2026-04-16T09:29' }, now)).toBe(true);
  });
});
