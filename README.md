# SentinelFi: Enterprise Financial Intelligence & Resilience Platform

SentinelFi is a mission-critical, multi-tenant financial monitoring platform engineered for high-availability performance (10,000+ concurrent users) and autonomous AI-driven insights.

## 🏗️ Architecture Overview

SentinelFi is structured as a high-performance monorepo:

*   **[`/backend`](./backend)**: NestJS (TypeScript) enterprise core. Features schema-based multi-tenancy, global rate limiting, and an autonomous AI circuit breaker.
*   **[`/frontend`](./frontend)**: Next.js (React) unified executive dashboard. Optimized for sub-second data visualization and AI-assisted financial workflows.
*   **[`/ai-agent`](./ai-agent)**: Python (FastAPI + LangChain) intelligence engine. Orchestrates generative financial analysis and automated budget forecasting.
*   **[`/shared`](./shared)**: Common TypeScript types and financial enums shared across the stack.

## 🛡️ Enterprise Hardening Features

*   **Scalability:** Multi-tenant Redis caching (IOREDS) for sub-second response times.
*   **Resilience:** State-managed Circuit Breakers for AI outages and Global Rate Limiting.
*   **Security:** Joi-based Environment Validation and PII-masking Log Interceptors.
*   **Governance:** Automated AI Audit Trails and Global Soft-Delete safety nets.

## 🚀 Quick Start (Dockerized)

Ensure you have **Docker Compose** installed.

1.  **Configure Environment:**
    Copy `.env.example` to `.env` in the root and subdirectories.
2.  **Launch Ecosystem:**
    ```bash
    docker-compose up -d --build
    ```
3.  **Access:**
    *   Frontend: `http://localhost:3000`
    *   Backend API (Swagger): `http://localhost:3001/api/v1/docs`

## 📚 Technical Documentation

*   [**Developer Guide**](./docs/DEVELOPER_GUIDE.md): Local setup, architectural patterns, and contribution standards.
*   [**Operator Manual**](./docs/OPERATOR_MANUAL.md): Scaling 10,000 users, Backup orchestration, and Resilience monitoring.
*   [**Enterprise Deployment Guide**](./docs/ENTERPRISE_DEPLOYMENT.md): High-availability infra requirements.

---
*Built for the future of autonomous financial oversight.*
