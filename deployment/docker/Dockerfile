# syntax=docker/dockerfile:1
# Life OS container image (docs/ARCHITECTURE.md §9, ADR-007/008).
# Build context: repository root. JavaScript is built on the build platform (fast, no
# emulation); only the small final stage runs for the target platform (linux/arm64 on a
# Raspberry Pi). better-sqlite3 ships prebuilt binaries for all platforms, so the copied
# node_modules work on arm64 without compiling.

ARG NODE_IMAGE=node:24-bookworm-slim
ARG TAILSCALE_IMAGE=tailscale/tailscale:v1.104.7

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/check-node.cjs scripts/
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# --ignore-scripts: better-sqlite3 loads its bundled prebuilt binary; no compiler needed.
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS runtime-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/check-node.cjs scripts/
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# Runtime dependencies of the backend only (@lifeos/shared is bundled into the server).
RUN npm ci --omit=dev --ignore-scripts --workspace @lifeos/backend --no-audit --no-fund \
 && rm -rf node_modules/@lifeos

FROM ${TAILSCALE_IMAGE} AS tailscale

FROM ${NODE_IMAGE}
ARG LIFEOS_VERSION=0.0.0-local
# No RUN steps in this stage: building for arm64 needs no CPU emulation.
COPY --from=tailscale /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=tailscale /usr/local/bin/tailscale /usr/local/bin/tailscaled /usr/local/bin/
WORKDIR /app
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/dist ./frontend/dist
COPY database/migrations ./database/migrations
COPY --chmod=755 deployment/docker/run.sh /run.sh

ENV NODE_ENV=production \
    HOST=127.0.0.1 \
    PORT=8080 \
    DATA_DIR=/data \
    STATIC_DIR=/app/frontend/dist \
    LIFEOS_VERSION=${LIFEOS_VERSION} \
    NODE_OPTIONS=--max-old-space-size=192

LABEL org.opencontainers.image.title="Life OS" \
      org.opencontainers.image.description="Private daily tracking (Home Assistant app)" \
      org.opencontainers.image.version="${LIFEOS_VERSION}" \
      io.hass.type="addon"

CMD ["/run.sh"]
