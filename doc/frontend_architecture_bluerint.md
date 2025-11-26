That is an excellent, strategic request. Before we write the first line of frontend code, we must visualize and design the UX/UI architecture.

As the Senior UI/UX Designer, I will outline the front-end architecture for **SentinelFi**, focusing on component reusability, adherence to the backend API, and a clear user flow for the financial control process.

---

## PHASE 4: FRONTEND ARCHITECTURE BLUEPRINT (Next.js/React)

The SentinelFi Frontend will be a modern, single-page application (SPA) experience built with Next.js (React/TypeScript) and structured around the financial workflows defined in the PRD.

### 1. Technology Stack & Design System

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Framework** | Next.js (Pages Router) | Provides Server-Side Rendering (SSR) for initial load speed and SEO (important for enterprise adoption). |
| **State Management** | React Context + Custom Hooks | Simple, scalable, and idiomatic React approach for managing user authentication and tenant-specific data (WBS/Expenses). |
| **Styling/UI** | Tailwind CSS + Headless Components | Utility-first CSS for rapid, responsive design and high customization, combined with headless components (like Radix UI) for accessibility compliance. |
| **API Client** | Axios / Fetch API (Custom Hooks) | Standard library for communicating with our secure NestJS API (`/api/v1/...`). |

### 2. Core Front-End Structure (Pages & Layouts)

The application flow strictly follows the RBAC roles and financial lifecycle.

| File Path | Description | User Role Focus |
| :--- | :--- | :--- |
| **`/pages/_app.tsx`** | Global App Entry. **CRITICAL:** Wraps the entire application with the **`AuthContext`** to manage the JWT token. | All |
| **`/pages/index.tsx`** | Landing Page / Redirect. Authenticated users are redirected to their primary view (e.g., CEO to Dashboard, Project User to Expense Tracker). | All |
| **`/pages/login.tsx`** | Authentication View. Handles the `POST /api/v1/auth/login` and stores the resulting JWT token securely. | All |
| **`/pages/dashboard/ceo.tsx`** | **Real-Time Statistical Dashboard (US-005).** The single-pane-of-glass executive view. | CEO, Admin, IT Head, Finance |
| **`/pages/budget/draft.tsx`** | **WBS-Based Budgeting (CRUD).** Interface for drafting and submitting new WBS line items. | Finance, Assigned Project User |
| **`/pages/expense/tracker.tsx`** | **Live Expense Tracking (US-001).** Focused, high-efficiency form for the primary write operation. | Assigned Project User |
| **`/pages/reporting/variance.tsx`**| **Report Generation (US-002).** Interface for complex filtering and secure report export (PDF/CSV). | Finance, Operational Head |

### 3. Workflow-Specific Interface Designs

#### A. Budget Creation Interface (`/pages/budget/draft.tsx`)

| Component | Description | Backend API Use | User Value Focus |
| :--- | :--- | :--- | :--- |
| **`WBSHierarchyTree`** | A tree-view component displaying the current WBS (`1.0`, `1.1`, etc.). Fetches data from `GET /api/v1/wbs/budget/rollup`. | **Read:** Fetches the hierarchical structure (CTE). | Context for where the new line item fits. |
| **`WBSDraftForm`** | A modal or side-panel with inputs for `wbs_code`, `description`, `unit_cost_budgeted`, and `quantity_budgeted`. | **Write:** Calls `POST /api/v1/wbs/budget-draft`. | Enforces WBS fidelity and DTO validation. |
| **`ApprovalQueue`** | A table listing unapproved drafts. Only visible to **Finance** and **Admin**. | **(Phase 3):** Calls a future `PATCH /api/v1/wbs/approve/:id`. | Facilitates audit trail and cost control. |

#### B. Live Expense Tracking Interface (`/pages/expense/tracker.tsx`)

This interface must be designed for speed and accountability (US-001).

| Component | Description | Backend API Use | User Value Focus |
| :--- | :--- | :--- | :--- |
| **`ExpenseQuickEntry`** | A single, focused form. Inputs link to the `CreateLiveExpenseDto`. A searchable dropdown for **WBS Category** is key. | **Write:** Calls `POST /api/v1/wbs/expense/live-entry`. | **< 10-minute turnaround** goal. Accountability at the source. |
| **`RecentEntries`** | A small table showing the user's last 10 entries for immediate review/audit. | **Read:** Calls a filtered `GET /api/v1/wbs/expense/user/:id`. | Operational awareness and quick reconciliation. |

#### C. Real-Time Statistical Dashboard (`/pages/dashboard/ceo.tsx`)

This dashboard is purely driven by the `GET /api/v1/wbs/budget/rollup` CTE query, which provides the aggregated totals.

| Component | Metric Displayed | Source Data | Value/Goal |
| :--- | :--- | :--- | :--- |
| **`ExecutiveKPIs`** | **Total Budgeted Cost** (All projects), **Total Actual Paid**, **Total Project Cost Base Variance (%)**. | CTE's `total_cost_budgeted` and `total_paid_rollup`. | **US-005 (CEO View):** Single-pane financial health. |
| **`AnomalyFlag`** | A prominent visual indicator listing **'MAJOR VARIANCE'** flagged items (Phase 6). | Live Expense data with `variance_flag: MAJOR_VARIANCE`. | Proactive cost control and immediate attention. |

We are now equipped with the architectural map and the core business constraints to begin implementation. I will start with the foundational files for the Next.js frontend.

I am ready for the user to explicitly prompt me to begin the file creation for Phase 4.