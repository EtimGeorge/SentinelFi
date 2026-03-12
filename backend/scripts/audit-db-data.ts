const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function auditData() {
  const client = new Client({ connectionString });
  let log = '';
  
  try {
    await client.connect();
    log += 'Connected to DB\n';

    await client.query("SET search_path TO 'solution_energy'");

    // 1. Check projects
    const pRes = await client.query("SELECT project_id, project_name, tenant_id FROM project WHERE deleted_at IS NULL");
    log += `\n--- PROJECTS IN solution_energy ---\n`;
    log += JSON.stringify(pRes.rows, null, 2) + '\n';

    // 2. Check WBS Budgets
    const wbRes = await client.query("SELECT COUNT(*) as count FROM wbs_budget");
    log += `\nTotal WBS Budgets: ${wbRes.rows[0].count}\n`;

    // 3. Check Live Expenses
    const leRes = await client.query("SELECT COUNT(*) as count FROM live_expense");
    log += `Total Live Expenses: ${leRes.rows[0].count}\n`;

    // 4. Try the exact logic of the service (aggregating)
    const aggRes = await client.query(`
      SELECT p.project_id, p.project_name, 
             COALESCE(SUM(wb.total_cost_budgeted), 0) as budgeted
      FROM project p
      LEFT JOIN wbs_budget wb ON wb.project_id = p.project_id
      WHERE p.deleted_at IS NULL
      GROUP BY p.project_id, p.project_name
    `);
    log += `\n--- AGGREGATED PORTFOLIO DATA ---\n`;
    log += JSON.stringify(aggRes.rows, null, 2) + '\n';

  } catch(e) {
    log += 'Error: ' + e.message + '\n';
  } finally {
    client.end();
    fs.writeFileSync('data-audit.txt', log);
  }
}

auditData();
