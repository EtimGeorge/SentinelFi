# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json and workspace configs
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install dependencies for the whole monorepo
RUN npm install

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
ENV PORT=3001

EXPOSE 3001

CMD ["npm", "run", "start", "-w", "frontend"]