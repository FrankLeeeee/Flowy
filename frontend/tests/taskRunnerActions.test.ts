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
});
