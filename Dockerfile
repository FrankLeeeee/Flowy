FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3456

ARG FLOWY_REPO=https://github.com/FrankLeeeee/Flowy.git
ARG FLOWY_REF=main
ARG FLOWY_DIR=/opt/flowy

RUN git clone --depth 1 --branch "$FLOWY_REF" "$FLOWY_REPO" "$FLOWY_DIR" \
    && cd "$FLOWY_DIR" \
    && npm install \
    && npm run build:flowy \
    && npm install --omit=dev --workspaces --include-workspace-root

WORKDIR ${FLOWY_DIR}

EXPOSE 3456
CMD ["node", "backend/dist/cli.js", "--port", "3456"]
