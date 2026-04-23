/**
 * CLI provider registry.
 *
 * To add a new AI CLI:
 *  1. Create a new file `runner/src/clis/<yourCli>.ts` that exports an object
 *     implementing `CLIProvider`.
 *  2. Import it here and add it to the `providers` array.
 */

import { claudeCodeProvider } from './claudeCode';
import { codexProvider } from './codex';
import { cursorAgentProvider } from './cursorAgent';
import { geminiProvider } from './gemini';

export interface CLICommand {
  cmd: string;
  args: string[];
  cwd?: string;
  streamOutput: boolean;
}

/**
 * Interface for an AI CLI provider.
 *
 * Each provider is responsible for:
 * - Declaring its unique `id` (matches `ai_provider` values in the DB).
 * - Parsing its own section from the raw harness-config JSON string.
 * - Constructing the shell command that Flowy runner will spawn.
 */
export interface CLIProvider {
  /** Unique identifier — must match the `ai_provider` column values. */
  readonly id: string;

  /**
   * Build the shell command for this provider.
   *
   * @param prompt           The task prompt (description or title).
   * @param rawHarnessConfig Raw JSON string from `tasks.harness_config`; may be
   *                         null/undefined if no config was supplied.
   * @returns The command descriptor to spawn.
   */
  buildCommand(prompt: string, rawHarnessConfig: string | null | undefined): CLICommand;
}

const providers: CLIProvider[] = [
  claudeCodeProvider,
  codexProvider,
  cursorAgentProvider,
  geminiProvider,
];

const registry = new Map<string, CLIProvider>(providers.map((p) => [p.id, p]));

/**
 * Look up a registered CLI provider by its id.
 * Throws if the provider is unknown — callers can treat this as a hard error.
 */
export function getProvider(id: string): CLIProvider {
  const provider = registry.get(id);
  if (!provider) throw new Error(`Unknown AI provider: ${id}`);
  return provider;
}

/** Return the ids of every registered provider (useful for heartbeats, tests, etc.). */
export function listProviderIds(): string[] {
  return [...registry.keys()];
}
