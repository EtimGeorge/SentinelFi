import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({path:'backend/.env'});
const secret = process.env.JWT_SECRET;
const {Client}=pg;
const c=new Client({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}});
await c.connect();
const tenants=await c.query(`SELECT tenant_id, schema_name FROM public.tenants WHERE deleted_at IS NULL`);
console.log(tenants.rows);
const usersByTenant={};
for(const t of tenants.rows){
  const u=await c.query(`SELECT id, email, tenant_id FROM public."user" WHERE tenant_id=$1 LIMIT 5`,[t.tenant_id]);
  usersByTenant[t.schema_name]=u.rows;
  console.log(t.schema_name, u.rows);
}
await c.end();
const base='http://localhost:3001/api/v1';

async function verify(schema){
  const tenantId = schema==='solution_energy' ? '28c5e8aa-5270-4299-b062-2414575019b9' : 'e5b8e754-396c-48ed-b6f0-65578a32deea';
  const users = usersByTenant[schema];
  if(!users || users.length<1){ console.log(`no users for ${schema}`); return; }
  // need at least 2 users per tenant – if only 1, create second via direct DB? For now test with existing plus fake?
  // We'll try to get 2 users; if only 1, we will use same user plus another uuid that is in same tenant – fetch second user if exists else create
  let userA = users[0];
  let userB = users[1];
  if(!userB){
    // try to find any other user for tenant, if none, use userA's id plus a new lookup via email
    // For testing, we will attempt to create a second user via backend if endpoint allows, else skip
    console.log(` only 1 user for ${schema}, will test email resolution path`);
    // create JWT for userA
    const token = jwt.sign({id:userA.id, email:userA.email, tenant_id:tenantId, roles:[{name:'AdminDirector'}]}, secret, {expiresIn:'1h'});
    // Test 1: POST with email identifier (should resolve)
    const emailToResolve = users[0].email; // self email would be deduped, need second distinct email
    // For single-user tenant, test with self email – expect 400 need at least 2 members (since resolved equals creator) – we'll handle
    // Instead try to test GET notifications
    console.log(`\n--- ${schema} GET /notifications ---`);
    try{
      const res=await fetch(`${base}/notifications`,{headers:{Authorization:`Bearer ${token}`}});
      const body=await res.text();
      console.log(` GET status ${res.status} body ${body.slice(0,500)}`);
    }catch(e){console.log(' GET error',e.message);}
    // Try POST with UUID that is not in tenant – should 400 not found, but not 400 validation
    console.log(`\n--- ${schema} POST /messaging/conversations with UUID ---`);
    // Use userA id as target? That would be duplicate of creator -> fail length 2 check. So need distinct.
    // Let's try to find a UUID of another tenant's user to test cross-tenant forbidden, and also test email path
    const otherSchema = schema==='solution_energy'?'saencrystal_global_services':'solution_energy';
    const otherUsers = usersByTenant[otherSchema];
    if(otherUsers && otherUsers[0]){
      // test email resolution: use email of same tenant second user if exists else other tenant's email but should fail cross-tenant
      // For now just test same tenant UUID duplicate handling
      const fakeUuid = '11111111-1111-4111-8111-111111111111';
      const res2=await fetch(`${base}/messaging/conversations`,{method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({userIds:[fakeUuid]})});
      const b2=await res2.text();
      console.log(` POST fake uuid status ${res2.status} body ${b2.slice(0,500)}`);
    }
    return;
  }
  const token = jwt.sign({id:userA.id, email:userA.email, tenant_id:tenantId, roles:[{name:'AdminDirector'}]}, secret, {expiresIn:'1h'});
  console.log(`\n=== Testing ${schema} tenant ${tenantId} users ${userA.id} -> ${userB.id} (${userB.email}) ===`);
  // Test UUID path
  console.log(' POST with UUID');
  let res=await fetch(`${base}/messaging/conversations`,{method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({userIds:[userB.id]})});
  let body=await res.text();
  console.log(`  status ${res.status} body ${body.slice(0,800)}`);
  // Test email path
  console.log(' POST with email');
  res=await fetch(`${base}/messaging/conversations`,{method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({userIds:[userB.email]})});
  body=await res.text();
  console.log(`  status ${res.status} body ${body.slice(0,800)}`);
  // Test GET notifications
  console.log(' GET /notifications');
  res=await fetch(`${base}/notifications`,{headers:{Authorization:`Bearer ${token}`}});
  body=await res.text();
  console.log(`  status ${res.status} body ${body.slice(0,500)}`);
  console.log(' GET /notifications/unread-count');
  res=await fetch(`${base}/notifications/unread-count`,{headers:{Authorization:`Bearer ${token}`}});
  body=await res.text();
  console.log(`  status ${res.status} body ${body.slice(0,500)}`);
}

for(const s of ['solution_energy','saencrystal_global_services']){
  await verify(s);
}
