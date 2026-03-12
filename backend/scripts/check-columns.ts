import { Client } from 'pg';
console.log('Script started...');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function checkSchema() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query("SELECT schema_name FROM public.tenant WHERE tenant_id = '28c5e8aa-5270-4299-b062-2414575019b9'");
    if (res.rows.length === 0) {
      console.log('Tenant not found');
      return;
    }
    const schema = res.rows[0].schema_name;
    console.log(`Checking schema: ${schema}`);
    
    const colRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = '${schema}' 
      AND table_name = 'wbs_budget' 
      AND column_name = 'uom'
    `);
    
    if (colRes.rows.length > 0) {
      console.log(`✅ Column 'uom' exists in schema '${schema}'`);
    } else {
      console.log(`❌ Column 'uom' DOES NOT exist in schema '${schema}'`);
    }
    
    const metaRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = '${schema}' 
      AND table_name = 'wbs_budget' 
      AND column_name = 'custom_metadata'
    `);
    
    if (metaRes.rows.length > 0) {
      console.log(`✅ Column 'custom_metadata' exists in schema '${schema}'`);
    } else {
      console.log(`❌ Column 'custom_metadata' DOES NOT exist in schema '${schema}'`);
    }

  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await client.end();
  }
}

checkSchema();
