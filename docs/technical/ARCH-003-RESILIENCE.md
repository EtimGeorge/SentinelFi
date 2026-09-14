# ARCH-003: Enterprise Resilience Architecture

SentinelFi is designed to remain operational even when upstream dependencies (External APIs, AI Agent) fail. We follow "Fail Fast, Recover Gracefully" patterns.

## 1. Circuit Breakers

To prevent cascading failures, critical services are wrapped in Circuit Breakers.

*   **Implementation**: Manual state management in `AiAssistantService`.
*   **Thresholds**: 
    - 3 consecutive failures trigger the **OPEN** state.
    - **Reset Timeout**: 30 seconds.
*   **Fallback Logic**: When the circuit is open, the system returns meaningful error messages or cached data instead of timing out, preserving the user experience.

## 2. Integrated Resilience (Frontend)

The frontend uses a `Resilience` wrapper (`lib/resilience.ts`) to handle transient networking issues.

*   **Retries**: Automatic 3-retry strategy for GET requests.
*   **Timeouts**: Global 10s timeout for standard UI fetching.
*   **Loading States**: Integrated with a centralized `uiStore` (Zustand) to provide feedback during recovery.

## 3. Global Exception Handling

Transparent error reporting is handled by the `AllExceptionsFilter`.

*   **Centralized Logging**: All errors are logged with a `correlationId` to link frontend reporting with backend server logs.
*   - **Security**: The filter ensures that internal stack traces are **never** exposed to the user in production, only clean error codes.

## 4. Data Safety (Soft-Delete)

Accidental deletion in a financial system is a disaster. We enforce **Soft-Delete** globally.

*   **Pattern**: Entities use `@DeleteDateColumn() deleted_at: Date;`.
*   **Querying**: TypeORM's `.find()` and `.findOne()` automatically ignore deleted records. 
*   **Recovery**: A record can only be definitively purged via a `SuperAdmin` action or manual SQL intervention.

---
*Precision. Resilience. Intelligence. SentinelFi.*
