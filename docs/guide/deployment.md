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
- uploads the generated static files
- deploys them through GitHub Pages

## Notes for Pages

- The VitePress base path is derived from the repository name
- project pages are served from `/<repo-name>/`
- user or org pages are served from `/`
