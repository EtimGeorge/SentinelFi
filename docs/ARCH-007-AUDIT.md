# ARCH-007: Enterprise Audit Strategy

SentinelFi maintains an immutable, high-fidelity audit trail of all administrative and financial activities to ensure compliance and complete traceability across multi-tenant environments.

## 🛡️ Audit Principles

The architecture follows a **Fire-and-Forget** pattern to ensure that auditing logic never impacts the performance of the core financial transactions.

### 1. Zero-Blocking Execution
- The `AuditService.log()` method wraps the database save operation in a `catch` block.
- If the audit log fails, the primary transaction (e.g., approving a requisition) still succeeds, ensuring business continuity.
- Failures in the audit system are captured in the system-level `CorrelatedLogger`.

### 2. High-Fidelity Context
Every audit entry captures:
- **Actor Identity**: User ID, Email, and Name.
- **Action Context**: IP Address, User Agent, and Action Type (e.g., `APPROVE_REQUISITION`).
- **Target Tracking**: The specific `targetId` (e.g., Project ID) and `targetType` affected.
- **Tenant Scope**: Strict `tenantId` assignment for partitioned multi-tenancy.

## 🧩 Technical Implementation

- **Service**: `backend/src/audit/audit.service.ts`
- **Entity**: `backend/src/audit/audit.entity.ts`
- **Search Logic**: Supports date-ranges, partial action matching (`Like`), and user-specific traces.

### Correlated Tracking
The audit system integrates with the **Correlated Logger**. This means that a single user action (e.g., creating a project) can be traced from the raw log files into the `AuditLog` table using the same **Correlation ID**.

## 🛡️ PII & Sanitization

To ensure data privacy (GDPR/NDPR compliance), the audit system **never** stores:
- Clear-text passwords.
- Full session tokens.
- Sensitive vendor bank details (only masked versions or references).

---

> [!TIP]
> Use the **Audit Trail** dashboard in the Admin portal to view real-time traces for any specific user or project activity.
