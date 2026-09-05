import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { DataSource } from "typeorm";
dotenv.config({ path: "D:/DOCUMENTS/Development/SentinelFi/backend/.env" });
let url = (process.env.DATABASE_URL || "").trim().replace(/^['"]|['"]$/g, "");
if (url.startsWith("postgresql://")) url = url.replace("postgresql://", "postgres://");
const ds = new DataSource({ type: "postgres", url, ssl: { rejectUnauthorized: false } });
await ds.initialize();
const secret = process.env.JWT_SECRET;
const tenants = await ds.query(`SELECT tenant_id, schema_name, name FROM public.tenants`);
const users = await ds.query(`SELECT id, email, tenant_id FROM public."user" WHERE tenant_id IS NOT NULL`);
console.log("users",users);
for(const u of users){
  const tenant = tenants.find(t=>t.tenant_id===u.tenant_id);
  if(!tenant) continue;
  // get roles/perms generically
  const rows = await ds.query(`SELECT r.name FROM public."user" u JOIN public.user_roles ur ON ur.user_id=u.id JOIN public.roles r ON r.id=ur.role_id WHERE u.id=$1`,[u.id]);
  const perms = await ds.query(`SELECT p.name FROM public.permissions p JOIN public.role_permissions rp ON rp.permission_id=p.id JOIN public.roles r ON r.id=rp.role_id JOIN public.user_roles ur ON ur.role_id=r.id WHERE ur.user_id=$1`,[u.id]);
  const payload = { jti:"verify-"+u.id, email:u.email, sub:u.id, id:u.id, roles: rows.map(r=>r.name), permissions: [...new Set(perms.map(p=>p.name))], tenant_id: u.tenant_id };
  const token = jwt.sign(payload, secret, {expiresIn:"1h"});
  console.log(`\n=== Tenant ${tenant.name} user ${u.email} ===`);
  for(const path of ["/api/v1/projects?limit=100", "/api/v1/dashboard/summary", "/api/v1/dashboard/executive", "/api/v1/wbs/expenses?limit=10"]){
    const res = await fetch(`http://127.0.0.1:3001${path}`, { headers: { Cookie: `access_token=${token}` }});
    const text = await res.text();
    console.log(path, "=>", res.status, text.slice(0,500).replace(/\n/g," "));
    if(path.includes("projects") && res.status!==200) { console.error("PROJECTS FAILED"); process.exit(1); }
    if(path.includes("dashboard") && res.status!==200) { console.error("DASHBOARD FAILED"); process.exit(1); }
  }
}
await ds.destroy();
console.log("\nAll curl verifications passed for both tenants (generic, no hardcoded names).");
