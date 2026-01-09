# SentinelFi: Comprehensive Guide to Budgeting and Expense Tracking

This guide provides a detailed overview of SentinelFi's budgeting and expense tracking functionalities, designed to empower users with real-time financial control and proactive precision. It covers everything from creating detailed budgets and managing Work Breakdown Structure (WBS) categories to tracking live expenses and generating insightful reports, all within a secure, multi-tenant environment.

---

## 1. Overview of Budgeting and Expense Tracking in SentinelFi

SentinelFi implements a hierarchical budgeting system based on the Work Breakdown Structure (WBS) methodology. This allows for granular control over project finances, from high-level categories down to individual line items. Approved budgets seamlessly integrate with the live expense tracker, enabling real-time variance analysis and proactive financial management. All operations respect Role-Based Access Control (RBAC) to ensure data integrity and security.

---

## 2. Creating and Managing Your Budget

The budget creation process in SentinelFi is designed to be intuitive and hierarchical, starting with broad categories and drilling down to specific line items.

### 2.1. WBS Structure: Projects, Categories, Sub-categories, and Line Items

SentinelFi organizes budgets using a WBS (Work Breakdown Structure) hierarchy:
*   **Projects**: Top-level initiatives (often defined by a Tenant/Client).
*   **Categories (Level 1 WBS)**: Broad classifications of work or expenditure within a project (e.g., 1.0 Project Management, 2.0 Engineering). These are managed centrally by Admin/Finance.
*   **Sub-categories (Level 2+ WBS)**: Further breakdown of categories into more specific tasks or cost centers (e.g., 1.1 Planning, 1.2 Reporting).
*   **Line Items**: The most granular level of the budget, representing individual tasks, purchases, or services (e.g., 1.1.1 Software License).

### 2.2. Navigating to the Budget Drafting Page

To begin drafting a new budget item:
1.  Log in to SentinelFi with appropriate permissions (e.g., Finance, Admin).
2.  Navigate to **Budget > Draft a New Budget** from the sidebar or quick links.
    *   Alternatively, use the direct URL: `/budget/draft`.

### 2.3. Step-by-Step Guide: Creating a New Budget Item

On the **Budget Drafting Page (`/budget/draft`)**, you will find a form structured into several sections:

#### a. WBS Allocation

This section defines where your new budget item fits into the overall project hierarchy.
*   **WBS Code**: Enter a unique code for this budget item (e.g., `1.1.1` for a line item under `1.1` Planning, or `2.1` for a sub-category under `2.0` Engineering). The system enforces hierarchical consistency.
*   **Parent WBS Element**: Select an existing WBS item to serve as the parent for your new entry.
    *   Choose `-- NO PARENT (New Level 1) --` if you are creating a new top-level category or a new project.
    *   The **"Existing WBS Structure"** card on the right provides a visual hierarchy of existing WBS elements for context. Use this to ensure proper placement of your new item.

#### b. General Information

Provide descriptive details for your budget item.
*   **Description**: A clear, concise description of the budget item (e.g., `Q3 Marketing Campaign Assets`).
*   **Vendor / Payee (Placeholder)**: Currently a text input. In a production environment, this would integrate with a vendor database.
*   **Duration (Days)**: The estimated duration of the task or expenditure in days.
*   **Required Date (Placeholder)**: A date input for when the budget item is needed.
*   **Justification / Notes**: Provide any relevant context or justification for this budget request.

#### c. Financials

Enter the core financial details.
*   **Unit Cost**: The cost per unit (e.g., cost per license, cost per ton of material).
*   **Quantity**: The number of units required.
*   **Total Estimated Cost**: This is automatically calculated as `Unit Cost * Quantity`.
*   **Budget Allocation Feedback**: SentinelFi provides real-time feedback on whether your `Total Estimated Cost` is "Within Budget" or highlights a "Potential Overrun" based on the remaining budget of the selected `Parent WBS Element`.

#### d. Attachments (Placeholder)

This section is a placeholder for uploading relevant documents (quotes, invoices, etc.) related to the budget item.

#### e. Saving Your Draft

1.  After filling all required fields, click the **"Save Draft"** button.
2.  A toast notification will confirm that your WBS line has been drafted successfully and is awaiting Finance approval.
3.  Drafts are recorded in the system with a `pending` status.

### 2.4. Approving a Budget Draft

