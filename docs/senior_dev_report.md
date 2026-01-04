# SentinelFi Frontend/Backend Integration Debug Report: Persistent Multi-Tenancy Error

**Date:** 2026-01-03
**Author:** Gemini Agent

---

## 1.0 Problem Description

The SentinelFi application is experiencing a persistent `Error loading dashboard data: Tenant ID not found in authenticated user payload.` on the CEO Dashboard (`/dashboard/ceo`). This error occurs during server-side rendering (SSR) and subsequent client-side API calls to tenant-aware endpoints (e.g., `GET /wbs/budget/rollup`), preventing the CEO dashboard from displaying any tenant-specific data.

Despite numerous debugging steps and implemented fixes, the `tenant_id` is not being correctly propagated to the `TenancyMiddleware`, leading to a `BadRequestException`.

## 2.0 Context

-   **Application:** SentinelFi (Next.js frontend, NestJS backend, PostgreSQL/TypeORM database).
-   **Architecture:** Monorepo structure, Multi-tenant (schema-per-tenant model with `search_path` dynamic switching).
-   **Current Task:** Implementing Phase 1.2 of the Multi-Tenancy PRD (Enhancing User Management for Tenant Assignment), which requires accurate `tenant_id` propagation.

## 3.0 Debugging Journey & Implemented Solutions (Chronological Order)

The debugging process involved resolving several cascading issues to reach the current blocking point.

### Phase 1: Initial Frontend Rendering Issues

**Symptoms:** Application crashed with `Objects are not valid as a React child` and `Invalid hook call` errors on startup.

**Solutions Implemented:**
-   **Solution 1.1: Duplicate React Instances Fix**
    -   **Problem:** Mismatched React versions due to conflicting `package-lock.json` files in monorepo workspaces.
    -   **Action:** Added `overrides` for `react` and `react-dom` in the root `package.json`. Instructed user to delete all `node_modules` and `package-lock.json` files and perform a clean `npm install`.
    -   **Outcome:** `Invalid hook call` error resolved.
-   **Solution 1.2: SSR Incompatibility Fix for `react-datepicker`**
    -   **Problem:** `react-datepicker` was not SSR-compatible, causing `Objects are not valid as a React child` during server-side rendering.
    -   **Action:** Used `next/dynamic` with `ssr: false` for `react-datepicker` in `frontend/pages/dashboard/ceo.tsx`.
    -   **Outcome:** Frontend application now loads without crashes.

### Phase 2: Backend Database Connection & Authentication (Backend 500)

**Symptoms:** `GET /api/v1/auth/test-secure` returned a 500 Internal Server Error, preventing user authentication.

**Solutions Implemented:**
-   **Solution 2.1: Missing Database Connection String**
    -   **Problem:** `ormconfig.ts` couldn't find `DATABASE_URL`.
    -   **Action:** Created `backend/.env.local` with a placeholder `DATABASE_URL` and instructed user to fill it with their NeonDB connection string.
    -   **Outcome:** Backend successfully connects to the database; User Management page loads user data.

### Phase 3: `GET /admin/tenants` 400 Bad Request (Tenant Dropdown Empty)

**Symptoms:** The "Tenant" dropdown in the User Management page was empty, and `GET /api/v1/admin/tenants` returned a `400 Bad Request` in the browser console. Backend logs showed `TenantService.findAllTenants()` was not even reached.

**Solutions Implemented:**
-   **Solution 3.1: Disabled Destructive Seeder**
    -   **Problem:** `backend/src/auth/seed-test-users.service.ts` was destructively re-seeding users on every backend restart, overwriting manual `tenant_id` assignments.
    -   **Action:** Modified `seed-test-users.service.ts` to only create users if they don't already exist.
    -   **Outcome:** Manual user changes (like `tenant_id` assignment) are preserved across restarts.
