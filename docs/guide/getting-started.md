# Getting Started

## Requirements

- Node.js 23+
- npm 8+

## Install dependencies

From the repository root:

```bash
npm install
```

## Run the app locally

```bash
npm run dev
```

This starts:

- the backend at `http://localhost:3001`
- the frontend at `http://localhost:5173`

You can also run each side separately:

```bash
npm run dev:backend
npm run dev:frontend
```

## Build and test

```bash
npm test
npm run build
```

## Run docs locally

```bash
npm run docs:dev
```

The docs site reads Markdown files from the `docs/` folder and serves them through VitePress.
