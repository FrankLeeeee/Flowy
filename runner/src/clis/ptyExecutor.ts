import { ChildProcess, spawn } from 'child_process';
import crypto from 'crypto';
import { trustClaudeWorkspace } from './claudeTrust';
import { stripAnsi } from './terminalSanitizer';
import { readClipboard, writeClipboard } from './clipboard';

export interface InteractiveSpawnOptions {
  prompt: string;
  model?: string;
  cwd?: string;
  worktree?: string;
  timeoutMs?: number;
  quietAfterMs?: number;
}

export interface InteractiveSpawnHandle {
  promise: Promise<{ success: boolean; output: string }>;
  kill: () => void;
}

const DEFAULT_TIMEOUT_MS = 90_000;

// How long the PTY must stay silent before we treat Claude's reply as done.
// Claude renders a live spinner while it works, so a gap this long only
// happens once it has settled back at the idle prompt.
const DEFAULT_QUIET_AFTER_MS = 3_000;

// Ignore the brief start-up lull (TUI mounting, model handshake) — only arm
// the quiet check once the session has been running at least this long.
const MIN_RUNTIME_MS = 6_000;

const POLL_INTERVAL_MS = 500;

// After `/copy`, how long to wait for Claude to actually populate the
// clipboard before giving up.
const CLIPBOARD_WAIT_MS = 8_000;

// Under a PTY, `--permission-mode bypassPermissions` surfaces a one-time
// "you accept all responsibility ... Bypass Permissions mode" acknowledgment
// that the runner cannot answer. Claude only shows it when none of the
// settings tiers have `skipDangerousModePermissionPrompt`; the `--settings`
// flag feeds the flag tier, so passing it inline pre-accepts the disclaimer
// for this process only, without mutating the user's global config.
const BYPASS_PERMISSIONS_SETTINGS = JSON.stringify({
  skipDangerousModePermissionPrompt: true,
});

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

/**
 * Build the platform-specific command that wraps `claude` inside a PTY using
 * the system `script` utility. This avoids a hard dependency on `node-pty`.
 *
 * - macOS:  `script -q /dev/null claude [args...]`
 * - Linux:  `script -qec "claude [args...]" /dev/null`
 *
 * The child is spawned with `stdio: pipe` so we can both observe its output
 * and type the trailing `/copy` command into it.
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

/**
 * Build the `claude` argv for an interactive PTY session. Pure (no I/O) so the
 * flag wiring — notably the bypass-permissions pre-acceptance — can be
 * unit-tested without spawning the real binary.
 */
export function buildInteractiveClaudeArgs(opts: {
  sessionId: string;
  prompt: string;
  model?: string;
  worktree?: string;
}): string[] {
  const args: string[] = ['--session-id', opts.sessionId];
  if (opts.model) args.push('--model', opts.model);
  if (opts.worktree) args.push('--worktree', opts.worktree);
  args.push('--permission-mode', 'bypassPermissions');
  args.push('--settings', BYPASS_PERMISSIONS_SETTINGS);
  args.push(opts.prompt);
  return args;
}

/**
 * Run a task through interactive (PTY) Claude.
 *
 * Unlike the standard `-p` path, the raw PTY transcript is never streamed back
 * to the server — it is noisy TUI chrome that is unhelpful as task output. We
 * only watch it internally to notice blocking prompts the runner cannot
 * answer. Once Claude settles at its idle prompt we type `/copy`, which copies
 * its last reply to the system clipboard, and return that clipboard text as
 * the task output.
 */
export function spawnInteractiveClaude(options: InteractiveSpawnOptions): InteractiveSpawnHandle {
  const {
    prompt,
    model,
    cwd,
    worktree,
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
    const claudeArgs = buildInteractiveClaudeArgs({ sessionId, prompt, model, worktree });
    const { cmd, args } = buildScriptCommand(claudeArgs);
    const env = buildSanitizedEnv();
    env.IS_SANDBOX = '1';

    // The PTY makes Claude run interactively, which surfaces the one-time
    // "Do you trust the files in this folder?" dialog (skipped only in
    // non-TTY/-p mode). The runner has no way to answer it, so pre-trust the
    // working directory. Best-effort: the interactive-block detector below is
    // the fallback if this fails.
    trustClaudeWorkspace(cwd);

    console.log(`  Spawning interactive claude (session: ${sessionId.slice(0, 8)}...)`);

    child = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
      env,
    });

    // Accumulated PTY output, kept only so `classifyInteractiveBlock` can spot
    // a prompt the runner can't answer — it is never sent to the server.
    let tuiBuffer = '';
    let lastDataTime = Date.now();
    let sawOutput = false;
    let processExited = false;

    const onData = (data: Buffer) => {
      tuiBuffer += data.toString();
      lastDataTime = Date.now();
      sawOutput = true;
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const finish = (success: boolean, output: string) => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (!processExited) kill();
      resolve({ success, output });
    };

    child.on('error', (err) => {
      processExited = true;
      finish(false, `[Error spawning interactive claude: ${err.message}]`);
    });
    child.on('close', () => {
      processExited = true;
    });

    const startTime = Date.now();
    // A unique marker dropped onto the clipboard *before* `/copy`, so we can
    // tell Claude's real reply from whatever happened to be there before (or
    // detect that `/copy` silently did nothing).
    const sentinel = `__flowy_pending_${sessionId}__`;
    let copyRequested = false;
    let copyRequestedAt = 0;

    const requestCopy = () => {
      copyRequested = true;
      copyRequestedAt = Date.now();
      writeClipboard(sentinel);
      // `/copy` is Claude's slash command to copy the last assistant message
      // to the clipboard. Send it as typed input followed by Enter (CR).
      child?.stdin?.write('/copy\r');
    };

    pollTimer = setInterval(() => {
      if (killed) {
        finish(false, '[Interactive session cancelled]');
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        console.log('  Interactive session timed out');
        finish(false, '[Timeout: no response received]');
        return;
      }

      // Surface prompts the runner cannot answer instead of hanging.
      const block = classifyInteractiveBlock(stripAnsi(tuiBuffer));
      if (block) {
        console.log(`  Interactive block detected: ${block}`);
        finish(false, `[Interactive block: ${block}]`);
        return;
      }

      if (!copyRequested) {
        // Interactive Claude normally stays at its prompt; exiting before we
        // could ask it to copy means it crashed or bailed early.
        if (processExited) {
          finish(false, '[Interactive claude exited before producing a reply]');
          return;
        }
        const quiet = Date.now() - lastDataTime;
        if (sawOutput && elapsed >= MIN_RUNTIME_MS && quiet >= quietAfterMs) {
          console.log('  Claude idle — requesting /copy');
          requestCopy();
        }
        return;
      }

      // `/copy` sent: wait for the clipboard to change from the sentinel,
      // which means Claude wrote its reply there.
      const clip = readClipboard();
      if (clip !== null && clip !== sentinel && clip.trim() !== '') {
        console.log('  Captured assistant reply from clipboard');
        finish(true, clip.trim());
        return;
      }
      if (Date.now() - copyRequestedAt >= CLIPBOARD_WAIT_MS) {
        finish(false, '[No output: /copy did not populate the clipboard]');
      }
    }, POLL_INTERVAL_MS);
  });

  return { promise, kill };
}
