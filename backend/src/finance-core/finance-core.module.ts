import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Fiscal Calendar
import { FiscalYearEntity } from './entities/fiscal-year.entity';
import { FiscalPeriodEntity } from './entities/fiscal-period.entity';

// Org Structure
import { DepartmentEntity } from './entities/department.entity';
import { CostCenterEntity } from './entities/cost-center.entity';

// Chart of Accounts
import { AccountClassEntity } from './entities/account-class.entity';
import { AccountGroupEntity } from './entities/account-group.entity';
import { GLAccountEntity } from './entities/gl-account.entity';

// Ledgers & P2P & Payroll
import { BudgetLedgerEntity } from './entities/budget-ledger.entity';
import { TENANT_DATA_SOURCE } from '../database/constants';
import { P2PRequisitionEntity } from './entities/p2p-requisition.entity';
import { P2PPurchaseOrderEntity } from './entities/p2p-purchase-order.entity';
import { P2PInvoiceEntity } from './entities/p2p-invoice.entity';
import { PayrollRunEntity } from './entities/payroll-run.entity';
import { PayrollLineItemEntity } from './entities/payroll-line-item.entity';

// Governance
import { ApprovalLogEntity } from '../common/entities/approval-log.entity';

import { FinanceCoreService } from './finance-core.service';
import { FinanceCoreController } from './finance-core.controller';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TenantModule } from '../tenants/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FiscalYearEntity,
      FiscalPeriodEntity,
      DepartmentEntity,
      CostCenterEntity,
      AccountClassEntity,
      AccountGroupEntity,
      GLAccountEntity,
      BudgetLedgerEntity,
      P2PRequisitionEntity,
      P2PPurchaseOrderEntity,
      P2PInvoiceEntity,
      PayrollRunEntity,
      PayrollLineItemEntity,
      ApprovalLogEntity,
    ], TENANT_DATA_SOURCE),
    CommonModule,          // Provides DOAService
    NotificationsModule,   // Provides NotificationsService
    TenantModule,          // Provides TenantService for branding
  ],
  providers: [FinanceCoreService, PayrollService],
  controllers: [FinanceCoreController, PayrollController],
  exports: [TypeOrmModule, FinanceCoreService, PayrollService]
})
export class FinanceCoreModule {}

