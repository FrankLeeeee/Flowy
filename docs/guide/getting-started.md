# Getting Started

This guide takes you from a fresh install to an online runner that is ready to accept work.

## Before you begin

- Install Node.js 18+.
- Install npm 8+.
- Make sure each runner machine has at least one supported AI CLI:
  - `claude` for Claude Code
  - `codex` for Codex
  - `agent` for Cursor Agent

## Step 1: Install Flowy

Install the hub and runner packages:

```bash
npm install -g @frankleeeee/flowy @frankleeeee/flowy-runner
```

## Step 2: Start the hub

Launch Flowy:

```bash
flowy --port 3001
```

Then open:

```text
http://localhost:3001
```

The hub serves the API and web app together, so one command is enough to get the dashboard running.

## Step 3: Copy the registration secret

When Flowy starts for the first time, it creates a runner registration secret.

1. Open the `Runners` page.
2. Switch to the `Security` tab.
3. Copy the `Registration Secret`.

Every new runner uses this secret the first time it connects.

## Step 4: Register a runner

On the machine that should execute tasks, run:

```bash
flowy-runner \
  --name "office-mac" \
  --url http://localhost:3001 \
  --secret "<registration-secret>"
```

Use a runner name that tells you which machine it is, such as `office-mac`, `mac-mini`, or `gpu-linux`.

> [!TIP]
> `--url` must be reachable from the runner machine. If the hub is running on another computer, use that computer's real hostname or IP address instead of `localhost`.

## Step 5: Confirm the runner is online

Go back to the `Runners` page in Flowy and check that:

- the runner appears in the list
- its status is `online` or `busy`
- the detected providers match the CLIs installed on that machine

If you install another AI CLI later, use the refresh action on the runner card to rescan the machine.

## Step 6: Create a project

In the sidebar:

1. Click the `+` button next to `Projects`.
2. Enter a project name.
3. Open the new project.

## Step 7: Create your first task

Inside the project:

1. Click `New Task`.
2. Add a clear title.
3. Add any useful context in the description.
4. Set priority and labels if needed.
5. Click `Create task`.

Once the task exists, move on to [Run Your First Task](/guide/usage).
