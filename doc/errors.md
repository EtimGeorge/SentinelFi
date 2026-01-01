[11:47:52 PM] File change detected. Starting incremental compilation...

[11:47:52 PM] Found 0 errors. Watching for file changes.

[Nest] 8664  - 12/31/2025, 11:47:59 PM     LOG [NestFactory] Starting Nest application...
[Nest] 8664  - 12/31/2025, 11:47:59 PM     LOG [InstanceLoader] AppModule dependencies initialized +80ms
[Nest] 8664  - 12/31/2025, 11:47:59 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +3ms   
[Nest] 8664  - 12/31/2025, 11:47:59 PM     LOG [InstanceLoader] PassportModule dependencies initialized +1ms  
[Nest] 8664  - 12/31/2025, 11:47:59 PM     LOG [InstanceLoader] HttpModule dependencies initialized +0ms      
[Nest] 8664  - 12/31/2025, 11:47:59 PM     LOG [InstanceLoader] ConfigHostModule dependencies initialized +1ms
[Nest] 8664  - 12/31/2025, 11:47:59 PM     LOG [InstanceLoader] ConfigModule dependencies initialized +1ms    
[Nest] 8664  - 12/31/2025, 11:47:59 PM     LOG [InstanceLoader] ConfigModule dependencies initialized +0ms    
[Nest] 8664  - 12/31/2025, 11:47:59 PM     LOG [InstanceLoader] JwtModule dependencies initialized +150ms
[Nest] 8664  - 12/31/2025, 11:47:59 PM     LOG [InstanceLoader] ThrottlerModule dependencies initialized +1ms
query: SELECT version()
query: SELECT * FROM current_schema()
query: CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [InstanceLoader] TypeOrmCoreModule dependencies initialized +3490ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +2ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [InstanceLoader] SearchModule dependencies initialized +15ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [InstanceLoader] WbsModule dependencies initialized +4ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [InstanceLoader] TenantModule dependencies initialized +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [InstanceLoader] AuthModule dependencies initialized +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RoutesResolver] WbsController {/api/v1/wbs}: +37ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/categories, GET} route +15ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/categories, POST} route +3ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/categories/:id, DELETE} route +3ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/categories/:id, PATCH} route +3ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft, POST} route +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft/batch, POST} route +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expense/live-entry, POST} route +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget/rollup, GET} route +2ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-drafts/pending, GET} route +2ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-drafts/:id/approve, PATCH} route +1ms     
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-drafts/:id/reject, PATCH} route +5ms      
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expense/exceptions/major-variance, GET} route +4ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RoutesResolver] AiController {/api/v1/ai}: +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/ai/draft-budget, POST} route +2ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RoutesResolver] DcsController {/api/v1/dcs}: +0ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/dcs/schedule-report, POST} route +2ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/dcs/test-data, GET} route +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RoutesResolver] AuthController {/api/v1/auth}: +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/login, POST} route +2ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/register, POST} route +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/forgot-password-request, POST} route +1ms       
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/logout, POST} route +5ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/test-secure, GET} route +3ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/users, GET} route +2ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/users, POST} route +6ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/users/:id, PATCH} route +2ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/users/:id, DELETE} route +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RoutesResolver] TenantController {/api/v1/admin/tenants}: +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants, POST} route +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants, GET} route +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, GET} route +5ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, PATCH} route +2ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, DELETE} route +1ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RoutesResolver] SearchController {/api/v1/search}: +0ms
[Nest] 8664  - 12/31/2025, 11:48:03 PM     LOG [RouterExplorer] Mapped {/api/v1/search, GET} route +2ms
--- Phase 3: FINAL DESTRUCTIVE RE-SEED ---
query: SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."role" AS "UserEntity_role", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires" FROM "public"."user" "UserEntity" WHERE (("UserEntity"."email" = $1)) LIMIT 1 -- PARAMETERS: ["admin@sentinelfi.com"]
query failed: SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."role" AS "UserEntity_role", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires" FROM "public"."user" "UserEntity" WHERE (("UserEntity"."email" = $1)) LIMIT 1 
-- PARAMETERS: ["admin@sentinelfi.com"]
error: error: column UserEntity.reset_password_token does not exist
C:\temp\SentinelFi\node_modules\typeorm\driver\src\driver\postgres\PostgresQueryRunner.ts:325
            throw new QueryFailedError(query, parameters, err)
                  ^


QueryFailedError: column UserEntity.reset_password_token does not exist
    at PostgresQueryRunner.query (C:\temp\SentinelFi\node_modules\typeorm\driver\src\driver\postgres\PostgresQueryRunner.ts:325:19)  
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async SelectQueryBuilder.loadRawResults (C:\temp\SentinelFi\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:3868:25)
    at async SelectQueryBuilder.executeEntitiesAndRawResults (C:\temp\SentinelFi\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:3614:26)
    at async SelectQueryBuilder.getRawAndEntities (C:\temp\SentinelFi\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:1671:29)
    at async SelectQueryBuilder.getOne (C:\temp\SentinelFi\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:1698:25)
    at async SeedTestUsersService.seedUsers (C:\temp\SentinelFi\backend\src\auth\seed-test-users.service.ts:46:24)
    at async SeedTestUsersService.onApplicationBootstrap (C:\temp\SentinelFi\backend\src\auth\seed-test-users.service.ts:18:5)       
    at async Promise.all (index 0)
    at async callModuleBootstrapHook (C:\temp\SentinelFi\node_modules\@nestjs\core\hooks\on-app-bootstrap.hook.js:43:5) {
  query: 'SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."role" AS "UserEntity_role", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires" FROM "public"."user" "UserEntity" WHERE (("UserEntity"."email" = $1)) LIMIT 1',   
  parameters: [ 'admin@sentinelfi.com' ],
  driverError: error: column UserEntity.reset_password_token does not exist
      at C:\temp\SentinelFi\node_modules\pg\lib\client.js:545:17
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async PostgresQueryRunner.query (C:\temp\SentinelFi\node_modules\typeorm\driver\src\driver\postgres\PostgresQueryRunner.ts:254:25)
      at async SelectQueryBuilder.loadRawResults (C:\temp\SentinelFi\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:3868:25)
      at async SelectQueryBuilder.executeEntitiesAndRawResults (C:\temp\SentinelFi\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:3614:26)
      at async SelectQueryBuilder.getRawAndEntities (C:\temp\SentinelFi\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:1671:29)
      at async SelectQueryBuilder.getOne (C:\temp\SentinelFi\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:1698:25)
      at async SeedTestUsersService.seedUsers (C:\temp\SentinelFi\backend\src\auth\seed-test-users.service.ts:46:24)
      at async SeedTestUsersService.onApplicationBootstrap (C:\temp\SentinelFi\backend\src\auth\seed-test-users.service.ts:18:5)     
      at async Promise.all (index 0) {
    length: 130,
    severity: 'ERROR',
    code: '42703',
    detail: undefined,
    hint: undefined,
    position: '290',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '3716',
    routine: 'errorMissingColumn'
  },
  length: 130,
  severity: 'ERROR',
  code: '42703',
  detail: undefined,
  hint: undefined,
  position: '290',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'parse_relation.c',
  line: '3716',
  routine: 'errorMissingColumn'
}

Node.js v22.20.0
