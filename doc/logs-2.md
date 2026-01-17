[10:39:42 PM] File change detected. Starting incremental compilation...

src/auth/auth.controller.ts:70:39 - error TS18046: 'error' is of type 'unknown'. 

70       throw new UnauthorizedException(error.message || "Invalid credentials");
                                         ~~~~~

src/auth/auth.controller.ts:89:39 - error TS18046: 'error' is of type 'unknown'. 

89       throw new UnauthorizedException(error.message || "Invalid credentials");
                                         ~~~~~

src/auth/auth.controller.ts:150:40 - error TS2345: Argument of type 'import("C:/temp/SentinelFi/shared/types/user").JwtPayload' is not assignable to parameter of type 'import("C:/temp/SentinelFi/backend/src/common/interfaces/authenticated-request.interface").JwtPayload'.
  Types of property 'tenant_id' are incompatible.
    Type 'string | null | undefined' is not assignable to type 'string | null'.
      Type 'undefined' is not assignable to type 'string | null'.

150     return this.authService.createUser(req.user, createUserDto);
                                           ~~~~~~~~

src/auth/auth.controller.ts:161:40 - error TS2345: Argument of type 'import("C:/temp/SentinelFi/shared/types/user").JwtPayload' is not assignable to parameter of type 'import("C:/temp/SentinelFi/backend/src/common/interfaces/authenticated-request.interface").JwtPayload'.
  Types of property 'tenant_id' are incompatible.
    Type 'string | null | undefined' is not assignable to type 'string | null'.
      Type 'undefined' is not assignable to type 'string | null'.

161     return this.authService.updateUser(req.user, id, updateUserDto);
                                           ~~~~~~~~

src/auth/auth.controller.ts:171:39 - error TS2345: Argument of type 'import("C:/temp/SentinelFi/shared/types/user").JwtPayload' is not assignable to parameter of type 'import("C:/temp/SentinelFi/backend/src/common/interfaces/authenticated-request.interface").JwtPayload'.
  Types of property 'tenant_id' are incompatible.
    Type 'string | null | undefined' is not assignable to type 'string | null'.
      Type 'undefined' is not assignable to type 'string | null'.

171     await this.authService.updateUser(req.user, id, { is_active: false });
                                          ~~~~~~~~

src/auth/auth.service.ts:18:3 - error TS2305: Module '"../common/interfaces/authenticated-request.interface"' has no exported member 'ICreateUserPayload'.

18   ICreateUserPayload,
     ~~~~~~~~~~~~~~~~~~

src/auth/auth.service.ts:19:3 - error TS2305: Module '"../common/interfaces/authenticated-request.interface"' has no exported member 'IUpdateUserPayload'.

19   IUpdateUserPayload,
     ~~~~~~~~~~~~~~~~~~

src/auth/dto/login-tenant.dto.ts:8:3 - error TS2564: Property 'tenantId' has no initializer and is not definitely assigned in the constructor.

8   tenantId: string;
    ~~~~~~~~

src/auth/guards/roles.guard.ts:6:29 - error TS2307: Cannot find module 'src/common/interfaces/request.interface' or its corresponding type declarations.

6 import { UserPayload } from 'src/common/interfaces/request.interface';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/auth/jwt.strategy.ts:115:9 - error TS2353: Object literal may only specify known properties, and 'id' does not exist in type 'JwtPayload'.

115         id: user.id,
            ~~

src/dashboard/dashboard.controller.ts:21:51 - error TS2345: Argument of type 'string | null' is not assignable to parameter of 
type 'string'.
  Type 'null' is not assignable to type 'string'.

21     return this.dashboardService.getTenantSummary(tenantId);
                                                     ~~~~~~~~

src/tenants/guards/tenant.guard.ts:5:29 - error TS2307: Cannot find module 'src/common/interfaces/request.interface' or its corresponding type declarations.

5 import { UserPayload } from 'src/common/interfaces/request.interface';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/wbs/wbs.controller.ts:286:38 - error TS2339: Property 'id' does not exist on type 'JwtPayload'.

286     const userIdFromToken = req.user.id;
                                         ~~

src/wbs/wbs.controller.ts:311:38 - error TS2339: Property 'id' does not exist on type 'JwtPayload'.

311     const userIdFromToken = req.user.id;
                                         ~~

src/wbs/wbs.controller.ts:357:38 - error TS2339: Property 'id' does not exist on type 'JwtPayload'.

357     const userIdFromToken = req.user.id;
                                         ~~

[10:39:48 PM] Found 15 errors. Watching for file changes.




### Frontend Logs:

