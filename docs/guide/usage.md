# Run Your First Task

Once a runner is online, Flowy follows a simple loop: create a task, assign it, watch it run, and review the result.

## Step 1: Open a project or use Inbox

You can work in either place:

- `Projects` keeps related work together.
- `Inbox` shows active tasks across every project.

For a first run, opening a project is usually the clearest path.

## Step 2: Create a task

1. Click `New Task`.
2. Enter a short, direct title.
3. Use the description for context, constraints, or the expected outcome.
4. Set priority and labels if they help with triage.
5. Click `Create task`.

Good tasks usually include the goal, the repo or workspace involved, and any limits the AI should respect.

## Step 3: Assign the task

Open the task, then click `Assign task` or `Reassign`.

In the assignment dialog:

1. Choose a runner.
2. Choose an AI provider from the list that runner advertises.
3. Fill in the harness settings you want to pass through.
4. Click `Assign task`.

If a provider is missing, that runner does not currently detect the matching CLI.

## Step 4: Set the right harness values

The most important field is usually `workspace`.

- Set `workspace` to a path that exists on the runner machine.
- Set `model` only if you want to force a specific model.
- Set `sandbox`, `mode`, or `worktree` only when the selected CLI needs them.

You do not need to fill every field. Flowy works well when you keep the config as small as possible.

## Step 5: Watch execution

After assignment:

1. The task is queued on the selected runner.
2. The runner picks it up and changes the task to `in_progress`.
3. Output streams back into Flowy while the CLI runs.
4. The runner status changes to `busy`.
5. When the command exits, the task becomes `done` or `failed`.

The `Inbox` view is useful when you want to monitor active work across multiple projects at once.

## Step 6: Review the result

Open the task detail view to inspect:

- streamed output
- assigned runner
- selected provider
- harness summary badges
- final status

If a task fails, you can update the task details and assign it again to the same runner or a different one.

## A simple working pattern

Many teams settle into this sequence:

1. Create a project for a repo or workstream.
2. Add focused tasks with clear titles.
3. Route each task to the machine that has the right CLI and workspace.
4. Use `Inbox` to watch active work.
5. Move completed tasks to `done` and retry failures with better context.

For help choosing runners, providers, and assignment fields, continue to [Runner & Provider Guide](/guide/developer-reference).
