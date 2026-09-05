const url='http://localhost:3001/api/v1';
async function login(email,password,tenant){
  const res=await fetch(`${url}/auth/login/tenant`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,tenantId:tenant})});
  const setCookie=res.headers.get('set-cookie')||res.headers.get('Set-Cookie');
  console.log('login status',res.status);
  const text=await res.text();
  console.log('login body length',text.length);
  return setCookie;
}
async function fetchAs(cookie, path){
  const res=await fetch(`${url}${path}`,{headers:{Cookie:cookie}});
  console.log(`GET ${path} => ${res.status}`);
  const body=await res.text();
  console.log(body.substring(0,1000));
  return res.status;
}
(async()=>{
  // credentials from superadmin? but need tenant user: saencrystal.global@gmail.com / we don't know password? The earlier log shows login with that email succeeded via frontend but we don't have password. Use admin account for solution_energy? The password used in logs? Not visible but we can try to discover via env? Maybe password not known. We can try usingAuthService with superadmin? But superadmin is not tenant.
  // Alternative: directly test via DB query already done; skip HTTP.
  // Let's try to get health endpoint without auth to verify backend running
  const res=await fetch(`${url}/health`);
  console.log('health',res.status, await res.text().then(t=>t.substring(0,500)));
})();
