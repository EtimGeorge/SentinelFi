# 🕰️ 15: Document Archive & Retrieval

The Document Archive serves as the "Vault" for all high-fidelity financial reports generated within your tenant. It ensures that every **[Intelligence Narrative](file:///c:/temp/SentinelFi/docs/user-guides/14-REPORTING-HUB.md)** or **[WBS Budget Export](file:///c:/temp/SentinelFi/docs/user-guides/08-PROJECT-BUDGETING.md)** is preserved for historical audit.

---

## 🔍 Locating Historical Reports

### 1. The Global Archive
- **Path**: Navigate to **"Reporting -> Document Archive"**.
- **The Interface**: A list of all generated PDFs, sorted by date and report type.

### 2. Search & Filter
- **By Date**: Select a specific month or year to find historical board presentations.
- **By Category**: Filter for "WBS Exports", "Forensic Summaries", or "LPO Packages".

---

## 🗄️ Managing Archived Files

### 📂 Downloading a Report
- **Single Download**: Click the **Download (PDF)** icon on any row to retrieve the file to your local machine.
- **Bulk Download**: Select multiple rows and click **"Export ZIP"** to grab a batch of reports for an audit review.

### 🗑️ Archiving vs. Deleting
- **The Behavior**: For compliance reasons, you cannot delete a generated report once it has been saved to the archive.
- **The Strategy**: If a report becomes "Obsolete," use the **"Hide"** toggle to remove it from the primary view while keeping it in the underlying schema for audit purposes.

---

## 🛡️ Efficiency & Reliability
- **Digital Signatures**: Every archived report includes a digital watermark and a **Correlation ID** from the **[Audit Trail](file:///c:/temp/SentinelFi/docs/user-guides/05-AUDIT-TRAIL.md)**.
- **PII Scrubbing**: Historical reports are automatically scrubbed of sensitive user credentials during generation, ensuring that clear-text passwords are never stored in the archive.

---
*Next: [16: SuperAdmin Controls](file:///c:/temp/SentinelFi/docs/user-guides/16-SUPERADMIN-CONTROLS.md)*
