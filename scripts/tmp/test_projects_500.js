const axios = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/axios').default;
(async () => {
  const base = 'http://127.0.0.1:3001';
  const login = await axios.post(`${base}/api/v1/auth/login/tenant`, { email: 'saencrystal.global@gmail.com', password: 'SaenCrystal123!Strong', tenantId: 'SOLUTION_ENERGY' });
  const setCookie = login.headers['set-cookie']?.find(c => c.includes('access_token'));
  const token = setCookie?.match(/access_token=([^;]+)/)?.[1];
  console.log('login ok, token len', token?.length);
  try {
    const r = await axios.get(`${base}/api/v1/projects?limit=100`, { headers: { Cookie: `access_token=${token}` } });
    console.log('projects ok', r.status, JSON.stringify(r.data).slice(0,500));
  } catch(e) {
    console.log('projects error', e.response?.status, JSON.stringify(e.response?.data).slice(0,1000));
  }
  try {
    const r2 = await axios.get(`${base}/api/v1/wbs/budgets?status=pending&limit=1`, { headers: { Cookie: `access_token=${token}` } });
    console.log('wbs ok', r2.status, JSON.stringify(r2.data).slice(0,500));
  } catch(e) {
    console.log('wbs error', e.response?.status, JSON.stringify(e.response?.data).slice(0,1000));
  }
})();
