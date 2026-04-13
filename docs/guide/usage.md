# Usage

Flowy revolves around three things: the hub, runners, and tasks.

- The hub stores projects, tasks, runner registrations, and task output.
- Runners advertise which AI CLIs they can execute.
- Tasks are assigned to a specific runner and provider, then executed with optional harness settings.

## Typical workflow

1. Start the Flowy hub with `flowy`.
2. Register one or more machines with `flowy-runner`.
3. Create a project and add tasks.
4. Assign a task to a runner and choose the AI provider that should execute it.
5. Watch the runner pick up the task, stream output, and report success or failure back to the hub.

## How task execution works

When you assign a task:

1. Flowy stores the selected runner, AI provider, and harness config on the task.
2. The runner polls the hub every 5 seconds by default.
3. When the runner sees a `todo` task assigned to it, it marks that task `in_progress`.
4. The runner launches the underlying CLI command for the selected provider.
5. Output is streamed back to the hub while the process runs.
6. The task is marked `done` or `failed` when the command exits.

The runner also sends a heartbeat every 30 seconds so the hub can show whether a machine is `online`, `busy`, or `offline`.

## Supported providers

Flowy currently supports these provider IDs:

| Provider | Local command | Notes |
| --- | --- | --- |
| `claude-code` | `claude` | Uses `claude -p --tools all ...` |
| `codex` | `codex` | Uses `codex exec ... --color never` |
| `cursor-agent` | `agent` | Uses `agent --print --force ...` |

Runners register only the providers they can detect on the local machine, so the provider list depends on which CLIs are installed.

## Harness settings

Harness settings are provider-specific options that Flowy passes through to the underlying CLI when the task runs. The UI writes this config for you during task assignment, but the stored value is JSON.

### Claude Code

Flowy maps these fields to the `claude` command:

- `workspace`
- `model`
- `mode`
- `worktree`

Example:

```json
{
  "claudeCode": {
    "workspace": "/path/to/repo",
    "model": "sonnet",
    "mode": "acceptEdits",
    "worktree": "feature/docs"
  }
}
```

### Codex

Flowy maps these fields to `codex exec`:

- `workspace`
- `model`
- `sandbox`

Example:

```json
{
  "codex": {
    "workspace": "/path/to/repo",
    "model": "gpt-5.4",
    "sandbox": "workspace-write"
  }
}
```

If you do not set a sandbox for Codex, Flowy defaults it to `workspace-write`.

### Cursor Agent

Flowy maps these fields to the `agent` command:

- `workspace`
- `model`
- `mode`
- `sandbox`
- `worktree`

Example:

```json
{
  "cursorAgent": {
    "workspace": "/path/to/repo",
    "model": "gpt-5",
    "mode": "plan",
    "sandbox": "enabled",
    "worktree": "feature/docs"
  }
}
```

## Runner behavior

Each runner keeps a local registration file at `~/.config/flowy/runner-<name>.json`. On startup it:

1. Reuses the saved token when possible.
2. Detects available AI CLIs on the machine.
3. Registers or reconnects to the hub.
4. Sends regular heartbeats.
5. Polls for assigned tasks.

If the hub asks for a CLI refresh, the runner rescans the machine and sends the updated provider list on the next heartbeat.

## Practical tips

- Use clear runner names such as `office-mac`, `build-box`, or `gpu-linux`.
- Point `workspace` at the repository that the target CLI should operate on.
- Copy the runner registration secret from the Runners page when onboarding a new machine.
- Give different machines different provider coverage if they serve different roles.
