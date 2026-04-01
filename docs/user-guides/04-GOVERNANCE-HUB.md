# ⚖️ 04: Governance Hub & Approvals

The Governance Hub is the "Traffic Control" for SentinelFi. It enforces the **Delegation of Authority (DOA)** rules, ensuring that no money leaves the organization without proper sign-off.

---

## 🏛️ The Approval Queue

### 1. Requisitions (Pending)
- **What you see**: A list of all Purchase Requisitions (PRs) originating from procurement and expense logging.
- **The Variance Guardrail**: Every PR shows the "Budget Availability" bar. If it's in the **Red**, the spend will exceed the allocated WBS category.

### 2. Multi-Tier Enforcement
- **Tier 2 (Manager)**: You will see and can approve PRs up to **$20,000 USD**.
- **Tier 3 (Director)**: You will see and can approve PRs up to **$100,000 USD**.
- **Tier 4 (Executive)**: You have unlimited approval authority and can "Unlock" any pending requisition.

---

## ✅ The Process: Approving a Spend

1. **Locate the Item**: Use the Search or Filter at the top of the queue to find a specific vendor or project.
2. **Review the Digital Signature**: Every requisition is cryptographically linked to the user who submitted it.
3. **Check the Forecast**: Look for the "Impact on Exhaustion Date" tooltip. It shows how approving this spend will shift your liquidity date.
4. **Action**: 
   - **Click "Approve"**: Moves the PR to the **Approved** state and generates an LPO (if applicable).
   - **Click "Reject"**: Prompts you for a mandatory "Rejection Reason" which is sent back to the submitter via **Notifications**.

---

## 🧭 Pro-Tips for Auditors
- **Bulk Action**: If you are a Director, you can select multiple PRs and click **"Bulk Approve"** to speed up processing.
- **The "Signature" Icon**: Click it to see the full **Approval Log** (every step from submission to final sign-off).

---
*Next: [05: The Audit Trail](file:///c:/temp/SentinelFi/docs/user-guides/05-AUDIT-TRAIL.md)*
