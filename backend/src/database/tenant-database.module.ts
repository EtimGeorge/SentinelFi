import { Module, Global } from "@nestjs/common";
import { TenantConnectionProvider, TenantDataSourceProvider } from "./tenant-database.providers";

@Global()
@Module({
  providers: [TenantConnectionProvider, TenantDataSourceProvider],
  exports: [TenantConnectionProvider, TenantDataSourceProvider],
})
export class TenantDatabaseModule {}