-   **Solution 3.2: Updated Backend DTOs and Service Methods for Tenant Info**
    -   **Problem:** `UserResponseDto` and `AuthService` methods (`login`, `findAllUsers`, `createUser`, `updateUser`) did not fully support `tenant_id` and `tenant_name` propagation.
    -   **Action:**
        -   Ensured `shared/types/user.ts` (User, UpdateUserDto) included `tenant_id` and `tenant_name`.
        -   Updated `backend/src/auth/dto/admin-user.dto.ts` (`UserResponseDto`) to include `tenant_id` and `tenant_name`.
        -   Modified `backend/src/auth/auth.service.ts` (`login`, `findAllUsers`, `createUser`, `updateUser`) to correctly fetch, update, and return tenant-related user data.
    -   **Outcome:** User Management UI displays tenant information correctly.
-   **Solution 3.3: Temporary `TenancyMiddleware` Bypass**
    -   **Problem:** The `TenancyMiddleware` (applied globally) was throwing a `400 BadRequestException` for `GET /api/v1/admin/tenants` because it expected a `tenant_id` in `req.user` for *all* routes, even those operating on the `public` schema.
    -   **Action:** Added a temporary `if (req.originalUrl.startsWith('/api/v1/admin/tenants')) { return next(); }` exclusion in `backend/src/common/middleware/tenancy.middleware.ts`.
    -   **Outcome:** The "Tenant" dropdown now populates successfully in the User Management page.
-   **Solution 3.4: TypeORM Repository Injection Fix**
    -   **Problem:** `TenancyMiddleware`'s constructor could not resolve `Repository<TenantEntity>`.
    -   **Action:** Added `TypeOrmModule.forFeature([TenantEntity])` to the `exports` array of `backend/src/tenants/tenant.module.ts`.
    -   **Outcome:** Backend starts successfully without dependency injection errors.

### Phase 4: Persistent CEO Dashboard Error (Current Blocking Issue)

**Symptoms:** The CEO Dashboard (`/dashboard/ceo`) continues to display `Error loading dashboard data: Tenant ID not found in authenticated user payload.`, and the frontend logs a 400 Bad Request for `GET /api/v1/wbs/budget/rollup`.

**Debugging Performed:**
-   **Solution 4.1: `TenancyMiddleware` Logic Correction**
    -   **Problem:** `TenancyMiddleware` was incorrectly using `tenant_id` (UUID) directly as the `schema_name` for `SET search_path`, which is invalid.
    -   **Action:** Modified `TenancyMiddleware` to inject `Repository<TenantEntity>`, look up the actual `schema_name` from `public.tenants` based on `tenant_id`, and then use this `schema_name` for `SET search_path`.
    -   **Outcome:** The logic within `TenancyMiddleware` for determining `schema_name` is now correct.
-   **Solution 4.2: `AuthenticatedRequest` Interface Update**
    -   **Problem:** TypeScript error (`TS2339`) when adding `schema_name` to `req` in `TenancyMiddleware`.
    -   **Action:** Updated `backend/src/common/interfaces/request.interface.ts` to include `schema_name?: string;`.
    -   **Outcome:** TypeScript error resolved.
-   **Solution 4.3: Cookie `SameSite` Policy Adjustment**
    -   **Problem:** Suspected `access_token` cookie was not being sent for cross-origin requests (frontend `localhost:3000` to backend `127.0.0.1:3001`) due to `SameSite=strict`.
    -   **Action:** Changed `sameSite: "strict"` to `sameSite: "lax"` in `backend/src/auth/auth.controller.ts` for login/logout cookies.
    -   **Outcome:** Error persists.

**Detailed Breakdown of Current Problem:**

Backend logs show:
-   **Login `AuthService`:** `[AuthService:Login] User fetched from DB has tenant_id: <VALID_UUID>` and `[AuthService:Login] JWT Payload generated with tenant_id: <VALID_UUID>`. **This confirms the generated JWT contains the correct tenant ID.**
-   **`JwtStrategy:Validate` (for CEO Dashboard access):** This is the crucial missing link. After all attempts to fix cookie issues and `TenancyMiddleware` logic, the `JwtStrategy:Validate` logs (which I added to specifically trace `payload.tenant_id`) are **not appearing for the dashboard request**, or previous attempts showed `payload.tenant_id: null`. This implies that the JWT containing the correct `tenant_id` is **NOT being successfully validated by `JwtStrategy`** when the CEO dashboard attempts to fetch data.

