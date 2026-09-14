# AI Communication and Messaging

The SentinelFi AI Assistant is more than a chatbot, it is an integrated member of your financial team, designed to give instant clarity on complex datasets.

---

## The AI Financial Assistant

### Interacting with the Bot
1. Click the **SentinelFi AI** bubble at the bottom-right of any page.
2. Open the chat window.
3. Type a specific query and press Enter:
   - `Summarize the variance for "Lagos HQ Renovation" for March.`
   - `Who approved the "General Supplies" requisition for $25,000?`
   - `Generate a 3-point risk analysis based on our current burn-rate.`

### Context Injection
The bot analyses the current URL. If you are on the [WBS Designer](07-WBS-DESIGNER.md), it pulls the data for that specific project ID into its reasoning window automatically.

---

## Notifications and Instant Alerts

### Real-Time Sync
Whenever a critical action occurs (e.g., a budget variance exceeds 10%), the system sends an instant notification through a [real-time WebSocket architecture](../../technical/ARCH-006-NOTIFICATIONS.md). Check the **Bell Icon** at the top-right to view your unread count.

### Alert Types
- **Variance Warning** - triggered when a project hits 85% of its allocated budget.
- **Approval Request** - notifies Directors when a high-value requisition is waiting in the queue.
- **Report Ready** - notifies you when a long-running PDF export is finished and available in the [Document Archive](15-DOCUMENT-ARCHIVE.md).

---

## Team Messaging and Collaboration

### Shared Project Threads
Every project has its own integrated messaging thread for communication between the Project Manager and the CFO. For accountability, these messages are linked to the project's [Audit Trail](05-AUDIT-TRAIL.md).

---

## Best Practices
- **Be Specific** - when asking the AI bot, specify the **Project Name** or **Fiscal Period** for better accuracy.
- **Read Your Alerts** - notifications are the first line of defence against over-expenditure. Review them daily.

---

### Conclusion of the User Guide
You have completed the full SentinelFi user guide. For deeper technical details or infrastructure setup, refer to the [Master System Documentation Index](../../MASTER_DOCUMENTATION.md).