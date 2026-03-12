const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function fix() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('--- Database Repair Script Started ---');
  
  try {
    // 1. Get all tenants and their schemas
    const tenantsRes = await client.query('SELECT tenant_id, name, schema_name FROM public.tenants');
    const tenants = tenantsRes.rows;
    console.log(`Found ${tenants.length} tenants to check.`);

    for (const tenant of tenants) {
      const schema = tenant.schema_name;
      console.log(`\nChecking schema: ${schema} (Tenant: ${tenant.name})`);

      // Ensure wbs_budget table exists in this schema
      const tableCheck = await client.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = 'wbs_budget'
      `, [schema]);

      if (tableCheck.rows.length === 0) {
        console.log(`[SKIP] Table 'wbs_budget' does not exist in schema ${schema}.`);
        continue;
      }

      // 2. Add sort_order if missing
      const sortOrderCheck = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = 'wbs_budget' AND column_name = 'sort_order'
      `, [schema]);

      if (sortOrderCheck.rows.length === 0) {
        console.log(`[FIX] Adding 'sort_order' to ${schema}.wbs_budget`);
        await client.query(`ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0`);
      } else {
        console.log(`[OK] 'sort_order' already exists in ${schema}.wbs_budget`);
      }

      // 3. Ensure uom and custom_metadata exist (preventative)
      const uomCheck = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = 'wbs_budget' AND column_name = 'uom'
      `, [schema]);
      if (uomCheck.rows.length === 0) {
        console.log(`[FIX] Adding 'uom' to ${schema}.wbs_budget`);
        await client.query(`ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN "uom" character varying(50)`);
      }

      const metaCheck = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = 'wbs_budget' AND column_name = 'custom_metadata'
      `, [schema]);
      if (metaCheck.rows.length === 0) {
        console.log(`[FIX] Adding 'custom_metadata' to ${schema}.wbs_budget`);
        await client.query(`ALTER TABLE "${schema}"."wbs_budget" ADD COLUMN "custom_metadata" jsonb`);
      }
    }

    console.log('\n--- Repair Completed Successfully ---');
  } catch (err) {
    console.error('\n--- Repair Failed ---');
    console.error(err);
  } finally {
    await client.end();
  }
}

fix();
