import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
  Logger,
} from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { WbsBudgetEntity } from "./wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "./wbs/live-expense.entity";
import { WbsModule } from "./wbs/wbs.module";
import { AuthModule } from "./auth/auth.module";
import { UserEntity } from "./auth/user.entity";
import { RoleEntity } from "./auth/role.entity"; // Import RoleEntity
import { PermissionEntity } from "./auth/permission.entity"; // Import PermissionEntity
import { WbsCategoryEntity } from "./wbs/wbs-category.entity";
import { TenantModule } from "./tenants/tenant.module";
import { TenantEntity } from "./tenants/tenant.entity";
import { SearchModule } from "./search/search.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { AuditModule } from "./audit/audit.module";
import { AuditLogEntity } from "./audit/audit.entity";
import { ProjectEntity } from "./projects/project.entity";
import { LpoEntity } from "./projects/lpo.entity";
import { ProjectInflowEntity } from "./projects/project-inflow.entity";
import { ProjectAuditEntity } from "./projects/project-audit.entity";
import { ProjectsModule } from "./projects/projects.module";
import { OperationalBudgetEntity } from "./operational-budgets/operational-budget.entity";
import { OperationalBudgetsModule } from "./operational-budgets/operational-budgets.module";
import { OperationalBudgetCategoryEntity } from "./operational-budgets/operational-budget-category.entity";
import { OperationalExpenseEntity } from "./operational-budgets/operational-expense.entity";
import { SuperAdminModule } from "./superadmin/superadmin.module";
import { BillingModule } from "./billing/billing.module";
import { SettingsModule } from "./settings/settings.module";
import { SettingsEntity } from "./settings/settings.entity";
import { EmailModule } from "./email/email.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { TenancyMiddleware } from "./common/middleware/tenancy.middleware";
import { TenantDatabaseModule } from "./database/tenant-database.module";
import { TenantMigrationModule } from "./database/tenant-migration.module";
import { CommonModule } from "./common/common.module";
import { PayrollEntryEntity } from "./operational-budgets/payroll-entry.entity";

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env", "backend/.env.local", "backend/.env"],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger("TypeOrmModule");
        let databaseUrl = configService.get<string>("DATABASE_URL");

        if (!databaseUrl) {
          logger.error("DATABASE_URL is not set in environment or .env files");
          throw new Error("DATABASE_URL environment variable is not set");
        }

        // 1. Strip suspicious non-printable characters and trim
        databaseUrl = databaseUrl
          .replace(/[^\x20-\x7E]/g, "")
          .trim()
          .replace(/^['"]|['"]$/g, "");

        // 2. Normalize and Robustly Encode Credentials (user:pass)
        // We isolate the authority part (between :// and the LAST @)
        let sanitizedUrl = databaseUrl;
        const protoMatch = databaseUrl.match(/^(postgres(?:ql)?:\/\/)/i);
        const lastAtIdx = databaseUrl.lastIndexOf("@");

        if (protoMatch && lastAtIdx > protoMatch[0].length) {
          const proto = "postgres://"; // standard for TypeORM
          const authority = databaseUrl.substring(
            protoMatch[0].length,
            lastAtIdx,
          );
          const remainder = databaseUrl.substring(lastAtIdx); // includes @host...

          const colonIdx = authority.indexOf(":");
          if (colonIdx !== -1) {
            const user = authority.substring(0, colonIdx);
            const pass = authority.substring(colonIdx + 1);

            // Reconstruct with properly encoded credentials
            // We use a safe encoder that doesn't double-encode %
            const safeEncode = (str: string) => {
              try {
                // If it's already mostly encoded, decode first to avoid %25...
                const decoded = decodeURIComponent(str);
                return encodeURIComponent(decoded);
              } catch (e) {
                // If decode fails (e.g. malformed %), encode it fresh
                return encodeURIComponent(str);
              }
            };
            sanitizedUrl = `${proto}${safeEncode(user)}:${safeEncode(pass)}${remainder}`;
            if (sanitizedUrl !== databaseUrl) {
              logger.log("Applied encoding/normalization to DATABASE_URL.");
            }
          }
        }

        // 3. Diagnostics
        const redactedUrl = sanitizedUrl.replace(/:([^:@]+)@/, ":****@");
        logger.log(
          `Connecting to database (len: ${sanitizedUrl.length}): ${redactedUrl}`,
        );

        try {
          new URL(sanitizedUrl);
        } catch (e: any) {
          logger.error(
            `Critical: Sanitize attempt resulted in an invalid URL: ${e.message}`,
          );
          // Log hex codes of the failing URL for deep troubleshooting
          const hex = Array.from(sanitizedUrl)
            .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
            .join(" ");
          logger.error(`Hex codes: ${hex}`);
          // Let's try one last thing: if it's missing a host or something, new URL fails.
        }

        const isNeon = sanitizedUrl.includes("neon.tech");
        const hasSslMode = sanitizedUrl.includes("sslmode=");

        return {
          type: "postgres",
          url: sanitizedUrl,
          // Let the URL define SSL if present, otherwise default to opt-in for Neon
          ssl:
            isNeon && !hasSslMode ? { rejectUnauthorized: false } : undefined,
          entities: [
            WbsBudgetEntity,
            LiveExpenseEntity,
            UserEntity,
            RoleEntity, // Add RoleEntity
            PermissionEntity, // Add PermissionEntity
            WbsCategoryEntity,
            TenantEntity,
            AuditLogEntity,
            ProjectEntity,
            LpoEntity,
            ProjectInflowEntity,
            ProjectAuditEntity,
            OperationalBudgetEntity,
            OperationalBudgetCategoryEntity,
            OperationalExpenseEntity,
            SettingsEntity,
            PayrollEntryEntity, // Correctly added PayrollEntryEntity
          ],
          synchronize: false,
          logging: true,
        };
      },
    }),
    TenantDatabaseModule, // Add the TenantDatabaseModule here
    TenantMigrationModule, // NEW: Add TenantMigrationModule
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
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenancyMiddleware).forRoutes("*");
  }
}