This results in `req.user` being `null` or having a `null` `tenant_id` by the time `TenancyMiddleware` runs for `/wbs/budget/rollup`, triggering the `if (!tenant_id_from_user_payload)` condition.

## 4.0 Request for Senior Developer Assistance

I am requesting assistance in diagnosing why the `JwtStrategy.validate` method is *not correctly receiving or processing* the `tenant_id` from the HttpOnly cookie's JWT on subsequent requests to tenant-aware endpoints (specifically `GET /wbs/budget/rollup`), even after `AuthService.login` confirms a valid `tenant_id` is put into the JWT.

### Specific Areas Requiring Deeper Investigation:

1.  **HttpOnly Cookie Transmission:**
    *   Despite `SameSite=lax`, is the `access_token` cookie actually being sent by the browser for `http://localhost:3000` to `http://127.0.0.1:3001` requests? (Inspect network requests in browser dev tools for cookie headers).
    *   Is the cookie being correctly read by `cookie-parser` on the backend?
2.  **JWT Secret Consistency:** Is the `JWT_SECRET_KEY` used for signing in `AuthService` identical to the one used for verification in `JwtStrategy`? (Environment variable loading: `configService.get<string>("JWT_SECRET_KEY")`).
3.  **JWT Expiration/Invalidation:** Could the token be expiring very quickly, or is there an invalidation mechanism at play? (Checked `ignoreExpiration: false` in `JwtStrategy`).
4.  **`AuthGuard('jwt')` Behavior:** Is there any scenario where `AuthGuard('jwt')` might silently fail or not correctly attach `req.user` *before* `TenancyMiddleware` runs, even if `JwtStrategy.validate` eventually gets called?
5.  **Global Middleware/Interceptor Order:** Is there any other global middleware or interceptor (especially ones affecting authentication or request context) that could be running before `TenancyMiddleware` and interfering with `req.user`? (e.g., in `main.ts`, `app.module.ts`).

## 5.0 Suggestions for Advanced Features (for consideration during resolution)

Once the core multi-tenancy context issue is resolved, I suggest prioritizing the following advanced features from the PRD to enhance the robustness and maintainability of the multi-tenancy architecture:

1.  **Robust Multi-Tenancy Guard (PRD Feature 4.1, refined):**
    *   **Description:** Replace the current `TenancyMiddleware` with a `TenancyGuard` that uses the newly created `@TenantAware()` decorator.
    *   **Benefit:** This provides granular, declarative control over which routes require a `tenant_id`. The guard can then enforce `tenant_id` presence, validate it, and set the `search_path` only for truly tenant-aware endpoints.
2.  **Centralized Error Handling with Custom Exceptions:**
    *   **Description:** Implement global exception filters in NestJS to catch `BadRequestException`, `ForbiddenException`, etc., and transform them into standardized, user-friendly JSON error responses.
    *   **Benefit:** Improves API consistency and developer experience; prevents raw exception details from leaking.

---

## Relevant Code Files

### `backend/src/auth/auth.controller.ts`
```typescript
// ... (imports) ...
@Controller("auth")
// ...
export class AuthController {
  // ... constructor ...

  @Public()
  @Throttle({ default: { ttl: 30, limit: 5 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(
    @Body() loginDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.authService.login(loginDto);
      const maxAge = loginDto.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
      response.cookie("access_token", result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // CRITICAL FIX: Changed from 'strict' to 'lax' for local development
        maxAge: maxAge,
      });
      return { success: true, user: result.user };
    } catch (error) {
      this.logger.error("Login controller error:", error);
      throw new UnauthorizedException("Invalid credentials");
    }
  }

  // ... (logout, register, forgotPasswordRequest, test-secure, users management endpoints) ...
}
```

