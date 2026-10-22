// backend/src/database/tenant-migration.service.ts
import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { DataSource, DataSourceOptions, MigrationInterface } from "typeorm";
import { ConfigService } from "@nestjs/config";

// Import all entities that are part of the tenant schema
import { ProjectEntity } from "../projects/project.entity";
import { LpoEntity } from "../projects/lpo.entity";
import { ProjectInflowEntity } from "../projects/project-inflow.entity";
import { ProjectAuditEntity } from "../projects/project-audit.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { WbsCategoryEntity } from "../wbs/wbs-category.entity";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { OperationalBudgetCategoryEntity } from "../operational-budgets/operational-budget-category.entity";
import { OperationalExpenseEntity } from "../operational-budgets/operational-expense.entity";
import { OpexEncumbranceEntity } from "../operational-budgets/opex-encumbrance.entity";
import { PayrollEntryEntity } from "../operational-budgets/payroll-entry.entity";
import { UserEntity } from "../auth/user.entity";
import { RoleEntity } from "../auth/role.entity"; // NEW
import { PermissionEntity } from "../auth/permission.entity"; // NEW
import { TenantEntity } from "../tenants/tenant.entity";
import {
  getTenantMigrationsPath,
  countTenantMigrationFiles,
} from "../common/utils/path.utils";
import { assertValidSchemaName } from "../common/utils/schema-name.util";
import { AuditLogEntity } from "../audit/audit.entity"; // NEW
import { BudgetCategoryEntity } from "../operational-budgets/budget-category.entity";
import { OperationalBudgetPeriodAllocationEntity } from "../operational-budgets/operational-budget-period-allocation.entity";
import { ClientEntity } from "../clients/client.entity";
import { CEOAnnotationEntity } from "../dashboard/annotation.entity";
import { ApprovalLogEntity } from "../common/entities/approval-log.entity";
// FinanceCore enterprise entities - ensure new tenants get full financial intelligence schema
import { FiscalYearEntity } from "../finance-core/entities/fiscal-year.entity";
import { FiscalPeriodEntity } from "../finance-core/entities/fiscal-period.entity";
import { DepartmentEntity } from "../finance-core/entities/department.entity";
import { CostCenterEntity } from "../finance-core/entities/cost-center.entity";
import { AccountClassEntity } from "../finance-core/entities/account-class.entity";
import { AccountGroupEntity } from "../finance-core/entities/account-group.entity";
import { GLAccountEntity } from "../finance-core/entities/gl-account.entity";
import { BudgetLedgerEntity } from "../finance-core/entities/budget-ledger.entity";
import { JournalEntryEntity } from "../general-ledger/entities/journal-entry.entity";
import { JournalLineEntity } from "../general-ledger/entities/journal-line.entity";
import { P2PRequisitionEntity } from "../finance-core/entities/p2p-requisition.entity";
import { P2PPurchaseOrderEntity } from "../finance-core/entities/p2p-purchase-order.entity";
import { P2PInvoiceEntity } from "../finance-core/entities/p2p-invoice.entity";
import { P2PReceiptEntity } from "../finance-core/entities/p2p-receipt.entity";
import { P2PPurchaseOrderLineEntity } from "../finance-core/entities/p2p-purchase-order-line.entity";
import { P2PReceiptLineEntity } from "../finance-core/entities/p2p-receipt-line.entity";
import { PayrollRunEntity } from "../finance-core/entities/payroll-run.entity";
import { PayrollLineItemEntity } from "../finance-core/entities/payroll-line-item.entity";
import { VendorEntity } from "../finance-core/entities/vendor.entity";

