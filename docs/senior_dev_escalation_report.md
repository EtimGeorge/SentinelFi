# Senior Developer Escalation Report: Persistent Multi-Tenancy Authentication Issue

**Date:** 2026-01-03
**Author:** Gemini Agent
**Problem Category:** Multi-Tenancy Authentication
**Current Blocking Issue:** The 'Tenant ID not found in authenticated user payload' error persists on tenant-aware pages.

---

## 1.0 Executive Summary

The SentinelFi application, a Next.js (frontend) and NestJS (backend) monorepo, is experiencing a critical and persistent failure in its multi-tenancy authentication flow during local development. Despite numerous debugging attempts, including addressing React version conflicts, cookie `SameSite` policies, and backend multi-tenancy logic, the system is blocked from full functionality. The primary symptom is a `500 Internal Server Error` on authentication endpoints or a `400 Bad Request` with the message `'Tenant ID not found in authenticated user payload'`.

---

## 2.0 Problem Description

The core functionality of SentinelFi relies on a multi-tenancy (schema-per-tenant) model authenticated via JWTs stored in HttpOnly cookies. The frontend (`http://localhost:3000`) communicates with the backend (`http://localhost:3001/api/v1`). Users are assigned a `tenant_id` in the `public.user` table, which is then embedded in their JWT. A `TenancyMiddleware` on the backend is responsible for setting the PostgreSQL `search_path` to the user's tenant-specific schema based on this `tenant_id`.

The system is currently blocked because the `Tenant ID not found in authenticated user payload.` error persists on tenant-aware pages (e.g., CEO Dashboard), indicating that `req.user?.tenant_id` is still `null` or `undefined` within `TenancyMiddleware` for these requests, despite previous logging confirming `tenant_id` is successfully added to the JWT during login.

## 3.0 Context & Environment

-   **Frontend:** Next.js 14.2.35, React 18.2.0, Axios. Accessed via `http://localhost:3000`.
-   **Backend:** NestJS 11.x, TypeORM 0.3.x, PostgreSQL (NeonDB), `cookie-parser`, `passport-jwt`. Backend listening on `http://localhost:3001/api/v1`.
-   **Monorepo:** npm workspaces.
-   **Operating System:** Windows.

---

## 4.0 Detailed Debugging Journey & Implemented Solutions (Chronological)

Below is a detailed account of the issues encountered and solutions implemented/attempted, along with their outcomes.

### 4.1 Initial Frontend Rendering & Backend Dependency Issues

-   **Problem 1:** Application crashed with `Objects are not valid as a React child` and `Invalid hook call` errors.
-   **Solution 1.1:** Add `overrides` for `react`/`react-dom` in root `package.json` to enforce single React version, followed by `npm install` clean-up.
    -   **Outcome:** `Invalid hook call` error resolved.
-   **Problem 2:** `react-datepicker` caused `Objects are not valid as a React child` during SSR.
-   **Solution 1.2:** Dynamic import for `react-datepicker` (`ssr: false`) in `ceo.tsx`.
    -   **Outcome:** Frontend application loads without general rendering crashes.

### 4.2 Backend Database Connection & Authentication Failure (Initial 500s)

-   **Problem:** `GET /api/v1/auth/test-secure` returned a 500 Internal Server Error, preventing `AuthContext` initialization. Backend initially failed to connect to DB (`EAI_AGAIN`).
-   **Solution 2.1:** Created `backend/.env.local` with `DATABASE_URL` (to address missing env var).
    -   **Outcome:** Backend successfully connects to DB on startup after retries.

### 4.3 Tenant Dropdown Empty (User Management Page) 

-   **Problem:** `GET /api/v1/admin/tenants` (from `/admin/users` page) returned a `400 Bad Request`. Tenant dropdown remained empty.
-   **Solution 3.1:** Modified `backend/src/auth/seed-test-users.service.ts` to prevent destructive re-seeding of users on restart.
    -   **Outcome:** Manual user/tenant assignments are now persistent.
-   **Solution 3.2:** Updated `shared/types/user.ts`, `backend/src/auth/dto/admin-user.dto.ts`, and `backend/src/auth/auth.service.ts` to fully support `tenant_id` and `tenant_name` propagation in user objects.
    -   **Outcome:** User object consistently contains tenant info.
-   **Solution 3.3:** Fixed `TenancyMiddleware` to look up `schema_name` from `public.tenants` based on `req.user.tenant_id` instead of directly using `tenant_id` (UUID) as schema name.
    -   **Outcome:** Core `TenancyMiddleware` logic is now theoretically correct for tenant-aware routes.
