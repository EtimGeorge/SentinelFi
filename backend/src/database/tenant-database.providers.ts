import { Provider, Scope, Logger } from "@nestjs/common";
import { DataSource, DataSourceOptions } from "typeorm";
import { TENANT_DATA_SOURCE } from "./constants";
import { getDataSourceToken } from "@nestjs/typeorm";
import { ClsService } from "nestjs-cls";
import { TenancyAwareDataSource } from "./tenancy-aware-data-source";

export const TenantConnectionProvider: Provider = {
  provide: TENANT_DATA_SOURCE,
  scope: Scope.DEFAULT, // Use Singleton scope for performance and metadata stability
  useFactory: async (defaultDataSource: DataSource, cls: ClsService) => {
    const dataSource = new TenancyAwareDataSource(defaultDataSource.options, cls);
    await dataSource.initialize();
    return dataSource;
  },
  inject: [getDataSourceToken(), ClsService],
};
