<p align="center">
  <img src="./docs/public/flowy-icon.svg" alt="Flowy icon" width="250" />
</p>

# 🌊 Flowy

Flowy is a self-hosted task hub for AI-assisted work. It gives you one place to manage projects, route tasks to connected runner machines, and execute them with the AI CLI that fits the job, such as Claude Code, Codex, or Cursor Agent.

## 📚 Table of Contents

- [✨ Overview](#-overview)
- [🧩 Packages](#-packages)
- [🔄 How It Works](#-how-it-works)
- [📖 Documentation](#-documentation)

## ✨ Overview

Flowy is designed for a simple workflow: keep projects and tasks in one dashboard, point each task at a runner, pass harness settings like workspace, model, sandbox, or worktree through to the underlying CLI, and watch execution output stream back into the hub.

## 🧩 Get Started

Flowy is published as two npm packages:

- `@frankleeeee/flowy` runs the hub UI and API
- `@frankleeeee/flowy-runner` registers a worker machine and executes assigned tasks

```bash
# install packages
npm install -g @frankleeeee/flowy @frankleeeee/flowy-runner

# start the application
flowy
```

## 🔄 How It Works

1. Run the Flowy hub to manage projects, tasks, and connected runners.
2. Connect one or more machines with Flowy Runner.
3. Assign tasks to the AI CLI that should handle them.
4. Monitor execution output directly from the hub.

## 📖 Documentation

Setup, configuration, and usage guides are available in [Flowy Docs](https://frankleeeee.github.io/Flowy/).
