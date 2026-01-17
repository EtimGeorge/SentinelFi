# Audit Findings: SentinelFi Project & Operational Architecture

## 1. Project Management Flow
**Current State**: The system allows for project creation (ID, Name, RFQ, SOW) and lists them in a portfolio view. Linking to budgets happens via the `wbs_id` in `LiveExpenseEntity` and `project_id` in `WbsBudgetEntity`.

### Inconsistencies & Flaws
*   **Decoupled Creation**: User creates a project in the "Projects" module, but must navigate to "WBS Manager" or "AI Draft" to build the budget. There is no unified "Project Setup Wizard" that forces/guides the creation of a budget immediately after project initialization.
*   **The "Overview" Trap**: The `pages/projects/[id]/overview.tsx` is a monolithic catch-all. It displays a list of budgets and a list of expenses. For professional accounting, this lacks the depth required for complex projects with hundreds of line items.
*   **Loose Project Association**: In `WBSManagerPage`, the logic to associate a new item with a project is a placeholder (`items[0]?.project_id`). This would cause data leakage across projects in a multi-project environment.
*   **Missing Financial Metadata**: Projects lack basic financial configuration such as "Tax ID," "Retention %," "Contingency Fund," and "Base Currency" (vital for NGN/USD conversions).

## 2. Operational Budget vs. Project Budget
**Current State**: Two distinct modules exist. `OperationalBudgetEntity` tracks company-wide spend, while `WbsBudgetEntity` tracks project-specific spend.

### Findings
*   **Feature Parity Gap**: Project budgets (WBS) support hierarchical rollups (e.g., 1.0 -> 1.1). Operational budgets appear to be flat lists without the "Employee Welfare" or "Payroll" depth requested.
*   **Payroll Disconnect**: There is no entity or logic for "Employee Salaries" or "Bonuses" within the operational module. These are currently just generic budget lines.
*   **User Journey**: The "Operational Budgets" page is "hidden" in the folder structure and not prominently featured in the main dashboard navigation, suggesting it is an underdeveloped limb of the app.

## 3. Uncompleted Flows & Placeholders
*   **Edit/Delete Logic**: In `project/[id]/overview.tsx`, the `handleEditBudget` and `handleEditExpense` functions are mere `alert()` placeholders.
*   **Approval Gates**: While the `Approvals` page exists, the bridge between "Draft WBS" and "Active Project Budget" is manual and lacks a "Locking" mechanism (i.e., you shouldn't be able to log expenses against a non-approved project).
*   **Reporting**: No "Project P&L" view currently calculates the real-time gross margin (Budget vs. Actual).

## 4. User Journey Gaps
*   **The "Draft" state**: Projects don't have a clear "Proposal" vs "Live" status that changes how budgeting behaves.
*   **Expense Entry**: Entering a live expense requires knowing the WBS code. There is no "Search/Searchable Dropdown" in the core expense entry flow that helps a user find the correct budget line item.
