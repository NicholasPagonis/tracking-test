FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY apps/web/package.json ./apps/web/

RUN npm install --workspace=apps/web

COPY apps/web ./apps/web

# Build for production
ARG VITE_API_BASE_URL=""
ARG VITE_WS_URL=""
ARG VITE_API_KEY="dev-dashboard-key"
ARG VITE_ADMIN_KEY="dev-admin-key"
ARG VITE_MAP_CENTER_LAT="-33.9399"
ARG VITE_MAP_CENTER_LON="151.1753"
ARG VITE_MAP_DEFAULT_ZOOM="14"
ARG VITE_REFRESH_INTERVAL_MS="10000"

RUN cd apps/web && npm run build

# ─── Runner: serve static files ───────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx/nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
