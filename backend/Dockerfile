# Build Stage
# IMPORTANT: This Dockerfile must be built from the MONOREPO ROOT.
# Back4App Configuration:
#   - Root Directory: / (repo root)
#   - Dockerfile Path: backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy ALL workspace manifests + the lockfile FIRST so the deps layer only
# replays when a manifest changes. (npm's `workspaces` list includes frontend/
# and packages/* — every manifest must exist or `npm ci` fails.)
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
COPY packages ./packages

# Deterministic install of the whole monorepo. The BuildKit cache mount reuses
# the npm download cache across rebuilds AND across the frontend image, so the
# second image's `npm ci` is mostly cache hits. Requires BuildKit (Docker
# Desktop / Compose v2 default).
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps

# Copy source code
COPY shared ./shared
COPY backend ./backend

# Build shared first, then backend
RUN npm run build:shared
RUN npm run build:backend

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets from the builder
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared ./shared
# Root node_modules (hoisted monorepo deps)
COPY --from=builder /app/node_modules ./node_modules
# Backend-specific node_modules (NestJS workspace deps not hoisted to root)
# Uses glob pattern [s] so it gracefully skips if the folder wasn't created
COPY --from=builder /app/backend/node_module[s] ./backend/node_modules
COPY --from=builder /app/backend/package*.json ./backend/


ENV NODE_ENV=production

# Non-root runtime (least privilege). /app must stay writable for the local
# uploads fallback and any temp files.
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD wget -qO- http://localhost:3001/api/v1/health/live || exit 1

# ✅ Path matches the actual build output: backend/dist/backend/src/main.js
CMD ["node", "backend/dist/backend/src/main.js"]