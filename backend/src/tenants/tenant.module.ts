import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios"; // <-- New Import
import { TenantService } from "./tenant.service";
import { TenantController } from "./tenant.controller";
import { TenantEntity } from "./tenant.entity";
import { WbsModule } from "../wbs/wbs.module"; // <-- New Import
import { AuditModule } from "../audit/audit.module";
import { TenantMigrationModule } from "../database/tenant-migration.module"; // NEW: Import Module

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantEntity]),
    HttpModule, // <-- New Import
    WbsModule, // <-- Add WbsModule here
    AuditModule,
    TenantMigrationModule, // <-- New Import for TenantService dependency
  ],
  controllers: [TenantController],
  providers: [TenantService], // Removed TenantProvisioningService
  exports: [
    TenantService,
    TypeOrmModule.forFeature([TenantEntity]), // Export the repository
  ],
})
export class TenantModule {}
