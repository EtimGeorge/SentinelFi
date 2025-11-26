# Placeholder for Next.js Frontend Development
# This ensures the docker-compose build succeeds.

FROM node:20-alpine AS development

WORKDIR /app

# The frontend code and dependencies will be copied in a later phase (Phase 4)
# For now, simply install a dummy package to establish the environment
COPY package.json .
RUN echo "{ \"name\": \"sentinelfi-ui-placeholder\", \"version\": \"1.0.0\" }" > package.json

# Keep the container running for development purposes
CMD ["sleep", "infinity"]