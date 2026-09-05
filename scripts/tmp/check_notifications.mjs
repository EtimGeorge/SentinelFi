import { Pool } from 'pg';
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});
async function check() {
  // Check solution_energy
  const sr = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'solution_energy' AND table_name = 'notifications'");
  console.log('solution_energy notifications:', sr.rows.length > 0 ? 'EXISTS' : 'MISSING');
  // Check saencrystal_global_services
  const sa = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'saencrystal_global_services' AND table_name = 'notifications'");
  console.log('saencrystal_global_services notifications:', sa.rows.length > 0 ? 'EXISTS' : 'MISSING');
  // List tables in both schemas
  const s2 = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'solution_energy'");
  console.log('solution_energy tables:', s2.rows.map(r => r.table_name).join(', '));
  const sa2 = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'saencrystal_global_services'");
  console.log('saencrystal_global_services tables:', sa2.rows.map(r => r.table_name).join(', '));
  await pool.end();
}
check().catch(e => console.error(e));