○ Compiling / ...
 ✓ Compiled / in 887ms (407 modules)
 ⨯ TypeError: Cannot convert undefined or null to object
    at Function.values (<anonymous>)
    at eval (webpack-internal:///./lib/navigationMap.ts:11:26)
    at ./lib/navigationMap.ts (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:154:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:15:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:1:21)
    at ./components/Layout/SuperAdminSidebar.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:88:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:10:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:1:21)
    at ./components/Layout/SuperAdminLayoutUI.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:77:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayout.tsx:10:77)
 ⚠ Fast Refresh had to perform a full reload due to a runtime error.
 ⨯ lib\navigationMap.ts (25:25) @ values
 ⨯ TypeError: Cannot convert undefined or null to object
    at Function.values (<anonymous>)
    at eval (webpack-internal:///./lib/navigationMap.ts:11:26)
    at ./lib/navigationMap.ts (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:154:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:15:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:1:21)
    at ./components/Layout/SuperAdminSidebar.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:88:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:10:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:1:21)
    at ./components/Layout/SuperAdminLayoutUI.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:77:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayout.tsx:10:77) {
  page: '/'
}
  23 | }
  24 |
> 25 | const ALL_ROLES = Object.values(Role);
     |                         ^
  26 |
  27 | export const navigationMap: NavItem[] = [
  28 |   // --- General Section ---
 ⨯ lib\navigationMap.ts (25:25) @ values
 ⨯ TypeError: Cannot convert undefined or null to object
    at Function.values (<anonymous>)
    at eval (webpack-internal:///./lib/navigationMap.ts:11:26)
    at ./lib/navigationMap.ts (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:154:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:15:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:1:21)
    at ./components/Layout/SuperAdminSidebar.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:88:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:10:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:1:21)
    at ./components/Layout/SuperAdminLayoutUI.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:77:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayout.tsx:10:77) {
  page: '/'
}
  23 | }
  24 |
> 25 | const ALL_ROLES = Object.values(Role);
     |                         ^
  26 |
  27 | export const navigationMap: NavItem[] = [
  28 |   // --- General Section ---
 ⨯ TypeError: Cannot convert undefined or null to object
    at Function.values (<anonymous>)
    at eval (webpack-internal:///./lib/navigationMap.ts:11:26)
    at ./lib/navigationMap.ts (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:154:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:15:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:1:21)
    at ./components/Layout/SuperAdminSidebar.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:88:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:10:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:1:21)
    at ./components/Layout/SuperAdminLayoutUI.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:77:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayout.tsx:10:77) {
  page: '/'
}
 ⨯ TypeError: Cannot convert undefined or null to object
    at Function.values (<anonymous>)
    at eval (webpack-internal:///./lib/navigationMap.ts:11:26)
    at ./lib/navigationMap.ts (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:154:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:15:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:1:21)
    at ./components/Layout/SuperAdminSidebar.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:88:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:10:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:1:21)
    at ./components/Layout/SuperAdminLayoutUI.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:77:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayout.tsx:10:77) {
  page: '/'
}
 ⨯ lib\navigationMap.ts (25:25) @ values
 ⨯ TypeError: Cannot convert undefined or null to object
    at Function.values (<anonymous>)
    at eval (webpack-internal:///./lib/navigationMap.ts:11:26)
    at ./lib/navigationMap.ts (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:154:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:15:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:1:21)
    at ./components/Layout/SuperAdminSidebar.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:88:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:10:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:1:21)
    at ./components/Layout/SuperAdminLayoutUI.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:77:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayout.tsx:10:77) {
  page: '/'
}
  23 | }
  24 |
> 25 | const ALL_ROLES = Object.values(Role);
     |                         ^
  26 |
  27 | export const navigationMap: NavItem[] = [
  28 |   // --- General Section ---
 ⨯ TypeError: Cannot convert undefined or null to object
    at Function.values (<anonymous>)
    at eval (webpack-internal:///./lib/navigationMap.ts:11:26)
    at ./lib/navigationMap.ts (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:154:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:15:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:1:21)
    at ./components/Layout/SuperAdminSidebar.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:88:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:10:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:1:21)
    at ./components/Layout/SuperAdminLayoutUI.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:77:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayout.tsx:10:77) {
  page: '/'
}
 ⨯ TypeError: Cannot convert undefined or null to object
    at Function.values (<anonymous>)
    at eval (webpack-internal:///./lib/navigationMap.ts:11:26)
    at ./lib/navigationMap.ts (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:154:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:15:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminSidebar.tsx:1:21)
    at ./components/Layout/SuperAdminSidebar.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:88:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:10:76)
    at __webpack_require__.a (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:97:13)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayoutUI.tsx:1:21)
    at ./components/Layout/SuperAdminLayoutUI.tsx (C:\temp\SentinelFi\frontend\.next\server\pages\_app.js:77:1)
    at __webpack_require__ (C:\temp\SentinelFi\frontend\.next\server\webpack-runtime.js:33:42)
    at eval (webpack-internal:///./components/Layout/SuperAdminLayout.tsx:10:77) {
  page: '/'
}