**TO:** Executive Leadership & Board of Directors
**FROM:** Chief Technology Officer (CTO) & Principal Financial Data Modeler
**DATE:** November 22, 2025
**SUBJECT:** Definitive Architectural Specification for WBS-Based Project Financial Control SaaS Platform (SentinelFi)

---

## DOCUMENT 1: Formal Product Requirements Document (PRD)

### 1.0 Business Case & Goals

| Attribute | Description |
| :--- | :--- |
| **Problem** | Reliance on manual, error-prone, unsecured, and non-real-time Excel/CSV sheets for mission-critical project financial control, resulting in poor cash-flow visibility and delayed variance reporting. |
| **Solution** | A highly-secure, real-time, multi-tenant SaaS application that enforces Work Breakdown Structure (WBS) fidelity for budgeting, expense tracking, and automated variance analysis. |
| **Primary Goal** | Achieve **< 10-minute turnaround** from expense entry to real-time variance flag on the CEO dashboard. |
| **Secondary Goals** | 1. Enforce strict RBAC and data isolation per tenant. 2. Automate budget drafting via AI/Document Intelligence. 3. Reduce non-financial administrative overhead by 40%. |
| **User Value** | Real-time financial oversight, enhanced auditability (ACID compliance), and proactive cost control through immediate anomaly detection. |

### 2.0 User Stories & Access Control (RBAC)

The system will enforce a strict Role-Based Access Control (RBAC) matrix to ensure data integrity and security.

#### 2.1 Role-Based Access Control (RBAC) Matrix

| Role | Budget Creation/Approval | Expense Entry (Write) | Report Generation | Live Dashboard (Read) | Budget Modification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | Approve/Reject | Full Write | Full Access | Full Access | Full Access |
| **IT Head** | View Only | View Only | Audit Logs Only | Full Access | No Access |
| **Finance** | Approve/Reject | View Only | Full Access | Full Access | Approve/Reject |
| **Operational Head** | View Only | View Only | Full Access (Projects) | Full Access (Projects) | Request Only |
| **CEO** | View Final Budget | No Access | Executive Reports Only | Executive Dashboard | No Access |
| **Assigned Project User** | Draft Only | **Full Write (Expense Tracker)** | Limited View (Own Project) | Limited View (Own Project) | No Access |

**Crucial Constraint:** The **Assigned Project User** is the *only* role permitted to perform a direct write operation (entry/edit) into the Live Expense Tracking module, ensuring accountability at the source.

#### 2.2 Key User Stories

| ID | As a... | I want to... | So that I can... |
| :--- | :--- | :--- | :--- |
| US-001 | Assigned Project User | Enter a new expense and link it to a specific WBS item (e.g., `1.6 Welder/Fabricator`). | Ensure the expense is immediately tracked against the approved budget line item. |
| US-002 | Finance Officer | View a real-time report filtered by `WBS Category` and `Variance Status: Negative > 10%`. | Proactively identify and investigate major cost overruns requiring immediate management attention. |
| US-003 | Operational Head | Receive an automated daily email report listing all committed (LPO) and paid expenses for my project. | Maintain operational awareness and reconcile on-the-ground spending with financial records. |
| US-004 | Admin | Create a new client account with a dedicated tenant database/schema. | Ensure strict data isolation and compliance for our multi-tenant SaaS model. |
| US-005 | CEO | See a statistical dashboard showing the **Total Project Cost Base** variance (%) across all active projects. | Have an executive-level, single-pane-of-glass overview of company financial health. |

### 3.0 SaaS/Sales Model

The platform will utilize a **Multi-Tenant Architecture with Physical Isolation (Schema-per-Tenant)** for high-volume SaaS.

*   **Client Data Isolation:** Each client (tenant) will have its own dedicated database schema within the PostgreSQL cluster, or its own separate database instance. This satisfies the client requirement for absolute data isolation and minimizes administrative overhead versus a full Single-Tenant model.
*   **WBS Fidelity:** The system will enforce a standardized WBS hierarchy across all tenants, ensuring consistent reporting and easier integration. New WBS lines *must* be approved by the Finance role.

### 4.0 Core Features

