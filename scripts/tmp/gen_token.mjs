import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { DataSource } from "typeorm";
dotenv.config({ path: "D:/DOCUMENTS/Development/SentinelFi/backend/.env" });
let url = (process.env.DATABASE_URL || "").trim().replace(/^['"]|['"]$/g, "");
if (url.startsWith("postgresql://")) url = url.replace("postgresql://", "postgres://");
const ds = new DataSource({ type: "postgres", url, ssl: { rejectUnauthorized: false } });
await ds.initialize();
const uid = "3fcf7d2f-901e-4acb-8d03-ae13dc4e06e1";
const rows = await ds.query(`SELECT u.id, u.email, u.tenant_id, r.name as role_name FROM public."user" u LEFT JOIN public.user_roles ur ON ur.user_id=u.id LEFT JOIN public.roles r ON r.id=ur.role_id WHERE u.id=$1`,[uid]);
console.log(rows);
const perms = await ds.query(`SELECT p.name FROM public."user" u JOIN public.user_roles ur ON ur.user_id=u.id JOIN public.roles r ON r.id=ur.role_id JOIN public.role_permissions rp ON rp.role_id=r.id JOIN public.permissions p ON p.id=rp.permission_id WHERE u.id=$1`,[uid]);
console.log(perms.map(p=>p.name));
// generate token
const secret = process.env.JWT_SECRET;
const payload = {
  jti: "test-jti-saencrystal",
  email: "saencrystal@gmail.com",
  sub: uid,
  id: uid,
  roles: rows.map(r=>r.role_name).filter(Boolean),
  permissions: perms.map(p=>p.name),
  tenant_id: "e5b8e754-396c-48ed-b6f0-65578a32deea"
};
const token = jwt.sign(payload, secret, { expiresIn: "1h" });
console.log("TOKEN",token);
// test projects
for(const path of ["/api/v1/projects?limit=100","/api/v1/dashboard/summary","/api/v1/dashboard/executive"]){
  const res = await fetch(`http://127.0.0.1:3001${path}`, { headers: { Cookie: `access_token=${token}` }});
  const text = await res.text();
  console.log(path, res.status, text.slice(0,3000));
}
await ds.destroy();
