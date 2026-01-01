import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios"; // <-- New Import
import { TenantService } from "./tenant.service";
import { TenantController } from "./tenant.controller";
import { TenantEntity } from "./tenant.entity";
import { WbsModule } from '../wbs/wbs.module'; // <-- New Import

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantEntity]),
    HttpModule, // <-- New Import
    WbsModule, // <-- Add WbsModule here
  ],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService], // Export if other modules need to interact with tenants
})
export class TenantModule {}
