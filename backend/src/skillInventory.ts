import { v4 as uuid } from 'uuid';
import { AiProvider } from './types';

export interface RunnerSkillEntry {
  cli: AiProvider;
  name: string;
  description: string;
  content: string;
  path: string;
}

interface PendingSkillInventoryRequest {
  requestId: string;
  runnerId: string;
  resolve: (skills: RunnerSkillEntry[]) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const SKILL_INVENTORY_TIMEOUT_MS = 10_000;
const pendingSkillInventory = new Map<string, PendingSkillInventoryRequest>();
const runnerSkillInventoryQueue = new Map<string, string[]>();

function enqueueSkillInventory(runnerId: string, requestId: string): void {
  const list = runnerSkillInventoryQueue.get(runnerId) ?? [];
  list.push(requestId);
  runnerSkillInventoryQueue.set(runnerId, list);
}

export function requestRunnerSkillInventory(runnerId: string): Promise<RunnerSkillEntry[]> {
  const requestId = uuid();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingSkillInventory.delete(requestId);
      reject(new Error('Runner did not respond in time'));
    }, SKILL_INVENTORY_TIMEOUT_MS);

    pendingSkillInventory.set(requestId, {
      requestId,
      runnerId,
      resolve: (skills) => {
        clearTimeout(timer);
        pendingSkillInventory.delete(requestId);
        resolve(skills);
      },
      reject: (err) => {
        clearTimeout(timer);
        pendingSkillInventory.delete(requestId);
        reject(err);
      },
      timer,
    });

    enqueueSkillInventory(runnerId, requestId);
  });
}

export function drainSkillInventoryRequestsFor(runnerId: string): { requestId: string }[] {
  const ids = runnerSkillInventoryQueue.get(runnerId) ?? [];
  runnerSkillInventoryQueue.delete(runnerId);
  return ids
    .filter((requestId) => pendingSkillInventory.has(requestId))
    .map((requestId) => ({ requestId }));
}

export function resolveSkillInventoryRequest(
  requestId: string,
  skills: RunnerSkillEntry[],
  error?: string,
): boolean {
  const pending = pendingSkillInventory.get(requestId);
  if (!pending) return false;

  if (error) pending.reject(new Error(error));
  else pending.resolve(skills);
  return true;
}
