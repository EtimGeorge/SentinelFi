import { DataSource } from "typeorm";
import dotenv from "dotenv";
dotenv.config({ path: "D:/DOCUMENTS/Development/SentinelFi/backend/.env" });
let url = (process.env.DATABASE_URL || "").trim().replace(/^['"]|['"]$/g, "");
if (url.startsWith("postgresql://")) url = url.replace("postgresql://", "postgres://");
const ds = new DataSource({ type: "postgres", url, ssl: { rejectUnauthorized: false } });
await ds.initialize();
const schemas = ["saencrystal_global_services", "solution_energy"];
for (const s of schemas) {
  console.log("=== SCHEMA", s, "===");
  const cols = await ds.query(
    `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema=$1 AND table_name='project' ORDER BY ordinal_position`,
    [s]
  );
  console.log(JSON.stringify(cols, null, 2));
  const tables = await ds.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE' ORDER BY table_name`,
    [s]
  );
  console.log("TABLES", tables.map((t) => t.table_name).join(","));
  const clientCols = await ds
    .query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='clients' ORDER BY ordinal_position`,
      [s]
    )
    .catch((e) => {
      console.log("clients missing", e.message);
      return [];
    });
  console.log("clients cols", JSON.stringify(clientCols, null, 2));
  const migr = await ds
    .query(`SELECT name FROM "${s}".tenant_migrations ORDER BY id`)
    .catch((e) => {
      console.log("migr err", e.message);
      return [];
    });
  console.log("migrations", JSON.stringify(migr, null, 2));
  console.log("");
  // Also check constraint / column details for dashboard related
  const wbsCols = await ds.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='wbs_budget' ORDER BY ordinal_position`, [s]);
  console.log("wbs_budget cols count", wbsCols.length);
  const expenseCols = await ds.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='live_expense' ORDER BY ordinal_position`, [s]);
  console.log("live_expense cols", expenseCols.map(c=>c.column_name).join(","));
  // Check if project has user relation column
  const proj2 = await ds.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='project'`,[s]);
  console.log("project columns flat", proj2.map(c=>c.column_name).join(","));
}
await ds.destroy();
