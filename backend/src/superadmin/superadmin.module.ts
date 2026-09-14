import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SuperAdminController } from "./superadmin.controller";
import { SuperAdminService } from "./superadmin.service";
import { TenantEntity } from "../tenants/tenant.entity";
import { AuthModule } from "../auth/auth.module";
import { TenantModule } from "../tenants/tenant.module";
import { UserEntity } from "../auth/user.entity";
import { AuditModule } from "../audit/audit.module";
import { ConfigModule } from "@nestjs/config";
import { EmailModule } from "../email/email.module";
import { BillingModule } from "../billing/billing.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantEntity, UserEntity]),
    AuthModule,
    TenantModule,
    AuditModule,
    ConfigModule,
    EmailModule,
    BillingModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
