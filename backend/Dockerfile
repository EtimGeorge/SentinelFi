# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json and workspace configs
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies for the whole monorepo (hoisted)
RUN npm install

# Copy source code
COPY shared ./shared
COPY backend ./backend

# Build shared first, then backend
RUN npm run build -w shared
RUN npm run build -w backend

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/.env ./backend/.env

# Create symbolic links or ensure paths match monorepo structure
# NestJS often expects dist/main.js
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "backend/dist/backend/src/main.js"]