FROM node:20-bookworm-slim AS build
WORKDIR /src

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ARG FLOWY_REPO=https://github.com/FrankLeeeee/Flowy.git
ARG FLOWY_REF=main
RUN git clone --depth 1 --branch "$FLOWY_REF" "$FLOWY_REPO" app

WORKDIR /src/app
RUN npm ci
RUN npm run build:flowy

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3456

COPY --from=build /src/app/package*.json ./
COPY --from=build /src/app/backend/package*.json backend/
COPY --from=build /src/app/frontend/package*.json frontend/
COPY --from=build /src/app/runner/package*.json runner/
RUN npm ci --omit=dev --workspaces --include-workspace-root

COPY --from=build /src/app/backend/dist ./backend/dist

EXPOSE 3456
CMD ["node", "backend/dist/cli.js", "--port", "3456"]