| Feature Category | Requirement Detail |
| :--- | :--- |
| **Real-Time Statistical Dashboard** | Single-screen view of **Total Budgeted Cost**, **Total Committed/LPO**, **Total Actual Paid**, and **Total Project Cost Base Variance (%)**. All data must be refreshable in real-time. |
| **WBS-Based Budgeting** | Full CRUD (Create, Read, Update, Delete) functionality for a multi-level WBS structure (`1.0`, `1.1`, `1.1.1`). Budget creation must link unit cost, quantity, and duration, mirroring the fidelity of the source data. |
| **Live Expense Tracking** | Direct entry module for the Assigned Project User, capturing: Date, WBS Category, Item Description, Actual Unit Cost, Actual Quantity, Commitment/LPO Amount, Actual Paid Amount, Document Reference (Invoice/PV), and Notes/Justification. |
| **Variance Calculation** | Automated, live calculation for *every* line item: **Cost Variance (NGN) = (Budgeted Cost of Item) - (Actual Paid Amount)**. |
| **Report Generation** | Mandatory report filters: **Day, Week, Month, Year, WBS Category (Level 1 and 2), and Variance Status (Positive, Negative, Major Variance)**. Reports must be exportable to secure PDF and CSV formats. |
| **DCS Integration** | Secure API endpoint for automated, scheduled (e.g., Daily EOD) distribution of custom, filtered reports (US-003) via email to assigned project personnel using SMTP/SendGrid or an internal document control system (DCS). |

---

## DOCUMENT 2: Technical Architecture Brief

### Section 1: Data Model Proposal (MANDATORY RESEARCH)

A deep comparative analysis was conducted on three candidate database models for the core WBS, Budget, and Expense data.

| Database Approach | Strength | Weakness | Justification for WBS Financial System |
| :--- | :--- | :--- | :--- |
| **PostgreSQL (Relational/SQL)** | **ACID Compliance**, Transactional Integrity, advanced features (CTEs, `ltree`), Schema-per-Tenant isolation. | Schema changes require downtime; potentially slower writes than NoSQL at peak scale. | **Optimal.** *ACID compliance* and *transactional integrity* are non-negotiable for financial data. WBS hierarchy is perfectly managed by *Recursive CTEs* or the `ltree` extension. Superior for multi-tenant isolation via schemas. |
| **MongoDB (Document/NoSQL)** | High Write Scalability, Flexible Schema, excellent for non-financial logs/auditing. | Weak ACID compliance (eventual consistency), poor for complex financial joins (WBS-Budget-Expense-Variance). | **Unsuitable for Core.** Lacks the transactional rigor needed for live variance and audit-proof financial data. WBS hierarchy traversal is non-performant. |
| **NewSQL (e.g., CockroachDB)** | Distributed ACID, high horizontal scalability, good for massive global scale. | Operational complexity, higher latency in single-region deployments, high cost. | **Overkill.** Not justified for the initial phase. Best reserved as a future scaling path once global distribution or exreme write-scaling demands are met. |

#### Definitive Data Model Choice: PostgreSQL

**PostgreSQL** is the most robust and production-ready solution.

1.  **ACID Compliance/Auditability:** Transactions guarantee that a budget line and its corresponding expense are always in sync, crucial for audit trails and idempotency. The database supports immutable transaction logs, satisfying the highest standard of financial auditability.
2.  **Query Speed for Live Variance:** The WBS hierarchy will be indexed and queried using **Recursive Common Table Expressions (CTEs)**. This structure allows for extremely fast aggregation of expense totals up the WBS tree (e.g., calculating `1.0 H/R TOTAL COST` from all sub-items `1.1` to `1.11`) in real-time, delivering the required low-latency dashboard metrics.
3.  **Scalability (Multi-Tenant):** The *Schema-per-Tenant* model provides the strongest physical and logical data isolation, satisfying the security and administrative overhead constraints of the SaaS model while allowing the application layer to operate on a consistent core logic.

### Section 2: Technology Stack & Justification

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend** | **Next.js (React) + TypeScript** | Enterprise-grade, type-safe (critical for financial UIs), high performance via Server-Side Rendering (SSR), and mobile-friendly by default. |
| **Backend/API** | **NestJS (Node.js) + TypeScript** | Opinionated, robust framework built on Node.js/Express. Provides high-performance I/O (required for real-time dashboard) and enforces a secure, modular (microservice-ready) architecture. |
| **Database** | **PostgreSQL** | *As detailed in Section 1.* The single source of truth for all financial and WBS data. |
| **AI/ML** | **Python (FastAPI) + PyTorch/LangChain** | Dedicated microservice for the AI Agent, allowing independent scaling and leveraging Python's superior data processing/NLP libraries. |

### Section 3: AI Agent Blueprint (Python/IA)

A dedicated, scalable microservice (`ai-document-intelligence-service`) will handle all AI-driven automation.

#### 3.1 Document Intelligence

*   **Role:** Automated budget/tracker drafting.
*   **Mechanism:** The AI agent (using OCR for images/PDFs and NLP for text extraction) will ingest source files (PDF, Word, Excel, CSV). It will be trained to identify WBS headers, line items, quantities, and unit costs.
*   **Output:** The agent will generate a clean, validated **JSON object** adhering strictly to the PostgreSQL database schema for WBS/Budget creation, which the Finance Officer can *review and approve* before committing. This replaces hours of manual data entry.

