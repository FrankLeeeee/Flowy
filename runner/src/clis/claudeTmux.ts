/**
 * Build a bash wrapper that runs `claude` inside a detached tmux session and
 * streams the pane output to stdout.
 *
 * Used when the user opts out of `claude -p` (see `ClaudeCodeHarnessConfig.runWithPrint`).
 * The wrapper is responsible for the full lifecycle:
 *
 *   1. Start a detached tmux session running `claude` interactively.
 *   2. Pipe the pane to a temp log file and `tail -f` it to stdout so the
 *      runner sees the same live output it would have streamed from `-p`.
 *   3. Send the user's prompt via `tmux send-keys` and press Enter.
 *   4. Wait until the pane has been idle for `idleTimeoutSeconds` (claude
 *      finished responding) or until the tmux session ends on its own.
 *   5. Tear everything down — kill the session, the tail, and the temp file.
 *
 * Inputs are passed via env vars so we don't have to escape user-supplied
 * strings into a shell script.
 */
export const CLAUDE_TMUX_PROMPT_ENV = 'FLOWY_CLAUDE_PROMPT';
export const CLAUDE_TMUX_MODEL_ENV = 'FLOWY_CLAUDE_MODEL';
export const CLAUDE_TMUX_WORKTREE_ENV = 'FLOWY_CLAUDE_WORKTREE';
export const CLAUDE_TMUX_IDLE_ENV = 'FLOWY_CLAUDE_IDLE_S';

/** Default idle window — claude must be silent this long before we tear down. */
export const DEFAULT_CLAUDE_TMUX_IDLE_SECONDS = 30;

/**
 * Bash wrapper. Reads:
 *   - `$FLOWY_CLAUDE_PROMPT`   (required) — the prompt to send via send-keys.
 *   - `$FLOWY_CLAUDE_MODEL`    (optional) — passed through as `--model`.
 *   - `$FLOWY_CLAUDE_WORKTREE` (optional) — passed through as `--worktree`.
 *   - `$FLOWY_CLAUDE_IDLE_S`   (optional) — idle threshold in seconds.
 */
export const CLAUDE_TMUX_WRAPPER_SCRIPT = `set -u
: "\${${CLAUDE_TMUX_PROMPT_ENV}:?missing prompt}"

SESSION="flowy-claude-$$-$(date +%s)"
LOGFILE="$(mktemp -t flowy-claude.XXXXXX 2>/dev/null || mktemp)"
TAIL_PID=""

cleanup() {
  if [ -n "$TAIL_PID" ]; then kill "$TAIL_PID" 2>/dev/null || true; fi
  tmux kill-session -t "$SESSION" 2>/dev/null || true
  rm -f "$LOGFILE"
}
trap cleanup EXIT INT TERM

if ! command -v tmux >/dev/null 2>&1; then
  echo "[Error: tmux is not installed on this runner — install tmux or enable 'Run with --print']" >&2
  exit 127
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "[Error: claude is not installed on this runner]" >&2
  exit 127
fi

CLAUDE_CMD="claude --permission-mode bypassPermissions"
if [ -n "\${${CLAUDE_TMUX_MODEL_ENV}:-}" ]; then
  CLAUDE_CMD="$CLAUDE_CMD --model \${${CLAUDE_TMUX_MODEL_ENV}}"
fi
if [ -n "\${${CLAUDE_TMUX_WORKTREE_ENV}:-}" ]; then
  CLAUDE_CMD="$CLAUDE_CMD --worktree \${${CLAUDE_TMUX_WORKTREE_ENV}}"
fi

tmux new-session -d -s "$SESSION" -x 220 -y 50 -c "$PWD" "$CLAUDE_CMD"
tmux pipe-pane -o -t "$SESSION" "cat >> $LOGFILE"

# Give claude a moment to render its prompt before we send keys.
sleep 2

tmux send-keys -t "$SESSION" -l -- "\${${CLAUDE_TMUX_PROMPT_ENV}}"
tmux send-keys -t "$SESSION" Enter

tail -n +1 -f "$LOGFILE" &
TAIL_PID=$!

IDLE_THRESHOLD_S="\${${CLAUDE_TMUX_IDLE_ENV}:-${DEFAULT_CLAUDE_TMUX_IDLE_SECONDS}}"
POLL_INTERVAL_S=3
last_size=0
idle_seconds=0

while tmux has-session -t "$SESSION" 2>/dev/null; do
  sleep "$POLL_INTERVAL_S"
  current_size=$(wc -c < "$LOGFILE" 2>/dev/null | tr -d ' ' || echo 0)
  if [ "$current_size" = "$last_size" ]; then
    idle_seconds=$((idle_seconds + POLL_INTERVAL_S))
    if [ "$idle_seconds" -ge "$IDLE_THRESHOLD_S" ] && [ "$current_size" -gt 0 ]; then
      break
    fi
  else
    idle_seconds=0
    last_size="$current_size"
  fi
done

# Brief pause so the tail can flush the final bytes before cleanup kills it.
sleep 1
exit 0
`;
