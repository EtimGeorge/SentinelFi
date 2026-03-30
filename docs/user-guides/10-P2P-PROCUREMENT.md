# 🛒 10: P2P Procurement Lifecycle

The **Procure-to-Pay (P2P)** lifecycle in SentinelFi automates the journey from an initial "Need" (Requisition) to the final "Payment" (LPO Liquidation).

---

## 🏗️ The 4-Stage Lifecycle

### Stage 1: Purchase Requisition (PR)
- **Who**: Any authorized **Officer** or **Manager**.
- **Process**: 
  1. Navigate to **"Corporate Operations -> P2P Procurement"**.
  2. Click **"New Requisition"**.
  3. Map the request to a **WBS Category** or **OPEX Category**.
  4. Submit for Approval.

### Stage 2: Governance Review
- **Who**: **Manager**, **Director**, or **CFO** (based on **[DOA Tier](file:///c:/temp/SentinelFi/docs/ARCH-005-GOVERNANCE.md)**).
- **Process**: The approver reviews the PR in the **[Governance Hub](file:///c:/temp/SentinelFi/docs/user-guides/04-GOVERNANCE-HUB.md)**.
- **Outcome**: The PR is either **Approved** (moving to LPO) or **Rejected** (sent back to the submitter).

### Stage 3: Local Purchase Order (LPO)
- **What**: Once the PR is approved, the system generates a formal **LPO**.
- **Action**: You can download the LPO as a **High-Fidelity PDF** to send to your vendor.
- **Commitment**: The LPO amount is now "Committed" in the budget, preventing other users from spending that money.

### Stage 4: LPO Liquidation (Expense)
- **What**: Once the goods/services are delivered, the LPO must be "Liquidated."
- **Process**: 
  1. Go to the **LPO Dashboard**.
  2. Click **"Liquidate as Expense"**.
  3. This automatically converts the commitment into an **[Actual Expense](file:///c:/temp/SentinelFi/docs/user-guides/09-LOGGING-EXPENSES.md)**.

---

## 🛡️ Efficiency Metrics

- **Average Approval Time**: Track how long PRs sit in the queue.
- **Vendor Reliability**: Measure the time between LPO issuance and liquidation.

---
*Next: [11: OPEX Planning & Departmental Budgets](file:///c:/temp/SentinelFi/docs/user-guides/11-OPEX-PLANNING.md)*
