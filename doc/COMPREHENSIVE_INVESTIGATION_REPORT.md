# 🔬 SentinelFi - Complete System Investigation Report

**Date:** 2026-01-19  
**Investigator:** AI Senior DevOps Architect  
**Scope:** Full-stack application architecture, database resilience, authentication flow, and test infrastructure

---

## 📋 EXECUTIVE SUMMARY

This investigation reveals **THREE INTERCONNECTED CRITICAL ISSUES** causing cascading system failure:

1. **🔴 DATABASE POOL TERMINATION** - Neon PostgreSQL idle timeout kills pool after 6 minutes
2. **🔴 FRONTEND AUTH RETRY STORM** - Axios retries canceled requests indefinitely, blocking UI
3. **🟡 TYPE MISMATCH IN ROUTE GUARD** - Frontend expects `roles[]` with `.name` property, but receives `RoleEnum[]`

**Impact:** Users cannot access the application, backend connections die silently, and the loading screen spins indefinitely.

---

## 🏗️ SYSTEM ARCHITECTURE ANALYSIS

### **1. Backend Architecture** ✅ WELL-DESIGNED

#### **Authentication Flow:**
```
1. Client sends credentials → POST /auth/login/super OR /auth/login/tenant
2. AuthController extracts IP/UserAgent, calls AuthService.login()
3. AuthService uses LoginCache to prevent duplicate requests
4. AuthService wraps DB query in RetryableQuery (3 retries, exponential backoff)
5. Password verification via bcrypt.compare()
6. JWT token generated with JwtService.sign()
7. Token set as httpOnly cookie (secure in production)
8. Audit log written via SafeTransaction
9. Response sent with user data
```

#### **JWT Strategy:**
- **Extraction:** `cookieExtractor` → `access_token` cookie (primary) + Bearer token (fallback)
- **Validation:** JwtStrategy queries UserEntity with `is_active: true` check
- **Payload:**
  ```typescript
  {
    id: string,
    sub: string, // User ID
    email: string,
    roles: RoleEnum[], // Array of string enums
    permissions: string[],
    tenant_id: string | null,
    iat: number,
    exp: number
  }
  ```

#### **Multi-Tenancy:**
- **TenancyMiddleware** runs on EVERY request (`/*`)
- Extracts `tenant_id` from JWT
- Queries TenantEntity for `schema_name`
- Sets `search_path` via ClsService (nestjs-cls)
- **ISSUE:** No dynamic connection pool per tenant - relies on search_path switching

#### **Database Configuration:**
- **Connection Pool:**
  - `max: 20, min: 5`
  - `idleTimeoutMillis: 15000` (closes idle connections after 15s)
  - `connectionTimeoutMillis: 30000`
  - `keepAliveInitialDelayMillis: 5000` (TCP-level, NOT database-level)
- **Health Monitoring:**
  - Runs every 30s: `setInterval(..., 30000)`
  - Logs pool metrics: `{ totalCount, idleCount, waitingCount }`
  - **CRITICAL FLAW:** Health check does NOT execute queries - only reads pool state

---

### **2. Frontend Architecture** ✅ WELL-DESIGNED BUT FLAWED

#### **Authentication Flow:**
```
1. App starts → _app.tsx wraps with <AuthProvider>
2. AuthContext.tsx initializes → useEffect calls fetchCurrentUser()
3. fetchCurrentUser() → apiClient.get('/auth/me')
4. API client (lib/api.ts) wraps axios with RetryHandler
5. Request succeeds → setUser(), setIsInitialized(true)
6. RouteGuard.tsx runs useEffect → checkAuthorization()
7. Authorization passes → setIsAuthorizing(false)
8. Children render
```

#### **API Client Configuration:**
```typescript
axios.create({
  baseURL: '/api/v1',
  timeout: 12000, // 12s
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})
```

