# Flowy Runner

A daemon that connects to the Flowy hub and executes tasks using AI CLI tools on your local machine.

## Prerequisites

- **Node.js v23+** (required for better-sqlite3 compatibility)
- One or more AI CLI tools installed:
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — `claude`
  - [Codex](https://github.com/openai/codex) — `codex`
  - [Cursor Agent](https://docs.cursor.com/agent) — `agent`

## Build

From the repository root:

```bash
npm install
npm run build --workspace=runner
```

Or from the `runner/` directory:

```bash
npm install
npm run build
```

This compiles TypeScript to `dist/` via `tsc`.

## Usage

Run via npm scripts:

```bash
# Development (with hot reload)
npm run dev -- --name <name> --url <hub-url> [options]

# Production (after building)
npm run build
npm start -- --name <name> --url <hub-url> [options]
```

Or install globally to use the `flowy-runner` command directly:

```bash
npm install -g @frankleeeee/flowy-runner
flowy-runner --name <name> --url <hub-url> [options]
```

### Required flags

| Flag | Description |
|------|-------------|
| `--name <name>` | Unique name for this runner (e.g. `macbook-pro`) |
| `--url <url>` | URL of the Flowy hub backend (e.g. `http://localhost:3001`) |

### Optional flags

| Flag | Default | Description |
|------|---------|-------------|
| `--poll-interval <ms>` | `5000` | How often to poll for new tasks (in milliseconds) |
| `--token <token>` | — | Reuse an existing runner token instead of registering |
| `--secret <secret>` | — | Registration secret (if the hub requires one) |
| `--device <info>` | auto-detected | Device info string sent during registration |

### Examples

**Development** (with hot reload):

```bash
cd runner
npm run dev -- --name my-laptop --url http://localhost:3001
```

**Production** (compiled):

```bash
cd runner
npm run build
npm start -- --name my-laptop --url http://localhost:3001
```

**Global install** (use from anywhere):

```bash
cd runner
npm run build
npm link
flowy-runner --name office-server --url https://hub.example.com --secret my-secret
```

## How it works

1. **Register** — On first launch, the runner registers with the hub and receives an authentication token. The token is saved to `~/.config/my-hub/runner-<name>.json` for future sessions.

2. **Heartbeat** — Every 30 seconds, the runner sends a heartbeat to the hub so it appears as "online" in the dashboard.

3. **Poll** — Every 5 seconds (configurable), the runner polls the hub for tasks assigned to it with status `todo`.

4. **Detect CLIs** — On startup, the runner checks the local machine for supported commands (`claude`, `codex`, `agent`) and registers only the providers it finds.

5. **Execute** — When a task is picked up, the runner spawns the appropriate AI CLI tool as a child process:
   | Provider | Command |
   |----------|---------|
   | `claude-code` | `claude -p "<task description>"` |
   | `codex` | `codex exec "<task description>"` |
   | `cursor-agent` | `agent -p "<task description>"` |

6. **Stream output** — Output is buffered and sent back to the hub every 2 seconds so you can monitor progress in real time from the web UI.

7. **Complete** — Once the process exits, the runner reports success or failure to the hub.

## Token persistence

Runner tokens are saved to `~/.config/my-hub/runner-<name>.json`. On subsequent launches with the same `--name`, the saved token is reused automatically. You can also pass `--token <token>` to use a specific token.

## Graceful shutdown

The runner handles `SIGINT` and `SIGTERM` signals for clean shutdown. Press `Ctrl+C` to stop the runner gracefully.
