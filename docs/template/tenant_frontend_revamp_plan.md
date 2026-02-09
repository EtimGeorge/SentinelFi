# Tenant Frontend Revamp Plan: Aligning Vision with Reality

**Date:** 2026-01-28
**Status:** REVISED
**Author:** SentinelFi Project Manager Agent

---

## 1.0 Executive Summary & Problem Statement

**The Problem:**
The current SentinelFi Tenant Frontend does not align with the product vision of a robust, granular budgeting tool.
-   **Operational Budgeting:** Currently implemented as a flat list. It needs to be a **flexible, spreadsheet-style Monthly Budget** that supports **Custom Categories** (unique to each company) alongside System Defaults.
-   **Project Budgeting:** Currently focuses on WBS structure but lacks the comprehensive financial tracking found in industry-standard tools. It must be upgraded to match the structure of the **`comprehensive_Project_Budget_2.xls`** template, featuring granular expense tracking and budget-vs-actual analysis.

**The Goal:**
Transform the Tenant Frontend into a sophisticated financial command center:
1.  **Operational Budgeting Engine:** A flexible Grid (Spreadsheet) view for managing Monthly allocations across Custom and Default categories.
2.  **Project Budgeting Suite:** A robust implementation of the "Project Budgeting Template" including detailed tracking of Labor, Materials, and Overheads.

---

## 2.0 Findings & Gap Analysis

### 2.1 Operational Budgeting (The "Flexible Monthly" Gap)
| Feature | Current Reality | Required Vision | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Categories** | Hardcoded or Flat | **Dual-Layer:** System Defaults + Tenant Custom Categories | **CRITICAL** |
| **Time Horizon** | Single Start/End Date | **Monthly Grid:** Flexible columns (Jan, Feb...) | **CRITICAL** |
| **Interface** | Basic List View | **Spreadsheet Workspace:** Editable cells for ease of use | **HIGH** |
| **Backend** | Single Entity | **Granular Model:** `Category` + `PeriodAllocation` | **CRITICAL** |

### 2.2 Project Budgeting (The "Template" Gap)
| Feature | Current Reality | Required Vision | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Structure** | WBS Tree (Generic) | **Template-Aligned:** Labor, Materials, Subcontractors, etc. | **HIGH** |
| **Tracking** | Simple Expense Log | **Detailed Journal:** Align expenses to specific Budget Lines | **MEDIUM** |
| **Analysis** | simple "Burn" rate | **Variance Analysis:** Budget vs Actuals per line item | **MEDIUM** |
 **Reporting** | "Burn vs Received" | Planned vs Actual Cashflow Curve (S-Curve) | **MEDIUM** |
| **LPOs** | Display Table only | Integrated LPO Creation linked to WBS | **MEDIUM** |
---

## 3.0 Strategic Plan

### Phase 1: Operational Budgeting Overhaul (Foundation)

**Objective:** Build the "Spreadsheet Engine" and Category System.

**1.1 Data Model Redesign (Backend)**
-   **Category System:**
    -   `BudgetCategory`: `name`, `type`, `is_system_default` (bool), `tenant_id` (nullable).
    -   *Logic:* Tenants see "System Defaults" + "Their Own Categories".
-   **Allocation Engine:**
    -   `OperationalBudgetPeriod`: `category_id`, `period_date` (Month Start), `planned_amount`, `actual_amount`.

**1.2 Frontend: The "Budget Workspace"**
-   **Category Manager:** UI to Add/Edit/Hide categories.
-   **The Budget Grid:**
    -   Replaces `manage.tsx`.
    -   Rows = Categories (Grouped by "Default" vs "Custom" or Type).
    -   Columns = Months.
    -   Cells = Editable Inputs.

### Phase 2: Project Budgeting "Template" Implementation

**Objective:** Replicate and enhance the Excel Template experience.

**2.1 Template Alignment**
-   Refine WBS to support specific "Cost Types" (Labor, Material, etc.) as seen in the Excel file.
-   Implement "Cash Flow" tab to show spending over time.

---

## 4.0 Detailed Implementation Steps (Immediate)

### Step 1: Backend Foundations (Operational)
- [ ] Create `BudgetCategory` entity (System vs Tenant).
- [ ] Create `OperationalBudgetPeriod` entity (Monthly Allocations).
- [ ] Update `OperationalBudgetsService` to merge categories and handle grid saves.

### Step 2: Frontend "Budget Grid" & Categories
- [ ] Create `components/budgets/CategoryManager.tsx`.
- [ ] Create `components/budgets/BudgetGrid.tsx` (using AG Grid or TanStack).
- [ ] Refactor `manage.tsx` to host the new Workspace.

---

## 5.0 Critical Challenges
-   **Data Volume:** A grid with 50 categories x 12 months = 600 cells. We need efficient bulk-save APIs (`UPSERT`) to avoid 600 API calls.
-   **UX Consistency:** Ensure "System Categories" are distinguishable but behave seamlessly alongside "Custom Categories".

## 6.0 Action Required
Proceed with **Phase 1 Step 1: Backend Foundations**.
