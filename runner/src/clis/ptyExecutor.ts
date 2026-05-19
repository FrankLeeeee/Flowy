import { ChildProcess, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { trustClaudeWorkspace } from './claudeTrust';

export interface InteractiveSpawnOptions {
  prompt: string;
  model?: string;
  cwd?: string;
  worktree?: string;
  onOutput: (chunk: string) => void;
  timeoutMs?: number;
  quietAfterMs?: number;
}

export interface InteractiveSpawnHandle {
  promise: Promise<{ success: boolean; output: string }>;
  kill: () => void;
}

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_QUIET_AFTER_MS = 3_000;
const JSONL_POLL_INTERVAL_MS = 500;
const PTY_COLS = 200;
const PTY_ROWS = 50;

const ENV_KEYS_TO_STRIP = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
];

const INTERACTIVE_BLOCK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /workspace trust/i, label: 'workspace_trust_blocked' },
  { pattern: /(?:approve|permission).*(?:tool|permission)/i, label: 'tool_approval_blocked' },
  { pattern: /rate.?limit|too many requests/i, label: 'rate_limit' },
  { pattern: /(?:auth|login|sign.?in|authenticate)/i, label: 'auth_blocked' },
];

function classifyInteractiveBlock(text: string): string | null {
  for (const { pattern, label } of INTERACTIVE_BLOCK_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

function buildSanitizedEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !ENV_KEYS_TO_STRIP.includes(key)) {
      env[key] = value;
    }
  }
  env.NO_COLOR = '1';
  env.TERM = 'xterm-256color';
  return env;
}

function findSessionJsonl(sessionId: string): string | null {
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  if (!fs.existsSync(projectsDir)) return null;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(projectsDir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const jsonlPath = path.join(projectsDir, entry.name, `${sessionId}.jsonl`);
    if (fs.existsSync(jsonlPath)) return jsonlPath;
  }
  return null;
}

interface AssistantResult {
  text: string;
  stopReason: string | null;
}

function readAssistantOutput(jsonlPath: string): AssistantResult | null {
  let content: string;
  try {
    content = fs.readFileSync(jsonlPath, 'utf-8');
  } catch {
    return null;
  }

  const lines = content.split('\n').filter(Boolean);
  let lastTerminal: AssistantResult | null = null;

  for (const line of lines) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }

    if (event.type !== 'assistant') continue;

    const message = event.message as Record<string, unknown> | undefined;
    const stopReason =
      (event.stop_reason as string) ??
      (message?.stop_reason as string) ??
      null;

    if (stopReason === 'tool_use' || stopReason === 'pause_turn') continue;

    const contentArr = (message?.content ?? []) as Array<Record<string, unknown>>;
    const textParts = contentArr
      .filter((c) => c.type === 'text')
      .map((c) => c.text as string);
    const text = textParts.join('\n');

    if (text) {
      lastTerminal = { text, stopReason };
    }
  }

  return lastTerminal;
}

// ANSI escape sequence pattern for stripping terminal formatting.
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07|\x1b[()][AB012]|\r/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

function extractAssistantFromTui(raw: string): string {
  const clean = stripAnsi(raw);
  const marker = '⏺'; // ⏺
  const idx = clean.lastIndexOf(marker);
  if (idx === -1) return clean.trim();
  return clean.slice(idx + 1).trim();
}

/**
 * Build the platform-specific command that wraps `claude` inside a PTY using
 * the system `script` utility. This avoids a hard dependency on `node-pty`.
 *
 * - macOS:  `script -q /dev/null claude [args...]`
 * - Linux:  `script -qec "claude [args...]" /dev/null`
 *
 * The child is spawned with `stdio: pipe` so we can capture its output.
 */
function buildScriptCommand(
  claudeArgs: string[],
): { cmd: string; args: string[] } {
  if (process.platform === 'darwin') {
    return { cmd: 'script', args: ['-q', '/dev/null', 'claude', ...claudeArgs] };
  }
  // Linux: -q (quiet), -e (return child exit code), -c (command string)
  const escaped = claudeArgs.map((a) =>
    a.includes(' ') || a.includes("'") || a.includes('"')
      ? `'${a.replace(/'/g, "'\\''")}'`
      : a,
  );
  return {
    cmd: 'script',
    args: ['-qec', `claude ${escaped.join(' ')}`, '/dev/null'],
  };
}

