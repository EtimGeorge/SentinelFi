--- START OF FILE Definitive_Architectural_Specification_SentinelFi_V2.0.md ---

**TO:** Executive Leadership & Board of Directors
**FROM:** Chief Technology Officer (CTO) & Principal Solutions Architect
**DATE:** December 22, 2025
**SUBJECT:** Definitive Architectural Specification for SentinelFi: WBS-Based Project Financial Control SaaS Platform (Version 2.0 - Incorporating Post-Implementation Audit)

---

## DOCUMENT 1: Formal Product Requirements Document (PRD) - V2.0

### 1.0 Business Case & Goals (Unchanged)

| Attribute | Description |
| :--- | :--- |
| **Problem** | Reliance on manual, error-prone, unsecured, and non-real-time Excel/CSV sheets for mission-critical project financial control. |
| **Solution** | A highly-secure, real-time, multi-tenant SaaS application that enforces Work Breakdown Structure (WBS) fidelity for budgeting, expense tracking, and automated variance analysis. |
| **Primary Goal** | Achieve **< 10-minute turnaround** from expense entry to real-time variance flag on the CEO dashboard. |
| **Secondary Goals** | 1. Enforce strict RBAC and data isolation per tenant. 2. Automate budget drafting via AI/Document Intelligence (Phase 5). 3. Reduce non-financial administrative overhead by 40%. |

### 2.0 User Stories & Access Control (RBAC)

The system enforces a strict Role-Based Access Control (RBAC) matrix and a dedicated User Management Module.

#### 2.1 Role-Based Access Control (RBAC) Matrix (Final)

| Role | Budget Creation/Approval | Expense Entry (Write) | Report Generation | User Management | WBS Category CRUD |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | Approve/Reject | Full Write | Full Access | **Full CRUD** | **Full CRUD** |
| **IT Head** | View Only | No Access | Audit Logs Only | **Full CRUD** | View Only |
| **Finance** | Approve/Reject | No Access | Full Access | No Access | **Create/View** |
| **Operational Head** | View Only | No Access | Full Access (Projects) | No Access | View Only |
| **CEO** | View Final Budget | No Access | Executive Reports Only | No Access | No Access |
| **Assigned Project User** | Draft Only | **Full Write (Expense Tracker)** | Limited View (Own Project) | No Access | No Access |

**Crucial Constraint:** The **Assigned Project User** is the *only* role permitted to perform a direct write operation (entry/edit) into the Live Expense Tracking module.

#### 2.2 Key User Stories (NGN Template Integration)

| ID | As a... | I want to... | So that I can... |
| :--- | :--- | :--- | :--- |
| **US-001** | Assigned Project User | Enter a new expense and link it to a specific **Indented WBS** item (e.g., `— 1.6 Welder/Fabricator`). | Ensure the expense is immediately tracked against the approved budget line item. |
| **US-002** | Finance Officer | View a real-time report filtered by `WBS Category` and `Variance Status: Negative > 10%`. | Proactively identify and investigate major cost overruns. |
| **US-006** (NEW) | Finance/Admin | Create a new top-level WBS Category (e.g., `8.0 Special Projects`). | Dynamically adapt the project structure to unforeseen business needs outside the default NGN categories. |
| **US-007** (NEW) | Admin/IT Head | Create a new user and assign them the `Assigned Project User` role. | Securely onboard new project personnel and enforce the RBAC matrix from day one. |

### 3.0 SaaS/Sales Model & Architecture

| Attribute | Specification | Detail |
| :--- | :--- | :--- |
| **Architecture** | Multi-Tenant Architecture | Physical Isolation (Schema-per-Tenant) on **Neon (Serverless PostgreSQL)**. |
| **Data Fidelity** | WBS Fidelity | Enforced using **Recursive CTEs** for roll-up reporting. |
| **Security** | Authentication | **JWT in HttpOnly Cookie** (Resolves XSS vulnerability). |

### 4.0 Core Features (NGN Template Fidelity)

| Feature Category | Requirement Detail |
| :--- | :--- |
| **Budget Drafting (UI)** | **NGN Template Fidelity:** The form must replicate the fields from the NGN budget template (Unit Cost, Quantity, Duration, Description). **WBS Selection:** Parent WBS selection must use a **dynamic, indented dropdown** based on the existing hierarchy. |
| **Expense Tracker (UI)** | **Quick-Entry Terminal:** Must use a dark, high-contrast UI for speed. Must include fields for: **Actual Unit Cost, Actual Quantity, Commitment/LPO Amount, Actual Paid Amount, Document Reference (Invoice/PV)**. **WBS Selection:** Must use the dynamic, indented WBS selector. |
| **WBS Category Manager** | **NEW MANDATE:** Backend includes a `wbs_category` table seeded with the NGN template categories (H/R, Material, Equipment, Logistics, Welfare, Accommodation, Contingency). Admin/Finance can perform CRUD on these Level 1 headers. |
| **User Management** | **NEW MANDATE:** Dedicated module for Admin/IT Head to perform **User CRUD** and change a user's role. |

---

## DOCUMENT 2: Final Frontend UI/UX Specification

This specification replaces all prior UI/UX descriptions, adopting the high-fidelity dark mode mockups as the definitive standard.

### 1. General UI/UX Principles

*   **Theme:** Primary color is **Dark Mode** (`bg-brand-dark`).
*   **Layout:** **Fixed Left Sidebar** (Primary Navigation) and **Fixed Top Header** (Search/Profile). The main content area must dynamically adjust its margin to avoid overlap.
*   **WBS Color-Coding:** The 8-color WBS palette is used for visual segmentation in all charts, KPIs, and hierarchy displays.
*   **Interactivity:** All relevant elements must have **Tooltips on hover** (e.g., variance percentages, truncated WBS descriptions).

### 2. Final User Journey & Navigation

| Journey | Start Page | End Page | Sidebar Links |
| :--- | :--- | :--- | :--- |
| **Executive Oversight** | `/dashboard/ceo` | `/dashboard/ceo` | Dashboard, Reports, Analytics |
| **Transaction Flow** | `/expense/tracker` | `/dashboard/ceo` | Live Tracker, Budgeting, Projects |
| **Security/Admin** | `/settings` | `/admin/users` | Settings, WBS Manager, Approvals |

### 3. Layout Component Specification

| Component | Function / Critical Behavior |
| :--- | :--- |
| **`SecuredLayout`** | Master template. Manages `isSidebarOpen` state and dynamically sets `main` content's `margin-left` for smooth collapse/expand transitions. |
| **`Sidebar`** | **Collapsible.** Width transitions from `w-64` (open) to `w-20` (closed). Contains **Role-Based Navigation**, and a **Real-Time Activity/Notification Feed**. |
| **`LiveExpenseTracker`** | **Quick-Entry Terminal UI.** Orange/Critical color palette. WBS selector uses the **hierarchical, indented dropdown**. |

---
--- END OF FILE Definitive_Architectural_Specification_SentinelFi_V2.0.md ---

**ACTION:** The updated PRD is complete and incorporates all your high-fidelity requirements and NGN template structures.
