import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { TenantService } from "./tenant.service";
import { TenantController } from "./tenant.controller";
import { TenantEntity } from "./tenant.entity";
import { TenantSettingsEntity } from "./tenant-settings.entity";
import { TenantSettingsService } from "./tenant-settings.service";
import { TenantSettingsController } from "./tenant-settings.controller";
import { WbsModule } from "../wbs/wbs.module";
import { AuditModule } from "../audit/audit.module";
import { TenantMigrationModule } from "../database/tenant-migration.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantEntity, TenantSettingsEntity]),
    HttpModule,
    forwardRef(() => WbsModule),
    AuditModule,
    TenantMigrationModule,
    AuthModule,
  ],
  controllers: [TenantController, TenantSettingsController],
  providers: [TenantService, TenantSettingsService],
  exports: [
    TenantService,
    TenantSettingsService,
    TypeOrmModule.forFeature([TenantEntity, TenantSettingsEntity]),
  ],
})
export class TenantModule {}
