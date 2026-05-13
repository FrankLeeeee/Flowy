import { describe, expect, it } from 'vitest';
import { getTaskRunnerActionState } from '../src/lib/taskRunnerActions';

describe('getTaskRunnerActionState', () => {
  it('hides runner actions while the runner is processing the task', () => {
    expect(getTaskRunnerActionState({
      status: 'in_progress',
      hasRunnerAssignment: true,
      hasAiProvider: true,
    })).toMatchObject({
      canAssignRunner: false,
      canRun: false,
      isRunnerProcessing: true,
    });
  });

  it('hides runner actions while an assigned task is queued for its runner', () => {
    expect(getTaskRunnerActionState({
      status: 'todo',
      hasRunnerAssignment: true,
      hasAiProvider: true,
    })).toMatchObject({
      canAssignRunner: false,
      canRun: false,
      isRunnerProcessing: true,
    });
  });

  it('hides runner actions while a run request is being submitted', () => {
    expect(getTaskRunnerActionState({
      status: 'backlog',
      hasRunnerAssignment: true,
      hasAiProvider: true,
      running: true,
    })).toMatchObject({
      canAssignRunner: false,
      canRun: false,
      isRunnerProcessing: true,
    });
  });

  it('allows running assigned backlog tasks', () => {
    expect(getTaskRunnerActionState({
      status: 'backlog',
      hasRunnerAssignment: true,
      hasAiProvider: true,
    })).toMatchObject({
      canAssignRunner: true,
      canRun: true,
      isRunnerProcessing: false,
    });
  });

  it('hides runner actions when an assigned backlog task is scheduled for a future time', () => {
    const now = new Date(2026, 0, 15, 9, 0);
    expect(getTaskRunnerActionState({
      status: 'backlog',
      hasRunnerAssignment: true,
      hasAiProvider: true,
      scheduledDate: '2026-01-15',
      scheduledTime: '10:30',
      now,
    })).toMatchObject({
      canAssignRunner: false,
      canRun: false,
      isRunnerProcessing: true,
    });
  });

  it('hides runner actions when an assigned backlog task is scheduled for a future date', () => {
    const now = new Date(2026, 0, 15, 23, 59);
    expect(getTaskRunnerActionState({
      status: 'backlog',
      hasRunnerAssignment: true,
      hasAiProvider: true,
      scheduledDate: '2026-01-16',
      scheduledTime: '00:01',
      now,
    })).toMatchObject({
      canAssignRunner: false,
      canRun: false,
      isRunnerProcessing: true,
    });
  });

  it('allows running assigned backlog tasks whose scheduled time has already passed', () => {
    const now = new Date(2026, 0, 15, 12, 0);
    expect(getTaskRunnerActionState({
      status: 'backlog',
      hasRunnerAssignment: true,
      hasAiProvider: true,
      scheduledDate: '2026-01-15',
      scheduledTime: '10:30',
      now,
    })).toMatchObject({
      canAssignRunner: true,
      canRun: true,
      isRunnerProcessing: false,
    });
  });

  it('allows running assigned backlog tasks with a scheduled date but no scheduled time', () => {
    const now = new Date(2026, 0, 15, 9, 0);
    expect(getTaskRunnerActionState({
      status: 'backlog',
      hasRunnerAssignment: true,
      hasAiProvider: true,
      scheduledDate: '2026-01-20',
      scheduledTime: null,
      now,
    })).toMatchObject({
      canAssignRunner: true,
      canRun: true,
      isRunnerProcessing: false,
    });
  });

  it('ignores future schedule when no runner is assigned', () => {
    const now = new Date(2026, 0, 15, 9, 0);
    expect(getTaskRunnerActionState({
      status: 'backlog',
      hasRunnerAssignment: false,
      hasAiProvider: false,
      scheduledDate: '2026-01-20',
      scheduledTime: '10:00',
      now,
    })).toMatchObject({
      canAssignRunner: true,
      canRun: false,
      isRunnerProcessing: false,
    });
  });
});