Budget drafts require approval by users with **Finance** or **Admin** roles before they can be used for expense tracking.
1.  Log in as a user with Finance or Admin privileges.
2.  Navigate to **Approvals** from the sidebar.
3.  On the **Finance Document Approvals** page, review the list of **"Pending WBS Budget Drafts."**
4.  For each draft, you can:
    *   Click **"Approve"**: Marks the draft as `approved`, making it available for expense allocation.
    *   Click **"Reject"**: Marks the draft as `rejected`.

---

### 3. Budget Trickle-Down to Expense Tracking

Once a WBS budget line item is `approved`, it becomes available for selection in the Live Expense Tracker, allowing expenses to be allocated against the pre-approved budget.

### 3.1. Entering Live Expenses

1.  Log in as an **Assigned Project User** or other authorized role.
2.  Navigate to **Expense > Live Expense Tracker** from the sidebar or quick links.
3.  On the **Quick-Entry Terminal (`/expense/tracker`)**, you will find a form for logging new expenses.
    *   **WBS Category**: Select the specific approved WBS line item against which the expense is to be logged. The dropdown will only show approved WBS items.
    *   **Transaction Date**: The date of the expense.
    *   **Description**: A clear description of the expense.
    *   **Vendor / Payee (Placeholder)**: Text input for the vendor.
    *   **Base Amount (Unit Cost \* Quantity)**: The calculated total cost of the item(s).
    *   **Commitment/LPO (NGN)**: The amount committed via a Local Purchase Order (LPO) or other commitment.
    *   **Actual Paid Amount**: The actual amount paid for the expense.
    *   **Document Ref (Invoice/PV)**: Reference number for the supporting document.
    *   **Notes / Justification**: Any additional notes for the expense.
4.  **Real-time Budget Allocation Feedback**: As you select a WBS category and enter expense amounts, SentinelFi provides immediate feedback on whether your expense is "Within Budget" or indicates a "Potential Overrun" against the selected WBS item's remaining budget.
5.  Click **"LOG EXPENSE"** to record the transaction. Real-time variance checks are triggered upon logging.

### 3.2. Recent Live Entries

The **"RECENT LIVE ENTRIES"** card on the right provides a snapshot of your most recent expense logs. You can click **"View All History"** to see a comprehensive list of past expenses (links to a placeholder `/expense/history` page).

---

## 4. Managing WBS Categories (Create, Edit, Delete)

Users with **Admin** or **Finance** roles can directly manage the Level 1 WBS Categories (e.g., 1.0, 2.0).

### 4.1. Navigating to the WBS Category Manager

1.  Log in as Admin or Finance.
2.  Navigate to **Settings > WBS Category Manager** from the sidebar.
    *   Alternatively, use the direct URL: `/wbs-manager`.

### 4.2. Creating a New WBS Category

1.  On the **WBS Category Manager (`/wbs-manager`)** page, locate the **"Create New Category"** card on the right.
2.  **Code**: Enter a unique WBS code (e.g., `8.0`).
3.  **Description**: Provide a description (e.g., `New Projects / Unallocated`).
4.  Click **"Add Master Category"**. A toast notification will confirm creation.

### 4.3. Editing an Existing WBS Category

1.  In the **"Current Master Categories"** list, locate the category you wish to edit.
2.  Click the **"Edit"** (<Edit3>) icon.
3.  Modify the **Code** and/or **Description**.
4.  Click the **"Save Changes"** (<Save>) icon.

### 4.4. Deleting an Existing WBS Category

1.  In the **"Current Master Categories"** list, locate the category you wish to delete.
2.  Click the **"Delete"** (<Trash2>) icon.
3.  A confirmation modal will appear. Be aware that deleting a category can impact dependent projects.
4.  Confirm the deletion.

---

## 5. Budget Document Export & Reporting

SentinelFi allows for the generation and export of financial reports for analysis, sharing, and compliance.

### 5.1. Navigating to the Variance Analysis Page

1.  Log in with appropriate permissions (e.g., CEO, Finance, Operational Head, IT Head, Admin).
2.  Navigate to **Reports > Variance Analysis** from the sidebar or quick links.
    *   Alternatively, use the direct URL: `/reporting/variance`.

### 5.2. Generating and Exporting Reports

On the **Financial Variance Analysis Page (`/reporting/variance`)**:
1.  **Report Filters**: Use the filter controls to narrow down the data for your report:
    *   **Start Date / End Date**: Filter expenses within a specific period.
    *   **WBS Category**: Select a Level 1 WBS Category to focus the report.
    *   **Variance Status**: Filter for "Positive", "Negative", or "Major" variances.
