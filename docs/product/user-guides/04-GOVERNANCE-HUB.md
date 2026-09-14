# Governance Hub and Approvals

The Governance Hub is the "Traffic Control" for SentinelFi. It enforces **Delegation of Authority (DOA)** rules, ensuring no money leaves the organisation without proper sign-off.

---

## The Approval Queue

### Requisitions (Pending)
A list of all Purchase Requisitions (PRs) originating from procurement and expense logging. Every PR shows a **Budget Availability** bar, if it is in the **Red**, the spend will exceed the allocated WBS category.

### Multi-Tier Enforcement
- **Tier 2 (Manager)** - approve PRs up to $20,000 USD.
- **Tier 3 (Director)** - approve PRs up to $100,000 USD.
- **Tier 4 (Executive)** - unlimited approval authority; can unlock any pending requisition.

---

## Approving a Spend

1. **Locate the Item** - use the Search or Filter at the top of the queue.
2. **Review the Digital Signature** - every requisition is cryptographically linked to the user who submitted it.
3. **Check the Forecast** - the "Impact on Exhaustion Date" tooltip shows how approving this spend shifts your liquidity date.
4. **Action**:
   - **Approve** - moves the PR to the Approved state and generates an LPO if applicable.
   - **Reject** - prompts for a mandatory "Rejection Reason" sent back to the submitter via Notifications.

---

## Tips for Auditors
- **Bulk Action** - Directors can select multiple PRs and click **Bulk Approve**.
- **Signature Icon** - click to see the full Approval Log (every step from submission to final sign-off).

---

*Next: [05: The Audit Trail](05-AUDIT-TRAIL.md)*
