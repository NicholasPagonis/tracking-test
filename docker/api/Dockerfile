FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root manifests
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/arcgis-adapter/package.json ./packages/arcgis-adapter/
COPY packages/webeoc-adapter/package.json ./packages/webeoc-adapter/

# Install all workspace dependencies
RUN npm install --workspaces --if-present

# Copy source
COPY apps/api ./apps/api
COPY packages/arcgis-adapter ./packages/arcgis-adapter
COPY packages/webeoc-adapter ./packages/webeoc-adapter

# ─── Runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app ./

# Data directory (SQLite file mounted as volume)
RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:3000/api/health/ready || exit 1

CMD ["node", "apps/api/src/index.js"]
