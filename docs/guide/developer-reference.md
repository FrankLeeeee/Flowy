# Reference

Use this page as a quick lookup while working in Flowy.

## Main areas

| Area | What it is for |
| --- | --- |
| `Inbox` | Active tasks across all projects |
| `Projects` | Task views scoped to one project |
| `Labels` | Reusable task categories |
| `Runners` | Runner status, provider availability, and registration security |

## Task statuses

| Status | What it means |
| --- | --- |
| `backlog` | Captured work that is not ready to run yet |
| `todo` | Ready to be picked up by a runner |
| `in_progress` | Currently running on a runner |
| `failed` | Finished with an error or unsuccessful result |
| `done` | Finished successfully |
| `cancelled` | Stopped or closed without completion |

## Runner states

| State | What it means |
| --- | --- |
| `online` | Connected and ready to accept work |
| `busy` | Connected and currently executing a task |
| `offline` | Not sending recent heartbeats to the hub |

If a runner is online but missing a provider you expect, refresh it from the `Runners` page after installing that CLI on the machine.

## Supported AI providers

Flowy only offers providers that the selected runner has detected locally.

| Provider | Local command | Settings you can set in Flowy |
| --- | --- | --- |
| `Claude Code` | `claude` | `workspace`, `model`, `mode`, `worktree` |
| `Codex` | `codex` | `workspace`, `model`, `sandbox` |
| `Cursor Agent` | `agent` | `workspace`, `model`, `mode`, `sandbox`, `worktree` |

## What the common settings mean

| Setting | Meaning |
| --- | --- |
| `workspace` | The folder or repository path on the runner machine |
| `model` | The model name to pass to the CLI |
| `sandbox` | Permission mode for providers that support it |
| `mode` | Execution behavior for Claude Code or Cursor Agent |
| `worktree` | A separate working directory or worktree name when you use one |

## Labels and priority

- Use labels when you want reusable categories across many tasks.
- Use priority when you want a task to stand out in queues and filters.
- Use both sparingly so the signal stays clear.

## Output and task details

Open a task to:

- review streamed output
- download the final output as Markdown
- open finished output in full screen
- update title, description, status, priority, and labels

## Runner registration notes

- Give each runner a clear name like `office-mac` or `gpu-linux`.
- Set a registration secret in `Runners > Security` if you do not want open enrollment.
- Use the `Add Runner` dialog when you want copy-ready install and registration commands.
- The runner machine must be able to reach the hub URL you pass with `--url`.

## Good defaults

- Start with one project and one runner.
- Use short, direct task titles.
- Set `workspace` before adding advanced settings.
- Add more runners only when they genuinely serve different machines or toolchains.
