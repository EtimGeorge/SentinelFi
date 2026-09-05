const axios = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/axios').default;
(async () => {
  const base = 'http://127.0.0.1:3000';
  // login as saencrystal
  const login = await axios.post(`${base}/api/v1/auth/login/tenant`, { email: 'saencrystal@gmail.com', password: 'SaenCrystal123!Strong', tenantId: 'SAENCRYSTAL_GLOBAL_SERVICES' }, { withCredentials: true });
  console.log('login status', login.status);
  const cookies = login.headers['set-cookie']?.join('; ') || '';
  console.log('cookies', cookies.slice(0,80));
  // try wbs budgets
  try {
    const wbs = await axios.get(`${base}/api/v1/wbs/budgets?status=pending&limit=1`, { headers: { Cookie: cookies } });
    console.log('wbs budgets', wbs.status, JSON.stringify(wbs.data).slice(0,200));
  } catch(e) { console.log('wbs error', e.response?.status, e.response?.data?.message?.slice?.(0,200) || e.message); }
  try {
    const proj = await axios.get(`${base}/api/v1/projects?limit=100`, { headers: { Cookie: cookies } });
    console.log('projects', proj.status, JSON.stringify(proj.data).slice(0,300));
  } catch(e) { console.log('projects error', e.response?.status, e.response?.data?.message?.slice?.(0,200) || e.message); }
  // login as saencrystal.global for SOLUTION
  const login2 = await axios.post(`${base}/api/v1/auth/login/tenant`, { email: 'saencrystal.global@gmail.com', password: 'SaenCrystal123!Strong', tenantId: 'SOLUTION_ENERGY' });
  console.log('login2 status', login2.status);
  const cookies2 = login2.headers['set-cookie']?.join('; ') || '';
  try {
    const wbs2 = await axios.get(`${base}/api/v1/wbs/budgets?status=pending&limit=1`, { headers: { Cookie: cookies2 } });
    console.log('wbs2', wbs2.status, JSON.stringify(wbs2.data).slice(0,300));
  } catch(e) { console.log('wbs2 error', e.response?.status, e.response?.data?.message?.slice?.(0,200) || e.message); }
  try {
    const live = await axios.get(`${base}/api/v1/wbs/live-expenses?limit=5`, { headers: { Cookie: cookies2 } });
    console.log('live', live.status, JSON.stringify(live.data).slice(0,500));
  } catch(e) { console.log('live error', e.response?.status, e.response?.data?.message?.slice?.(0,300) || e.message); }
})();
