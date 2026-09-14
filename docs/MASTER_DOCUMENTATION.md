# SentinelFi: Master System Documentation Index

Welcome to the central technical hub for the SentinelFi Financial Intelligence platform. This index provides a roadmap to the modular documentation system, designed for high-scale financial resilience.

For a single end-to-end manual covering the whole product, start with the [Product Documentation](product/PRODUCT_DOCUMENTATION.md).

---

## 1. Quick Start and Onboarding
- [Deployment Guide](#-quick-deployment-reference) - how to run SentinelFi via Docker or natively.
- [Developer Handover Guide](technical/DEVELOPER_GUIDE.md) - coding standards, monorepo workflow, and local setup.
- [Product Documentation](product/PRODUCT_DOCUMENTATION.md) - end-user product manual: roles, features, workflows, troubleshooting.

## 2. System Architecture and Mapping
- [STRUCTURE_MAP.md](technical/STRUCTURE_MAP.md) - granular directory-to-page mapping and data flow.
- [ARCH-001: Security & Identity](technical/ARCH-001-SECURITY.md) - JWT Strategy, RBAC, Token Blacklisting, and PII Sanitization.
- [ARCH-002: Multi-Tenancy & Database](technical/ARCH-002-TENANCY.md) - schema-per-tenant isolation, dynamic data sources, and migration orchestration.
- [ARCH-003: Enterprise Resilience](technical/ARCH-003-RESILIENCE.md) - circuit breakers, global error handling, soft-deletes, and recovery.
- [ARCH-004: Predictive Financial Intelligence](technical/ARCH-004-FINANCIAL-INTELLIGENCE.md) - forensics engine, reporting system, and performance architecture.
- [ARCH-005: Governance & Budget Controls](technical/ARCH-005-GOVERNANCE.md) - DOA thresholds, approval flows, and variance guardrails.
- [ARCH-006: Notifications & Real-Time Sync](technical/ARCH-006-NOTIFICATIONS.md) - WebSocket architecture and event-driven alert dispatching.
- [ARCH-007: Enterprise Audit Strategy](technical/ARCH-007-AUDIT.md) - fire-and-forget logging, context capture, and traceability.
- [ARCH-008: Operational Budgeting (OPEX) Engine](technical/ARCH-008-OPEX-ENGINE.md) - period-based allocations, departmental variance, and payroll sync.
- [Feature Deep Dive: Reporting & WBS Engine](technical/features/reporting_and_wbs_engine.md) - the CAPEX/OPEX reporting and work-breakdown-structure engine.

## 3. Product & User Guides
- [User Process Guide](product/USER_PROCESS_GUIDE.md) - table of contents to every feature guide.
- [User Interface Guide](product/USER_INTERFACE_GUIDE.md) - high-level walkthrough of UI modules and navigation.
- [End-User Guides](product/user-guides) - 18 step-by-step module guides (00 Quick Start through 17 AI Communication).
- [Financial Management Guide](product/financial-management-guide.md) - end-user money movement and ledger workflows.
- [Session & Autosave Guide](product/session-and-autosave-guide.md) - session persistence and draft autosave behaviour.
- [Payment Flow Guide](product/PAYMENT_FLOW_GUIDE.md) - end-to-end payment journeys (checkout to confirmation).
- [Multi-Tenancy & Onboarding PRD](business/prd_multi_tenancy_and_onboarding.md) - product requirements for tenancy and onboarding.

## 4. Operations, Deployment & Business
- [Operator Manual](technical/OPERATOR_MANUAL.md) - scaling to 10,000+ users, backup orchestration, resilience monitoring.
- [Enterprise Deployment Guide](technical/ENTERPRISE_DEPLOYMENT.md) - high-availability infrastructure strategy.
- [Free Deployment Strategy](business/FREE_DEPLOYMENT_STRATEGY.md) - zero-cost deployment roadmap for MVP and pitching.
- [Database Operations](technical/DATABASE_OPERATIONS.md) - schema management, backups, and migrations.
- [Backend Database Management Guide](technical/backend/database_management_guide.md) - backend-specific database administration.
- [Email Setup Guide](technical/EMAIL_SETUP_GUIDE.md) - Resend/SMTP configuration.
- [Payment Gateway Guide](technical/PAYMENT_SYSTEM_GUIDE.md) - integration logic for Ivorypay and Paystack.
- [Secret Keys & Environment Guide](internal/SECRET_KEYS_GUIDE.md) - internal: where API keys live and how to configure them.
- [NPM Workflow Reference](technical/backend/npm-runs.md) - internal: common backend npm scripts.
- [Production Readiness Implementation](technical/backend/production_readiness_implementation.md) - internal: hardening checklist and status.
- [Investor Pitch Guide](business/INVESTOR_PITCH_GUIDE.md) - high-level vision and USPs for investors and marketers.

## 5. AI Agent
- [AI Agent Guide](technical/backend/ai-agent.md) - the FastAPI/LangChain intelligence engine: prompting, financial context injection, and guardrails.
- [AI Communication (End User)](product/user-guides/17-AI-COMMUNICATION.md) - using the assistant, alerts, and team messaging.

## 6. Internal Security & Audit (DO NOT serve to the app frontend)
- [SentinelFi Audit Report](internal/audit/sentinelfi_audit_report.md) - internal: vulnerability/stub findings with file:line references. Contains the exact attack surface; must never ship in the application.

---

## Appendix: Quick Deployment Reference

### Option A: Docker (Containerized)
1. **Setup:** Populate `.env.prod` in the root.
2. **Execute:** `docker-compose up --build`
3. **Access:** Frontend `:3000`, Backend `:3001` (`/api/v1`), AI Agent `:8000/docs`.

### Option B: Native (Direct Execution)
- **Backend:** `npm run start:backend:dev` (from root)
- **Frontend:** `npm run dev:frontend` (from root)
- **AI Agent:** `cd ai-agent && pip install -r requirements.txt && uvicorn main:app --reload`

---
*Precision. Resilience. Intelligence. SentinelFi.*