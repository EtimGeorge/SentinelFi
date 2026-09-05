# Build Stage
# IMPORTANT: This Dockerfile must be built from the MONOREPO ROOT.
# Back4App Configuration:
#   - Root Directory: / (repo root)
#   - Dockerfile Path: backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json and workspace configs first (for layer caching)
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install all monorepo dependencies (hoisted to root node_modules)
RUN npm install --legacy-peer-deps

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

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD wget -qO- http://localhost:3001/api/v1/health/live || exit 1

# ✅ Path matches the actual build output: backend/dist/backend/src/main.js
CMD ["node", "backend/dist/backend/src/main.js"]