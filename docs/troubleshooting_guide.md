# SentinelFi Production Troubleshooting Guide

## 🎯 Quick Diagnosis Commands

### Check Database Connection Pool Health
```bash
# In backend logs, look for:
[DatabaseConfig] Pool Health - Total: X, Idle: Y, Waiting: Z

# Healthy indicators:
# - Waiting: 0-2 (occasional)
# - Idle: 3-10 (good buffer)
# - Total: 5-15 (normal load)

# WARNING signs:
# - Waiting: 5+ (pool exhaustion)
# - Idle: 0 with Total: 15+ (running hot)
```

### Monitor Login Performance
```bash
# Backend logs show timing:
[LOGIN] ✓ Login completed successfully for user@example.com in 234ms

# Acceptable: <500ms
# Concerning: 500-1000ms
# Critical: >1000ms (indicates DB issues)
```

### Check Circuit Breaker Status (Frontend `next.config.js`)
```bash
# In Next.js terminal, if proxy fails repeatedly:
[CircuitBreaker] Circuit OPENED after 5 failures

# This prevents cascading failures
# Circuit will auto-reset after 30 seconds
```

---

## 🔴 Common Issues & Solutions

### Issue 1: "socket hang up" or Frontend 500 Error on Login

**Symptoms:**
- Frontend (Browser Network Tab): `POST /api/v1/auth/login/...` results in a `500 Internal Server Error`.
- Frontend (Dev Server Logs - Next.js): `Failed to proxy ... Error: socket hang up` or `ECONNRESET`.
- Backend (Console): Logs show successful authentication, JWT generation, and cookie setting.

**Root Causes & Fixes:**

#### A. Database Connection Timeout/Exhaustion
**Symptoms:** Intermittent `ERROR [ExceptionsHandler] error: Authentication timed out` or `Connection terminated unexpectedly` in backend logs.
**Solution:**
1.  **Verify PostgreSQL Status:** Ensure your PostgreSQL server is running and accessible.
2.  **Check `backend/.env` `DATABASE_URL`:** Confirm `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` are correctly configured and the password is URL-encoded if it contains special characters.
3.  **Test Direct DB Connection:** Use `psql -h <host> -U <user> -d <database>` to verify connectivity.
4.  **Restart PostgreSQL:** `sudo service postgresql restart` (Linux/Mac) or via Services (Windows).
5.  **Monitor Pool Health:** Check backend logs for `[DatabaseConfig] Pool Health` messages. If `Waiting` count is high, it indicates exhaustion.

#### B. Audit Log Transaction Hanging
**Symptoms:** Backend logs show successful authentication but hang after `query: INSERT INTO "public"."audit_log"` or `query: COMMIT` during login.
**Solution:**
1.  **Verify `audit_log` table:** Confirm the `audit_log` table exists in your database (`\dt audit_log` in `psql`).
2.  **Run Migrations:** If missing, run `cd backend && npm run typeorm migration:run` (or the equivalent script for your setup).
3.  **Check Audit Log Timeout:** The `SafeTransaction` for audit logging has a 3-second timeout. If the database is extremely slow, this might still be hit. Monitor logs for `[LOGIN] Audit log created successfully` vs. `[logAuditAsync] Failed to log audit`.

#### C. Backend Response Streaming Failure
**Symptoms:** Backend completes processing but the frontend never receives the full response due to premature connection termination.
**Solution (Client-side Debugging):**
1.  **Clear Browser Cache/Site Data:** For `http://localhost:3000` (or your frontend URL). Stale cookies can cause issues.
2.  **Restart Backend & Frontend (Clean Order):**
    *   Terminal 1: `cd backend && npm run start:dev` (wait for "Backend server running...")
    *   Terminal 2: `cd frontend && npm run dev`
3.  **Verify `frontend/next.config.js` Proxy:** Ensure `NEXT_PUBLIC_API_URL` environment variable points to the correct backend address (e.g., `http://localhost:3001/api/v1`). Check if `Failed to proxy ... Error: socket hang up` or `ECONNRESET` messages still appear in the Next.js dev server logs.

### Issue 2: Frontend "Too many login attempts" (Rate Limiting)

**Symptoms:**
- Frontend displays an error message like "Too many login attempts. Please try again in a minute."
- Backend logs might show `[AUTH] Rate limited for user@example.com`.

**Root Cause:** The `LoginRateLimiter` in `AuthContext.tsx` and the `@Throttle` decorator in `AuthController.ts` are actively preventing brute-force attacks.
**Solution:** This is expected behavior for security. If debugging, temporarily adjust `maxAttempts` in `LoginRateLimiter` (e.g., to 50) and `limit` in `@Throttle` (e.g., to 50) for your local development environment. **Remember to revert these changes for production.**

### Issue 3: Backend TypeScript Compilation Errors / Jest Test Failures

**Symptoms:**
- `npm run typecheck` in the backend project shows errors.
- `npm test` in the backend project fails with TypeScript errors or runtime crashes.

**Root Cause:** Incompatible type definitions, incorrect mock setups, or improper handling of promises/exceptions in tests.
**Solution:** This typically requires a senior developer's intervention. Refer to the `docs/senior_dev_escalation_report_3.md` (or the current escalation report) for the latest status and specific guidance. Ensure all mocks align precisely with TypeORM entity definitions and NestJS dependency injection patterns. Pay close attention to:
- Correctly typing mock repository methods as `jest.Mock`.
- Providing complete mock entities (including all required fields and relations like `created_at`, `updated_at`, `tenant`).
- Properly handling `unknown` error types in `catch` blocks with type guards.
- Ensuring `async`/`await` are used correctly to prevent unhandled promise rejections.
