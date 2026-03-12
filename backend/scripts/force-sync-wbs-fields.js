const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function forceSync() {
  console.log('--- FORCE SYNC WBS FIELDS STARTED ---');
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query("SELECT tenant_id, name, schema_name FROM public.tenants WHERE is_active = true");
    console.log(`Processing ${res.rows.length} active tenants.`);

    for (const tenant of res.rows) {
      const schema = tenant.schema_name;
      console.log(`\nTenant: ${tenant.name} (Schema: ${schema})`);

      try {
        // 1. Force add columns using raw SQL in the specific schema
        // We use fully qualified names to be 100% sure
        console.log(` Adding columns to "${schema}"."wbs_budget"...`);
        await client.query(`
          ALTER TABLE "${schema}"."wbs_budget" 
          ADD COLUMN IF NOT EXISTS "uom" character varying(50),
          ADD COLUMN IF NOT EXISTS "custom_metadata" jsonb
        `);
        console.log(` ✅ Column addition command succeeded.`);

        // 2. Refresh migration record
        // First delete it to avoid 'duplicate key' but ensure it's there
        const migName = 'TenantAddAdvancedFinancialFieldsToWbs1771955000000';
        await client.query(`DELETE FROM "${schema}"."tenant_migrations" WHERE name = $1`, [migName]);
        await client.query(`
          INSERT INTO "${schema}"."tenant_migrations" (name, timestamp) 
          VALUES ($1, $2)
        `, [migName, 1771955000000]);
        console.log(` ✅ Migration record ${migName} synchronized.`);

        // 3. Final structural verify
        const verifyCol = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = 'wbs_budget' AND column_name = 'uom'
        `, [schema]);
        if (verifyCol.rows.length > 0) {
          console.log(` ✅ VERIFIED: Column 'uom' exists in "${schema}"."wbs_budget".`);
        } else {
          console.log(` ❌ CRITICAL: Column 'uom' STILL MISSING in "${schema}"."wbs_budget" after ALTER command!`);
        }

      } catch (err) {
        console.error(` ❌ Error syncing schema ${schema}:`, err.message);
      }
    }

  } catch (err) {
    console.error('CRITICAL SYNC ERROR:', err);
  } finally {
    await client.end();
    console.log('--- FORCE SYNC WBS FIELDS FINISHED ---');
  }
}

forceSync();
