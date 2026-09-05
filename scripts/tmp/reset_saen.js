const bcrypt = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/bcryptjs');
const { Client } = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/pg');
const fs = require('fs');
const envContent = fs.readFileSync('D:/DOCUMENTS/Development/SentinelFi/backend/.env', 'utf8');
const line = envContent.split('\n').find(l => l.trim().startsWith('DATABASE_URL='));
let url = line.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
const newPassword = 'SaenCrystal123!Strong';
bcrypt.hash(newPassword, 10).then(hash => {
  console.log('new hash', hash);
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  return c.connect().then(() => c.query('UPDATE public."user" SET password_hash = $1 WHERE email = $2 RETURNING email', [hash, 'saencrystal@gmail.com'])).then(r => {
    console.log('updated', r.rows);
    return c.end();
  });
}).catch(e => console.error(e));
