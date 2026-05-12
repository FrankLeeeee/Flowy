import type { TaskStatus } from '../types';

export interface TaskRunnerActionStateInput {
  status: TaskStatus;
  hasRunnerAssignment: boolean;
  hasAiProvider: boolean;
  running?: boolean;
}

export function getTaskRunnerActionState({
  status,
  hasRunnerAssignment,
  hasAiProvider,
  running = false,
}: TaskRunnerActionStateInput) {
  const isQueuedForRunner = status === 'todo' && hasRunnerAssignment && hasAiProvider;
  const isRunnerProcessing = running || status === 'in_progress' || isQueuedForRunner;

  return {
    isRunnerProcessing,
    canRun: hasRunnerAssignment && hasAiProvider && !isRunnerProcessing,
    canAssignRunner: !isRunnerProcessing,
  };
}
