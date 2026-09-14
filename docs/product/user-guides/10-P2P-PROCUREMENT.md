# P2P Procurement Lifecycle

The **Procure-to-Pay (P2P)** lifecycle in SentinelFi automates the journey from an initial "Need" (Requisition) to the final "Payment" (LPO Liquidation).

---

## The 4-Stage Lifecycle

### Stage 1: Purchase Requisition (PR)
**Who**: any authorised Officer or Manager.

1. Navigate to **Corporate Operations > P2P Procurement**.
2. Click **New Requisition**.
3. Map the request to a **WBS Category** or **OPEX Category**.
4. Submit for Approval.

### Stage 2: Governance Review
**Who**: Manager, Director, or CFO (based on [DOA Tier](../../technical/ARCH-005-GOVERNANCE.md)).

The approver reviews the PR in the [Governance Hub](04-GOVERNANCE-HUB.md). The PR is either **Approved** (moving to LPO) or **Rejected** (sent back to the submitter with a mandatory reason).

### Stage 3: Local Purchase Order (LPO)
Once the PR is approved, the system generates a formal **LPO**. You can download it as a high-fidelity PDF to send to your vendor. The LPO amount is now **Committed** in the budget, preventing other users from spending that money.

### Stage 4: LPO Liquidation (Expense)
Once goods/services are delivered, the LPO must be liquidated:

1. Go to the LPO Dashboard.
2. Click **Liquidate as Expense**.
3. This automatically converts the commitment into an [Actual Expense](09-LOGGING-EXPENSES.md).

---

## Efficiency Metrics

- **Average Approval Time** - track how long PRs sit in the queue.
- **Vendor Reliability** - measure the time between LPO issuance and liquidation.

---

*Next: [11: OPEX Planning and Departmental Budgets](11-OPEX-PLANNING.md)*
