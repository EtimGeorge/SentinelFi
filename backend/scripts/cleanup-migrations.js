const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function cleanup() {
  console.log('Script started...');
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query("SELECT schema_name FROM public.tenants WHERE is_active = true");
    
    for (const tenant of res.rows) {
      console.log(`Cleaning up schema: ${tenant.schema_name}`);
      await client.query(`DELETE FROM "${tenant.schema_name}"."tenant_migrations" WHERE name = 'TenantAddAdvancedFinancialFieldsToWbs1771955000000'`);
      console.log(`✅ Deleted migration record if it existed.`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
    console.log('Cleanup finished.');
  }
}

cleanup();
