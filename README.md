# Flowy

## Overview

Flowy is a self-hosted task hub for AI-assisted work. You run the hub with `@frankleeeee/flowy`, connect one or more machines with `@frankleeeee/flowy-runner`, and assign tasks to the AI CLI that should handle them, such as Claude Code, Codex, or Cursor Agent.

It fits a simple workflow: keep projects and tasks in one dashboard, point each task at a runner, pass harness settings like workspace, model, sandbox, or worktree through to the underlying CLI, and watch execution output stream back into the hub.

## Get Started

Flowy is published as two npm packages:

- `@frankleeeee/flowy` runs the hub UI and API
- `@frankleeeee/flowy-runner` registers a worker machine and executes assigned tasks

Install both packages globally:

```bash
npm install -g @frankleeeee/flowy @frankleeeee/flowy-runner
```

Start the hub:

```bash
flowy --port 3001
```

Then open `http://localhost:3001`.
On first start, Flowy generates a runner registration secret for the hub. Copy it from the Runners page before connecting a new machine.

On any machine that should execute tasks, make sure at least one supported AI CLI is installed (`claude`, `codex`, or `agent`), then start a runner:

```bash
flowy-runner \
  --name "my-device" \
  --url http://localhost:3001 \
  --secret <secret>

```

Use the registration secret shown by Flowy when a runner registers for the first time.

If you are working from this repository instead of the published packages:

```bash
npm install
npm run dev
```

That starts the backend on `http://localhost:3001` and the frontend on `http://localhost:5173`.

## Docs

Full documentation is available at [frankleeeee.github.io/Flowy](https://frankleeeee.github.io/Flowy/).

- [Get Started](https://frankleeeee.github.io/Flowy/guide/getting-started)
- [Usage](https://frankleeeee.github.io/Flowy/guide/usage)
- [Developer Reference](https://frankleeeee.github.io/Flowy/guide/developer-reference)
