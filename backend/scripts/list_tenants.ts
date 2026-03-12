
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function listTenants() {
  dotenv.config({ path: [
    path.resolve(process.cwd(), 'backend', '.env.local'), 
    path.resolve(process.cwd(), 'backend', '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env')
  ] });
  
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    entities: [],
    synchronize: false,
  });

  try {
    await ds.initialize();
    const result = await ds.query('SELECT schema_name FROM tenants');
    console.log('--- TENANT SCHEMAS ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('----------------------');
  } catch (err) {
    console.error('Error listing tenants:', err);
  } finally {
    await ds.destroy();
  }
}

listTenants();
