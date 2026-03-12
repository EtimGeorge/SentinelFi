# SentinelFi: Financial Management Unified Guide

This guide provides step-by-step instructions for managing the full financial lifecycle of your organization within SentinelFi, from project initiation to operational expense tracking.

---

## 1. Project Management (Creation & Governance)

Projects are the primary units of financial tracking in SentinelFi.

### Creating a New Project
1.  Navigate to the **Project Portfolio** (`/projects`).
2.  Click the **"New Project"** button to launch the wizard.
3.  **Step 1: General Info** - Enter the Project Name and select a **Client** (e.g., "Internal Operations" or a specific corporate entity).
4.  **Step 2: Financial Governance** - 
    *   **Base Currency**: Choose the functional currency (USD or NGN).
    *   **Contract Value**: Enter the total revenue expected from this project.
    *   **Contingency & Taxes**: Define your safety margin (Contingency %) and applicable taxes (VAT/WHT).
5.  **Step 3: Strategic Context** - Enter RFQ numbers or Statement of Work (SOW) details for audit trails.

> [!TIP]
> Use the **"Health Filter"** on the portfolio page to instantly identify projects with significant budget variances.

---

## 2. Project Budgeting (WBS Master Builder)

SentinelFi uses a **Work Breakdown Structure (WBS)** for granular cost control.

### Building Your Budget
1.  Go to the **WBS Master Builder** (`/wbs-manager`).
2.  **Filter by Project**: Use the dropdown at the top right to select the project you just created.
3.  **Create Nodes**:
    *   **Top-Level**: Click "Add Top-Level Node" (e.g., `1.0 Site Preparation`).
    *   **Sub-Items**: Hover over a node and click the **"+"** icon to add child elements (e.g., `1.1 Surveying`, `1.2 Excavation`).
4.  **Allocate Funds**: 
    *   Click the **Edit (Pencil)** icon on any node.
    *   Enter the **Budgeted Amount** in your preferred display currency.
    *   The system automatically calculates "Rollups"—meaning parent nodes (1.0) will show the sum of all child node (1.1, 1.2) budgets.

---

## 3. Operational Budgeting (Monthly Engine)

Operational budgets handle non-project costs like Rent, Salaries, and Utilities.

### Managing Monthly Allocations
1.  Navigate to the **Operational Workspace** (`/operational-budgets/manage`).
2.  **Categories**: Switch to the "Categories" tab to define your expense line items (e.g., Office Supplies).
3.  **Budget Grid**:
    *   Select your fiscal year from the workspace dropdown.
    *   Enter planned amounts directly into the **Monthly Grid**.
    *   **Auto-Save**: Changes are saved locally and synced to the cloud every second.
    *   **Totalization**: The right-most column provides a yearly forecast for each category.

---

## 4. Expense Tracking & Live Auditing

Expenses are logged against specific WBS nodes or operational categories to provide real-time variance analysis.

### Logging a Project Expense
1.  Open the project's **Overview Dossier** (`/projects/[id]/overview`).
2.  In the **Live Expenses** section, click **"New Expense"**.
3.  Select the relevant **WBS Node**.
4.  Enter the **Actually Paid Amount** and the payment date.
5.  The system will instantly flag **Budget Overruns** if the expense exceeds the allocated WBS amount.

### Centralized Expense Journal
*   Navigate to the **Expense Journal** (`/expense/manage`).
*   Use the **Variance Filter** to see "Major Overruns" across all projects.
*   Click **"Download CSV"** to generate a local copy for accounting reconciliation.

---

## 5. Multi-Currency & Health Indicators

### Preferred Currency
*   SentinelFi is benchmarked in **USD**, but you can work in any currency.
*   Go to **Settings** (`/settings`) to change your **Display Currency**. 
*   All financial labels and values across WBS, Projects, and Dashboards will convert instantly using live exchange rates.

### Reading the Health Engine
*   **Green (Compliant)**: Actual spend is < 2% variance from budget.
*   **Yellow (At Risk)**: Spend is between 2% and 5% over budget.
*   **Red (Critical)**: Spend exceeds 5% of budget or is unbudgeted.

---
**Need Help?** Contact your IT Head for role-based permissions or see the [Developer Documentation](https://sentinelfi.docs).
