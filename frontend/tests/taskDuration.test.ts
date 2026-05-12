import { describe, expect, it } from 'vitest';
import {
  combineDurationMinutes,
  formatDurationMinutes,
  getDurationHourOptions,
  getDurationMinuteOptions,
  splitDurationMinutes,
} from '../src/lib/taskDuration';

describe('taskDuration helpers', () => {
  describe('splitDurationMinutes', () => {
    it('returns zeros for null/undefined/non-positive input', () => {
      expect(splitDurationMinutes(null)).toEqual({ hours: 0, minutes: 0 });
      expect(splitDurationMinutes(undefined)).toEqual({ hours: 0, minutes: 0 });
      expect(splitDurationMinutes(0)).toEqual({ hours: 0, minutes: 0 });
      expect(splitDurationMinutes(-30)).toEqual({ hours: 0, minutes: 0 });
    });

    it('splits totals into hours and minutes', () => {
      expect(splitDurationMinutes(5)).toEqual({ hours: 0, minutes: 5 });
      expect(splitDurationMinutes(45)).toEqual({ hours: 0, minutes: 45 });
      expect(splitDurationMinutes(60)).toEqual({ hours: 1, minutes: 0 });
      expect(splitDurationMinutes(75)).toEqual({ hours: 1, minutes: 15 });
      expect(splitDurationMinutes(155)).toEqual({ hours: 2, minutes: 35 });
    });
  });

  describe('combineDurationMinutes', () => {
    it('returns null when the combined total is zero', () => {
      expect(combineDurationMinutes(0, 0)).toBeNull();
    });

    it('combines hours and minutes additively', () => {
      expect(combineDurationMinutes(0, 5)).toBe(5);
      expect(combineDurationMinutes(1, 0)).toBe(60);
      expect(combineDurationMinutes(2, 35)).toBe(155);
    });

    it('clamps negative inputs to zero before adding', () => {
      expect(combineDurationMinutes(-1, 30)).toBe(30);
      expect(combineDurationMinutes(1, -10)).toBe(60);
    });
  });

  describe('formatDurationMinutes', () => {
    it('returns empty for zero/null/undefined', () => {
      expect(formatDurationMinutes(null)).toBe('');
      expect(formatDurationMinutes(undefined)).toBe('');
      expect(formatDurationMinutes(0)).toBe('');
    });

    it('uses minutes-only when under an hour', () => {
      expect(formatDurationMinutes(5)).toBe('5m');
      expect(formatDurationMinutes(45)).toBe('45m');
    });

    it('uses hours-only when on the hour', () => {
      expect(formatDurationMinutes(60)).toBe('1h');
      expect(formatDurationMinutes(180)).toBe('3h');
    });

    it('combines hours and minutes when both are present', () => {
      expect(formatDurationMinutes(65)).toBe('1h 5m');
      expect(formatDurationMinutes(155)).toBe('2h 35m');
    });
  });

  describe('getDurationHourOptions', () => {
    it('produces an inclusive range starting at 0', () => {
      expect(getDurationHourOptions(3)).toEqual([0, 1, 2, 3]);
    });
  });

  describe('getDurationMinuteOptions', () => {
    it('produces 5-minute steps covering 0–55 by default', () => {
      expect(getDurationMinuteOptions()).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    });

    it('respects a custom step', () => {
      expect(getDurationMinuteOptions(15)).toEqual([0, 15, 30, 45]);
    });
  });
});
