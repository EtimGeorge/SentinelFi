import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';
import { TenantEntity } from '../tenants/tenant.entity';
import { AuthModule } from '../auth/auth.module'; // To potentially leverage Auth service for user creation
import { TenantModule } from '../tenants/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantEntity]), // Manage TenantEntity
    AuthModule, // May need to inject AuthService for creating tenant admin users
    TenantModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService], // Export if other modules need to use it
})
export class SuperAdminModule {}
