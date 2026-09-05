const res = await fetch("http://127.0.0.1:3001/api/v1/auth/login/tenant", {
  method: "POST",
  headers: { "Content-Type":"application/json" },
  body: JSON.stringify({ email: "saencrystal@gmail.com", password: "password123" }) // guess
});
console.log(res.status, await res.text());

// try superadmin
const res2 = await fetch("http://127.0.0.1:3001/api/v1/auth/login/super", {
  method: "POST",
  headers: { "Content-Type":"application/json" },
  body: JSON.stringify({ email: "superadmin@sentinelfi.com", password: "Ndiong1988" })
});
console.log("super",res2.status, await res2.text());
