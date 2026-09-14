# Enterprise Deployment Guide: SentinelFi

This guide outlines the steps to deploy SentinelFi in a high-availability production environment capable of supporting 10,000+ concurrent users.

## 1. Infrastructure Requirements
*   **Database:** PostgreSQL (Neon or RDS) with connection pooling.
*   **Cache:** Redis (ElastiCache or Upstash) for multi-tenant data isolation.
*   **Orchestration:** Docker Compose (v2+) or Kubernetes.
*   **SSL:** Mandatory SSL termination at the Load Balancer level.

## 2. Configuration (Strict Validation)
SentinelFi uses strict Joi-based validation at boot. The following variables are **REQUIRED**:
*   `DATABASE_URL`: Connection string for Postgres.
*   `REDIS_HOST`: Hostname of the Redis instance.
*   `JWT_SECRET`: 64+ character secure string.
*   `FRONTEND_URL`: The canonical URL of your Next.js app (e.g., `https://app.sentinelfi.com`).

## 3. Operational Resilience Features
*   **Rate Limiting:** Automatically active (10 req/min/IP). Tune `ThrottlerModule` in `AppModule` for higher limits.
*   **AI Circuit Breaker:** Injected into `AiAssistantService`. If the AI Agent is down, the system trips the circuit after 3 failures and serves cached data for 1 hour.
*   **Health Checks:** Monitor `https://your-api.com/api/v1/health`. Returns 200 only if DB, Redis, and AI Agent are all reachable.
*   **Audit Sanitization:** Use the `LogSanitizationInterceptor` to keep production logs free of PII.

## 4. Scaling the AI Agent
For 10,000 users, we recommend scaling the Python AI Agent horizontally. 
*   Ensure `AI_AGENT_URL` points to a Load Balancer if using multiple instances.
*   The AI Agent is stateless and works perfectly behind a round-robin LB.

## 5. Deployment Commands
```bash
# Build production images
docker-compose build

# Start services in detached mode
docker-compose up -d
```
