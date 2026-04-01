# 🛡️ 05: The Audit Trail

The Audit Trail is the foundation of accountability in SentinelFi. It records every administrative and financial action taken within your tenant schema.

---

## 🔍 Navigating the Audit Log

### 1. The Global Search
- **Action**: Use the search bar at the top of the **Admin -> Audit Log** page.
- **Support**: You can search by **User Email**, **Action Type** (e.g., `APPROVE_REQUISITION`), or **Target ID** (e.g., a specific Project ID).

### 2. Filtering by Context
- **IP Address**: Filter for actions originating from a specific network.
- **Date Range**: Drill down into activity during a specific fiscal period or audit week.

---

## 🧭 Interpreting an Entry

Every audit entry contains a "Dossier" of information:
- **Timestamp**: The millisecond-accurate time the action was finalized.
- **Actor**: The name and role of the user (e.g., *"John Doe (CFO)"*).
- **Action**: A clear verbal description (e.g., *"Modified WBS category budget"*).
- **Correlation ID**: A unique trace-id. You can provide this to the **SentinelFi Support** team if you need to debug a deeper system issue.

---

## 🛡️ Immutability & Safety
- **Anti-Tamper**: Audit logs are **read-only**. No user, including the SuperAdmin, can delete a record from the audit trail.
- **PII Scrubbing**: SentinelFi automatically masks sensitive data (like password hashes or API keys) before they reach the audit log.

---

### ✅ Pro-Tips
- **Exporting**: Click **"Download Audit Report (PDF)"** at the end of every month for your compliance folder.
- **The "Trace" Button**: Click the magnifying glass on any entry to see the "Parent" action that triggered it (e.g., *"This approval was triggered by Requisition #123"*).

---
*Next: [06: Project Portfolio Management](file:///c:/temp/SentinelFi/docs/user-guides/06-PROJECT-PORTFOLIO.md)*
