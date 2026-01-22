import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLogEntity } from "./audit.entity";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [AuditService],
  controllers: [AuditController], // Add AuditController here
  exports: [TypeOrmModule.forFeature([AuditLogEntity]), AuditService], // Export TypeOrmModule.forFeature
})
export class AuditModule {}
