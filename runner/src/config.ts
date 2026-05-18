import os from 'os';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { RunnerConfig } from './types';
import { ensureConfigDir, getRunnerTokenPath } from './configDir';

export const childProcess = { spawnSync };
const SUPPORTED_PROVIDERS = [
  { id: 'claude-code', command: 'claude' },
  { id: 'codex', command: 'codex' },
  { id: 'cursor-agent', command: 'agent' },
  { id: 'gemini-cli', command: 'gemini' },
] as const;

const CLI_UPDATE_COMMANDS: Record<string, { cmd: string; args: string[] }> = {
  'claude-code':  { cmd: 'claude', args: ['update'] },
  'codex':        { cmd: 'npm',   args: ['i', '-g', '@openai/codex@latest'] },
  'cursor-agent': { cmd: 'agent', args: ['update'] },
  'gemini-cli':   { cmd: 'npm',   args: ['install', '-g', '@google/gemini-cli'] },
};

const PROVIDER_COMMAND: Record<string, string> = Object.fromEntries(
  SUPPORTED_PROVIDERS.map((p) => [p.id, p.command]),
);

/**
 * How to ask each CLI for the models it can run, without an interactive TUI.
 * Each entry in `argSets` is tried in order until one yields a parseable,
 * non-empty list. CLIs that only expose models through an interactive prompt
 * (e.g. Claude Code's `/model`) are intentionally omitted here — the UI falls
 * back to a free-text model input for those.
 */
const CLI_MODEL_QUERIES: Record<string, { argSets: string[][]; parse: (output: string) => string[] }> = {
  'cursor-agent': { argSets: [['--list-models'], ['models']],                   parse: parseModelLines },
  'codex':        { argSets: [['debug', 'models'], ['debug', 'models', '--bundled']], parse: parseCodexModels },
};

export function parseArgs(argv: string[]): RunnerConfig {
  const args = argv.slice(2);
  let name = '';
  let url = '';
  let pollInterval = 5;
  let token: string | undefined;
  let secret: string | undefined;
  let device = os.hostname();

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name':    name = args[++i] ?? ''; break;
      case '--url':     url = args[++i] ?? ''; break;
      case '--poll-interval': pollInterval = parseInt(args[++i] ?? '5', 10); break;
      case '--token':   token = args[++i]; break;
      case '--secret':  secret = args[++i]; break;
      case '--device':  device = args[++i] ?? os.hostname(); break;
    }
  }

  if (!name || !url) {
    console.error('Usage: flowy-runner --name <name> --url <hub-url> [options]');
    console.error('');
    console.error('Required:');
    console.error('  --name          Runner name');
    console.error('  --url           Hub URL (e.g. http://localhost:3001)');
    console.error('');
    console.error('Options:');
    console.error('  --poll-interval Poll interval in seconds (default: 5)');
    console.error('  --token         Existing runner token (skip registration)');
    console.error('  --secret        Registration secret (required for first-time registration)');
    console.error('  --device        Device info (default: hostname)');
    process.exit(1);
  }

  // If no token provided, try to load from saved config
  if (!token) {
    token = loadToken(name);
  }

  if (!token && !secret) {
    console.error('A registration secret is required the first time a runner connects.');
    console.error('Copy it from the Flowy Runners > Security page and pass it with --secret.');
    process.exit(1);
  }

  const { providers, versions } = detectAvailableProvidersWithVersions();
  if (providers.length === 0) {
    console.error('No supported AI CLIs were detected on this machine.');
    console.error('Install one of: claude, codex, agent, gemini');
    process.exit(1);
  }

  return {
    name,
    url: url.replace(/\/$/, ''),
    providers,
    cliVersions: versions,
    cliModels: detectAvailableModels(providers),
    lastCliScanAt: new Date().toISOString(),
    pollInterval,
    token,
    secret,
    device,
  };
}

export function updateInstalledClis(providers: string[]): void {
  for (const provider of providers) {
    const entry = CLI_UPDATE_COMMANDS[provider];
    if (!entry) continue;
    const label = `${entry.cmd} ${entry.args.join(' ')}`;
    console.log(`  Running: ${label}`);
    const result = childProcess.spawnSync(entry.cmd, entry.args, {
      encoding: 'utf-8',
      timeout: 120_000,
      env: { ...process.env, CI: '1' },
    });
    if (result.status !== 0) {
      const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
      console.warn(`  Failed to update ${provider}: ${output || `exit ${result.status}`}`);
    } else {
      console.log(`  Updated ${provider}`);
    }
  }
}

