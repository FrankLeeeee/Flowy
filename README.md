# My-Hub

AI usage dashboard inspired by [codexbar](https://github.com/steipete/codexbar). Monitors Claude Code, Codex CLI, OpenAI API, Gemini, and OpenRouter — all in one place.

## Requirements

- Node.js 18+
- npm 8+

## Setup

```bash
npm install
```

## Running

```bash
# Both servers (recommended)
npm run dev

# Individually
npm run dev:backend    # Express API  → http://localhost:3001
npm run dev:frontend   # Vite/React   → http://localhost:5173
```

Open **http://localhost:5173**.

## Providers

| Provider | Data source | What's shown |
|---|---|---|
| **Claude Code** | `~/.claude/projects/**/*.jsonl` | 5-hour session window usage %, burn rate, session & 30-day costs |
| **Codex CLI** | `~/.codex/sessions/**/*.jsonl` | Session & weekly rate windows (from server-provided data), costs |
| **OpenAI API** | Admin API key | Today & 30-day token usage and estimated cost |
| **Gemini** | API key | Key validation (no public usage REST API) |
| **OpenRouter** | API key | Credit balance and usage % |

## Configuration

Open **http://localhost:5173/settings**:

- **Claude Code / Codex** — select your subscription plan (no API key needed)
- **OpenAI** — paste an Admin-level API key (`sk-…`) and optional org ID
- **Gemini** — paste your Generative Language API key (`AIza…`)
- **OpenRouter** — paste your API key (`sk-or-…`)

Settings are stored at `~/.config/my-hub/settings.json` (git-ignored).

## Building for production

```bash
npm run build
# Serve with: node backend/dist/index.js
```