2.  **Export Format**: Choose your desired output format from the dropdown (PDF, Excel, CSV).
3.  Click the **"Export Report"** button. A toast notification will indicate that report generation is in progress.
    *   **RBAC**: The system will ensure you only generate reports for data you are authorized to access.
    *   **Print/Download**: The generated report (once backend integration is complete) will be available for download.

### 5.3. Automated Reporting

For regularly scheduled reports:
1.  Navigate to **Reports > Schedule Report** (`/reporting/schedule`).
2.  Configure automated report generation and email distribution for key stakeholders.

---

## 6. Role-Based Access Control (RBAC) Summary

SentinelFi rigorously enforces RBAC to ensure users only access and modify data relevant to their roles. This table reflects the updated administrative roles.

| Feature Area                  | Roles with Access                                                                                             |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------ |
| **SuperAdmin Tenant Mgmt.**   | `SuperAdmin`                                                                                                  |
| **Admin Audit Log**           | `SuperAdmin`, `Admin`                                                                                         |
| **User Management**           | `SuperAdmin`, `Admin`, `IT Head`                                                                              |
| **Tenant Assignment in User Mgmt.** | `SuperAdmin` (only)                                                                                         |
| **Budget Drafting**           | `Finance`, `Admin`, `Assigned Project User`                                                                     |
| **Budget Approval**           | `Finance`, `Admin`                                                                                              |
| **Expense Tracking**          | `Assigned Project User`, `Admin`, `CEO`, `Finance`, `IT Head`, `Operational Head`                               |
| **WBS Category Mgmt.**        | `Admin`, `Finance`                                                                                              |
| **Executive Dashboard**       | `CEO`, `Finance`, `Admin`, `IT Head`, `Operational Head`                                                        |
| **Variance Reporting**        | `CEO`, `Finance`, `Admin`, `IT Head`, `Operational Head`                                                        |
| **Automated Reporting**       | `Finance`, `Admin`, `Operational Head`                                                                          |

---

## 7. Platform Administration

This section covers features accessible to `SuperAdmin` and `Admin` roles for managing the platform, its tenants, and its users.

### 7.1. SuperAdmin: Tenant Management

Users with the `SuperAdmin` role have access to a dedicated dashboard for managing all client tenants on the platform.

1.  **Login & Redirection**: Upon logging in, a `SuperAdmin` is automatically redirected to the **Tenant Management Dashboard** at `/super/tenants`.
2.  **View All Tenants**: This page displays a comprehensive table of all tenants, showing their name, status, and other relevant details.
3.  **Create New Tenant**:
    *   Click the **"Create New Tenant"** button to open a modal form.
    *   Enter the `Tenant Name` and an `Admin Email` for the new tenant's primary administrator.
    *   Upon submission, the system automatically:
        a. Creates the new `tenant` record.
        b. Provisions a new, isolated database schema for that tenant.
        c. Creates a new `user` account for the specified admin email, assigns them the `Admin` role, and links them to the new tenant. The new user will receive an email to set their password.

### 7.2. Admin: User Management & Tenant Assignment

The user management page is enhanced with tenant-assignment capabilities, strictly controlled by role.

1.  **Navigation**: Navigate to **Admin > User Management** from the sidebar or access `/admin/users`.
2.  **View Users**: The table lists all users. For `SuperAdmin` roles, it also displays which tenant each user belongs to.
3.  **Tenant Assignment (SuperAdmin only)**:
    *   When a `SuperAdmin` edits a user, a **"Tenant"** dropdown is enabled.
    *   This allows the `SuperAdmin` to assign or re-assign a user to any existing tenant.
    *   For all other roles (e.g., `Admin`), this dropdown is disabled to prevent unauthorized tenant changes.

### 7.3. Admin: Audit Log Viewer

For enhanced security and compliance, all key events are recorded in an audit log, which is viewable by `Admin` and `SuperAdmin` roles.

1.  **Navigation**: Navigate to **Admin > Audit Log** from the sidebar or access `/admin/audit-log`.
2.  **Data Visualization**: The page presents a bar chart visualizing the number of events per day, providing an at-a-glance overview of platform activity.
3.  **Filtering**: You can refine the audit log data using the filter controls:
    *   **Date Range**: Select a start and end date.
    *   **User Email**: Filter for events performed by a specific user.
    *   **Action Type**: Filter by the type of event (e.g., `LOGIN_SUCCESS`, `CREATE_TENANT`).
4.  **Data Table**: Below the chart, a paginated table displays the detailed log entries, including timestamp, the user who performed the action, the action itself, the target of the action, and other relevant details.

---

This guide provides the foundation for effectively utilizing SentinelFi's powerful financial management tools.