export function detectAvailableProvidersWithVersions(): { providers: string[]; versions: Record<string, string> } {
  const providers: string[] = [];
  const versions: Record<string, string> = {};
  for (const p of SUPPORTED_PROVIDERS) {
    if (!isCommandAvailable(p.command)) continue;
    providers.push(p.id);
    const v = detectCliVersion(p.command);
    if (v) versions[p.id] = v;
  }
  return { providers, versions };
}

export function detectAvailableProviders(): string[] {
  return detectAvailableProvidersWithVersions().providers;
}

function detectCliVersion(command: string): string {
  const result = childProcess.spawnSync(command, ['--version'], {
    encoding: 'utf-8',
    timeout: 5_000,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join('');
  const match = output.match(/\d+\.\d+\.\d+/);
  return match?.[0] ?? '';
}

/**
 * Query every detected provider that exposes a non-interactive "list models"
 * command and return the discovered model ids keyed by provider. Best-effort:
 * any failure to spawn or parse leaves that provider out rather than throwing,
 * so model detection never blocks heartbeats or startup.
 */
export function detectAvailableModels(providers: string[]): Record<string, string[]> {
  const models: Record<string, string[]> = {};
  for (const provider of providers) {
    const query = CLI_MODEL_QUERIES[provider];
    const command = PROVIDER_COMMAND[provider];
    if (!query || !command) continue;

    for (const args of query.argSets) {
      const result = childProcess.spawnSync(command, args, {
        encoding: 'utf-8',
        timeout: 10_000,
      });
      if (result.status !== 0) continue;

      const stdout = typeof result.stdout === 'string' ? result.stdout : '';
      const stderr = typeof result.stderr === 'string' ? result.stderr : '';
      const output = stdout.trim() ? stdout : stderr;

      let parsed: string[] = [];
      try {
        parsed = query.parse(output);
      } catch {
        parsed = [];
      }
      if (parsed.length > 0) {
        models[provider] = parsed;
        break;
      }
    }
  }
  return models;
}

const ANSI_PATTERN = /\[[0-9;]*m/g;

/** Parse a plain-text model listing (one model per line, tolerant of bullets/headers). */
export function parseModelLines(output: string): string[] {
  const models: string[] = [];
  for (const rawLine of output.replace(ANSI_PATTERN, '').split('\n')) {
    const line = rawLine.trim().replace(/^[-*•>]+\s*/, '');
    if (!line || line.endsWith(':')) continue; // skip blank lines and headers
    const token = line.split(/\s+/)[0];
    if (/^[A-Za-z0-9][\w.\-/:]*$/.test(token)) models.push(token);
  }
  return [...new Set(models)];
}

/** Parse Codex's `debug models` JSON catalog, tolerant of leading log noise and shape. */
export function parseCodexModels(output: string): string[] {
  const start = output.search(/[[{]/);
  if (start === -1) return [];

  const data = JSON.parse(output.slice(start)) as unknown;
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as { models?: unknown })?.models)
      ? (data as { models: unknown[] }).models
      : [];

  const models = items.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const id = record.id ?? record.slug ?? record.model ?? record.name;
      return typeof id === 'string' ? id : '';
    }
    return '';
  }).filter((id): id is string => id.length > 0);

  return [...new Set(models)];
}

function isCommandAvailable(command: string): boolean {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  const result = childProcess.spawnSync(checker, [command], { stdio: 'ignore' });
  return result.status === 0;
}

function loadToken(name: string): string | undefined {
  ensureConfigDir();
  const file = getRunnerTokenPath(name);
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return data.token;
  } catch {
    return undefined;
  }
}

export function saveToken(name: string, id: string, token: string): void {
  ensureConfigDir();
  const file = getRunnerTokenPath(name);
  fs.writeFileSync(file, JSON.stringify({ id, token }, null, 2));
}

export function deleteToken(name: string): void {
  ensureConfigDir();
  const file = getRunnerTokenPath(name);
  try {
    fs.unlinkSync(file);
  } catch {
    // Ignore missing/unreadable token files.
  }
}
