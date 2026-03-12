const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function addLpoColumn() {
  console.log('--- ADD LPO COMMITMENT COLUMN STARTED ---');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to Neon database.');

    // Fetch all active tenants
    const res = await client.query("SELECT tenant_id, name, schema_name FROM public.tenants WHERE is_active = true");
    console.log(`Processing ${res.rows.length} active tenants.`);

    for (const tenant of res.rows) {
      const schema = tenant.schema_name;
      console.log(`\nTenant: ${tenant.name} (Schema: ${schema})`);

      try {
        console.log(` Injecting total_committed_lpo into "${schema}"."wbs_budget"...`);
        await client.query(`
          ALTER TABLE "${schema}"."wbs_budget" 
          ADD COLUMN IF NOT EXISTS "total_committed_lpo" numeric(19,4) NOT NULL DEFAULT 0;
        `);
        console.log(` ✅ Column addition succeeded.`);
        
        // Also register the migration step so TypeORM knows about it
        const migName = 'AddWbsLpoCommitments1773024546528';
        await client.query(`DELETE FROM "${schema}"."tenant_migrations" WHERE name = $1`, [migName]);
        await client.query(`
          INSERT INTO "${schema}"."tenant_migrations" (name, timestamp) 
          VALUES ($1, $2)
        `, [migName, 1773024546528]);
        console.log(` ✅ Database migration record saved.`);

      } catch (err) {
        console.error(` ❌ Error syncing schema ${schema}:`, err.message);
      }
    }

  } catch (err) {
    console.error('CRITICAL SYNC ERROR:', err);
  } finally {
    await client.end();
    console.log('\n--- ADD LPO COMMITMENT COLUMN FINISHED ---');
  }
}

addLpoColumn();
