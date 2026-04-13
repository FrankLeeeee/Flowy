# Step-by-Step Guide

Once Flowy is running, the daily loop is simple: create work, assign it, watch it run, and review the result.

## Step 1: Create a project

Use the `+` button in the sidebar `Projects` section to create a project.

Projects are your main containers for work. Use them to separate clients, repositories, teams, or streams of effort.

## Step 2: Add a task

Open a project and click `New Task`.

Fill in:

- `Title` for the outcome you want
- `Description` for context, constraints, or acceptance criteria
- `Priority` if this task needs to stand out
- `Labels` if you want reusable categories like `frontend`, `ops`, or `urgent`

Keep titles direct and action-oriented. The clearer the task, the better the handoff.

## Step 3: Work from the view that fits

Flowy gives you two main ways to manage tasks:

- `Inbox` shows active tasks across all projects.
- A project page shows only the tasks for that project.

Use search, filters, and the Kanban or List toggle to switch between a broad view and a focused one.

## Step 4: Assign the task to a runner

Open the task details and click `Assign`, then:

1. Choose the runner that should do the work.
2. Choose an AI provider available on that runner.
3. Fill in the provider settings for this task.
4. Click `Assign task`.

Flowy only shows providers detected on the selected runner, so the provider list changes by machine.

## Step 5: Set the execution details

The assignment form passes settings through to the underlying CLI.

The most common fields are:

- `workspace` for the folder or repository on the runner machine
- `model` for the model name you want that CLI to use
- `sandbox` for permission mode when the provider supports it
- `mode` for Claude Code or Cursor Agent execution behavior
- `worktree` for a separate working directory when you use one

Start small. In many cases, `workspace` and `model` are enough.

## Step 6: Watch the task run

After assignment, Flowy handles the handoff:

1. the task is queued on the selected runner
2. the runner picks it up
3. the task moves to `in_progress`
4. the runner shows as `busy`
5. output streams back into the task
6. the task finishes as `done` or `failed`

Use `Runners` when you want the machine view. Use `Inbox` or the project page when you want the task view.

## Step 7: Review the result

Open the task details to:

- read the output
- download the output as Markdown
- open completed output in full screen
- edit the title, description, status, priority, or labels

This is also the best place to decide whether the task is finished or needs a follow-up task.

## Step 8: Keep the queue healthy

A simple working routine looks like this:

1. Review `Inbox`.
2. Create or refine tasks.
3. Assign each task to the best runner and provider.
4. Check `Runners` for machine availability.
5. Review output and close the loop.

## Helpful habits

- Use clear runner names like `office-mac`, `build-box`, or `gpu-linux`.
- Point `workspace` to the exact folder the CLI should work in on that runner.
- Use labels for themes or ownership, not long task titles.
- Keep tasks focused so each assignment has one obvious goal.

## If something looks wrong

- If a runner is `offline`, make sure `flowy-runner` is still running and can reach the hub URL.
- If a provider is missing, install that CLI on the runner machine and refresh the runner.
- If a task does not start, make sure it is assigned to an `online` runner with a provider selected.
- If a task fails, open the task details first and review the streamed output.

Use the [reference page](/guide/developer-reference) when you need a quick lookup for statuses, runner states, or provider settings.
