import { Provider, Scope, Logger } from "@nestjs/common";
import { DataSource, DataSourceOptions } from "typeorm";
import { TENANT_DATA_SOURCE } from "./constants";
import { getDataSourceToken } from "@nestjs/typeorm";
import { ClsService } from "nestjs-cls";
import { TenancyAwareDataSource } from "./tenancy-aware-data-source";

export const TenantConnectionProvider: Provider = {
  provide: TENANT_DATA_SOURCE,
  scope: Scope.REQUEST, // Standard request scope
  useFactory: async (defaultDataSource: DataSource, cls: ClsService) => {
    // We instantiate our custom wrapper, passing the global options and the CLS service
    // Note: We reuse the connection options from the default source (host, port, user, etc.)
    return new TenancyAwareDataSource(defaultDataSource.options, cls);
  },
  inject: [getDataSourceToken(), ClsService],
};