#### 3.2 Variance & Anomaly Detection

*   **Role:** Real-time flagging of financial anomalies on the live dashboard.
*   **Actionable Rule/Formula for 'Major Variance':**
    The system's rule engine will flag an expense as **'MAJOR VARIANCE'** if *either* of the following conditions are met:
    1.  **Variance Threshold Breached:** `| (Budgeted Total Cost of WBS Category) - (Actual Paid Amount of WBS Category) | > 10% of (Budgeted Total Cost of WBS Category)`
    2.  **Unbudgeted Major Expense:** `WBS Category = UNBUDGETED AND Actual Paid Amount > NGN 50,000`
*   **Process:** This flag is generated upon *every* expense entry transaction, ensuring immediate visibility and triggering the automated report distribution.

### Section 4: SaaS Architectural Design & DevOps

#### 4.1 SaaS Architectural Design (Isolation & Security)

*   **Tenant Isolation:** **Schema-per-Tenant** within a master PostgreSQL cluster. All data is logically and physically separated at the database layer. Application requests are routed via a secure API gateway that validates the tenant ID using the OIDC/OAuth 2.0 token.
*   **Security & Audit:**
    *   End-to-end encryption (TLS 1.3).
    *   All financial and expense-related actions (entry, modification, approval) are written to a separate, immutable **Audit Log** microservice.
    *   API is secured with a token-based authentication (JWT/OAuth 2.0) and uses role-scoped permissions to enforce the strict RBAC matrix.

#### 4.2 DevOps & Deployment

*   **Dockerization Strategy:** All microservices (Frontend/Next.js, Backend/NestJS API, AI/Python Agent, Audit Log) will be **fully containerized using Docker**. This ensures environment parity from development to production.
*   **Deployment Environment:** Production will be deployed on a Hyperscaler (e.g., AWS/Azure/GCP) using a **Kubernetes (K8s) cluster**.
    *   **Justification:** K8s provides auto-scaling (critical for high-volume SaaS), automatic health checks, and superior fault tolerance, ensuring production readiness and high availability (HA).
*   **CI/CD Pipeline:** Automated pipeline (e.g., GitHub Actions or GitLab CI) for testing, security scanning, image building, and deployment to the K8s cluster.

---

## DOCUMENT 3: Phased Implementation Plan (7-Step Roadmap)

The implementation plan is structured to prioritize the foundational financial integrity and security layers before implementing advanced features.

| Phase | Duration | Objective | Key Deliverables | Stakeholders |
| :--- | :--- | :--- | :--- | :--- |
| **1: Foundation & Data Model** | 4 Weeks | Finalize and lock the PostgreSQL Data Model, focusing on WBS hierarchy and ACID compliance. Set up Multi-Tenant isolation. | Finalized PostgreSQL Schema with CTEs, Initial Tenant Management System, Audit Log Structure. | CTO, Principal Modeler, IT Head |
| **2: Core WBS Module (MVP)** | 6 Weeks | Build the core Budget Creation (Draft) and Expense Entry (Write) modules. Enforce WBS fidelity and variance calculation on commit. | CRUD for WBS/Budget, Assigned Project User Expense Entry, Live Variance Calculation Logic. | Principal Modeler, Assigned Project Users |
| **3: RBAC & Security Layer** | 4 Weeks | Fully integrate the RBAC matrix and set up the OAuth 2.0/OIDC security layer. Lock down all API endpoints based on role permissions. | Fully operational RBAC logic, Secure Login/Auth System, Initial Security Audit Report. | IT Head, Admin, CTO |
| **4: Dashboard & Reporting** | 6 Weeks | Develop the real-time statistical dashboard and all core reporting functions with mandatory filters (Day, WBS, Variance Status). | Real-Time Dashboard (CEO/Finance view), All mandatory Report Generation Filters, Data Visualization Engine. | CEO, Finance, Operational Heads |
| **5: AI Agent Integration (Document Drafting)** | 5 Weeks | Deploy the initial AI microservice and integrate the Document Intelligence feature for budget drafting. | AI Service deployed on K8s, OCR/NLP integration, JSON Budget Draft Review interface. | Finance, CTO |
| **6: Automation & AI Rule Engine Finalization** | 4 Weeks | Deploy the advanced features: full DCS integration and the Major Variance AI Rule Engine. | Functional DCS Integration (Automated Email Reports), Live Anomaly/Major Variance Flags operational. | Finance, Operational Heads, CTO |
| **7: UAT, Stress Testing & Production Launch** | 3 Weeks | Final Quality Assurance, penetration testing, and load testing to ensure high-volume SaaS readiness. | UAT Sign-off, Performance Testing Report (Latency/Throughput), Full Production Deployment. | All Stakeholders, External Security Firm |