#### **Retry Logic:**
- **Max Retries:** 3
- **Retryable Status Codes:** `[408, 429, 500, 502, 503, 504]`
- **Backoff:** `300ms * 2^retryCount`
- **CRITICAL FLAW:** Retries `ERR_CANCELED` errors (line 112-117 in api.ts)

#### **RouteGuard Logic:**
- **Loading State:** `isAuthorizing` - blocks UI render
- **Authorization Check:** Runs on `[router, isAuthenticated, user, ...]` dependency changes
- **ISSUE:** Line 145 assumes `user.roles` has objects with `.name` property

---

## 🐛 ROOT CAUSE ANALYSIS

### **Issue #1: Database Pool Death** 🔴 CRITICAL

#### **Timeline (from logs):**
```
7:56:30 PM  - Backend starts, pool initialized (total: 1, idle: 1)
7:57:15 PM  - Health check: total: 1, idle: 1, waiting: 0
7:58:15 PM  - Health check: total: 1, idle: 1, waiting: 0
8:01:46 PM  - Health check: total: 1, idle: 1, waiting: 0
8:02:16 PM  - ERROR: "Connection terminated unexpectedly"
8:02:16 PM  - Health check: total: 0, idle: 0, waiting: 0 ← POOL DEAD
```

#### **Root Cause:**
**Neon PostgreSQL's compute auto-suspend** terminates idle connections after 5-6 minutes of NO DATABASE ACTIVITY.

**Why health checks don't help:**
```typescript
// database.config.ts line 91-110
static initializeHealthMonitoring(dataSource: DataSource): void {
  this.healthCheckInterval = setInterval(async () => {
    try {
      const pool = (dataSource.driver as any).master;
      // THIS ONLY READS POOL METRICS, DOESN'T EXECUTE A QUERY!
      const { totalCount, idleCount, waitingCount } = pool;
      this.logger.log(`Pool Health - Total: ${totalCount}...`);
    } catch (error) {
      this.logger.error('Health check failed:', errorMessage);
    }
  }, 30000);
}
```

**The Fix Requires:**
1. **Active Keep-Alive Query:** `SELECT 1` every 4 minutes
2. **Connection Pool Error Handler:** Detect `error: Connection terminated`
3. **Automatic Reconnection:** Create new pool on failure
4. **Circuit Breaker:** Prevent request storms during reconnection

---

### **Issue #2: Frontend Retry Storm** 🔴 CRITICAL

#### **Failure Sequence (from logs):**
```
Line 10:  [API] → GET /auth/me
Line 10:  [API] ✗ ERR_CANCELED GET /auth/me (3ms): canceled
Line 34:  [API] Retrying request (1/3) in 600ms...
Line 56:  [API] → GET /auth/me
Line 57:  [API] ✗ ERR_CANCELED GET /auth/me (1ms): canceled
Line 86:  [API] Retrying request (2/3) in 1200ms...
Line 113: [API] → GET /auth/me
Line 114: [API] ✗ ERR_CANCELED GET /auth/me (1ms): canceled
Line 148: [API] Retrying request (3/3) in 2400ms...
Line 181: [API] → GET /auth/me
Line 182: [API] ✗ ERR_CANCELED GET /auth/me (1ms): canceled
Line 221: [AUTH] User fetch cancelled.
```

#### **Root Cause:**
**api.ts line 112-117** retries ALL errors, including `ERR_CANCELED`:

```typescript
if (RetryHandler.shouldRetry(error, config._retryCount)) {
  config._retryCount++;
  const delay = RetryHandler.getRetryDelay(config._retryCount);
  console.warn(`[API] Retrying request (${config._retryCount}/3)...`);
  await new Promise(resolve => setTimeout(resolve, delay));
  return api.request(config); // ← RETRIES CANCELED REQUEST!
}
```

**Why Requests Get Canceled:**
1. React StrictMode mounts components twice in development
2. AuthContext.tsx line 134: `abortControllerRef.current.abort()`
3. New fetch aborts previous fetch
4. Axios throws `CanceledError`
5. Retry logic treats it as retryable

