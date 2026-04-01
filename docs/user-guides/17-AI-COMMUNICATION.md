# 💬 17: AI Communication & Messaging

The SentinelFi AI Assistant is more than a chatbot—it’s an integrated member of your financial team, designed to give you instant clarity on complex datasets.

---

## 🧠 The AI Financial Assistant

### 1. Interacting with the Bot (Step-by-Step)
- **Access**: Click the **"SentinelFi AI"** floating bubble at the bottom-right of any page.
- **The Process (What to Type)**: 
  1. Open the chat window.
  2. Type a specific query and hit `Enter`. 
  - *Example*: `Summarize the variance for "Lagos HQ Renovation" for March.`
  - *Example*: `Who approved the "General Supplies" requisition for $25,000?`
  - *Example*: `Generate a 3-point risk analysis based on our current burn-rate.`

### 2. Context Injection (How it Works)
- **The Behavior**: The bot analyzes the current URL. If you are on the **[WBS Designer](file:///c:/temp/SentinelFi/docs/user-guides/07-WBS-DESIGNER.md)**, it pulls the data for that specific project ID from the database into its reasoning window automatically.


---

## 🔔 Notifications & Instant Alerts

### 1. Real-Time Sync
- **What it is**: Whenever a critical action occurs (e.g., a budget variance exceeds 10%), the system sends an instant notification through the **[Raw WebSocket Architecture](file:///c:/temp/SentinelFi/docs/ARCH-006-NOTIFICATIONS.md)**.
- **Action**: Check the "Bell Icon" at the top-right to view your unread notification count.

### 2. Alert Types
- **Variance Warning**: Triggered when a project hits 85% of its allocated budget.
- **Approval Request**: Notifies **Directors** when a high-value requisition is waiting in the queue.
- **Report Ready**: Notifies you when a long-running PDF export is finished and available in the **[Document Archive](file:///c:/temp/SentinelFi/docs/user-guides/15-DOCUMENT-ARCHIVE.md)**.

---

## 💬 Team Messaging & Collaboration

### 1. Shared Project Threads
- Every project has its own integrated messaging thread for communication between the **Project Manager** and the **CFO**.
- **Audit Trace**: For accountability, these messages are linked to the project's **[Audit Trail](file:///c:/temp/SentinelFi/docs/user-guides/05-AUDIT-TRAIL.md)**.

---

## 🛡️ Best Practices
- **Be Specific**: When asking the AI bot, specify the **Project Name** or **Fiscal Period** for better accuracy.
- **Read Your Alerts**: Notifications are the "First Line of Defense" against over-expenditure. Ensure your team reviews them daily.

---

### ✅ Conclusion of the User Guide
You have completed the full encyclopedic guide for SentinelFi. For deeper technical details or infrastructure setup, refer back to the **[Master System Documentation Index](file:///c:/temp/SentinelFi/docs/MASTER_DOCUMENTATION.md)**.
