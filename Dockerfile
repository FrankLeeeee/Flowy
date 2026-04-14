FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
COPY runner/package*.json runner/
RUN npm ci

COPY . .
RUN npm run build:flowy

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3456

COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
COPY runner/package*.json runner/
RUN npm ci --omit=dev --workspaces --include-workspace-root

COPY --from=build /app/backend/dist ./backend/dist

EXPOSE 3456
CMD ["node", "backend/dist/cli.js", "--port", "3456"]
