import { Provider, Scope, Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { DataSource, DataSourceOptions } from 'typeorm'; // Keep DataSourceOptions for consistency
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'; // Import specific Postgres options
import { TENANT_DATA_SOURCE } from './constants';
import { TenantEntity } from '../tenants/tenant.entity';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { getDataSourceToken } from '@nestjs/typeorm';

const tenantDataSources = new Map<string, DataSource>();

export const TenantConnectionProvider: Provider = {
  provide: TENANT_DATA_SOURCE,
  scope: Scope.REQUEST,
  useFactory: async (request: AuthenticatedRequest, defaultDataSource: DataSource) => {
    const logger = new Logger('TenantConnectionProvider');
    const user = request.user;

    if (!user || !user.tenant_id) {
      return defaultDataSource;
    }

    const tenantId = user.tenant_id;

    let cachedDataSource = tenantDataSources.get(tenantId);
    if (cachedDataSource && cachedDataSource.isInitialized) {
      return cachedDataSource;
    }
    
    const tenant = await defaultDataSource.getRepository(TenantEntity).findOne({
      where: { tenant_id: tenantId },
    });

    if (!tenant || !tenant.schema_name) {
      logger.error(`Could not find tenant or schema_name for tenant_id: ${tenantId}`);
      throw new Error(`Tenant data not found for tenant id: ${tenantId}`);
    }

    const schemaName = tenant.schema_name;
    logger.log(`Connecting to schema: ${schemaName} for tenant: ${tenantId}`);

    // Explicitly cast to PostgresConnectionOptions to correctly handle the schema property
    const defaultPostgresOptions = defaultDataSource.options as PostgresConnectionOptions;

    const tenantDataSource = new DataSource({
      ...defaultPostgresOptions, // Spread the specific Postgres options
      name: schemaName, // Each DataSource must have a unique name
      schema: schemaName, // Schema property is now correctly typed for Postgres
    });

    await tenantDataSource.initialize();

    tenantDataSources.set(tenantId, tenantDataSource);

    return tenantDataSource;
  },
  inject: [REQUEST, getDataSourceToken()],
};
