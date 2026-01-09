import { Module, Global } from '@nestjs/common';
import { TenantConnectionProvider } from './tenant-database.providers';

@Global()
@Module({
  providers: [TenantConnectionProvider],
  exports: [TenantConnectionProvider],
})
export class TenantDatabaseModule {}
