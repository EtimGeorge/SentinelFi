import { DataSource } from "typeorm";
import dotenv from "dotenv";
dotenv.config({ path: "D:/DOCUMENTS/Development/SentinelFi/backend/.env" });
let url = (process.env.DATABASE_URL || "").trim().replace(/^['"]|['"]$/g, "");
if (url.startsWith("postgresql://")) url = url.replace("postgresql://", "postgres://");
const ds = new DataSource({ type: "postgres", url, ssl: { rejectUnauthorized: false } });
await ds.initialize();
for(const schema of ["saencrystal_global_services","solution_energy"]){
  console.log("=== schema",schema," ===");
  const enums = await ds.query(`SELECT n.nspname as schema, t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname='wbs_budget_status_enum' ORDER BY n.nspname, e.enumsortorder`);
  console.log(JSON.stringify(enums,null,2));
  // also check column type
  const col = await ds.query(`SELECT udt_name, udt_schema FROM information_schema.columns WHERE table_schema=$1 AND table_name='wbs_budget' AND column_name='status'`,[schema]);
  console.log("status col",col);
  // try query with lowercase?
  try{
    await ds.query(`SET search_path TO ${schema}, public`);
    const r1 = await ds.query(`SELECT COUNT(*) FROM wbs_budget WHERE status='draft'`);
    console.log("lowercase draft",r1);
  }catch(e){console.log("lowercase fail",e.message)}
  try{
    await ds.query(`SET search_path TO ${schema}, public`);
    const r2 = await ds.query(`SELECT enum_range(NULL::wbs_budget_status_enum)`);
    console.log("enum range",r2);
  }catch(e){console.log("enum range fail",e.message)}
  // distinct status values
  try{
    const vals = await ds.query(`SELECT DISTINCT status::text FROM "${schema}".wbs_budget LIMIT 10`);
    console.log("distinct vals",vals);
  }catch(e){console.log("distinct fail",e.message)}
}
await ds.destroy();
