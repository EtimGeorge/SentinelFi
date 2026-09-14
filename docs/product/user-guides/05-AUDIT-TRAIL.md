# The Audit Trail

The Audit Trail is the foundation of accountability in SentinelFi. It records every administrative and financial action taken within your tenant schema.

---

## Navigating the Audit Log

### Global Search
Use the search bar at the top of **Admin > Security Audit Log**. You can search by:
- **User Email**
- **Action Type** (e.g., `APPROVE_REQUISITION`)
- **Target ID** (e.g., a specific Project ID)

### Filtering by Context
- **IP Address** - filter for actions originating from a specific network.
- **Date Range** - drill down into activity during a specific fiscal period or audit week.

---

## Interpreting an Entry

Every audit entry contains:
- **Timestamp** - the millisecond-accurate time the action was finalised.
- **Actor** - the name and role of the user (e.g., "John Doe (CFO)").
- **Action** - a clear verbal description (e.g., "Modified WBS category budget").
- **Correlation ID** - a unique trace-id you can provide to the SentinelFi Support team for deeper system debugging.

---

## Immutability and Safety
- **Anti-Tamper** - audit logs are read-only. No user, including the SuperAdmin, can delete a record.
- **PII Scrubbing** - SentinelFi automatically masks sensitive data (password hashes, API keys) before they reach the audit log.

---

## Tips
- **Export** - click **Download Audit Report (PDF)** at the end of every month for your compliance folder.
- **Trace** - click the magnifying glass on any entry to see the "Parent" action that triggered it (e.g., "This approval was triggered by Requisition #123").

---

*Next: [06: Project Portfolio Management](06-PROJECT-PORTFOLIO.md)*