-   **Solution 3.4:** Resolved TypeScript error (`TS2339`) in `backend/src/common/middleware/tenancy.middleware.ts` by updating `AuthenticatedRequest` interface.
    -   **Outcome:** Backend compiles cleanly.
-   **Solution 3.5:** Added **temporary bypass** (`if (req.originalUrl.startsWith('/api/v1/admin/tenants')) { return next(); }`) to `TenancyMiddleware` for `GET /api/v1/admin/tenants`.
    -   **Outcome:** Tenant dropdown in User Management page populates successfully (confirming `GET /api/v1/admin/tenants` now works).

### 4.4 Persistent Authentication Failures (Current State)

**Symptoms:**
-   Login attempts occasionally succeed, but navigating to CEO dashboard results in `'Error loading dashboard data: Tenant ID not found in authenticated user payload.'`. This error originates from `TenancyMiddleware`'s `if (!tenant_id_from_user_payload)` check.

**Solutions Implemented (Specific to Cookie/Authentication Flow):**
-   **Solution 4.1: Cookie `SameSite` Policy:** Changed `sameSite: "strict"` to `sameSite: "lax"` for `access_token` cookies in `backend/src/auth/auth.controller.ts`.
    -   **Outcome:** Necessary for correct cookie behavior.
-   **Solution 4.2: `test-secure` Response Body Fix:** Corrected `backend/src/auth/auth.controller.ts` `getProfile` method to return `user_data_from_token: req.user`.
    -   **Outcome:** Backend now returns correct structure for `test-secure`.
-   **Solution 4.3: Backend Listen Address:** Modified `backend/src/main.ts` to force `app.listen` on `"localhost"` instead of `"127.0.0.1"`.
    -   **Outcome:** Backend now starts with `SentinelFi API is running on: http://localhost:3001/api/v1`.
-   **Solution 4.4: Remove `test-secure` `@Public()`:** Removed `@Public()` from `getProfile` in `backend/src/auth/auth.controller.ts` to ensure it's protected.
    -   **Outcome:** Correct authentication flow for protected endpoints.
-   **Solution 4.5: `JwtStrategy` `secretOrKey` fix:** Fixed `TS2345` and `TS18046` compilation errors in `jwt.strategy.ts`.
    -   **Outcome:** Backend compiles cleanly.
-   **Solution 4.6: Frontend `baseURL` and `next.config.js` `rewrites`:**
    -   **Action:** Modified `frontend/lib/api.ts` `baseURL` to `"/api/v1"` (relative) and updated `frontend/next.config.js` with `rewrites` to proxy `/api/v1/:path*` to `http://localhost:3001/api/v1/:path*`.
    -   **Outcome:** Frontend can now communicate with the backend.

## 5.0 Current Blocking Issue & Request for Senior Developer Assistance

The system is currently blocked by a persistent `'Tenant ID not found in authenticated user payload'` error. This indicates that `req.user?.tenant_id` is `null` or `undefined` within `TenancyMiddleware` for tenant-aware requests, despite previous login logs confirming `tenant_id` is successfully added to the JWT.

I am requesting assistance in diagnosing this deep-seated issue. I suspect a subtle cookie/session management interaction or an issue with `req.user` construction.

### Specific Areas for Senior Developer Investigation:

1.  **Cookie/Session Propagation Consistency:** Why does `req.user?.tenant_id` appear `null` in `TenancyMiddleware` when `AuthService.login` clearly embeds it in the JWT and `JwtStrategy` logs indicate it's receiving it? This implies a possible issue with how `req.user` is constructed or propagated through guards/middleware, potentially specific to the `JwtStrategy` or `AuthGuard`.
2.  **JWT Secret Consistency:** Is the `JWT_SECRET_KEY` used for signing in `AuthService` identical to the one used for verification in `JwtStrategy`? (Environment variable loading: `configService.get<string>("JWT_SECRET_KEY")`).
3.  **JWT Expiration/Invalidation:** Could the token be expiring very quickly, or is there an invalidation mechanism at play? (Checked `ignoreExpiration: false` in `JwtStrategy`).
4.  **`AuthGuard('jwt')` Behavior:** Is there any scenario where `AuthGuard('jwt')` might silently fail or not correctly attach `req.user` *before* `TenancyMiddleware` runs, even if `JwtStrategy.validate` eventually gets called?
5.  **Global Middleware/Interceptor Order:** Is there any other global middleware or interceptor (especially ones affecting authentication or request context) that could be running before `TenancyMiddleware` and interfering with `req.user`? (e.g., in `main.ts`, `app.module.ts`).

## 6.0 Implemented Tasks (Since Session Start)

