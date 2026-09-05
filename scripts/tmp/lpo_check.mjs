import { DataSource } from "typeorm";
import dotenv from "dotenv";
dotenv.config({ path: "D:/DOCUMENTS/Development/SentinelFi/backend/.env" });
let url = (process.env.DATABASE_URL || "").trim().replace(/^['"]|['"]$/g, "");
if (url.startsWith("postgresql://")) url = url.replace("postgresql://", "postgres://");
const ds = new DataSource({ type: "postgres", url, ssl: { rejectUnauthorized: false } });
await ds.initialize();
for(const s of ["saencrystal_global_services","solution_energy"]){
  const c = await ds.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name='lpo' ORDER BY ordinal_position`,[s]);
  console.log(s, c.map(x=>x.column_name).join(","));
}
await ds.destroy();
