# ARCH-008: Operational Budgeting (OPEX) Engine

SentinelFi provides a comprehensive engine for managing recurring departmental expenditures, alongside its project-based (CAPEX) controls. This is handled by the **Operational Budgeting (OPEX)** system.

## 🏢 CAPEX vs. OPEX

- **CAPEX (Capital Expenditure)**: Project-based, time-limited, and often involves capital-heavy investments (e.g., building a facility).
- **OPEX (Operational Expenditure)**: Departmental, recurring, and focused on day-to-day operations (e.g., payroll, utility bills, office rent).

## 📅 Period-Based Allocation

Unlike project budgets which may span years, OPEX budgets are strictly tied to **Fiscal Periods**.

### Allocation Logic
1.  **Budget Categories**: Hierarchical structures (e.g., "Human Resources" -> "Training").
2.  **Period Allocation**: Each category is assigned a specific budget amount for a given period (e.g., "Monthly Budget for Utilities").
3.  **Consumption**: Expenses are recorded against these period-specific allocations.

## 💰 Payroll Integration

One of the most significant components of the OPEX engine is **Payroll Coordination**.

### PayrollEntry Entity
- **Base Pay + Allowances**: Captured for each staff member.
- **Dynamic Allocation**: Staff payroll can be split across different departments or even tied to specific project overheads.
- **Automated Burn**: Payroll is automatically deducted from the department's monthly OPEX allocation.

## 📈 Real-Time Variance Analysis

The OPEX engine performs continuous variance checking.

- **Allocated**: The total budget granted for the period.
- **Actual**: Real-time consumption (spent + committed).
- **Variance**: The difference, used for executive reporting and cost-center "overrun" alerts.

---

- **Service**: `backend/src/operational-budgets/operational-budgets.service.ts`
- **Entity**: `backend/src/operational-budgets/operational-budget.entity.ts`
- **Payroll**: `backend/src/operational-budgets/payroll-entry.entity.ts`
