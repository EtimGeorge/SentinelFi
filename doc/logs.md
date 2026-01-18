### browser dev tool console:

Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
websocket.js:46 [HMR] connected
AuthContext.tsx:84 [AUTH] [RouteGuard] Displaying loading screen. {isInitialized: false, isLoading: true, isAuthorizing: true}
AuthContext.tsx:84 [AUTH] [RouteGuard] Displaying loading screen. {isInitialized: false, isLoading: true, isAuthorizing: true}
AuthContext.tsx:84 [AUTH] [RouteGuard] Waiting for initialization or router readiness, or check in progress. {checkInProgress: false, isInitialized: false, routerReady: false}
AuthContext.tsx:84 [AUTH] Initializing auth state... 
AuthContext.tsx:84 [AUTH] Fetching current user... 
AuthContext.tsx:88 [AUTH] ⚠️ No token found for fetching current user. 
warn @ AuthContext.tsx:88
eval @ AuthContext.tsx:318
initializeAuth @ AuthContext.tsx:364
eval @ AuthContext.tsx:405
commitHookEffectListMount @ react-dom.development.js:23145
commitPassiveMountOnFiber @ react-dom.development.js:24921
commitPassiveMountEffects_complete @ react-dom.development.js:24886
commitPassiveMountEffects_begin @ react-dom.development.js:24873
commitPassiveMountEffects @ react-dom.development.js:24861
flushPassiveEffectsImpl @ react-dom.development.js:27034
flushPassiveEffects @ react-dom.development.js:26979
eval @ react-dom.development.js:26764
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
AuthContext.tsx:84 [AUTH] [RouteGuard] Waiting for initialization or router readiness, or check in progress. {checkInProgress: false, isInitialized: false, routerReady: false}
AuthContext.tsx:84 [AUTH] Initializing auth state... 
AuthContext.tsx:84 [AUTH] Fetching current user... 
AuthContext.tsx:88 [AUTH] ⚠️ No token found for fetching current user. 
warn @ AuthContext.tsx:88
eval @ AuthContext.tsx:318
initializeAuth @ AuthContext.tsx:364
eval @ AuthContext.tsx:405
commitHookEffectListMount @ react-dom.development.js:23145
invokePassiveEffectMountInDEV @ react-dom.development.js:25149
invokeEffectsInDev @ react-dom.development.js:27346
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27325
flushPassiveEffectsImpl @ react-dom.development.js:27051
flushPassiveEffects @ react-dom.development.js:26979
eval @ react-dom.development.js:26764
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
AuthContext.tsx:88 [AUTH] ⚠️ Attempted state update after unmount - ignoring 
warn @ AuthContext.tsx:88
eval @ AuthContext.tsx:222
initializeAuth @ AuthContext.tsx:381
await in initializeAuth
eval @ AuthContext.tsx:405
commitHookEffectListMount @ react-dom.development.js:23145
invokePassiveEffectMountInDEV @ react-dom.development.js:25149
invokeEffectsInDev @ react-dom.development.js:27346
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27325
flushPassiveEffectsImpl @ react-dom.development.js:27051
flushPassiveEffects @ react-dom.development.js:26979
eval @ react-dom.development.js:26764
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this warning
AuthContext.tsx:84 [AUTH] [RouteGuard] Displaying loading screen. {isInitialized: false, isLoading: true, isAuthorizing: true}
AuthContext.tsx:84 [AUTH] [RouteGuard] Displaying loading screen. {isInitialized: false, isLoading: true, isAuthorizing: true}
AuthContext.tsx:84 [AUTH] [RouteGuard] Waiting for initialization or router readiness, or check in progress. {checkInProgress: false, isInitialized: false, routerReady: true}
(index):1 [Intervention] Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: chrome-extension://okfkdaglfjjjfefdcppliegebpoegaii/assets/PublicSans-VariableFont_wght.ttf

### frontend console logs:

PS C:\temp\SentinelFi> npm run dev:frontend

> sentinelfi-monorepo@1.0.0 dev:frontend
> npm run dev -w frontend


