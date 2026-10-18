import { Module, Logger } from "@nestjs/common";
import { TenancyGuard } from "./common/guards/tenancy.guard";
import { MaintenanceGuard } from "./common/guards/maintenance.guard";
import { TenantAccessGuard } from "./common/guards/tenant-access.guard"; // Import TenantAccessGuard
import { ClsModule, ClsService } from "nestjs-cls";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DataSourceOptions } from "typeorm";
import { TenancyAwareDataSource } from "./database/tenancy-aware-data-source";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CorrelationInterceptor } from "./common/interceptors/correlation.interceptor";
import { WbsModule } from "./wbs/wbs.module";
import { AuthModule } from "./auth/auth.module";
import { TenantModule } from "./tenants/tenant.module";
import { SearchModule } from "./search/search.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { AuditModule } from "./audit/audit.module";
import { ProjectsModule } from "./projects/projects.module";
import { OperationalBudgetsModule } from "./operational-budgets/operational-budgets.module";
import { SuperAdminModule } from "./superadmin/superadmin.module";
import { BillingModule } from "./billing/billing.module";
import { SettingsModule } from "./settings/settings.module";
import { EmailModule } from "./email/email.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { TenantDatabaseModule } from "./database/tenant-database.module";
import { TenantMigrationModule } from "./database/tenant-migration.module";
import { CommonModule } from "./common/common.module";
import { DatabaseConfig } from "./common/config/database.config";
import { TenantRepositoriesModule } from "./tenant-repositories.module"; // Import TenantRepositoriesModule
import { CurrencyModule } from "./currency/currency.module";
import { ClientModule } from "./clients/client.module";
import { FinanceCoreModule } from "./finance-core/finance-core.module";
import { ReportingModule } from "./reporting/reporting.module";
import { MessagingModule } from "./messaging/messaging.module";
import { AiAssistantModule } from "./ai-assistant/ai-assistant.module";
import { MarketingModule } from "./marketing/marketing.module";
import { CacheModule } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-redis-yet";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { RedisThrottlerStorage } from "./common/throttler/redis-throttler.storage";
import { LogSanitizationInterceptor } from "./common/interceptors/log-sanitization.interceptor";
import { HealthModule } from "./health/health.module";
import { AdsModule } from "./ads/ads.module";
import { envValidationSchema } from "./common/config/env-validation.schema";
import { ScheduleModule } from "@nestjs/schedule";
import * as path from "path";
import * as fs from "fs";

/**
 * Locate the backend package directory that holds the env files.
 *
 * Nest can be launched from the repo root (`npm run start:dev` uses
 * `--entryFile backend/src/main`), from inside `backend/`, or from an
 * IDE/debugger whose working directory is a nested folder (e.g. `backend/src`).
 * Resolving env files relative to `process.cwd()` therefore breaks whenever the
 * cwd is not exactly the repo root or `backend/`, surfacing to the user as
 * `Config validation error: "DATABASE_URL" is required`.
 *
 * Instead, walk up from this file's own location (`__dirname`) to find the
 * directory that contains both a `package.json` and an `.env`/`.env.local`.
 * That is the backend package dir, independent of cwd. The cwd-based locations
 * are only used as a fallback (e.g. a fresh clone before any env file exists).
 */