@Injectable()
export class TenantMigrationService {
  private readonly logger = new Logger(TenantMigrationService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Applies tenant migrations to a single tenant schema.
   *
   * @param schemaName Tenant schema to migrate (validated before any interpolation).
   * @param only Optional allow-list of migration class names. Omit to run every
   *   pending migration, which is what new-tenant provisioning needs. Pass it when
   *   a specific migration cannot run for a given tenant because the tenant
   *   predates the base schema that migration ALTERs — e.g. a tenant that never
   *   received the finance-core tables cannot run a migration that does
   *   `ALTER TABLE payroll_run ADD COLUMN`, and running it anyway aborts the
   *   whole run and leaves the remaining migrations unapplied.
   */
  async runTenantMigrations(
    schemaName: string,
    only?: string[],
  ): Promise<void> {
    // Every schema name reaching this point is about to be interpolated into a
    // DataSource `schema` option and into `information_schema` lookups. Validate
    // it here as well so a tampered `tenants.schema_name` row can never be used
    // to reach an unintended schema.
    assertValidSchemaName(schemaName, "tenant migration schema");

    this.logger.log(`Attempting to run migrations for schema: "${schemaName}"`);

    let databaseUrl = this.configService.get<string>("DATABASE_URL");
    if (!databaseUrl) {
      this.logger.error(
        "DATABASE_URL environment variable is not set for tenant migrations.",
      );
      throw new InternalServerErrorException(
        "DATABASE_URL environment variable is not set for tenant migrations. Please check your .env files (backend/.env or backend/.env.local).",
      );
    }

    // Clean and Normalize
    databaseUrl = databaseUrl.trim().replace(/^['"]|['"]$/g, "");
    if (databaseUrl.startsWith("postgresql://")) {
      databaseUrl = databaseUrl.replace("postgresql://", "postgres://");
    }

    // Credentials encoding if needed
    let sanitizedUrl = databaseUrl;
    const credsMatch = databaseUrl.match(/^(postgres:\/\/)([^:]+):(.+)@(.+)$/);
    if (credsMatch) {
      const [, proto, user, pass, rest] = credsMatch;
      const needsEncoding =
        /[\#\?\[\]\@]/.test(pass) || /[\#\?\[\]\@]/.test(user);
      if (needsEncoding) {
        sanitizedUrl = `${proto}${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${rest}`;
      }
    }

    const isNeon = sanitizedUrl.includes("neon.tech");
    const hasSslMode = sanitizedUrl.includes("sslmode=");

    // Define tenant-specific DataSource options
    const tenantDataSourceOptions: DataSourceOptions = {
      type: "postgres",
      url: sanitizedUrl,
      ssl: isNeon && !hasSslMode ? { rejectUnauthorized: false } : undefined,
      schema: schemaName, // CRITICAL: Dynamically set the schema name
      // Pin `search_path` at CONNECTION level for every pooled connection.
      // Some tenant migrations do `SET search_path TO "<schema>"` (tenant-only,
      // no `public`), and that setting leaks onto the shared pooled connection
      // for the rest of the run — a later migration that relies on
      // `uuid_generate_v4()` (from the `uuid-ossp` extension in `public`) then
      // fails with "function uuid_generate_v4() does not exist". Setting the
      // path via the libpq `options` startup parameter makes it the baseline
      // for each connection, so `public` is always reachable regardless of what
      // an individual migration does mid-run.
      extra: {
        options: `-c search_path=${schemaName},public`,
      },
      entities: [
        ProjectEntity,
        LpoEntity,
        ProjectInflowEntity,
        ProjectAuditEntity,
        WbsBudgetEntity,
        LiveExpenseEntity,
        WbsCategoryEntity,
        OperationalBudgetEntity,
        OperationalBudgetCategoryEntity,
        OperationalExpenseEntity,
        OpexEncumbranceEntity,
        PayrollEntryEntity,
        BudgetCategoryEntity,
        OperationalBudgetPeriodAllocationEntity,
        ClientEntity,
        CEOAnnotationEntity,
        UserEntity, // Public entity (for reference)
        RoleEntity, // Public entity (for reference)
        PermissionEntity, // Public entity (for reference)
        TenantEntity, // Public entity (for reference)
        AuditLogEntity, // Public entity (for reference)
        ApprovalLogEntity, // Added
        FiscalYearEntity,
        FiscalPeriodEntity,
        DepartmentEntity,
        CostCenterEntity,
        AccountClassEntity,
        AccountGroupEntity,
        GLAccountEntity,
        BudgetLedgerEntity,
        JournalEntryEntity,
        JournalLineEntity,
        P2PRequisitionEntity,
        P2PPurchaseOrderEntity,
        P2PInvoiceEntity,
        P2PReceiptEntity,
        P2PPurchaseOrderLineEntity,
        P2PReceiptLineEntity,
        PayrollRunEntity,
        PayrollLineItemEntity,
        VendorEntity,
      ],
      migrations: getTenantMigrationsPath(),
      migrationsTableName: "tenant_migrations", // Dedicated migrations table for tenant schemas
      synchronize: false, // Always false in production
      logging: ["error", "warn"], // Only log errors and warnings for migrations
    };

    const tenantDataSource = new DataSource(tenantDataSourceOptions);

    try {
      await tenantDataSource.initialize();
      this.logger.log(
        `DataSource initialized for schema: "${schemaName}". Running migrations...`,
      );

      // SCHEMA PREREQUISITES: make sure the tenant schema exists before
      // migrations run against it. The `uuid-ossp`/search_path issue that used
      // to break brand-new provisioning is handled at the connection level via
      // the `extra.options` startup parameter on the DataSource above, which
      // guarantees `public` (where Neon installs `uuid-ossp`) is always on the
      // search_path. (Idempotent.)
      await tenantDataSource.query(
        `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`,
      );

      // PRE-MIGRATION GUARD: if the glob resolves to zero files, TypeORM
      // `runMigrations()` applies NOTHING and reports success. That silent
      // no-op is what produces "empty" tenant schemas that only fail later,
      // at first query time. Fail loudly *before* touching the database.
      const resolvedMigrationFiles = countTenantMigrationFiles();
      if (resolvedMigrationFiles === 0) {
        throw new InternalServerErrorException(
          `No tenant migration files could be resolved for schema "${schemaName}". ` +
            `Refusing to run migrations because TypeORM would report success while applying nothing. ` +
            `Check getTenantMigrationsPath() and the build output layout.`,
        );
      }

      // Optional per-migration allow-list. `runMigrations()` reads the
      // `migrations` array directly, so narrowing it here applies exactly these
      // and skips the rest — the skipped ones stay "pending" in
      // `tenant_migrations` and will be applied by a later run once the tenant
      // has the base relations they depend on.
      let selected: string[] | undefined;
      if (only && only.length > 0) {
        const allow = new Set(only);
        const available = new Set(
          tenantDataSource.migrations.map((m: MigrationInterface) => m.name),
        );
        const unknown = only.filter((n: string) => !available.has(n));
        if (unknown.length > 0) {
          throw new InternalServerErrorException(
            `Requested migration(s) not found for schema "${schemaName}": ${unknown.join(
              ", ",
            )}. Available: ${[...available].join(", ")}`,
          );
        }
        // `DataSource.migrations` is typed `readonly` but `runMigrations()` reads
        // this exact array at execution time, so narrowing it here is the
        // supported way to apply a subset without re-globbing migration classes.
        const executable = tenantDataSource as {
          migrations: MigrationInterface[];
        };
        executable.migrations = executable.migrations.filter(
          (m: MigrationInterface) => m.name !== undefined && allow.has(m.name),
        );
        selected = only;
        this.logger.warn(
          `Applying an explicit SUBSET of migrations for schema "${schemaName}": ${only.join(
            ", ",
          )}. Remaining migrations stay pending for this tenant.`,
        );
      }

      const applied = await tenantDataSource.runMigrations();
      this.logger.log(
        `Migrations successfully run for schema: "${schemaName}" (${applied.length} applied${
          selected ? `, subset: ${selected.join(", ")}` : ""
        }).`,
      );

      // POST-MIGRATION VERIFICATION (R1f): `runMigrations()` reporting success is
      // NOT proof the schema is usable. Verify the sentinel tables that the
      // initial tenant migration must create. These names are singular — they
      // were verified against 1768016698926-InitialTenantSchemaSetup.ts. Do not
      // "tidy" them into plurals: `users`/`audit_log` live in the public schema
      // and are deliberately NOT in this list.
      const requiredTables = ["project", "wbs_budget", "operational_budget"];
      const presentRows: Array<{ table_name: string }> =
        await tenantDataSource.query(
          `SELECT table_name FROM information_schema.tables
          WHERE table_schema = $1 AND table_name = ANY($2::text[])`,
          [schemaName, requiredTables],
        );
      const present = new Set(presentRows.map((r) => r.table_name));
      const missing = requiredTables.filter((t) => !present.has(t));

      if (missing.length > 0) {
        throw new InternalServerErrorException(
          `Tenant schema "${schemaName}" is incomplete after migrations: missing required table(s) ${missing.join(
            ", ",
          )}. The tenant must NOT be activated.`,
        );
      }

      this.logger.log(
        `Post-migration verification passed for schema "${schemaName}": ${requiredTables.length}/${requiredTables.length} sentinel tables present.`,
      );
    } catch (error: unknown) {
      // Explicitly mark as unknown
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to run migrations for schema "${schemaName}": ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        `Tenant schema migration failed for "${schemaName}": ${errorMessage}`,
      );
    } finally {
      if (tenantDataSource.isInitialized) {
        await tenantDataSource.destroy();
        this.logger.log(`DataSource destroyed for schema: "${schemaName}".`);
      }
    }
  }
}