> frontend@1.0.0 dev
> set NODE_OPTIONS=--max-old-space-size=4096 && next dev

   ▲ Next.js 14.1.4
   - Local:        http://localhost:3000
   - Environments: .env.local

 ✓ Ready in 11.1s
 ○ Compiling / ...
 ✓ Compiled / in 6.8s (411 modules)
[AUTH] [RouteGuard] Displaying loading screen. { isInitialized: false, isLoading: true, isAuthorizing: true }
 ⚠ Fast Refresh had to perform a full reload. Read more: https://nextjs.org/docs/messages/fast-refresh-reload
[AUTH] [RouteGuard] Displaying loading screen. { isInitialized: false, isLoading: true, isAuthorizing: true }
[AUTH] [RouteGuard] Displaying loading screen. { isInitialized: false, isLoading: true, isAuthorizing: true }
[AUTH] [RouteGuard] Displaying loading screen. { isInitialized: false, isLoading: true, isAuthorizing: true }


### backend console logs:

[2:37:49 AM] File change detected. Starting incremental compilation...

[2:37:56 AM] Found 0 errors. Watching for file changes.

[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [NestFactory] Starting Nest application...
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] AppModule dependencies initialized +164ms
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +4ms  
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] ClsModule dependencies initialized +3ms      
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] ClsCommonModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] NotificationsModule dependencies initialized +19ms
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] ConfigHostModule dependencies initialized +1ms    
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] HttpModule dependencies initialized +0ms
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] CommonModule dependencies initialized +2ms        
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] DiscoveryModule dependencies initialized +8ms
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [TypeOrmModule] Applied encoding/normalization to DATABASE_URL.
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [TypeOrmModule] Connecting to database (len: 125): postgres://neondb_owner:****@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] ConfigModule dependencies initialized +3ms
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] ConfigModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] ClsRootModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:38 AM     LOG [InstanceLoader] ClsPluginsModule dependencies initialized +0ms
[Nest] 4624  - 01/18/2026, 2:38:39 AM     LOG [InstanceLoader] TenantMigrationModule dependencies initialized +354ms
[Nest] 4624  - 01/18/2026, 2:38:39 AM     LOG [InstanceLoader] EmailModule dependencies initialized +1ms  
[Nest] 4624  - 01/18/2026, 2:38:39 AM     LOG [InstanceLoader] JwtModule dependencies initialized +2ms    
[Nest] 4624  - 01/18/2026, 2:38:39 AM     LOG [InstanceLoader] JwtModule dependencies initialized +0ms    
[Nest] 4624  - 01/18/2026, 2:38:39 AM     LOG [InstanceLoader] BillingModule dependencies initialized +1ms
(node:4624) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
query: SELECT version()
query: SELECT * FROM current_schema()
query: CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] TenantDatabaseModule dependencies initialized +4558ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] TypeOrmCoreModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] SearchModule dependencies initialized +8ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] DashboardModule dependencies initialized +10ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] SettingsModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] AuditModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] OperationalBudgetsModule dependencies initialized +3ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] ProjectsModule dependencies initialized +4ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] AuthModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] SuperAdminModule dependencies initialized +0ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] WbsModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [InstanceLoader] TenantModule dependencies initialized +1ms
[Nest] 4624  - 01/18/2026, 2:38:43 AM     LOG [Bootstrap] Development request logging is enabled.
[Nest] 4624  - 01/18/2026, 2:38:44 AM     LOG [WebSocketsController] NotificationsGateway subscribed to the "message" message +1051ms[Nest] 4624  - 01/18/2026, 2:38:44 AM   DEBUG [ClsModule] Mounting ClsMiddleware to /
[Nest] 4624  - 01/18/2026, 2:38:44 AM    WARN [LegacyRouteConverter] Unsupported route path: "/api/v1/*". In previous versions, the symbols ?, *, and + were used to denote optional or repeating path parameters. The latest version of "path-to-regexp" now requires the use of named parameters. For example, instead of using a route like /users/* to capture all routes starting with "/users", you should use /users/*path. For more details, refer to the migration guide. Attempting to auto-convert...
[Nest] 4624  - 01/18/2026, 2:38:44 AM     LOG [RoutesResolver] WbsController {/api/v1/wbs}: +14ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budgets, GET} route +28ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget/rollup, GET} route +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budgets/export, GET} route +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expenses, GET} route +5ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/exceptions, GET} route +5ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expenses/export, GET} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft/:id, DELETE} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft, POST} route +4ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft/batch, POST} route +5ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft/:id, PATCH} route +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expense/live-entry, POST} route +23ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expense/live-entry/:id, PATCH} route +19ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] AiController {/api/v1/ai}: +21ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/ai/draft-budget, POST} route +45ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] DcsController {/api/v1/dcs}: +33ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/dcs/schedule-report, POST} route +32ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] ProjectsController {/api/v1/projects}: +35ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects, POST} route +16ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects/lpo, POST} route +8ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects, GET} route +10ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id, GET} route +13ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/rollup, GET} route +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id, PATCH} route +4ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id, DELETE} route +10ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/cashflow, GET} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/inflow, POST} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/audits, GET} route +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/lpos, GET} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/inflows, GET} route +5ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/projects/export, GET} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] AuthController {/api/v1/auth}: +1ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/login/super, POST} route +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/login/tenant, POST} route +5ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/logout, POST} route +9ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/register, POST} route +5ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/test-secure, GET} route +6ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/validate, GET} route +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/me, GET} route +39ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/users, GET} route +9ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/users, POST} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/users/:id, PATCH} route +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/auth/users/:id, DELETE} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] AuditController {/api/v1/admin/audit}: +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/audit/logs, GET} route +4ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] TenantController {/api/v1/admin/tenants}: +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants, GET} route +4ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, GET} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, PATCH} route +9ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, DELETE} route +19ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] SearchController {/api/v1/search}: +4ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/search, GET} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] OperationalBudgetsController {/api/v1/operational-budgets}: +13ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets, POST} route +12ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/expense, POST} route +13ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/payroll, POST} route +4ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets, GET} route +5ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/:id, GET} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/:id, PATCH} route +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/:id, DELETE} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/export, GET} route +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/run-bot, POST} route +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] SuperAdminController {/api/v1/super}: +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants, POST} route +1ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants, GET} route +1ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants/:id, PATCH} route +0ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants/:id/plan, GET} route +0ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants/:id/plan, PATCH} route +1ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/tenant-count, GET} route +1ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/tenant-growth, GET} route +2ms        
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/user-growth, GET} route +1ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/system-health, GET} route +2ms        
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/total-users, GET} route +0ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/mrr-estimate, GET} route +1ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/wbs-metrics, GET} route +1ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/operational-budget-metrics, GET} route +1ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants/:id/impersonate, POST} route +1ms       
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] BillingController {/api/v1/super/billing}: +0ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/billing/overview, GET} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/billing/invoices, GET} route +2ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/billing/invoices/:id/download, GET} route +1ms  
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] SettingsController {/api/v1/super/settings}: +1ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/settings, GET} route +4ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/settings, PUT} route +4ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/super/settings/test-email, POST} route +11ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RoutesResolver] DashboardController {/api/v1/dashboard}: +3ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [RouterExplorer] Mapped {/api/v1/dashboard/summary, GET} route +1ms
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [InitialSuperAdminSeederService] --- Starting SuperAdmin Seeding (NODE_ENV: development) ---
[Nest] 4624  - 01/18/2026, 2:38:45 AM     LOG [InitialSuperAdminSeederService] Using SuperAdmin credentials from environment variables: superadmin@example.com
query: SELECT DISTINCT "distinctAlias"."RoleEntity_id" AS "ids_RoleEntity_id" FROM (SELECT "RoleEntity"."id" AS "RoleEntity_id", "RoleEntity"."name" AS "RoleEntity_name", "RoleEntity"."description" AS "RoleEntity_description", "RoleEntity__permissions"."id" AS "RoleEntity__permissions_id", "RoleEntity__permissions"."name" AS "RoleEntity__permissions_name", "RoleEntity__permissions"."description" 
AS "RoleEntity__permissions_description" FROM "public"."roles" "RoleEntity" LEFT JOIN "public"."role_permissions" "RoleEntity_RoleEntity__permissions" ON "RoleEntity_RoleEntity__permissions"."role_id"="RoleEntity"."id" LEFT JOIN "public"."permissions" "RoleEntity__permissions" ON "RoleEntity__permissions"."id"="RoleEntity_RoleEntity__permissions"."permission_id" WHERE (("RoleEntity"."name" = $1))) "distinctAlias" ORDER BY "RoleEntity_id" ASC LIMIT 1 -- PARAMETERS: ["SuperAdmin"]
query: SELECT "RoleEntity"."id" AS "RoleEntity_id", "RoleEntity"."name" AS "RoleEntity_name", "RoleEntity"."description" AS "RoleEntity_description", "RoleEntity__permissions"."id" AS "RoleEntity__permissions_id", "RoleEntity__permissions"."name" AS "RoleEntity__permissions_name", "RoleEntity__permissions"."description" AS "RoleEntity__permissions_description" FROM "public"."roles" "RoleEntity" LEFT JOIN "public"."role_permissions" "RoleEntity_RoleEntity__permissions" ON "RoleEntity_RoleEntity__permissions"."role_id"="RoleEntity"."id" LEFT JOIN "public"."permissions" "RoleEntity__permissions" ON "RoleEntity__permissions"."id"="RoleEntity_RoleEntity__permissions"."permission_id" WHERE ( (("RoleEntity"."name" = $1)) ) AND ( "RoleEntity"."id" IN ($2) ) -- PARAMETERS: ["SuperAdmin","c0da617e-3d24-4dd6-bdc4-7a7bef6290e8"]
query: SELECT "user"."id" AS "user_id", "user"."email" AS "user_email", "user"."first_name" AS "user_first_name", "user"."last_name" 
AS "user_last_name", "user"."is_active" AS "user_is_active", "user"."created_at" AS "user_created_at", "user"."updated_at" AS "user_updated_at", "user"."tenant_id" AS "user_tenant_id", "user"."reset_password_token" AS "user_reset_password_token", "user"."reset_password_expires" AS "user_reset_password_expires", "user"."password_hash" AS "user_password_hash", "role"."id" AS "role_id", "role"."name" AS "role_name", "role"."description" AS "role_description" FROM "public"."user" "user" LEFT JOIN "public"."user_roles" "user_role" 
ON "user_role"."user_id"="user"."id" LEFT JOIN "public"."roles" "role" ON "role"."id"="user_role"."role_id" WHERE "user"."email" = $1 -- PARAMETERS: ["superadmin@example.com"]
[Nest] 4624  - 01/18/2026, 2:38:47 AM     LOG [InitialSuperAdminSeederService] SuperAdmin user 'superadmin@example.com' found. Ensuring correct configuration...
[Nest] 4624  - 01/18/2026, 2:38:48 AM     LOG [InitialSuperAdminSeederService] SuperAdmin user 'superadmin@example.com' is already configured correctly. Skipping update.
[Nest] 4624  - 01/18/2026, 2:38:48 AM     LOG [InitialSuperAdminSeederService] SuperAdmin password was not changed.
[Nest] 4624  - 01/18/2026, 2:38:48 AM     LOG [InitialSuperAdminSeederService] --- SuperAdmin Seeding Complete ---
[Nest] 4624  - 01/18/2026, 2:38:48 AM     LOG [NestApplication] Nest application successfully started +2ms
[Nest] 4624  - 01/18/2026, 2:38:48 AM     LOG [Bootstrap] 🚀 SentinelFi API is running on: http://localhost:3001/api/v1
[Nest] 4624  - 01/18/2026, 2:38:48 AM     LOG [Bootstrap] 📡 CORS enabled for: http://localhost:3000
[Nest] 4624  - 01/18/2026, 2:38:48 AM     LOG [Bootstrap] 🍪 Cookie-based authentication active



