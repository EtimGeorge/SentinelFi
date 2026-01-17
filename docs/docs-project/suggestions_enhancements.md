# Advanced Enhancements: Financial Control & Operational Excellence

## 1. Unified Project Workspace (UPW)
Instead of a single "Overview" page, implement a Tabbed Workspace for projects:
*   **Tab A: Financial Dashboard**: High-level KPIs, Burn Rate, and Variance Charts.
*   **Tab B: Budget Ledger (WBS)**: The hierarchical builder (Master WBS) scoped specifically to the project ID.
*   **Tab C: Expense Journal**: A searchable, filterable list of all payments made against this project.
*   **Tab D: Procurement/LPOs**: Unique to projects - tracking committed costs before they become actual cash expenses.

## 2. Advanced Project Controls
*   **Contingency Allocation**: Every project budget should have a "Contingency" line (usually 5-10%) that requires special CEO approval to "draw down" from.
*   **Multi-Currency Template**: Allow projects to be defined in NGN but track foreign procurement in USD/GBP with automatic exchange rate fetching (or manual pegged rates).
*   **Tax/Retention Automation**: Automatic deduction of Withholding Tax (WHT) and VAT calculation during expense logging.

## 3. Operational Budget: The "Internal Annual" Engine
Transform the Operational module to handle "Company Vitals":
*   **Payroll Bridge**: A dedicated sub-module for "Salaries & Welfare".
    *   Fields: Base Pay, Bonus, Overtime, Pension, Tax (PAYE).
    *   Automated monthly budget deduction (Monthly Salaried Spend).
*   **Recurring Overheads**: Auto-generation of budget lines for Rent, Software Subscriptions, and Utilities based on annual forecasts.
*   **Variance Guard**: Unlike projects, operational variance should trigger "Budget Freeze" if exceeded by a certain threshold (%) without CEO override.

## 4. Intelligent User Journey (UX)
*   **Project Setup Wizard**:
    1.  Define Project Meta (Client, Start/End).
    2.  Set Financial Constraints (Currency, Margin Goal).
    3.  Select WBS Template (Internal AI or Standard Template).
    4.  Initial Approval Request.
*   **Smart Expense Picker**: When logging an expense, provide a hierarchical dropdown of the Project's WBS to ensure every Naira is mapped to the correct budget line.

## 5. Reporting & Analytics
*   **Project Gross Margin (PGM)**: Real-time calculation: `(Initial Budget - Actual Spent - Committed LPOs)`.
*   **Cash Flow Heatmap**: Compare Project expenditure cycles vs Operational spend to predict cash shortages.
