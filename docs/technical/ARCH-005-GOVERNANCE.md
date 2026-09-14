# ARCH-005: Governance & Budget Controls (DOA)

SentinelFi implements an enterprise-grade Governance engine to manage spending across thousands of Cost Centers and Projects. The core of this system is the **Delegation of Authority (DOA)** engine and real-time **Budget Variance Controls**.

## 🏛️ Delegation of Authority (DOA)

The `DOAService` centrally orchestrates spend authority based on user roles and historical spend normalizations.

### Authority Tiers
The system uses a 4-tier authority model:
- **TIER 1 (Officer)**: Preparation and submission of requisitions. No approval authority.
- **TIER 2 (Manager)**: Authority up to **$20,000 USD** (or NGN equivalent).
- **TIER 3 (Director/CFO)**: Authority up to **$100,000 USD**.
- **TIER 4 (Executive/CEO)**: Unlimited authority.

### Currency-Aware Validation
All thresholds are internally calculated in **USD** to ensure consistency across global project offices.
1. The service converts the requisition amount using the current `CurrencyService` spot rate.
2. It compares the USD-normalized value against the user's role-based ceiling.
3. If insufficient, it throws a `ForbiddenException` with a clear "Required Tier" message.

## 📊 Budget Variance Controls

The governance engine works in tandem with the `BudgetControlService` to prevent budget exhaustion before it happens.

### Variance Thresholds
- **OK**: Actual spend is within allocated budget.
- **WARNING**: Actual spend has reached **85%** of the allocated budget.
- **CRITICAL**: Actual spend has exceeded **100%** (Burn-rate exceeded).

### Automated Approval Logs
Every governance action is recorded in the `ApprovalLog` table, capturing:
- **Previous State**: The status before the action (e.g., PENDING).
- **New State**: The upgraded status (e.g., APPROVED).
- **Justification**: Mandatory notes for any overrides or director-level approvals.

## 🔗 Technical Integration

- **Service**: `backend/src/common/doa.service.ts`
- **Entity**: `backend/src/common/entities/approval-log.entity.ts`
- **Controller Decorator**: `@UseGuards(DoaGuard)` (applied to high-value project spend endpoints).

> [!IMPORTANT]
> Any adjustment to the `THRESHOLDS` constant in `DOAService` will immediately update the enforcement logic across all multi-tenant schemas.
