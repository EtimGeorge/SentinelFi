const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function checkSchema() {
  console.log('Script started...');
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query("SELECT tenant_id, name, schema_name FROM public.tenants WHERE is_active = true");
    console.log(`Found ${res.rows.length} active tenants.`);

    console.log(`\nChecking Public Schema:`);
    const pubColRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'wbs_budget' 
      AND column_name IN ('uom', 'custom_metadata')
    `);
    const pubCols = pubColRes.rows.map(r => r.column_name);
    console.log(`Column 'uom': ${pubCols.includes('uom') ? '✅' : '❌'}`);
    console.log(`Column 'custom_metadata': ${pubCols.includes('custom_metadata') ? '✅' : '❌'}`);

    for (const tenant of res.rows) {
      console.log(`\nChecking Tenant: ${tenant.name} (Schema: ${tenant.schema_name})`);
      
      const colRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = '${tenant.schema_name}' 
        AND table_name = 'wbs_budget' 
        AND column_name IN ('uom', 'custom_metadata')
      `);
      
      const columns = colRes.rows.map(r => r.column_name);
      if (columns.includes('uom')) {
        console.log(`✅ Column 'uom' exists.`);
      } else {
        console.log(`❌ Column 'uom' MISSING.`);
      }

      if (columns.includes('custom_metadata')) {
        console.log(`✅ Column 'custom_metadata' exists.`);
      } else {
        console.log(`❌ Column 'custom_metadata' MISSING.`);
      }

      // Also check migrations table
      try {
        const migRes = await client.query(`SELECT name FROM "${tenant.schema_name}"."tenant_migrations" WHERE name LIKE '%AdvancedFinancialFields%'`);
        if (migRes.rows.length > 0) {
          console.log(`📝 Migration record found: ${migRes.rows[0].name}`);
        } else {
          console.log(`❌ No migration record found in tenant_migrations.`);
        }
      } catch (err) {
        console.log(`⚠️  Could not check tenant_migrations table: ${err.message}`);
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
    console.log('Script finished.');
  }
}

checkSchema();