-   **Frontend:**
    -   CEO Dashboard implemented with date filtering, search, and drill-down modal.
    -   `frontend/pages/admin/users.tsx` enhanced for user/tenant assignment (UI ready).
    -   `frontend/lib/utils.ts` created (`formatCurrency`, `getWBSColor`).
    -   `frontend/components/common/Switch.tsx` created.
    -   `frontend/pages/_app.tsx` restored.
    -   `frontend/next.config.js` re-configured with explicit `rewrites` to `http://localhost:3001`.
    -   `frontend/lib/api.ts` updated to use relative `baseURL: "/api/v1"`.
-   **Backend:**
    -   `backend/.env.local` created.
    -   `backend/src/auth/seed-test-users.service.ts` modified to prevent destructive re-seeding.
    -   `backend/src/auth/auth.service.ts` `updateUser` and `findAllUsers` updated for `tenant_id` propagation.
    -   `backend/src/auth/dto/admin-user.dto.ts` updated for `tenant_id` and `tenant_name`.
    -   `backend/src/common/middleware/tenancy.middleware.ts` implemented `schema_name` lookup and temporary bypass for `/admin/tenants` (with extensive logging).
    -   `backend/src/common/interfaces/request.interface.ts` updated for `schema_name`.
    -   `backend/src/auth/auth.controller.ts` cookie `SameSite=lax` fixed and `test-secure` `@Public()` removed.
    -   `backend/src/main.ts` `app.listen` changed to `"localhost"`.
    -   `backend/src/auth/jwt.strategy.ts` `tsc` errors fixed.
-   **Project:**
    -   All `node_modules` and `package-lock.json` cleared, `npm install` run.
    -   Root `.next` folder identified and deleted.

## 7.0 Yet-to-be-Implemented Tasks (from PRD `docs/prd_multi_tenancy_and_onboarding.md`)

Below is the updated list of tasks yet to be implemented based on our current progress, assuming the core authentication and `tenant_id` propagation issues are resolved.

### Phase 1: Foundational Administration (Immediate Priority)

-   [ ] **Feature 1.1: SuperAdmin Manual Tenant Creation**
    -   [ ] **UI:** Create a new page at `/super/tenants`, accessible only to `SuperAdmin` roles.
    -   [ ] **UI:** The page should contain a table listing all tenants.
    -   [ ] **UI:** Implement a "Create New Tenant" button and form.
    -   [ ] **Backend:** Create a `SuperAdminController` with a `POST /super/tenants` endpoint.
    -   [ ] **Backend:** Implement `GET /super/tenants` and `PATCH /super/tenants/:id` endpoints.
-   [x] **Feature 1.2: Enhanced User Management for Tenant Assignment** *(Implemented, awaiting full verification)*
    -   [x] **UI:** Make the "Tenant" dropdown functional in the "Edit" mode on the `/admin/users` page.
    -   [x] **Backend:** Update `auth.service.ts`'s `updateUser` method to handle saving the `tenant_id`.
    -   [x] **Backend:** Ensure the `PATCH /auth/users/:id` request payload is correctly processed.
    -   [x] **Backend:** Updated `auth.service.ts` to include `tenant_name` in `findAllUsers` and `createUser` responses.
    -   [x] **Backend:** Updated `admin-user.dto.ts` to include `tenant_id` and `tenant_name`.
    -   [x] **Frontend:** Updated `handleSaveUser` in `frontend/pages/admin/users.tsx` to send `tenant_id` in update payload.

### Phase 2: Tenant Self-Management

-   [ ] **Feature 2.1: User Invitation System**
    -   [ ] **UI:** Add an "Invite User" button and modal to the `/admin/users` page for Tenant Admins.
    -   [ ] **Backend:** Create a new endpoint `POST /users/invite` to generate a secure invitation token.
    -   [ ] **Frontend:** Update the `/register` page to handle the `invitation_token` from the URL.
-   [ ] **Feature 2.2: Tenant-Specific Settings**
    -   [ ] **UI:** Create a new `/settings/tenant` page for Tenant Admins.
    -   [ ] **Backend:** Create endpoints to manage tenant-level settings (e.g., company name, billing details).

### Phase 3: Public Onboarding & Commercialization

-   [ ] **Feature 3.1: Marketing & Pricing Pages**
    -   [ ] **UI:** Create a new public-facing landing page (`/`).
    -   [ ] **UI:** Create a `/pricing` page with subscription tiers.
-   [ ] **Feature 3.2: Stripe Integration & Checkout**
    -   [ ] **UI:** Implement a checkout form using Stripe Elements.
    -   [ ] **Backend:** Create endpoints to manage the Stripe Checkout Session.
    -   [ ] **Backend:** Implement a webhook endpoint `POST /stripe-webhook` to receive events from Stripe.
