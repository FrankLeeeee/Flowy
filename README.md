<p align="center">
  <img src="./docs/public/flowy-icon.svg" alt="Flowy icon" width="96" height="96" />
</p>

# Flowy

Flowy is a self-hosted task hub for AI-assisted work. Run the hub with `@frankleeeee/flowy`, connect runner machines with `@frankleeeee/flowy-runner`, and route tasks to Claude Code, Codex, or Cursor Agent from one dashboard.

## Quick Start

Install the hub and runner packages:

```bash
npm install -g @frankleeeee/flowy @frankleeeee/flowy-runner
```

Start the hub:

```bash
flowy --port 3001
```

Open `http://localhost:3001`, copy the runner registration secret from `Runners` -> `Security`, then register a machine that has a supported AI CLI installed:

```bash
flowy-runner \
  --name "my-device" \
  --url http://localhost:3001 \
  --secret "<registration-secret>"
```

## Docs

[Full documentation](https://frankleeeee.github.io/Flowy/)

- [Getting Started](https://frankleeeee.github.io/Flowy/guide/getting-started)
- [Run Your First Task](https://frankleeeee.github.io/Flowy/guide/usage)
- [Runner & Provider Guide](https://frankleeeee.github.io/Flowy/guide/developer-reference)
