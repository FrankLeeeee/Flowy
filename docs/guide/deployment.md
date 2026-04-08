# Deployment

## Application build

Build all runtime packages from the repository root:

```bash
npm run build
```

This compiles:

- `backend/dist`
- `frontend/dist`
- `runner/dist`

## npm package publishing

This repository already includes GitHub Actions workflows for npm publishing:

- `Publish Flowy`
- `Publish Flowy Runner`

They can be triggered by version tags or manual workflow dispatch.

## GitHub Pages docs publishing

The docs site is built with:

```bash
npm run docs:build
```

The GitHub Pages workflow:

- installs dependencies with `npm ci`
- builds the VitePress site
- publishes the generated static files to the `gh/pages` branch

## Notes for Pages

- The VitePress base path is derived from the repository name
- GitHub Pages should be configured to serve from the `gh/pages` branch root
- project pages are served from `/<repo-name>/`
- user or org pages are served from `/`
