# syntax=docker/dockerfile:1

# --- Build: Frontend (Vite) und Backend (tsup-Bundle) -------------------------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
RUN npm ci

COPY . .
RUN npm run build

# --- Laufzeit: nur Produktionsabhängigkeiten des Backends ---------------------
FROM node:24-alpine AS runtime
# tzdata: Datumsangaben in Titeln und Ablagepfaden in der Zeitzone aus TZ
RUN apk add --no-cache tzdata

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    FRONTEND_DIST_DIR=/app/apps/frontend/dist \
    TZ=Europe/Berlin
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev --workspace @cm/backend && npm cache clean --force

COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/backend/assets apps/backend/assets
COPY --from=build /app/apps/frontend/dist apps/frontend/dist

RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "apps/backend/dist/index.js"]