-   [ ] **Feature 3.3: Automated Tenant Provisioning**
    -   [ ] **Backend:** Create a `provisionNewTenant` service triggered by the Stripe webhook.
    -   [ ] **Backend:** The service should automate tenant and user creation as specified in the User Flow (Section 3.1).

### Phase 4: Advanced Security & Enterprise Features

-   [ ] **Feature 4.1: Audited Support Impersonation**
    -   [ ] **UI (SuperAdmin):** Add a "Start Support Session" button to the SuperAdmin tenant dashboard.
    -   [ ] **UI (Tenant Admin):** Implement a notification and approval modal for support requests.
    -   [ ] **Backend:** Create a new `audit_log` table in the database.
    -   [ ] **Backend:** Develop the system for generating and validating short-lived impersonation JWTs.
    -   [ ] **Backend:** Ensure all impersonated actions are logged to the `audit_log` table.

---
## 8.0 Relevant Code for Review

### `backend/src/auth/auth.service.ts`
```typescript
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "./user.entity";
import { JwtService } from "@nestjs/jwt";
import { LoginUserDto } from "./dto/login-user.dto";
import * as bcrypt from "bcryptjs";
import { UserResponseDto } from "./dto/admin-user.dto";
import { CreateUserDto, UpdateUserDto } from "shared/types/user";
import { Role } from "shared/types/role.enum";
import { RegisterUserDto } from './dto/register-user.dto';
import { ForgotPasswordRequestDto } from './dto/forgot-password-request.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  /**
   * User Login Logic (Final Production Version)
   */
  async login(
    loginDto: LoginUserDto,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
      select: ["id", "email", "password_hash", "role", "is_active", "tenant_id"],
      relations: ['tenant'], // Also load the tenant relation
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException(
        "Invalid credentials or user is inactive.",
      );
    }

    this.logger.log("User found. Validating password.");

    const passwordValid = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );

    if (!passwordValid) {
      this.logger.log("Password validation failed");
      throw new UnauthorizedException("Invalid credentials.");
    }

    this.logger.log("Password validation passed.");
    this.logger.log(`[AuthService:Login] User fetched from DB has tenant_id: ${user.tenant_id}`);


    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      tenant_id: user.tenant_id,
    };
    this.logger.log(`[AuthService:Login] JWT Payload generated with tenant_id: ${payload.tenant_id}`);


    this.logger.log("Generating JWT token and returning user object.");
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

  /**
   * Public registration for new users (self-registration).
   * Assigns a default role and creates the user in the 'public' schema initially (tenant_id is null).
   */
  async register(registerDto: RegisterUserDto): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const newUser = await this.registerUser(
      registerDto.email,
      registerDto.password,
      Role.AssignedProjectUser, // Default role for self-registered users
      null // tenant_id is null for self-registered users, to be assigned during tenant provisioning
    );

    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      is_active: newUser.is_active,
    };
  }

  /**
   * Handles a request to reset a user's password.
   * Generates a reset token, stores it, and (TODO) sends an email.
   */
  async requestPasswordReset(forgotPasswordDto: ForgotPasswordRequestDto): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { email: forgotPasswordDto.email, is_active: true },
    });

    // Always return a generic success message to prevent user enumeration
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent or inactive user: ${forgotPasswordDto.email}`);
      return;
    }

    // 1. Generate a secure, unique reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2. Hash the token before storing it in the database
    const hashedResetToken = await bcrypt.hash(resetToken, 10); // Use a salt round of 10

    // 3. Set expiry time (e.g., 1 hour from now)
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);

    // 4. Store the hashed token and expiry in the user entity
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await this.usersRepository.save(user);

    // TODO: Send email to user with the reset link
    // The link should be something like: `${FRONTEND_URL}/reset-password?token=${resetToken}`
    // FRONTEND_URL and email sending service need to be configured.
    this.logger.log(`Password reset token generated for ${user.email}. Token (hashed): ${hashedResetToken}. Expiry: ${resetTokenExpires}`);
    this.logger.warn('TODO: Implement email sending for password reset link.');
  }

  /**
   * Admin Function - Retrieves all users (for Admin/IT Head)
   */
  async findAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.find({
      relations: ['tenant'], // Join with the tenant entity
      select: ["id", "email", "role", "is_active", "tenant_id"],
    });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      tenant_id: user.tenant_id,
      tenant_name: user.tenant ? user.tenant.name : null, // Include tenant name
    }));
  }

  /**
   * Admin Function - Creates a new user with initial role and password
   */
  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException("User with this email already exists.");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = this.usersRepository.create({
      email: createUserDto.email,
      password_hash: hashedPassword,
      role: createUserDto.role,
      is_active: true,
      tenant_id: createUserDto.tenant_id,
    });

    const savedUser = await this.usersRepository.save(newUser);

    // Re-fetch with relation to get tenant name
    const userWithTenant = await this.usersRepository.findOne({
      where: { id: savedUser.id },
      relations: ['tenant'],
    });

    return {
      id: userWithTenant!.id,
      email: userWithTenant!.email,
      role: userWithTenant!.role,
      is_active: userWithTenant!.is_active,
      tenant_id: userWithTenant!.tenant_id,
      tenant_name: userWithTenant!.tenant ? userWithTenant!.tenant.name : null,
    };
  }

  /**
   * Admin Function - Updates a user's role, status, and tenant assignment
   */
  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    // Update role if provided
    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }
    // Update active status if provided
    if (updateUserDto.is_active !== undefined) {
      user.is_active = updateUserDto.is_active;
    }
    // Update tenant assignment if provided
    if (updateUserDto.tenant_id !== undefined) {
      user.tenant_id = updateUserDto.tenant_id;
    }

    const savedUser = await this.usersRepository.save(user);

    // Re-fetch with relation to get tenant name for the response
    const updatedUserWithTenant = await this.usersRepository.findOne({
        where: { id: savedUser.id },
        relations: ['tenant'],
    });

    return {
      id: updatedUserWithTenant!.id,
      email: updatedUserWithTenant!.email,
      role: updatedUserWithTenant!.role,
      is_active: updatedUserWithTenant!.is_active,
      tenant_id: updatedUserWithTenant!.tenant_id,
      tenant_name: updatedUserWithTenant!.tenant ? updatedUserWithTenant!.tenant.name : null,
    };
  }

  /**
   * User registration utility (hashes manually before save).
   * @param plainPassword The plain text password to hash.
   */
  async registerUser(
    email: string,
    plainPassword: string,
    role: Role,
    tenantId: string | null = null, // Allow null for self-registration initially
  ): Promise<UserEntity> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const newUser = this.usersRepository.create({
      email,
      password_hash: hashedPassword,
      role,
      tenant_id: tenantId,
    });

    return this.usersRepository.save(newUser);
  }
}
```

### `backend/src/auth/jwt.strategy.ts`
```typescript
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt'; // Import ExtractJwt
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../auth/user.entity'; // Corrected import path
import { JwtPayload, UserPayload } from '../common/interfaces/request.interface';
import { Request } from 'express';

