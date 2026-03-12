import { Provider, Scope, Logger } from "@nestjs/common";
import { DataSource, DataSourceOptions } from "typeorm";
import { TENANT_DATA_SOURCE } from "./constants";
import { getDataSourceToken } from "@nestjs/typeorm";
import { ClsService } from "nestjs-cls";
import { ConfigService } from "@nestjs/config";
import { TenancyAwareDataSource } from "./tenancy-aware-data-source";
import { DatabaseConfig } from "../common/config/database.config";

export const TenantConnectionProvider: Provider = {
  provide: TENANT_DATA_SOURCE,
  scope: Scope.DEFAULT,
  inject: [ConfigService, ClsService],
  useFactory: async (configService: ConfigService, cls: ClsService) => {
    const entities = DatabaseConfig.getEntities();
    const options = DatabaseConfig.getTypeOrmConfig(configService, entities, 5) as DataSourceOptions;
    const dataSource = new TenancyAwareDataSource(options, cls);
    await dataSource.initialize();
    return dataSource;
  },
};

/**
 * Provider that maps the standard TypeORM connection token to our custom TENANT_DATA_SOURCE.
 * This ensures @InjectRepository(Entity, TENANT_DATA_SOURCE) can resolve its DataSource.
 */
export const TenantDataSourceProvider: Provider = {
  provide: getDataSourceToken(TENANT_DATA_SOURCE),
  useExisting: TENANT_DATA_SOURCE,
};

