# Runner & Provider Guide

When you assign a task in Flowy, you are really choosing three things:

1. Which machine should run it
2. Which AI CLI should handle it
3. Which harness settings should be passed through

This page helps you make those choices quickly and safely.

## Step 1: Choose the right runner

Pick the machine that has the right environment for the job.

Use the runner card to check:

- whether it is `online`, `busy`, or `offline`
- which providers it currently detects
- whether it is the machine that has the repo or files you want to target

Use clear runner names so assignment stays obvious later.

Good examples:

- `office-mac`
- `mac-mini`
- `gpu-linux`
- `build-box`

## Step 2: Choose the provider

Flowy only shows providers that the selected runner detected locally.

| Provider | Local CLI | Best when you want |
| --- | --- | --- |
| Claude Code | `claude` | Claude Code workflows with workspace, model, mode, and worktree controls |
| Codex | `codex` | Codex execution with explicit workspace, model, and sandbox control |
| Cursor Agent | `agent` | Cursor Agent workflows with mode, sandbox, and optional worktree settings |

If the provider you want is missing:

1. Make sure the CLI is installed on that machine.
2. Restart the runner or refresh its detected CLIs from the `Runners` page.
3. Reopen the assignment dialog.

## Step 3: Set the workspace first

The `workspace` field matters more than anything else because it tells the CLI where to run.

- The path must exist on the runner machine.
- The path should point at the repo or folder the AI needs to work in.
- If the runner is remote, use that machine's local path, not the path from your laptop.

If you are not sure what else to fill in, start with `workspace` and add the rest only when needed.

## Step 4: Add provider-specific settings

### Claude Code

Use these fields when the runner is using Claude Code:

| Field | What it controls |
| --- | --- |
| `workspace` | Working directory for the command |
| `model` | Model selection, such as `sonnet` |
| `mode` | Claude Code execution mode |
| `worktree` | Optional worktree name |

### Codex

Use these fields when the runner is using Codex:

| Field | What it controls |
| --- | --- |
| `workspace` | Working directory for `codex exec` |
| `model` | Model selection, such as `gpt-5.4` |
| `sandbox` | Execution sandbox: `read-only`, `workspace-write`, or `danger-full-access` |

If you leave the Codex sandbox empty, Flowy uses `workspace-write`.

### Cursor Agent

Use these fields when the runner is using Cursor Agent:

| Field | What it controls |
| --- | --- |
| `workspace` | Working directory for the task |
| `model` | Model selection |
| `mode` | Agent mode, such as `plan` or `ask` |
| `sandbox` | Sandbox behavior |
| `worktree` | Optional worktree name |

## Step 5: Monitor task and runner status

After you assign a task:

1. The runner polls for work.
2. The task moves to `in_progress` when the runner picks it up.
3. The runner shows `busy` during execution.
4. Output streams into the task detail view.
5. The task finishes as `done` or `failed`.

The `Inbox` page is the fastest way to monitor active work across every project.

## Practical tips

- Keep runner names stable so past task history stays easy to read.
- Keep task titles short and put details in the description.
- Keep harness settings minimal. More fields only help when they are intentional.
- Reassign failed work with better context instead of creating duplicate tasks when the original history still matters.
