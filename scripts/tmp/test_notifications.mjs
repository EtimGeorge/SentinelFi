import { Pool } from 'pg';
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});
async function test() {
  // Check solution_energy structure
  const sr = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'solution_energy' AND table_name = 'notifications' ORDER BY ordinal_position");
  console.log('solution_energy notifications columns:');
  sr.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
  
  // Check saencrystal_global_services structure
  const sa = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'saencrystal_global_services' AND table_name = 'notifications' ORDER BY ordinal_position");
  console.log('saencrystal_global_services notifications columns:');
  sa.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
  
  // Try a simple query
  try {
    const sq = await pool.query("SELECT COUNT(*) as cnt FROM \"notifications\" WHERE \"tenant_id\" = '00000000-0000-0000-0000-000000000000'");
    console.log('solution_energy count:', sq.rows);
  } catch(e) {
    console.log('solution_energy count error:', e.message);
  }
  
  try {
    const saq = await pool.query("SELECT COUNT(*) as cnt FROM \"notifications\" WHERE \"tenant_id\" = '00000000-0000-0000-0000-000000000000'");
    console.log('saencrystal count:', saq.rows);
  } catch(e) {
    console.log('saencrystal count error:', e.message);
  }
  
  await pool.end();
}
test().catch(e => console.error(e));