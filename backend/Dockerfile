# Stage 1: Build stage
FROM node:20-alpine AS development
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install
ENV PATH /app/node_modules/.bin:$PATH

# Copy the rest of the application code
COPY . .

# Build the NestJS application (compiles TypeScript to JavaScript)
RUN npm run build

# Stage 2: Production stage (minimal and secure)
FROM node:20-alpine AS production
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=development /app/node_modules ./node_modules
COPY --from=development /app/package*.json ./
COPY --from=development /app/dist ./dist

# Define the command to run the built application
CMD ["node", "dist/main"]