export function spawnInteractiveClaude(options: InteractiveSpawnOptions): InteractiveSpawnHandle {
  const {
    prompt,
    model,
    cwd,
    worktree,
    onOutput,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    quietAfterMs = DEFAULT_QUIET_AFTER_MS,
  } = options;

  const sessionId = crypto.randomUUID();
  let child: ChildProcess | null = null;
  let killed = false;

  const kill = () => {
    killed = true;
    if (child) {
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child && !child.killed) child.kill('SIGKILL');
      }, 2000);
    }
  };

  const promise = new Promise<{ success: boolean; output: string }>((resolve) => {
    const claudeArgs: string[] = ['--session-id', sessionId];
    if (model) claudeArgs.push('--model', model);
    if (worktree) claudeArgs.push('--worktree', worktree);
    claudeArgs.push('--permission-mode', 'bypassPermissions');
    claudeArgs.push(prompt);

    const { cmd, args } = buildScriptCommand(claudeArgs);
    const env = buildSanitizedEnv();
    env.IS_SANDBOX = '1';

    // The PTY makes Claude run interactively, which surfaces the one-time
    // "Do you trust the files in this folder?" dialog (skipped only in
    // non-TTY/-p mode). The runner has no way to answer it, so pre-trust the
    // working directory to make interactive mode behave like -p. Best-effort:
    // the interactive-block detector below is the fallback if this fails.
    trustClaudeWorkspace(cwd);

    console.log(`  Spawning interactive claude (session: ${sessionId.slice(0, 8)}...)`);

    child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd,
      env,
    });

    let tuiBuffer = '';
    let lastDataTime = Date.now();
    let processExited = false;
    let exitCode: number | null = null;

    const cleanup = (timers: ReturnType<typeof setInterval>[]) => {
      for (const t of timers) clearInterval(t);
    };

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      tuiBuffer += text;
      lastDataTime = Date.now();
      onOutput(stripAnsi(text));
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      tuiBuffer += text;
      lastDataTime = Date.now();
    });

    child.on('error', (err) => {
      processExited = true;
      const errMsg = `[Error spawning interactive claude: ${err.message}]`;
      onOutput(errMsg);
      cleanup(timers);
      resolve({ success: false, output: errMsg });
    });

    child.on('close', (code) => {
      processExited = true;
      exitCode = code;
    });

    const startTime = Date.now();
    const timers: ReturnType<typeof setInterval>[] = [];

    // Poll for the session JSONL file and check completion conditions.
    const pollTimer = setInterval(() => {
      if (killed) {
        cleanup(timers);
        resolve({ success: false, output: tuiBuffer });
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        console.log('  Interactive session timed out');
        cleanup(timers);
        kill();
        const fallback = extractAssistantFromTui(tuiBuffer);
        resolve({ success: false, output: fallback || '[Timeout: no response received]' });
        return;
      }

      // Check for interactive blocks that need human intervention.
      const block = classifyInteractiveBlock(stripAnsi(tuiBuffer));
      if (block) {
        console.log(`  Interactive block detected: ${block}`);
        cleanup(timers);
        kill();
        resolve({ success: false, output: `[Interactive block: ${block}]` });
        return;
      }

      // Try reading the session JSONL for the canonical output.
      const jsonlPath = findSessionJsonl(sessionId);
      if (jsonlPath) {
        const result = readAssistantOutput(jsonlPath);
        if (result) {
          // We have a terminal assistant message — check if the process has
          // settled (quiet timeout) or already exited.
          const quietElapsed = Date.now() - lastDataTime;
          if (quietElapsed >= quietAfterMs || processExited) {
            console.log('  Interactive session completed via JSONL');
            cleanup(timers);
            if (!processExited) kill();
            resolve({ success: true, output: result.text });
            return;
          }
        }
      }

      // If the process exited but no JSONL output was found, give a brief
      // grace period then fall back to TUI-scraped output.
      if (processExited) {
        const postExitWait = Date.now() - lastDataTime;
        if (postExitWait >= 1000) {
          cleanup(timers);
          const jsonlPath2 = findSessionJsonl(sessionId);
          if (jsonlPath2) {
            const result2 = readAssistantOutput(jsonlPath2);
            if (result2) {
              resolve({ success: exitCode === 0, output: result2.text });
              return;
            }
          }
          const fallback = extractAssistantFromTui(tuiBuffer);
          resolve({
            success: exitCode === 0,
            output: fallback || '[No output captured]',
          });
        }
      }
    }, JSONL_POLL_INTERVAL_MS);

    timers.push(pollTimer);
  });

  return { promise, kill };
}
