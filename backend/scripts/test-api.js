const axios = require('axios');

async function testApi() {
  const baseURL = 'http://localhost:3001/api/v1';

  try {
    // 1. Login as a TENANT user (not SuperAdmin, who has no tenant_id)
    console.log('1. Attempting login as tenant user...');
    let loginRes;
    let cookies = '';
    
    // Try tenant login first (tenant users have tenant_id)
    try {
      loginRes = await axios.post(`${baseURL}/auth/login/tenant`, {
        email: 'saencrystal.global@gmail.com',
        password: 'Ndiong1988'
      }, { 
        maxRedirects: 0,
        validateStatus: (s) => s < 500 // Accept 2xx and 4xx
      });
      
      // Extract cookies from Set-Cookie header
      const setCookies = loginRes.headers['set-cookie'];
      if (setCookies) {
        cookies = setCookies.map(c => c.split(';')[0]).join('; ');
      }
      console.log(`Login response: ${loginRes.status} - cookies: ${cookies ? 'YES' : 'NO'}`);
      console.log('Response body:', JSON.stringify(loginRes.data));
    } catch (e) {
      console.error(`Tenant login error: ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
      
      // Fallback: try SuperAdmin
      console.log('\nTrying SuperAdmin login...');
      loginRes = await axios.post(`${baseURL}/auth/login/super`, {
        email: 'superadmin@sentinelfi.com',
        password: 'Ndiong1988'
      }, { validateStatus: (s) => s < 500 });
      
      const setCookies = loginRes.headers['set-cookie'];
      if (setCookies) {
        cookies = setCookies.map(c => c.split(';')[0]).join('; ');
      }
      console.log(`SuperAdmin login response: ${loginRes.status} - cookies: ${cookies ? 'YES' : 'NO'}`);
      console.log('Response body:', JSON.stringify(loginRes.data));
    }

    if (!cookies) {
      console.error('ERROR: No cookies received from login. Cannot test authenticated endpoints.');
      return;
    }

    // Create authenticated client
    const api = axios.create({
      baseURL,
      headers: { Cookie: cookies },
      validateStatus: (s) => true // Accept all status codes to see raw errors
    });

    // 2. Test /projects
    console.log('\n2. Testing /projects endpoint...');
    const projRes = await api.get('/projects?limit=100');
    console.log(`/projects: ${projRes.status} - ${JSON.stringify(projRes.data).substring(0, 500)}`);

    // 3. Test /wbs/budgets
    console.log('\n3. Testing /wbs/budgets endpoint...');
    const wbsRes = await api.get('/wbs/budgets');
    console.log(`/wbs/budgets: ${wbsRes.status} - ${JSON.stringify(wbsRes.data).substring(0, 500)}`);

    // 4. Test /auth/me
    console.log('\n4. Testing /auth/me endpoint...');
    const meRes = await api.get('/auth/me');
    console.log(`/auth/me: ${meRes.status} - ${JSON.stringify(meRes.data).substring(0, 500)}`);

  } catch (err) {
    console.error('Unhandled error:', err.message);
  }
}

testApi();
