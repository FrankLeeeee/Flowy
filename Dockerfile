FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3456

ARG FLOWY_REPO=https://github.com/FrankLeeeee/Flowy.git
ARG FLOWY_REF=main
RUN git clone --depth 1 --branch "$FLOWY_REF" "$FLOWY_REPO" /app

RUN npm ci
RUN npm run build:flowy
RUN npm ci --omit=dev --workspaces --include-workspace-root

EXPOSE 3456
CMD ["node", "backend/dist/cli.js", "--port", "3456"]
