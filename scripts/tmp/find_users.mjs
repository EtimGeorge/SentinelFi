import { DataSource } from "typeorm";
import dotenv from "dotenv";
dotenv.config({ path: "D:/DOCUMENTS/Development/SentinelFi/backend/.env" });
let url = (process.env.DATABASE_URL || "").trim().replace(/^['"]|['"]$/g, "");
if (url.startsWith("postgresql://")) url = url.replace("postgresql://", "postgres://");
const ds = new DataSource({ type: "postgres", url, ssl: { rejectUnauthorized: false } });
await ds.initialize();
const users = await ds.query(`SELECT id, email, tenant_id FROM public."user" ORDER BY email`);
console.log(JSON.stringify(users,null,2));
const tenants = await ds.query(`SELECT tenant_id, schema_name, name FROM public.tenants`);
console.log(JSON.stringify(tenants,null,2));
// count projects per schema
for(const t of tenants){
  const cnt = await ds.query(`SELECT COUNT(*) FROM "${t.schema_name}".project`);
  console.log(t.schema_name, cnt[0].count);
  const w = await ds.query(`SELECT COUNT(*) FROM "${t.schema_name}".wbs_budget`);
  console.log(" wbs",w[0].count);
}
await ds.destroy();