### `backend/src/auth/auth.service.ts`
```typescript
// ... (imports) ...
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // ... constructor ...

  async login(
    loginDto: LoginUserDto,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
      select: ["id", "email", "password_hash", "role", "is_active", "tenant_id"],
      relations: ['tenant'],
    });
    // ... (password validation) ...
    this.logger.log(`[AuthService:Login] User fetched from DB has tenant_id: ${user.tenant_id}`);
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tenant_id: user.tenant_id,
    };
    this.logger.log(`[AuthService:Login] JWT Payload generated with tenant_id: ${payload.tenant_id}`);
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant ? user.tenant.name : null,
      },
    };
  }
  // ... (register, requestPasswordReset, findAllUsers, createUser, updateUser, registerUser) ...
}
```

### `backend/src/auth/jwt.strategy.ts`
```typescript
// ... (imports) ...
const cookieExtractor = (req: Request) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies["access_token"];
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private usersRepository: Repository<UserEntity>;
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    // ... super(...) configuration ...
    this.usersRepository = this.dataSource.getRepository(UserEntity);
  }

  async validate(payload: JwtPayload): Promise<UserPayload> {
    this.logger.log(`[JwtStrategy:Validate] Received JWT payload with sub: ${payload.sub}, tenant_id: ${payload.tenant_id}`);
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub, is_active: true },
      select: ["id", "email", "role", "tenant_id"],
    });
    if (!user) {
      this.logger.warn(`[JwtStrategy:Validate] User not found or inactive for sub: ${payload.sub}`);
      throw new UnauthorizedException("User no longer active or token invalid.");
    }
    this.logger.log(`[JwtStrategy:Validate] User fetched from DB has tenant_id: ${user.tenant_id}`);
    const userPayloadToReturn = {
      id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id,
    };
    this.logger.log(`[JwtStrategy:Validate] Returning user payload with tenant_id: ${userPayloadToReturn.tenant_id}`);
    return userPayloadToReturn;
  }
}
```

### `backend/src/common/middleware/tenancy.middleware.ts`
```typescript
// ... (imports) ...
@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TenantEntity)
    private tenantsRepository: Repository<TenantEntity>,
    private readonly reflector: Reflector,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Temporarily bypass for /admin/tenants to fix the current issue
    if (req.originalUrl.startsWith('/api/v1/admin/tenants')) {
      return next();
    }

    const tenant_id_from_user_payload = req.user?.tenant_id;

    if (!tenant_id_from_user_payload) {
      throw new BadRequestException('Tenant ID not found in authenticated user payload.');
    }

    // 1. Look up the tenant in the public.tenants table using the tenant_id from the user's JWT
    const tenant = await this.tenantsRepository.findOne({
        where: { id: tenant_id_from_user_payload },
        select: ['id', 'schema_name'],
    });

    if (!tenant) {
        throw new ForbiddenException('Authenticated user belongs to a non-existent or invalid tenant.');
    }

    const actual_schema_name = tenant.schema_name;
    const schemaNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!schemaNameRegex.test(actual_schema_name)) {
        throw new InternalServerErrorException('Invalid schema name retrieved from tenant data.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.query(`SET search_path TO "${actual_schema_name}", public;`);
      req.tenant_id = tenant_id_from_user_payload;
      req.schema_name = actual_schema_name;
      req.queryRunner = queryRunner;
      next();
    } catch (error: unknown) {
      throw new InternalServerErrorException('Failed to set tenant context', (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
        if (req.queryRunner) {
            await req.queryRunner.release();
        }
    }
  }
}
```

### `backend/src/common/interfaces/request.interface.ts`
```typescript
import { Request } from 'express';
import { QueryRunner } from 'typeorm';
import { Role } from 'shared/types/role.enum';

export interface JwtPayload {
  email: string;
  sub: string;
  role: Role;
  tenant_id: string | null;
}

export interface UserPayload {
    id: string;
    email: string;
    role: Role;
    tenant_id: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  tenant_id?: string | null;
  schema_name?: string; // NEW: Added by TenancyMiddleware for convenience
  queryRunner?: QueryRunner;
}
```