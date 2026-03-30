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
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package*.json ./backend/

ENV NODE_ENV=production

EXPOSE 3001

# ✅ Path matches the actual build output: backend/dist/backend/src/main.js
CMD ["node", "backend/dist/backend/src/main.js"]