function findBackendEnvDir(): string | undefined {
  const seeds = [__dirname, process.cwd(), path.join(process.cwd(), "backend")];
  const visited = new Set<string>();

  for (const seed of seeds) {
    let dir = seed;
    for (let depth = 0; depth < 8; depth++) {
      if (visited.has(dir)) break;
      visited.add(dir);

      const hasPackageJson = fs.existsSync(path.join(dir, "package.json"));
      const hasEnv =
        fs.existsSync(path.join(dir, ".env")) ||
        fs.existsSync(path.join(dir, ".env.local"));
      if (hasPackageJson && hasEnv) {
        return dir;
      }

      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return undefined;
}

/**
 * Monorepo-aware, cwd-independent env file resolution.
 *
 * Precedence is fixed regardless of cwd: `backend/.env.local` over
 * `backend/.env`, so a stray root-level `.env.local` can never shadow the
 * backend's own values.
 */
function backendEnvFilePaths(): string[] {
  const cwd = process.cwd();
  const backendDir =
    findBackendEnvDir() ??
    (fs.existsSync(path.join(cwd, "backend", "package.json"))
      ? path.join(cwd, "backend")
      : cwd);
  return [path.join(backendDir, ".env.local"), path.join(backendDir, ".env")];
}

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: backendEnvFilePaths(),
      // We validate via `validate` (not `validationSchema`) so we can first drop
      // empty-string env vars. Blank optional entries (e.g. `SMTP_HOST=`,
      // `JWT_SECRET_KEY=`, `FRONTEND_ALLOWED_ORIGINS=`) are common in .env files;
      // Joi treats "" as present and rejects it on string/number/enum fields,
      // which otherwise fails boot one variable at a time. Removing them here
      // makes them behave as "unset" so defaults apply — a clean, single fix.
      validate: (config: Record<string, unknown>) => {
        for (const key of Object.keys(config)) {
          if (config[key] === "") delete config[key];
        }
        const { error, value } = envValidationSchema.validate(config, {
          allowUnknown: true,
          abortEarly: true,
        });
        if (error) {
          throw new Error(`Config validation error: ${error.message}`);
        }
        return value;
      },
    }),
    // Distributed rate limiting: counters live in Redis so the limit is shared
    // across every API instance. Degrades to in-process limiting if Redis is
    // down. (See RedisThrottlerStorage.)
    // TTL/limit are env-tunable so a load test or a launch-day spike can be
    // sized without a code change (THROTTLE_TTL_MS / THROTTLE_LIMIT).
    ThrottlerModule.forRootAsync({
      inject: [RedisThrottlerStorage, ConfigService],
      useFactory: (storage: RedisThrottlerStorage, config: ConfigService) => {
        const parsePositive = (value: unknown, fallback: number) => {
          const n = Number(value);
          return Number.isFinite(n) && n > 0 ? n : fallback;
        };
        return {
          throttlers: [
            {
              ttl: parsePositive(config.get("THROTTLE_TTL_MS"), 60000),
              limit: parsePositive(config.get("THROTTLE_LIMIT"), 10),
            },
          ],
          storage,
        };
      },
    }),
    // Enables @Cron decorators (e.g. the daily tenant-archive purge sweep).
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const ttl = 600; // 10 minutes default
        const redisUrl =
          configService.get("REDIS_URL") ||
          `redis://${configService.get("REDIS_HOST") || "localhost"}:${configService.get("REDIS_PORT") || 6379}`;
        try {
          const store = await redisStore({
            url: redisUrl,
            ttl,
            // Self-heal a dropped socket instead of failing on first hiccup.
            socket: {
              reconnectStrategy: (retries: number) =>
                Math.min(retries * 200, 3000),
            },
          });
          // node-redis is an EventEmitter: an 'error' event with no listener is
          // re-thrown, which crashed the whole process on a transient
          // `SocketClosedUnexpectedlyError` from the managed Redis instance.
          // A listener degrades that to a log line and cache misses.
          store.client.on("error", (err: Error) => {
            Logger.warn(
              `Redis cache client error: ${err.message}`,
              "CacheModule",
            );
          });
          return { store, ttl };
        } catch (error) {
          // Graceful fallback: do not fail closed when Redis is unreachable (SEC-P1-01).
          Logger.warn(
            `Redis unavailable — falling back to in-memory cache: ${error instanceof Error ? error.message : String(error)}`,
            "CacheModule",
          );
          const { createCache } = await import("cache-manager");
          return { store: createCache(), ttl };
        }
      },
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, ClsModule],
      inject: [ConfigService, ClsService],
      useFactory: (configService: ConfigService) => {
        const entities = DatabaseConfig.getEntities();
        // Use a unified pool for the entire application (5 connections).
        // Combined with the tenant pool (5), this stays within Neon safe limits (10).
        return DatabaseConfig.getTypeOrmConfig(configService, entities, 5);
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error("DataSource options are undefined");
        }
        const dataSource = new TenancyAwareDataSource(
          options as DataSourceOptions,
        );
        return dataSource;
      },
    }),
    TenantDatabaseModule, // Add the TenantDatabaseModule here
    TenantMigrationModule, // NEW: Add TenantMigrationModule
    TenantRepositoriesModule, // Add TenantRepositoriesModule global
    WbsModule,
    AuthModule,
    TenantModule,
    SearchModule,
    NotificationsModule,
    AuditModule,
    ProjectsModule,
    OperationalBudgetsModule,
    SuperAdminModule,
    BillingModule,
    SettingsModule,
    EmailModule,
    DashboardModule,
    CurrencyModule,
    ClientModule,
    FinanceCoreModule,
    ReportingModule,
    MessagingModule,
    AiAssistantModule,
    MarketingModule,
    HealthModule,
    AdsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LogSanitizationInterceptor, // Automated security scrubbing
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Runs very first to prevent DDoS/Brute-force
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Runs second: authenticates the user
    },
    {
      provide: APP_GUARD,
      useClass: TenancyGuard, // Runs third: resolves tenant context from the authenticated user
    },
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard, // Runs fourth: reads per-tenant settings, so it must follow TenancyGuard
    },
    {
      provide: APP_GUARD,
      useClass: TenantAccessGuard, // Runs fifth: enforces tenant-level access control
    },
  ],
})
export class AppModule {}
