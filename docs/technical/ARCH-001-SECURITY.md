# ARCH-001: Security & Identity Architecture

SentinelFi implements a "Defense-in-Depth" security model, combining strict token management with automated data sanitization and in-memory optimization.

## 1. Authentication Strategy (JWT)

We use a dual-mode JWT extraction strategy, supporting both standard Bearer headers and Secure/HttpOnly cookies for enhanced CSRF protection.

*   **Implementation**: `JwtStrategy` (NestJS/Passport).
*   **Deduplicated Validation**: To handle high concurrency (10k+ users), `JwtStrategy` implements **In-Flight Query Deduplication**. If 50 simultaneous requests arrive for the same user, only **one** hits the database; the others wait for the same promise.
*   **Tiered Caching**:
    *   **Level 1**: `InMemoryAuthCache` (Fastest, per-node).
    *   **Level 2**: Redis-backed cache for cross-node synchronization (Planned/Enterprise).

## 2. Authorization & RBAC

Access control is enforced via a hierarchical Role-Based Access Control (RBAC) system.

*   **Roles**: Defined in `Role` enum (e.g., `SuperAdmin`, `AdminDirector`, `FinanceOfficer`).
*   **Guards**: 
    - `JwtAuthGuard`: Authenticates the user.
    - `TenancyGuard`: Resolves the tenant context.
    - `TenantAccessGuard`: Verifies the user belongs to the requested tenant.
*   **Permissions**: Granular string-based permissions (e.g., `projects:write`) are encoded in the JWT payload.

## 3. Data Masking & PII Protection

To remain compliant with financial regulations (GDPR/NDPR), we enforce automated PII scrubbing.

*   **LogSanitizationInterceptor**: A global interceptor that recursively scans request bodies and response data.
*   **Protected Keys**: `password`, `ssn`, `bank_account`, `accessToken`, `secret`, etc.
*   **Behavior**: Sensitive fields are replaced with `[MASKED]` in all application logs (Console, Audit Trails).

## 4. Token Revocation (Blacklisting)

Standard stateless JWTs cannot be revoked. SentinelFi solves this by maintaining a **JTI-based Blacklist**.

*   **Logout**: When a user logs out, the unique JWT ID (`jti`) is added to the `TokenBlacklistService`.
*   **Check**: Every request validation checks the `jti` against the blacklist before granting access.

---
*Precision. Resilience. Intelligence. SentinelFi.*
