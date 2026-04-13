# Flowy Docs

## Run Locally

Launch the documentation website from the repository root:

```bash
npm install
npm run docs:dev
```

VitePress starts a local development server and prints the local URL in the terminal. By default, it is usually `http://localhost:5173`.

## Build The Docs

Create a production build locally:

```bash
npm run docs:build
```

## Preview The Production Build

Preview the built docs site locally:

```bash
npm run docs:preview
```

## Where The Docs Live

- Content pages: `docs/`
- VitePress config: `docs/.vitepress/config.mts`