// Enhanced cookie extractor with detailed logging
const cookieExtractor = (req: Request): string | null => {
  const logger = new Logger('CookieExtractor');
  
  logger.log(`[Extract] Cookies present: ${JSON.stringify(Object.keys(req.cookies || {}))}`);
  
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['access_token'];
    if (token) {
      logger.log(`[Extract] Token found in cookies (length: ${token.length})`);
    } else {
      logger.warn('[Extract] access_token cookie NOT FOUND');
      logger.warn(`[Extract] Available cookies: ${JSON.stringify(req.cookies)}`);
    }
  } else {
    logger.warn('[Extract] No cookies object on request');
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
    const secret = configService.get<string>('JWT_SECRET_KEY');
    
    // Log configuration (without exposing full secret)
    const logger = new Logger('JwtStrategy:Constructor');
    logger.log(`JWT Secret configured: ${secret ? 'YES (length: ' + secret.length + ')' : 'NO - CRITICAL ERROR'}`);
    
    // CRITICAL FIX: Ensure 'secret' is not undefined by asserting it with '!'
    if (!secret) {
      logger.error('CRITICAL: JWT_SECRET_KEY is not configured!');
      throw new Error('JWT_SECRET_KEY is not defined. Cannot start JWT Strategy.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(), // Fallback to Authorization header
      ]),
      ignoreExpiration: false,
      secretOrKey: secret, // Use the non-nullable secret
    });

    this.usersRepository = this.dataSource.getRepository(UserEntity);
  }

  async validate(payload: JwtPayload): Promise<UserPayload> {
    this.logger.log(`[Validate] Called with payload: ${JSON.stringify({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      tenant_id: payload.tenant_id,
      has_tenant: !!payload.tenant_id,
    })}`);

    if (!payload.sub) {
      this.logger.error('[Validate] Missing sub (user ID) in JWT payload');
      throw new UnauthorizedException('Invalid token: missing user ID');
    }

    try {
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub, is_active: true },
        select: ['id', 'email', 'role', 'tenant_id'],
      });

      if (!user) {
        this.logger.warn(`[Validate] User not found or inactive for sub: ${payload.sub}`);
        throw new UnauthorizedException('User no longer active or token invalid.');
      }

      this.logger.log(`[Validate] User found in DB: ${JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        has_tenant: !!user.tenant_id,
      })}`);

      const userPayloadToReturn: UserPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      };

      this.logger.log(`[Validate] Returning user payload with tenant_id: ${userPayloadToReturn.tenant_id}`);
      
      return userPayloadToReturn;
    } catch (error: unknown) { // Add explicit type annotation to catch
        if (error instanceof Error) {
            this.logger.error(`[Validate] Error during validation: ${error.message}`, error.stack);
        } else {
            this.logger.error(`[Validate] Unknown error during validation: ${JSON.stringify(error)}`);
        }
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
```

### `backend/src/common/middleware/tenancy.middleware.ts`
```typescript
import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  Logger, // Import Logger
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthenticatedRequest } from '../interfaces/request.interface';
import { Reflector } from '@nestjs/core';
import { IS_TENANT_AWARE_KEY } from '../decorators/tenant-aware.decorator';
import { TenantEntity } from '../../tenants/tenant.entity';

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenancyMiddleware.name); // Initialize Logger

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TenantEntity)
    private tenantsRepository: Repository<TenantEntity>,
    private readonly reflector: Reflector,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    this.logger.log(`[TenancyMiddleware] Processing request for URL: ${req.originalUrl}`);
    this.logger.log(`[TenancyMiddleware] req.user: ${JSON.stringify(req.user)}`);
    this.logger.log(`[TenancyMiddleware] req.user?.tenant_id: ${req.user?.tenant_id}`);


    // Temporarily bypass for /admin/tenants to fix the current issue
    // TODO: Replace this with a robust @TenantAware decorator implementation.
    if (req.originalUrl.startsWith('/api/v1/admin/tenants')) {
      this.logger.log('[TenancyMiddleware] Bypassing for /admin/tenants route.');
      return next();
    }

    const tenant_id_from_user_payload = req.user?.tenant_id;

    if (!tenant_id_from_user_payload) {
      this.logger.error(`[TenancyMiddleware] Tenant ID not found in payload for URL: ${req.originalUrl}. req.user: ${JSON.stringify(req.user)}`);
      throw new BadRequestException('Tenant ID not found in authenticated user payload.');
    }

    // 1. Look up the tenant in the public.tenants table using the tenant_id from the user's JWT
    const tenant = await this.tenantsRepository.findOne({
        where: { id: tenant_id_from_user_payload },
        select: ['id', 'schema_name'],
    });

    if (!tenant) {
        this.logger.error(`[TenancyMiddleware] Tenant ID ${tenant_id_from_user_payload} from user payload does not match any tenant in DB.`);
        throw new ForbiddenException('Authenticated user belongs to a non-existent or invalid tenant.');
    }

    const actual_schema_name = tenant.schema_name;

    // Advanced Implementation: Sanitize and validate the tenantId to ensure it's a safe schema name.
    // The schema name is retrieved from the DB, so it should be valid, but we can still validate.
    const schemaNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!schemaNameRegex.test(actual_schema_name)) {
        // This indicates a misconfiguration in the tenants table data itself.
        this.logger.error(`[TenancyMiddleware] Invalid schema name '${actual_schema_name}' retrieved for tenant ${tenant_id_from_user_payload}.`);
        throw new InternalServerErrorException('Invalid schema name retrieved from tenant data.');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      // Set the search_path for the current session to the actual tenant's schema
      await queryRunner.query(`SET search_path TO "${actual_schema_name}", public;`);
      this.logger.log(`[TenancyMiddleware] search_path set to "${actual_schema_name}", public for URL: ${req.originalUrl}`);

      // Attach tenant_id (the UUID) and the queryRunner to the request for potential use in transactions
      req.tenant_id = tenant_id_from_user_payload;
      req.schema_name = actual_schema_name;
      req.queryRunner = queryRunner;

      next();
    } catch (error: unknown) {
      const errorMessage = (error instanceof Error ? error.message : 'Unknown error');
      this.logger.error(`[TenancyMiddleware] Failed to set tenant context for URL: ${req.originalUrl}. Error: ${errorMessage}`, (error instanceof Error ? error.stack : undefined));
      throw new InternalServerErrorException(`Failed to set tenant context: ${errorMessage}`);
    } finally {
        // This is critical. The `finally` block ensures that the search_path is reset
        // and the connection is released back to the pool, even if an error occurs mid-request.
        if (req.queryRunner) {
            await req.queryRunner.release();
        }
    }
  }
}
```

### `frontend/pages/dashboard/ceo.tsx`
```typescript
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic'; // Import dynamic
import PageContainer from '../../components/Layout/PageContainer';
import { useSecuredApi } from '../../components/hooks/useSecuredApi';
import { useAuth } from '../../components/context/AuthContext';
import { formatCurrency } from '../../lib/utils';
import WBSHierarchyTree from '../../components/dashboard/WBSHierarchyTree';
import SpendingChart from '../../components/dashboard/SpendingChart';
import Card from '../../components/common/Card';
import withAuth from '../../components/auth/withAuth';
import { Role } from '../../components/context/AuthContext';
import { Loader2, Search, RefreshCcw } from 'lucide-react';

