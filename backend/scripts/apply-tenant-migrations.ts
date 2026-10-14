/**
 * Standalone tenant migration runner.
 *
 * Replicates TenantMigrationService.runTenantMigrations() WITHOUT bootstrapping
 * Nest's AppModule (which hangs in this environment). Used to close the schema
 * drift behind "column requisition.vendor_id does not exist".
 *
 * Usage: npx ts-node -r tsconfig-paths/register scripts/apply-tenant-migrations.ts <schema>
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { ProjectEntity } from '../src/projects/project.entity';
import { LpoEntity } from '../src/projects/lpo.entity';
import { ProjectInflowEntity } from '../src/projects/project-inflow.entity';
import { ProjectAuditEntity } from '../src/projects/project-audit.entity';
import { WbsBudgetEntity } from '../src/wbs/wbs-budget.entity';
import { LiveExpenseEntity } from '../src/wbs/live-expense.entity';
import { WbsCategoryEntity } from '../src/wbs/wbs-category.entity';
import { OperationalBudgetEntity } from '../src/operational-budgets/operational-budget.entity';
import { OperationalBudgetCategoryEntity } from '../src/operational-budgets/operational-budget-category.entity';
import { OperationalExpenseEntity } from '../src/operational-budgets/operational-expense.entity';
import { OpexEncumbranceEntity } from '../src/operational-budgets/opex-encumbrance.entity';
import { PayrollEntryEntity } from '../src/operational-budgets/payroll-entry.entity';
import { BudgetCategoryEntity } from '../src/operational-budgets/budget-category.entity';
import { OperationalBudgetPeriodAllocationEntity } from '../src/operational-budgets/operational-budget-period-allocation.entity';
import { UserEntity } from '../src/auth/user.entity';
import { RoleEntity } from '../src/auth/role.entity';
import { PermissionEntity } from '../src/auth/permission.entity';
import { TenantEntity } from '../src/tenants/tenant.entity';
import { AuditLogEntity } from '../src/audit/audit.entity';
import { BudgetLedgerEntity } from '../src/finance-core/entities/budget-ledger.entity';
import { FiscalYearEntity } from '../src/finance-core/entities/fiscal-year.entity';
import { FiscalPeriodEntity } from '../src/finance-core/entities/fiscal-period.entity';
import { DepartmentEntity } from '../src/finance-core/entities/department.entity';
import { CostCenterEntity } from '../src/finance-core/entities/cost-center.entity';
import { AccountClassEntity } from '../src/finance-core/entities/account-class.entity';
import { AccountGroupEntity } from '../src/finance-core/entities/account-group.entity';
import { GLAccountEntity } from '../src/finance-core/entities/gl-account.entity';
import { P2PRequisitionEntity } from '../src/finance-core/entities/p2p-requisition.entity';
import { P2PPurchaseOrderEntity } from '../src/finance-core/entities/p2p-purchase-order.entity';
import { P2PInvoiceEntity } from '../src/finance-core/entities/p2p-invoice.entity';
import { P2PReceiptEntity } from '../src/finance-core/entities/p2p-receipt.entity';
import { P2PPurchaseOrderLineEntity } from '../src/finance-core/entities/p2p-purchase-order-line.entity';
import { P2PReceiptLineEntity } from '../src/finance-core/entities/p2p-receipt-line.entity';
import { PayrollRunEntity } from '../src/finance-core/entities/payroll-run.entity';
import { PayrollLineItemEntity } from '../src/finance-core/entities/payroll-line-item.entity';
import { VendorEntity } from '../src/finance-core/entities/vendor.entity';
import { ClientEntity } from '../src/clients/client.entity';
import { CEOAnnotationEntity } from '../src/dashboard/annotation.entity';
import { ApprovalLogEntity } from '../src/common/entities/approval-log.entity';
import { getTenantMigrationsPath } from '../src/common/utils/path.utils';

/** Tenant schema entity set — mirrors TenantMigrationService exactly. */
const TENANT_ENTITIES = [
  ProjectEntity, LpoEntity, ProjectInflowEntity, ProjectAuditEntity,
  WbsBudgetEntity, LiveExpenseEntity, WbsCategoryEntity,
  OperationalBudgetEntity, OperationalBudgetCategoryEntity,
  OperationalExpenseEntity, OpexEncumbranceEntity, PayrollEntryEntity,
  BudgetCategoryEntity, OperationalBudgetPeriodAllocationEntity,
  UserEntity, RoleEntity, PermissionEntity, TenantEntity, AuditLogEntity,
  FiscalYearEntity, FiscalPeriodEntity, DepartmentEntity, CostCenterEntity,
  AccountClassEntity, AccountGroupEntity, GLAccountEntity, BudgetLedgerEntity,
  P2PRequisitionEntity, P2PPurchaseOrderEntity, P2PInvoiceEntity,
  P2PReceiptEntity, P2PPurchaseOrderLineEntity, P2PReceiptLineEntity,
  PayrollRunEntity, PayrollLineItemEntity, VendorEntity,
  ClientEntity, CEOAnnotationEntity, ApprovalLogEntity,
];

function loadDatabaseUrl(): string {
  for (const p of ['../.env.local', '../.env']) {
    const abs = path.resolve(__dirname, p);
    if (!fs.existsSync(abs)) continue;
    for (const line of fs.readFileSync(abs, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m && m[1]) return m[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  throw new Error('DATABASE_URL not found in backend/.env.local or backend/.env');
}

async function main() {
  const schemaName = process.argv[2];
  if (!schemaName) {
    console.error('Usage: apply-tenant-migrations <schema>');
    process.exit(1);
  }

  let databaseUrl = loadDatabaseUrl();
  if (databaseUrl.startsWith('postgresql://')) {
    databaseUrl = databaseUrl.replace('postgresql://', 'postgres://');
  }
  // Same credential-encoding guard as TenantMigrationService.
  const creds = databaseUrl.match(/^(postgres:\/\/)([^:]+):(.+)@(.+)$/);
  if (creds && /[#?[\]@]/.test(creds[3])) {
    databaseUrl = `${creds[1]}${encodeURIComponent(creds[2])}:${encodeURIComponent(creds[3])}@${creds[4]}`;
  }

  const isNeon = databaseUrl.includes('neon.tech');
  const hasSslMode = databaseUrl.includes('sslmode=');

  console.log(`Target schema: ${schemaName}`);

  const ds = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: isNeon && !hasSslMode ? { rejectUnauthorized: false } : undefined,
    schema: schemaName,
    entities: TENANT_ENTITIES,
    migrations: getTenantMigrationsPath(),
    migrationsTableName: 'tenant_migrations',
    synchronize: false,
    logging: ['error', 'warn', 'migration'],
  });

  await ds.initialize();
  console.log('DataSource initialized. Running migrations...');

  try {
    const applied = await ds.runMigrations({ transaction: 'each' });
    console.log(`APPLIED ${applied.length} migration(s):`);
    for (const m of applied) console.log('  + ' + m.name);
    if (applied.length === 0) console.log('  (none pending)');

    const rows = await ds.query(
      `SELECT name FROM "${schemaName}"."tenant_migrations" ORDER BY timestamp`,
    );
    console.log(`Ledger now holds ${rows.length} migration(s).`);
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('MIGRATION FAILED: ' + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
});
