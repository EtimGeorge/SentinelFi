# syntax=docker/dockerfile:1
# Build Stage
# IMPORTANT: This Dockerfile must be built from the MONOREPO ROOT.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy ALL workspace manifests + the lockfile FIRST so the deps layer only
# replays when a manifest changes. (npm's `workspaces` list includes every
# workspace — all manifests must exist or `npm ci` fails.)
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
COPY packages ./packages

# Deterministic install of the whole monorepo. The BuildKit cache mount reuses
# the npm download cache across rebuilds AND across the backend image.
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps

# Copy source code
COPY shared ./shared
COPY frontend ./frontend

# Build shared first, then frontend
RUN npm run build -w shared

# ✅ Inject the backend URL at build-time so Next.js rewrites can resolve it correctly
# This must be an ARG (not ENV) for build-time config evaluation in next.config.js
ARG BACKEND_INTERNAL_URL=http://backend:3001
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL
RUN npm run build -w frontend


# Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/node_modules ./node_modules
# Copy monorepo configuration for workspace resolution
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/frontend/package.json ./frontend/
ENV NODE_ENV=production
ENV PORT=3000
# HOME must be writable by the non-root user (npm writes ~/.npm here).
ENV HOME=/tmp

# Non-root runtime (least privilege). .next and next start may write cache/temp.
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["npm", "run", "start", "-w", "frontend"]