**The Infinite Loop:**
- Request canceled → Retry → Request canceled → Retry → ...
- `isAuthorizing` never becomes `false`
- Loading screen spins forever

---

### **Issue #3: Type Mismatch** 🟡 HIGH

#### **The Incompatibility:**

**Backend Returns (auth.service.ts line 165-173):**
```typescript
const roleNames: RoleEnum[] = user.roles.map(role => role.name as RoleEnum);
// ...
return {
  access_token: accessToken,
  user: {
    id: user.id,
    email: user.email,
    roles: this.mapRolesToSimpleRoles(user.roles), // ←SimpleRole[]
    // ...
  },
};
```

**Frontend Expects (AuthContext.tsx line 33-40):**
```typescript
export interface User {
  id: string;
  email: string;
  roles: RoleEnum[]; // ← Array of STRING ENUMS!
  tenant_id: string | null;
  name?: string;
}
```

**RouteGuard Crashes (RouteGuard.tsx line 145):**
```typescript
 roles: user.roles.map(r => r.name), // ← TypeError!
```

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'includes')
```

**Why:** `RoleEnum.Admin` has no `.name` property - it IS a string!

---

## 🧪 UNIT TEST INFRASTRUCTURE ANALYSIS

### **Current State:**
- **Test Framework:** Jest 30.2.0 + ts-jest 29.4.6
- **Coverage:** Only `auth.service.spec.ts` exists
- **Status:** ❌ FAILING

### **Problems Identified:**

1. **Mock Complexity:** Lines 31-65 - Manually mocking `SafeTransaction` and `RetryableQuery`
2. **Incomplete QueryRunner Mock:** Lines 163-222 - 50+ dummy methods
3. **Test Isolation:** No database cleanup between tests
4. **Skipped Tests:** Lines 332-460 use `.skip` - tests disabled
5. **No Integration Tests:** No E2E auth flow tests

### **Recommendation:**
**Use testcontainers + real PostgreSQL** for integration tests instead of mocking TypeORM internals.

---

## 🎯 COMPREHENSIVE FIX STRATEGY (Option C)

### **PHASE 1: IMMEDIATE STABILITY (Fix Now)**

#### **1.1 Database Resilience** 🔥 HIGHEST PRIORITY
- [ ] Add connection pool `error` event handler
- [ ] Implement keep-alive query scheduler (`SELECT 1` every 4 min)
- [ ] Add automatic reconnection logic
- [ ] Upgrade health monitoring to execute queries
- [ ] Add connection validation before query execution

#### **1.2 Frontend Auth Circuit Breaker** 🔥 HIGHEST PRIORITY
- [ ] Fix api.ts to NOT retry `ERR_CANCELED` errors
- [ ] Add request timeout fallback (show error after 15s)
- [ ] Fix AuthContext type to match backend (roles: SimpleRole[])
- [ ] Fix RouteGuard to use correct role structure
- [ ] Add exponential backoff with jitter

#### **1.3 Loading UX Improvement** 🔥 HIGH PRIORITY
- [ ] Add timeout to RouteGuard (max 10s authorization check)
- [ ] Implement degraded mode (show error page, not infinite spinner)
- [ ] Add manual retry button on error
- [ ] Add network status detection

#### **1.4 Unit Test Fix** 🟡 MEDIUM PRIORITY
- [ ] Simplify mocks (use jest.spyOn instead of manual mocks)
- [ ] Fix all skipped tests
- [ ] Add integration tests with testcontainers
- [ ] Add E2E auth flow tests

---

### **PHASE 2: ARCHITECTURAL REFACTOR (Fix Later)**

#### **2.1 JWT Refresh Token Strategy**
**Goal:** Eliminate `/auth/me` on every page load

**Current Flow:**
```
Page Load → fetchCurrentUser() → GET /auth/me → DB query
```

**Proposed Flow:**
```
Page Load → Validate JWT signature locally → No DB query!
Background: Refresh token rotation (15-day expiry)
```

**Benefits:**
- ✅ No DB load on page refresh
- ✅ Better offline support
- ✅ Faster initial load
- ✅ Resilient to DB outages

#### **2.2 Connection Pool Per Tenant**
**Goal:** Eliminate `search_path` switching, use dedicated pools

**Current (Line 83 in tenancy.middleware.ts):**
```typescript
await queryRunner.manager.query(`SET search_path TO "${schemaName}"`);
```

**Proposed:**
```typescript
const tenantPool = TenantPoolManager.getPool(schemaName);
await tenantPool.query('SELECT ...');
```

#### **2.3 API Client Upgrade**
- Implement request deduplication (already partially done)
- Add request prioritization (auth > data)
- Add request cancellation on route change
- Add offline queue

---

## 📊 PRODUCTION READINESS CHECKLIST

### **Backend:**
- [ ] Database connection resilience
- [ ] Graceful degradation on DB failure
- [ ] Circuit breaker for external services
- [ ] Comprehensive error logging (Sentry integration)
- [ ] Performance monitoring (New Relic / DataDog)
- [ ] Rate limiting per tenant
- [ ] API request/response compression
- [ ] HTTPS enforcement
- [ ] Security headers (Helmet.js)

### **Frontend:**
- [ ] Loading state management
- [ ] Error boundary components
- [ ] Retry logic with exponential backoff
- [ ] Network status detection
- [ ] Service worker for offline support
- [ ] Performance monitoring (Web Vitals)
- [ ] Accessibility (WCAG 2.1 AA)

### **Infrastructure:**
- [ ] Database connection pooling tuning
- [ ] CDN for static assets
- [ ] Redis for session management
- [ ] Automated backups
- [ ] Health check endpoints
- [ ] Blue-green deployment
- [ ] Rollback strategy

---

## 🚀 IMPLEMENTATION TIMELINE

| Phase | Task | Priority | Est. Time | Dependencies |
|-------|------|----------|-----------|--------------|
| 1.1 | Database resilience | 🔴 P0 | 4 hours | None |
| 1.2 | Frontend circuit breaker | 🔴 P0 | 3 hours | None |
| 1.3 | Loading UX | 🟡 P1 | 2 hours | 1.2 |
| 1.4 | Unit test fix | 🟡 P1 | 6 hours | None |
| 2.1 | JWT refresh tokens | 🟢 P2 | 8 hours | 1.1, 1.2 |
| 2.2 | Per-tenant pools | 🟢 P2 | 12 hours | 1.1 |
| 2.3 | API client upgrade | 🟢 P2 | 6 hours | 1.2 |

**Total Immediate Fix Time:** ~15 hours  
**Total Refactor Time:** ~26 hours  
**Grand Total:** ~41 hours

---

## 💡 RECOMMENDATIONS

### **For the User:**
1. **Accept the pain now, gain long-term stability** - Option C is the correct choice
2. **Plan for 2-week sprint:** Phase 1 (1 week) + Phase 2 (1 week)
3. **Budget for testing:** Add 20% buffer for integration tests
4. **Consider Neon upgrade:** Paid tier has configurable idle timeout

### **For the Developer (Me):**
1. **No placeholders, no shortcuts** - Production-ready code only
2. **Test coverage >= 80%** for all new code
3. **Document every architectural decision** in ADR format
4. **Pair with user on deployment** to production

---

## 📝 RECALL KEYWORDS

- `SENTINELFI_INVESTIGATION_2026_01_19`
- `DB_POOL_DEATH_NEON_IDLE`
- `FRONTEND_RETRY_STORM_FIX`
- `JWT_ARCHITECTURE_REFACTOR`

---

**Next Action:** Await user approval for Phase 1 implementation.
