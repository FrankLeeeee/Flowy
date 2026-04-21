import { v4 as uuid } from 'uuid';

export type SessionCommandKind = 'send-prompt' | 'stop';

export interface SessionCommand {
  id: string;
  sessionId: string;
  kind: SessionCommandKind;
  payload: Record<string, unknown>;
}

export interface EnqueueSessionCommand {
  sessionId: string;
  kind: SessionCommandKind;
  payload: Record<string, unknown>;
}

// runnerId → FIFO list of commands
const queue = new Map<string, SessionCommand[]>();

export function enqueueSessionCommand(runnerId: string, cmd: EnqueueSessionCommand): void {
  const list = queue.get(runnerId) ?? [];
  list.push({ id: uuid(), ...cmd });
  queue.set(runnerId, list);
}

export function drainSessionCommands(runnerId: string): SessionCommand[] {
  const list = queue.get(runnerId) ?? [];
  queue.delete(runnerId);
  return list;
}
