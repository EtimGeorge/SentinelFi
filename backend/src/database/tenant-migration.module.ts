import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TenantMigrationService } from "./tenant-migration.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as path from "path";

// Import all entities that are part of the tenant schema
import { ProjectEntity } from "../projects/project.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { WbsCategoryEntity } from "../wbs/wbs-category.entity";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { OperationalBudgetCategoryEntity } from "../operational-budgets/operational-budget-category.entity";
import { OperationalExpenseEntity } from "../operational-budgets/operational-expense.entity";
// Public entities (User, Tenant) are not part of tenant-specific TypeOrmModule,
// but their types might be referenced in tenant entities, which is handled by TypeOrm.

@Module({
  imports: [
    ConfigModule, // Needed to inject ConfigService into TenantMigrationService
  ],
  providers: [TenantMigrationService],
  exports: [TenantMigrationService],
})
export class TenantMigrationModule {}
