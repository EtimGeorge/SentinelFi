import { Pool } from 'pg';
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});
async function test() {
  // Try querying with explicit schema
  try {
    const sq = await pool.query('SELECT COUNT(*) as cnt FROM "solution_energy".notifications WHERE "tenant_id" = $1', ['00000000-0000-0000-0000-000000000000']);
    console.log('solution_energy count:', sq.rows);
  } catch(e) {
    console.log('solution_energy count error:', e.message);
  }
  
  try {
    const saq = await pool.query('SELECT COUNT(*) as cnt FROM "saencrystal_global_services".notifications WHERE "tenant_id" = $1', ['00000000-0000-0000-0000-000000000000']);
    console.log('saencrystal count:', saq.rows);
  } catch(e) {
    console.log('saencrystal count error:', e.message);
  }
  
  // Check if we can see the table in pg_tables
  try {
    const pt = await pool.query("SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'notifications'");
    console.log('pg_tables notifications:', pt.rows);
  } catch(e) {
    console.log('pg_tables error:', e.message);
  }
  
  await pool.end();
}
test().catch(e => console.error(e));