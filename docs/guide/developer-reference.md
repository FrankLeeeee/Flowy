# Developer Reference

This page documents how Flowy models AI providers and what needs to change when you add a new CLI harness.

## How a harness fits into Flowy

A harness in Flowy is made up of four connected pieces:

1. A provider ID that can be stored on a task, such as `codex`.
2. A harness config shape that survives API writes, UI edits, and runner execution.
3. Runner-side detection and execution logic for the local CLI.
4. Frontend labels and form fields so users can pick the provider and configure it.

Once those pieces line up, Flowy can persist the assignment, hand it to a runner, and stream execution output back into the hub.

## Checklist for adding a new CLI harness

### 1. Add the provider type

Add the new provider ID to both shared type definitions:

- `backend/src/types.ts`
- `frontend/src/types.ts`

You will usually update:

- `AiProvider`
- the `HarnessConfig` interface
- a provider-specific config interface for the new harness

Keep the provider ID stable because it is persisted in the database as `tasks.ai_provider`.

### 2. Accept and normalize harness config

Flowy sanitizes harness config before writing it to the database and parses it back out on the runner and frontend.

Update these files together:

- `backend/src/harnessConfig.ts`
- `runner/src/harnessConfig.ts`
- `frontend/src/lib/harnessConfig.ts`

The backend normalizer should prune empty values. The runner and frontend parsers should tolerate missing or malformed JSON and return an empty config instead of throwing.

### 3. Update database constraints

The allowed provider list is enforced in SQLite, so a new harness requires a schema update in:

- `backend/src/db.ts`

Today the `tasks.ai_provider` column uses a `CHECK` constraint with hardcoded provider IDs. When you add a new provider, update:

- the main `CREATE TABLE IF NOT EXISTS tasks` statement
- the fallback table definition inside `migrateTaskStatuses()`

If you need to support existing local databases, add a migration path that recreates the `tasks` table with the updated `CHECK` constraint. Updating the TypeScript union alone is not enough.

### 4. Teach the runner how to detect the CLI

Runners advertise their available providers by checking whether the local command exists. Extend:

- `runner/src/config.ts`

Add the new provider to `SUPPORTED_PROVIDERS` with:

- the persisted provider ID
- the command name to probe with `which` or `where`

If a runner cannot detect the command, the provider will never show up in the assignment UI for that machine.

### 5. Teach the runner how to execute the CLI

Map the stored harness config to the real command line in:

- `runner/src/executor.ts`

Add a new `case` in `buildCommandWithConfig()` that returns:

- `cmd`
- `args`
- optional `cwd`
- whether output should be streamed

This is where Flowy translates harness settings into real flags.

Example shape:

```ts
case 'my-provider': {
  const config = harnessConfig.myProvider ?? {};
  const args = ['run'];

  if (config.workspace) args.push('--workspace', config.workspace);
  if (config.model) args.push('--model', config.model);

  args.push(prompt);

  return {
    cmd: 'my-cli',
    args,
    cwd: config.workspace,
    streamOutput: true,
  };
}
```

### 6. Expose the harness in the frontend

Make the new provider visible in the UI by updating:

- `frontend/src/lib/taskConstants.tsx` for the display label
- `frontend/src/lib/semanticColors.ts` for provider styling
- `frontend/src/components/tasks/AssignTaskModal.tsx` for provider-specific form fields
- `frontend/src/lib/harnessConfig.ts` for summary badges shown on task detail views

If you mention supported CLIs in setup copy, also update:

- `frontend/src/pages/Runners.tsx`

The assignment modal is the main place where users edit harness config, so make sure the form fields match the flags you expect in `runner/src/executor.ts`.

### 7. Keep backend task APIs compatible

The existing task routes already persist `runnerId`, `aiProvider`, and `harnessConfig`:

- `backend/src/routes/tasks.ts`

In most cases you do not need to add route logic for a new harness, but you do need the type, schema, and config parser changes described above so the API can accept the new provider cleanly.

### 8. Document and verify the new harness

Before shipping a new provider:

1. Build the repo with `npm run build`.
2. Start the hub and a runner that has the target CLI installed.
3. Assign a task to that runner with the new provider.
4. Confirm the task transitions through `todo`, `in_progress`, and `done` or `failed`.
5. Confirm the generated command line matches the harness fields exposed in the UI.

It is also worth adding tests around command construction if the new CLI has non-trivial flag handling.

## Data flow reference

When a user assigns a task in the UI, the data flow is:

1. The frontend writes `aiProvider` and `harnessConfig`.
2. `backend/src/routes/tasks.ts` stores the normalized JSON string.
3. The runner polls the task and parses `task.harness_config`.
4. `runner/src/executor.ts` turns that config into a CLI invocation.
5. The runner streams output back through the runner API.

That flow is the mental model to keep in mind when you extend Flowy with another harness.