import 'react-datepicker/dist/react-datepicker.css'; // Keep CSS import here
import WBSDetailModal from '../../components/dashboard/WBSDetailModal'; 

// Dynamically import DatePicker with SSR turned off
const DatePicker = dynamic(() => import('react-datepicker'), {
  ssr: false,
});

// Helper to format date to YYYY-MM-DD
const toYYYYMMDD = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// Interface for the data returned from the production-ready Recursive CTE endpoint
interface RollupData {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: string; // From DB (NUMERIC)
  total_paid_rollup: string;   // From DB (NUMERIC)
  total_paid_self: string;     // From DB (NUMERIC)
  total_committed_lpo: string;
}

const CEODashboard: React.FC = () => {
  const { user } = useAuth();
  const api = useSecuredApi();
  const [data, setData] = useState<RollupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // State for error handling

  const [startDate, setStartDate] = useState<Date | null>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), 0, 1); // Default to start of current year
  });
  const [endDate, setEndDate] = useState<Date | null>(new Date()); // Default to today

  const [onPageSearchTerm, setOnPageSearchTerm] = useState<string>(''); // For WBS table search

  // State for WBS Detail Modal
  const [showWBSDetailModal, setShowWBSDetailModal] = useState(false);
  const [selectedWBS, setSelectedWBS] = useState<{ id: string; code: string; description: string } | null>(null);

  // State for the four MANDATORY KPIs
  const [kpis, setKpis] = useState({
    totalBudget: 0,
    totalActualPaid: 0,
    totalCommittedLPO: 0,
    variancePercentage: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', toYYYYMMDD(startDate)); // Format date
      if (endDate) params.append('endDate', toYYYYMMDD(endDate)); // Format date

      const response = await api.get<RollupData[]>(`/wbs/budget/rollup?${params.toString()}`);
      setData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.message || err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [api, startDate, endDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]); // Re-fetch data when date range changes

  // Calculate the final KPIs whenever the data changes
  useEffect(() => {
    if (data.length === 0) {
      setKpis({
        totalBudget: 0,
        totalActualPaid: 0,
        totalCommittedLPO: 0,
        variancePercentage: 0,
      });
      return;
    }

    // Only consider top-level items for overall KPI aggregation
    const rootLevelItems = data.filter(item => !item.parent_wbs_id);
    
    const totalBudget = rootLevelItems.reduce((sum, item) => sum + Number(item.total_cost_budgeted), 0);
    const totalActualPaid = rootLevelItems.reduce((sum, item) => sum + Number(item.total_paid_rollup), 0);
    const totalCommittedLPO = rootLevelItems.reduce((sum, item) => sum + Number(item.total_committed_lpo), 0);

    const variance = totalBudget > 0 ? ((totalActualPaid - totalBudget) / totalBudget) * 100 : 0;

    setKpis({
      totalBudget,
      totalActualPaid,
      totalCommittedLPO,
      variancePercentage: variance,
    });
  }, [data]);

  // Filtered data for the WBS Hierarchy Tree based on onPageSearchTerm
  const filteredWBSData = useMemo(() => {
    if (!onPageSearchTerm) return data;
    const lowerCaseSearchTerm = onPageSearchTerm.toLowerCase();
    return data.filter(item => 
      item.wbs_code.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.description.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [data, onPageSearchTerm]);

  // Handler for WBS drill-down click
  const handleWBSClick = (wbsId: string, wbsCode: string, description: string) => {
    setSelectedWBS({ id: wbsId, code: wbsCode, description: description });
    setShowWBSDetailModal(true);
  };

  return (
    <>
      <Head>
        <title>CEO Dashboard | SentinelFi</title>
      </Head>
      <PageContainer title="Executive Financial Oversight">
        <div className="space-y-6">
            {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-lg flex items-center justify-between">
                    <span>Error loading dashboard data: {error}</span>
                    <button onClick={fetchDashboardData} className="ml-4 px-3 py-1 bg-red-700 hover:bg-red-600 rounded-md flex items-center">
                        <RefreshCcw className="w-4 h-4 mr-2" /> Retry
                    </button>
                </div>
            )}

            {/* Controls Section: Date Picker, Search, Refresh */}
            <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <label className="text-gray-300 text-sm">Date Range:</label>
                    <DatePicker
                        selected={startDate}
                        onChange={(date: Date | null) => setStartDate(date)}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        className="p-2 bg-brand-dark/50 border border-gray-600 rounded-lg text-white focus:ring-brand-primary focus:border-brand-primary w-32"
                        dateFormat="yyyy/MM/dd"
                        placeholderText="Start Date"
                    />
                    <DatePicker
                        selected={endDate}
                        onChange={(date: Date | null) => setEndDate(date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        className="p-2 bg-brand-dark/50 border border-gray-600 rounded-lg text-white focus:ring-brand-primary focus:border-brand-primary w-32"
                        dateFormat="yyyy/MM/dd"
                        placeholderText="End Date"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search WBS..."
                            value={onPageSearchTerm}
                            onChange={(e) => setOnPageSearchTerm(e.target.value)}
                            className="pl-9 p-2 w-48 bg-brand-dark/50 border border-gray-600 rounded-lg text-white focus:ring-brand-primary focus:border-brand-primary"
                        />
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        className="px-4 py-2 bg-brand-primary rounded-lg text-white hover:bg-brand-primary/90 transition flex items-center disabled:opacity-50"
                        disabled={loading}
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
                    </button>
                </div>
            </Card>
            
            {/* Section 1: MANDATORY KPIs */}
            <Card title="Financial Health KPIs" className="bg-gray-800/50">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card title="Total Budgeted Cost" borderTopColor="primary">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  ) : data.length === 0 ? (
                    <p className="text-3xl font-semibold text-gray-400">No Data</p>
                  ) : (
                    <p className="text-3xl font-semibold text-gray-100">{formatCurrency(kpis.totalBudget)}</p>
                  )}
                </Card>
                <Card title="Total Actual Paid" borderTopColor="primary">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  ) : data.length === 0 ? (
                    <p className="text-3xl font-semibold text-gray-400">No Data</p>
                  ) : (
                    <p className="text-3xl font-semibold text-gray-100">{formatCurrency(kpis.totalActualPaid)}</p>
                  )}
                </Card>
                <Card title="Total Committed (LPO)" borderTopColor="secondary">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  ) : data.length === 0 ? (
                    <p className="text-3xl font-semibold text-gray-400">No Data</p>
                  ) : (
                    <p className="text-3xl font-semibold text-gray-100">{formatCurrency(kpis.totalCommittedLPO)}</p>
                  )}
                </Card>
                <Card 
                  title="Cost Base Variance"
                  borderTopColor={kpis.variancePercentage > 0 ? 'alert' : 'positive'}
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  ) : data.length === 0 ? (
                    <p className="text-3xl font-semibold text-gray-400">No Data</p>
                  ) : (
                    <p className="text-3xl font-semibold text-gray-100">{`${kpis.variancePercentage.toFixed(2)}%`}</p>
                  )}
                </Card>
              </div>
            </Card>

            {/* Section 2: WBS Breakdown (Hierarchy and Chart View) */}
            <Card title="Work Breakdown Structure Analysis" className="bg-gray-800/50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="WBS Cost Structure" className="lg:col-span-1">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-brand-primary"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading WBS...</div>
                  ) : filteredWBSData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">No WBS data available. Adjust search or date range.</div>
                  ) : (
                    <WBSHierarchyTree data={filteredWBSData} onWBSClick={handleWBSClick} />
                  )}
                </Card>
                <Card title="WBS Level 1 Spending vs. Budget" className="lg:col-span-2">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-brand-primary"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading chart...</div>
                  ) : filteredWBSData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">No chart data available. Adjust search or date range.</div>
                  ) : (
                    <SpendingChart data={filteredWBSData} />
                  )}
                </Card>
              </div>
            </Card>
            
          </div>
        </PageContainer>

      {/* WBS Detail Modal */}
      <WBSDetailModal
        isOpen={showWBSDetailModal}
        onClose={() => setShowWBSDetailModal(false)}
        wbsId={selectedWBS?.id || null}
        wbsCode={selectedWBS?.code || null}
        description={selectedWBS?.description || null}
      />
    </>
  );
};

export default withAuth(CEODashboard, [Role.CEO, Role.Finance]);
```

### `frontend/lib/api.ts`
```typescript
import axios from "axios";

// CRITICAL FIX: Base URL is now relative, as Next.js will handle proxying via next.config.js rewrites.
const BASE_URL = "/api/v1"; 

/**
 * Global, unsecured Axios instance.
 * Interceptors for security (token injection, 401 handling) will be added
 * dynamically in the AuthProvider to give them access to the context (token/logout).
 */
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // CRITICAL: This ensures cookies (HttpOnly JWT) are sent with every request
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
```
