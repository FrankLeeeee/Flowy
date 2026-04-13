# Getting Started

This guide takes you from install to your first online runner.

## Before you begin

- Node.js 18+
- npm 8+
- At least one supported AI CLI on every runner machine:
  - `claude` for Claude Code
  - `codex` for Codex
  - `agent` for Cursor Agent

## Step 1: Install Flowy

Install both packages globally:

```bash
npm install -g @frankleeeee/flowy @frankleeeee/flowy-runner
```

`@frankleeeee/flowy` runs the hub. `@frankleeeee/flowy-runner` connects worker machines to that hub.

## Step 2: Start the hub

Run:

```bash
flowy --port 3001
```

Then open:

```text
http://localhost:3001
```

This is where you will create projects, manage tasks, and monitor runners.

## Step 3: Optional: lock runner registration with a secret

If you want to restrict which machines can register:

1. Open `Runners`.
2. Switch to `Security`.
3. Add a registration secret.
4. Save it.

Leave this empty if open runner registration is fine for your setup.

## Step 4: Start a runner on a machine that should execute work

Run this on the target machine:

```bash
flowy-runner \
  --name "my-device" \
  --url http://localhost:3001
```

If the runner machine is not the same machine as the hub, replace `http://localhost:3001` with the hub URL that machine can actually reach.

If you set a registration secret, include it:

```bash
flowy-runner \
  --name "my-device" \
  --url http://localhost:3001 \
  --secret "your-shared-secret"
```

You can also open `Runners` and click `Add Runner` to copy the install and registration commands from the UI.

## Step 5: Confirm the runner is ready

Open `Runners` in Flowy and check that:

- the runner appears with the name you chose
- its status is `online` or `busy`
- one or more AI providers appear on the runner card

If no providers appear, install the target CLI on that machine and refresh the runner from the `Runners` page.

## Step 6: Create your first project

1. In the sidebar, use the `+` button in `Projects`.
2. Enter a project name.
3. Click `Create project`.

Projects keep related work together and make filtering easier later.

## Step 7: Create your first task

1. Open the project.
2. Click `New Task`.
3. Add a clear title.
4. Add description, priority, and labels if needed.
5. Click `Create task`.

## Step 8: Assign the task

1. Open the task details.
2. Click `Assign`.
3. Choose a runner.
4. Choose an AI provider available on that runner.
5. Fill in the provider settings you want to pass through, such as `workspace`, `model`, `sandbox`, or `worktree`.
6. Click `Assign task`.

## Next

Continue with the [step-by-step usage guide](/guide/usage) for the full daily workflow.
