import { v4 as uuid } from 'uuid';
import { AiProvider } from './types';

export type SkillAction = 'write' | 'delete' | 'install';

export interface SkillCommand {
  commandId: string;
  runnerId: string;
  action: SkillAction;
  cli: AiProvider;
  name: string;
  description?: string;
  content?: string;
  installCommand?: string;
}

// runnerId → pending commands (FIFO)
const queues = new Map<string, SkillCommand[]>();

export function enqueueSkillCommand(
  runnerId: string,
  payload: Omit<SkillCommand, 'commandId' | 'runnerId'>,
): SkillCommand {
  const command: SkillCommand = {
    commandId: uuid(),
    runnerId,
    ...payload,
  };
  const list = queues.get(runnerId) ?? [];
  list.push(command);
  queues.set(runnerId, list);
  return command;
}

export function drainSkillCommandsFor(runnerId: string): SkillCommand[] {
  const list = queues.get(runnerId) ?? [];
  queues.delete(runnerId);
  return list;
}

export function clearSkillCommandsFor(runnerId: string): void {
  queues.delete(runnerId);
}
