import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables dynamically, prioritizing .env.local over .env for the backend context
dotenv.config({ path: [path.resolve(process.cwd(), 'backend', '.env.local'), path.resolve(process.cwd(), 'backend', '.env')] });

const config: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL, // Use DATABASE_URL from .env files
  ssl: process.env.DATABASE_URL?.includes('neon.tech'), // Conditionally enable SSL for Neon databases
  schema: 'client_template', // This DataSource is specifically for a tenant schema (placeholder)
  entities: [
    path.resolve(__dirname, 'src/projects/project.entity.ts'),
    path.resolve(__dirname, 'src/wbs/wbs-budget.entity.ts'),
    path.resolve(__dirname, 'src/wbs/live-expense.entity.ts'),
    path.resolve(__dirname, 'src/wbs/wbs-category.entity.ts'),
    path.resolve(__dirname, 'src/operational-budgets/operational-budget.entity.ts'),
    path.resolve(__dirname, 'src/operational-budgets/operational-budget-category.entity.ts'),
    path.resolve(__dirname, 'src/operational-budgets/operational-expense.entity.ts'),
    path.resolve(__dirname, 'src/dashboard/annotation.entity.ts'),
    // Public entities referenced by tenant entities or their dependencies
    path.resolve(__dirname, 'src/auth/user.entity.ts'), 
    path.resolve(__dirname, 'src/auth/role.entity.ts'),
    path.resolve(__dirname, 'src/auth/permission.entity.ts'),
    path.resolve(__dirname, 'src/tenants/tenant.entity.ts'),
  ],
  migrations: [
    path.resolve(__dirname, 'src/migrations/tenant/*.ts'), // Tenant schema migrations
  ],
  migrationsTableName: 'tenant_migrations', // Dedicated migrations table for tenant schemas
  synchronize: false, // Should always be false for production
  logging: true,
};

const AppDataSource = new DataSource(config);

export default AppDataSource;
