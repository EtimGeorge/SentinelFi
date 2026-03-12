const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function deepAudit() {
  console.log('--- DEEP DATABASE AUDIT STARTED ---');
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    const schema = 'saencrystal_global_services';
    console.log(`Auditing Schema: ${schema}`);
    
    // 1. Check if table definitely exists in THIS schema
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name = 'wbs_budget'
    `, [schema]);
    console.log(`Table 'wbs_budget' exists in ${schema}: ${tableCheck.rows.length > 0}`);

    if (tableCheck.rows.length > 0) {
      // 2. List ALL columns in wbs_budget for this schema
      const colCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = 'wbs_budget'
        ORDER BY ordinal_position
      `, [schema]);
      console.log('Current columns in saencrystal_global_services.wbs_budget:');
      colCheck.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
    }

    // 3. Check migrations table content and structure
    console.log(`\nChecking '${schema}.tenant_migrations' content:`);
    try {
      const migs = await client.query(`SELECT * FROM "${schema}"."tenant_migrations" ORDER BY id ASC`);
      migs.rows.forEach(m => console.log(` [${m.id}] ${m.name} (timestamp: ${m.timestamp})`));
    } catch (e) {
      console.log(`Error reading migrations table: ${e.message}`);
    }

    // 4. Compare with public.tenants record
    const tenantRecord = await client.query(`SELECT * FROM public.tenants WHERE schema_name = $1`, [schema]);
    console.log('\nPublic Tenant Record:');
    console.log(JSON.stringify(tenantRecord.rows[0], null, 2));

  } catch (err) {
    console.error('CRITICAL AUDIT ERROR:', err);
  } finally {
    await client.end();
    console.log('--- DEEP DATABASE AUDIT FINISHED ---');
  }
}

deepAudit();
