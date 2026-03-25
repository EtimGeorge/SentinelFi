# SentinelFi: Master System Documentation Index

Welcome to the central technical hub for the SentinelFi Financial Intelligence platform. This index provides a roadmap to our modular documentation system, designed for high-scale financial resilience.

---

## 🚀 1. Quick Start & Onboarding
*   **[Deployment Guide](#-launching-the-application)**: How to run SentinelFi via Docker or Native.
*   **[Developer Handover Guide](file:///c:/temp/SentinelFi/docs/DEVELOPER_GUIDE.md)**: Coding standards, monorepo workflow, and local setup.

## 🌉 2. System Architecture & Mapping
*   **[STRUCTURE_MAP.md](file:///c:/temp/SentinelFi/docs/STRUCTURE_MAP.md)**: Granular directory-to-page mapping and data flow.
*   **[ARCH-001: Security & Identity](file:///c:/temp/SentinelFi/docs/ARCH-001-SECURITY.md)**: JWT Strategy, RBAC, Token Blacklisting, and PII Sanitization.
*   **[ARCH-002: Multi-Tenancy & Database](file:///c:/temp/SentinelFi/docs/ARCH-002-TENANCY.md)**: Schema-per-tenant isolation, Dynamic DataSources, and Migration Orchestration.
*   **[ARCH-003: Enterprise Resilience](file:///c:/temp/SentinelFi/docs/ARCH-003-RESILIENCE.md)**: Circuit Breakers, Global Error Handling, Soft-Deletes, and Recovery.

## 💼 3. Strategic & Business Operations
*   **[INVESTOR_PITCH_GUIDE.md](file:///c:/temp/SentinelFi/docs/INVESTOR_PITCH_GUIDE.md)**: High-level vision and USPs for investors and marketers.
*   **[FREE_DEPLOYMENT_STRATEGY.md](file:///c:/temp/SentinelFi/docs/FREE_DEPLOYMENT_STRATEGY.md)**: Zero-cost deployment roadmap for MVP and pitching.
*   **[Scaling & Performance](file:///c:/temp/SentinelFi/docs/ENTERPRISE_DEPLOYMENT.md)**: Infrastructure strategy for 10,000+ concurrent users.
*   **[Payment Gateway Guide](file:///c:/temp/SentinelFi/docs/PAYMENT_SYSTEM_GUIDE.md)**: Integration logic for Ivorypay and Paystack.
*   **[AI Agent Extended Guide](file:///c:/temp/SentinelFi/docs/PRD_MULTI_TENANCY_AND_ONBOARDING.md)**: Prompting, Financial Context Injection, and Guardrails.

---

## 🚀 Appendix: Quick Deployment Reference

### 🐳 Option A: Docker (Containerized)
1. **Setup:** Populate `.env.prod` in the root.
2. **Execute:** `docker-compose up --build`
3. **Access:** Frontend: `:3001`, Backend: `:3000/api/v1`, AI Agent: `:8000/docs`

### 💻 Option B: Native (Direct Execution)
*   **Backend:** `npm run start:backend:dev` (from root)
*   **Frontend:** `npm run dev:frontend` (from root)
*   **AI Agent:** `cd ai-agent && pip install -r requirements.txt && uvicorn main:app --reload`

---
*Precision. Resilience. Intelligence. SentinelFi.*
