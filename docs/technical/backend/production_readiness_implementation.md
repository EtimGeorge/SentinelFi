# Production Readiness Implementation Roadmap

This document outlines the phased implementation plan based on the **Production Readiness Audit**. The goal is to elevate the SentinelFi backend to production standards for security, stability, and observability.

## Phase 1: Security & Dependency Stabilization
**Priority: Critical**

1.  **Framework Upgrade**:
    - Update `next` and related core dependencies to eliminate the high-risk vulnerability in v14.1.4.
    - Run `npm audit fix --force` to resolve deprecated `glob`, `eslint`, and other vulnerable packages.
    - Perform a clean `npm install` and verify build stability.

2.  **Environment Validation**:
    - Implement a strict configuration validator in `ConfigModule` (using `Joi` or `class-validator`) to ensure all production variables (e.g., `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`) are valid and non-empty at startup.

## Phase 2: Observability & Standardized Error Handling
**Priority: High**

1.  **Global Exception Filter**:
    - Create `src/common/filters/all-exceptions.filter.ts`.
    - Catch all `HttpException` and unknown `Error` types.
    - Standardize the response format: `{ statusCode, message, timestamp, path, correlationId }`.
    - Ensure internal stack traces are **only** logged to `CorrelatedLogger` and **never** returned in production HTTP responses.

2.  **Health Check Endpoint**:
    - Implement a dedicated health controller (e.g., `/api/v1/health`) using `@nestjs/terminus`.
    - Integrate existing `DatabaseConfig.validateConnection` into the health check logic.

## Phase 3: Middleware & Security Hardening
**Priority: Medium-High**

1.  **Security Headers (Helmet)**:
    - Install and configure `helmet`.
    - Enable CSP (Content Security Policy), HSTS (Strict-Transport-Security), and other standard protections.

2.  **Global Throttling (Rate Limiting)**:
    - Implement `ThrottlerModule` across the entire API.
    - Set aggressive limits for authentication, audit exports, and bulk import endpoints to mitigate brute-force and DoS risks.

## Phase 4: Data Integrity & Typing Refinement
**Priority: Medium**

1.  **Strict Typing Enforcement**:
    - Replace usage of `req: any` with the `AuthenticatedRequest` interface across all controllers.
    - Audit `WbsController` and `AuditController` specifically for loose typing in body/query parameters.

2.  **DTO Hardening**:
    - Update `GetAuditLogsDto` and other filter DTOs with stricter decorators (e.g., `@IsEmail()`, `@MaxLength()`).
    - Enable `forbidNonWhitelisted: true` globally in `ValidationPipe` to prevent mass assignment attacks.

---

## Maintenance & Verification
- **Automated Scanning**: Integrate `npm audit` into the CI/CD pipeline to block builds with high-risk vulnerabilities.
- **Log Monitoring**: Ensure all production logs are streamed to a centralized sink (e.g., CloudWatch, ELK) for real-time alerting on `correlationId` tracks.
