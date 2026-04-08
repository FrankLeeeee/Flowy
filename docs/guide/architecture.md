# Architecture

Flowy is split into three packages plus a documentation site.

## App package

The root package ties everything together:

- workspace management
- shared scripts for build, test, and docs
- the production `flowy` entrypoint in `bin/flowy.js`

## Backend

The backend is an Express application that:

- exposes the task, project, runner, and settings APIs
- stores state in a local SQLite database
- serves the built frontend in production mode

Key directory:

- `backend/src`

## Frontend

The frontend is a Vite + React application that renders:

- project and task views
- runner management flows
- settings and operational UI

Key directory:

- `frontend/src`

## Runner

The runner is a separate CLI package that:

- registers with the hub
- polls for assigned tasks
- executes tasks through local AI CLIs such as Claude Code or Codex

Key directory:

- `runner/src`

## Docs

The docs site is built with VitePress from Markdown files under `docs/` and can be published independently to GitHub Pages.
