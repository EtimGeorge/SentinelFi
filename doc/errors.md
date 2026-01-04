[12:05:24 AM] Starting compilation in watch mode...

[12:05:38 AM] Found 0 errors. Watching for file changes.

[Nest] 16928  - 01/04/2026, 12:05:47 AM     LOG [NestFactory] Starting Nest application...
[Nest] 16928  - 01/04/2026, 12:05:47 AM     LOG [InstanceLoader] AppModule dependencies initialized +42ms
[Nest] 16928  - 01/04/2026, 12:05:47 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms      
[Nest] 16928  - 01/04/2026, 12:05:47 AM     LOG [InstanceLoader] PassportModule dependencies initialized +1ms     
[Nest] 16928  - 01/04/2026, 12:05:47 AM     LOG [InstanceLoader] ConfigHostModule dependencies initialized +1ms   
[Nest] 16928  - 01/04/2026, 12:05:47 AM     LOG [InstanceLoader] HttpModule dependencies initialized +1ms
[Nest] 16928  - 01/04/2026, 12:05:47 AM     LOG [InstanceLoader] ConfigModule dependencies initialized +2ms       
[Nest] 16928  - 01/04/2026, 12:05:47 AM     LOG [InstanceLoader] ConfigModule dependencies initialized +1ms       
[Nest] 16928  - 01/04/2026, 12:05:47 AM     LOG [InstanceLoader] NotificationsModule dependencies initialized +1ms
[Nest] 16928  - 01/04/2026, 12:05:47 AM     LOG [InstanceLoader] JwtModule dependencies initialized +216ms
[Nest] 16928  - 01/04/2026, 12:05:47 AM     LOG [InstanceLoader] ThrottlerModule dependencies initialized +1ms
query: SELECT version()
query: SELECT * FROM current_schema()
query: CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [JwtStrategy:Constructor] JWT Secret configured: YES (length: 64)
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [InstanceLoader] TypeOrmCoreModule dependencies initialized +3ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms    
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms    
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms    
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms    
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [InstanceLoader] SearchModule dependencies initialized +15ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [InstanceLoader] WbsModule dependencies initialized +19ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [InstanceLoader] TenantModule dependencies initialized +6ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [InstanceLoader] AuthModule dependencies initialized +2ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [WebSocketsController] NotificationsGateway subscribed to the "message" message +42ms[Nest] 16928  - 01/04/2026, 12:05:54 AM    WARN [LegacyRouteConverter] Unsupported route path: "/api/v1/auth/(.*)". In previous versions, the symbols ?, *, and + were used to denote optional or repeating path parameters. The latest version of "path-to-regexp" now requires the use of named parameters. For example, instead of using a route like /users/* to capture all routes starting with "/users", you should use /users/*path. For more details, refer to the migration guide. Attempting to auto-convert...
[Nest] 16928  - 01/04/2026, 12:05:54 AM    WARN [LegacyRouteConverter] Unsupported route path: "/api/v1/*". In previous versions, the symbols ?, *, and + were used to denote optional or repeating path parameters. The latest version of "path-to-regexp" now requires the use of named parameters. For example, instead of using a route like /users/* to capture all routes starting with "/users", you should use /users/*path. For more details, refer to the migration guide. Attempting to auto-convert...
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RoutesResolver] WbsController {/api/v1/wbs}: +30ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft, POST} route +36ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft/batch, POST} route +20ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft/:id, PATCH} route +46ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expense/live-entry, POST} route +49ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expense/live-entry/:id, PATCH} route +12ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget/rollup, GET} route +38ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RoutesResolver] AiController {/api/v1/ai}: +16ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/ai/draft-budget, POST} route +3ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RoutesResolver] DcsController {/api/v1/dcs}: +1ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/dcs/schedule-report, POST} route +4ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/dcs/test-data, GET} route +3ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RoutesResolver] AuthController {/api/v1/auth}: +1ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/login, POST} route +3ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/logout, POST} route +3ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/register, POST} route +1ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/test-secure, GET} route +2ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/users, GET} route +1ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/users, POST} route +1ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/users/:id, PATCH} route +2ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/users/:id, DELETE} route +2ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RoutesResolver] TenantController {/api/v1/admin/tenants}: +17ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants, POST} route +16ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants, GET} route +2ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, GET} route +15ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, PATCH} route +1ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, DELETE} route +1ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RoutesResolver] SearchController {/api/v1/search}: +1ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [RouterExplorer] Mapped {/api/v1/search, GET} route +1ms
[Nest] 16928  - 01/04/2026, 12:05:54 AM     LOG [SeedTestUsersService] --- Starting Test User Seeding ---
query: SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."role" AS "UserEntity_role", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires" FROM "public"."user" "UserEntity" WHERE (("UserEntity"."email" = $1)) LIMIT 1 -- PARAMETERS: ["admin@sentinelfi.com"]
[Nest] 16928  - 01/04/2026, 12:05:55 AM     LOG [SeedTestUsersService] - User already exists: admin@sentinelfi.com. Skipping re-creation.
query: SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."role" AS "UserEntity_role", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires" FROM "public"."user" "UserEntity" WHERE (("UserEntity"."email" = $1)) LIMIT 1 -- PARAMETERS: ["finance@sentinelfi.com"]
[Nest] 16928  - 01/04/2026, 12:05:55 AM     LOG [SeedTestUsersService] - User already exists: finance@sentinelfi.com. Skipping re-creation.
query: SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."role" AS "UserEntity_role", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires" FROM "public"."user" "UserEntity" WHERE (("UserEntity"."email" = $1)) LIMIT 1 -- PARAMETERS: ["projectuser@sentinelfi.com"]
[Nest] 16928  - 01/04/2026, 12:05:56 AM     LOG [SeedTestUsersService] - User already exists: projectuser@sentinelfi.com. Skipping re-creation.
query: SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."role" AS "UserEntity_role", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires" FROM "public"."user" "UserEntity" WHERE (("UserEntity"."email" = $1)) LIMIT 1 -- PARAMETERS: ["ceo@sentinelfi.com"]
[Nest] 16928  - 01/04/2026, 12:05:57 AM     LOG [SeedTestUsersService] - User already exists: ceo@sentinelfi.com. Skipping re-creation.
query: SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."role" AS "UserEntity_role", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires" FROM "public"."user" "UserEntity" WHERE (("UserEntity"."email" = $1)) LIMIT 1 -- PARAMETERS: ["ophead@sentinelfi.com"]
[Nest] 16928  - 01/04/2026, 12:05:57 AM     LOG [SeedTestUsersService] - User already exists: ophead@sentinelfi.com. Skipping re-creation.
[Nest] 16928  - 01/04/2026, 12:05:57 AM     LOG [SeedTestUsersService] --- Test User Seeding Complete ---
[Nest] 16928  - 01/04/2026, 12:05:57 AM     LOG [NestApplication] Nest application successfully started +3ms
SentinelFi API is running on: http://localhost:3001/api/v1
[Nest] 16928  - 01/04/2026, 12:07:49 AM     LOG [CookieExtractor] [Extract] Cookies present: []
[Nest] 16928  - 01/04/2026, 12:07:49 AM    WARN [CookieExtractor] [Extract] access_token cookie NOT FOUND
[Nest] 16928  - 01/04/2026, 12:07:49 AM    WARN [CookieExtractor] [Extract] Available cookies: {}
[Nest] 16928  - 01/04/2026, 12:07:49 AM     LOG [CookieExtractor] [Extract] Cookies present: []
[Nest] 16928  - 01/04/2026, 12:07:49 AM    WARN [CookieExtractor] [Extract] access_token cookie NOT FOUND
[Nest] 16928  - 01/04/2026, 12:07:49 AM    WARN [CookieExtractor] [Extract] Available cookies: {}
query: SELECT DISTINCT "distinctAlias"."UserEntity_id" AS "ids_UserEntity_id" FROM (SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."password_hash" AS "UserEntity_password_hash", "UserEntity"."role" AS "UserEntity_role", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity__UserEntity_tenant"."id" AS "UserEntity__UserEntity_tenant_id", "UserEntity__UserEntity_tenant"."name" AS "UserEntity__UserEntity_tenant_name", "UserEntity__UserEntity_tenant"."project_name" AS "UserEntity__UserEntity_tenant_project_name", "UserEntity__UserEntity_tenant"."schema_name" AS "UserEntity__UserEntity_tenant_schema_name", "UserEntity__UserEntity_tenant"."created_at" AS "UserEntity__UserEntity_tenant_created_at" FROM "public"."user" "UserEntity" LEFT JOIN "public"."tenants" "UserEntity__UserEntity_tenant" ON "UserEntity__UserEntity_tenant"."id"="UserEntity"."tenant_id" WHERE (("UserEntity"."email" = $1))) "distinctAlias" ORDER BY "UserEntity_id" ASC LIMIT 
1 -- PARAMETERS: ["ceo@sentinelfi.com"]
query: SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."password_hash" AS "UserEntity_password_hash", "UserEntity"."role" AS "UserEntity_role", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity__UserEntity_tenant"."id" AS "UserEntity__UserEntity_tenant_id", "UserEntity__UserEntity_tenant"."name" AS "UserEntity__UserEntity_tenant_name", "UserEntity__UserEntity_tenant"."project_name" AS "UserEntity__UserEntity_tenant_project_name", "UserEntity__UserEntity_tenant"."schema_name" AS "UserEntity__UserEntity_tenant_schema_name", "UserEntity__UserEntity_tenant"."created_at" AS "UserEntity__UserEntity_tenant_created_at" FROM "public"."user" "UserEntity" LEFT JOIN "public"."tenants" "UserEntity__UserEntity_tenant" ON "UserEntity__UserEntity_tenant"."id"="UserEntity"."tenant_id" WHERE ( (("UserEntity"."email" = $1)) ) AND ( "UserEntity"."id" IN ($2) ) -- PARAMETERS: ["ceo@sentinelfi.com","0cc1ad18-153d-4ef7-a8bd-f21fd3092557"]
[Nest] 16928  - 01/04/2026, 12:08:09 AM     LOG [AuthService] User found. Validating password.
[Nest] 16928  - 01/04/2026, 12:08:09 AM     LOG [AuthService] Password validation passed.
[Nest] 16928  - 01/04/2026, 12:08:09 AM     LOG [AuthService] [AuthService:Login] User fetched from DB has tenant_id: 99acb74f-8982-42b6-8eaf-2f7fc14a3399
[Nest] 16928  - 01/04/2026, 12:08:09 AM     LOG [AuthService] [AuthService:Login] JWT Payload generated with tenant_id: 99acb74f-8982-42b6-8eaf-2f7fc14a3399
[Nest] 16928  - 01/04/2026, 12:08:09 AM     LOG [AuthService] Generating JWT token and returning user object.
[Nest] 16928  - 01/04/2026, 12:08:09 AM     LOG [AuthController] [Login] Setting cookie with options: {"httpOnly":true,"secure":false,"sameSite":"lax","maxAge":3600000}



PS C:\temp\SentinelFi> npm run dev:frontend

> sentinelfi-monorepo@1.0.0 dev:frontend
> npm run dev -w frontend


> frontend@1.0.0 dev
> set NODE_OPTIONS=--max-old-space-size=4096 && next dev

  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 13.4s
 ○ Compiling /login ...
 ✓ Compiled /login in 14.7s (456 modules)
 GET /login 200 in 17118ms
 ○ Compiling /_error ...
 ✓ Compiled /_error in 12.6s (458 modules)
 GET /.well-known/appspecific/com.chrome.devtools.json 404 in 12800ms
(node:2584) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
 ○ Compiling /dashboard/ceo ...
 ✓ Compiled /dashboard/ceo in 28.8s (1615 modules)





 Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
websocket.js:39 [HMR] connected
AuthContext.tsx:114  GET http://localhost:3000/api/v1/auth/test-secure 500 (Internal Server Error)
dispatchXhrRequest @ axios.cjs:2663
xhr @ axios.cjs:2480
dispatchRequest @ axios.cjs:3238
_request @ axios.cjs:3538
request @ axios.cjs:3395
Axios.<computed> @ axios.cjs:3564
wrap @ axios.cjs:15
checkAuthStatus @ AuthContext.tsx:114
eval @ AuthContext.tsx:136
commitHookEffectListMount @ react-dom.development.js:23184
commitPassiveMountOnFiber @ react-dom.development.js:24960
commitPassiveMountEffects_complete @ react-dom.development.js:24925
commitPassiveMountEffects_begin @ react-dom.development.js:24912
commitPassiveMountEffects @ react-dom.development.js:24900
flushPassiveEffectsImpl @ react-dom.development.js:27073
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
AuthContext.tsx:129 checkAuthStatus: API call failed with unexpected error AxiosError {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
console.error @ hydration-error-info.js:63
window.console.error @ setup-hydration-warning.js:18
checkAuthStatus @ AuthContext.tsx:129
await in checkAuthStatus
eval @ AuthContext.tsx:136
commitHookEffectListMount @ react-dom.development.js:23184
commitPassiveMountOnFiber @ react-dom.development.js:24960
commitPassiveMountEffects_complete @ react-dom.development.js:24925
commitPassiveMountEffects_begin @ react-dom.development.js:24912
commitPassiveMountEffects @ react-dom.development.js:24900
flushPassiveEffectsImpl @ react-dom.development.js:27073
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
Header.tsx:19 Header component rendered
Header.tsx:26 unreadNotificationsCount from useUIStore: 0
Header.tsx:19 Header component rendered
Header.tsx:26 unreadNotificationsCount from useUIStore: 0
AuthContext.tsx:114  GET http://localhost:3000/api/v1/auth/test-secure 500 (Internal Server Error)
dispatchXhrRequest @ axios.cjs:2663
xhr @ axios.cjs:2480
dispatchRequest @ axios.cjs:3238
_request @ axios.cjs:3538
request @ axios.cjs:3395
Axios.<computed> @ axios.cjs:3564
wrap @ axios.cjs:15
checkAuthStatus @ AuthContext.tsx:114
eval @ AuthContext.tsx:136
commitHookEffectListMount @ react-dom.development.js:23184
invokePassiveEffectMountInDEV @ react-dom.development.js:25188
invokeEffectsInDev @ react-dom.development.js:27385
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27364
flushPassiveEffectsImpl @ react-dom.development.js:27090
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
AuthContext.tsx:129 checkAuthStatus: API call failed with unexpected error AxiosError {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
console.error @ hydration-error-info.js:63
window.console.error @ setup-hydration-warning.js:18
checkAuthStatus @ AuthContext.tsx:129
await in checkAuthStatus
eval @ AuthContext.tsx:136
commitHookEffectListMount @ react-dom.development.js:23184
invokePassiveEffectMountInDEV @ react-dom.development.js:25188
invokeEffectsInDev @ react-dom.development.js:27385
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27364
flushPassiveEffectsImpl @ react-dom.development.js:27090
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
ceo:1 [Intervention] Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: chrome-extension://okfkdaglfjjjfefdcppliegebpoegaii/assets/PublicSans-VariableFont_wght.ttf
warn-once.js:16 Image with src "/SentinelFi Logo Concept-bg-remv-logo-only.png" has either width or height modified, but not the other. If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.
warnOnce @ warn-once.js:16
eval @ image-component.js:110
Promise.then
handleLoading @ image-component.js:35
onLoad @ image-component.js:196
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
eval @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26174
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457Understand this warning
warn-once.js:16 Image with src "/SentinelFi Logo Concept-bg-remv-logo-only.png" was detected as the Largest Contentful Paint (LCP). Please add the "priority" property if this image is above the fold.
Read more: https://nextjs.org/docs/api-reference/next/image#priority
warnOnce @ warn-once.js:16
eval @ get-img-props.js:349Understand this warning
Header.tsx:19 Header component rendered
Header.tsx:26 unreadNotificationsCount from useUIStore: 0
Header.tsx:19 Header component rendered
Header.tsx:26 unreadNotificationsCount from useUIStore: 0
inject.js:2  GET http://localhost:3000/api/v1/wbs/budget/rollup?startDate=2025-12-31&endDate=2026-01-03 400 (Bad Request)
(anonymous) @ inject.js:2
dispatchXhrRequest @ axios.cjs:2663
xhr @ axios.cjs:2480
dispatchRequest @ axios.cjs:3238
_request @ axios.cjs:3538
request @ axios.cjs:3395
Axios.<computed> @ axios.cjs:3564
wrap @ axios.cjs:15
eval @ ceo.tsx:75
eval @ ceo.tsx:86
commitHookEffectListMount @ react-dom.development.js:23184
commitPassiveMountOnFiber @ react-dom.development.js:24960
commitPassiveMountEffects_complete @ react-dom.development.js:24925
commitPassiveMountEffects_begin @ react-dom.development.js:24912
commitPassiveMountEffects @ react-dom.development.js:24900
flushPassiveEffectsImpl @ react-dom.development.js:27073
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
ceo.tsx:78 Failed to fetch dashboard data: AxiosError {message: 'Request failed with status code 400', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}
console.error @ hydration-error-info.js:63
window.console.error @ setup-hydration-warning.js:18
eval @ ceo.tsx:78
await in eval
eval @ ceo.tsx:86
commitHookEffectListMount @ react-dom.development.js:23184
commitPassiveMountOnFiber @ react-dom.development.js:24960
commitPassiveMountEffects_complete @ react-dom.development.js:24925
commitPassiveMountEffects_begin @ react-dom.development.js:24912
commitPassiveMountEffects @ react-dom.development.js:24900
flushPassiveEffectsImpl @ react-dom.development.js:27073
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
inject.js:2  GET http://localhost:3000/api/v1/wbs/budget/rollup?startDate=2025-12-31&endDate=2026-01-03 400 (Bad Request)
(anonymous) @ inject.js:2
dispatchXhrRequest @ axios.cjs:2663
xhr @ axios.cjs:2480
dispatchRequest @ axios.cjs:3238
_request @ axios.cjs:3538
request @ axios.cjs:3395
Axios.<computed> @ axios.cjs:3564
wrap @ axios.cjs:15
eval @ ceo.tsx:75
eval @ ceo.tsx:86
commitHookEffectListMount @ react-dom.development.js:23184
invokePassiveEffectMountInDEV @ react-dom.development.js:25188
invokeEffectsInDev @ react-dom.development.js:27385
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27364
flushPassiveEffectsImpl @ react-dom.development.js:27090
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
ceo.tsx:78 Failed to fetch dashboard data: AxiosError {message: 'Request failed with status code 400', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}
console.error @ hydration-error-info.js:63
window.console.error @ setup-hydration-warning.js:18
eval @ ceo.tsx:78
await in eval
eval @ ceo.tsx:86
commitHookEffectListMount @ react-dom.development.js:23184
invokePassiveEffectMountInDEV @ react-dom.development.js:25188
invokeEffectsInDev @ react-dom.development.js:27385
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27364
flushPassiveEffectsImpl @ react-dom.development.js:27090
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error