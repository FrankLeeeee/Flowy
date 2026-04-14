FROM node:24-bookworm-slim

ENV NODE_ENV=production

ARG FLOWY_REPO=https://github.com/FrankLeeeee/Flowy.git
ARG FLOWY_REF=main
ARG FLOWY_DIR=/workspace/Flowy

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates python3 make g++

RUN git clone --depth 1 --branch "$FLOWY_REF" "$FLOWY_REPO" "$FLOWY_DIR"

RUN npm cache clean --force \
    && cd "$FLOWY_DIR" \
    && npm install --include=dev \
    && npm run build:flowy

WORKDIR ${FLOWY_DIR}

CMD ["node", "backend/dist/cli.js", "--port", "8000"]
