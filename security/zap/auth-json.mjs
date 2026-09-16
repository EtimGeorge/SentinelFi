#!/usr/bin/env node
/**
 * SentinelFi login helper used by the security tooling and CI.
 *
 * Logs in against POST /api/v1/auth/login/tenant and prints the resulting
 * httpOnly `access_token` cookie (and, optionally, a ZAP user JSON) to stdout.
 *
 * Usage:
 *   node auth-json.mjs http://localhost:3001 user@example.com 'password' solution_energy
 *
 * Env overrides:
 *   ZAP_LOGIN_URL — full login URL (defaults to <baseUrl>/api/v1/auth/login/tenant)
 */
const [baseUrl, email, password, tenantId] = process.argv.slice(2);

if (!baseUrl || !email || !password || !tenantId) {
  console.error(
    'Usage: node auth-json.mjs <baseUrl> <email> <password> <tenantId>',
  );
  process.exit(1);
}

const loginUrl =
  process.env.ZAP_LOGIN_URL ||
  `${baseUrl.replace(/\/+$/, '')}/api/v1/auth/login/tenant`;

const res = await fetch(loginUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, tenantId }),
  redirect: 'manual',
});

const setCookie = res.headers.get('set-cookie') || '';
const cookie = setCookie.split(';')[0];

if (res.status !== 200 || !cookie) {
  console.error(
    `ERROR: login failed (HTTP ${res.status}). Check credentials / tenant.`,
  );
  if (setCookie) console.error(`Set-Cookie present but status not 200: ${setCookie.slice(0, 120)}`);
  process.exit(1);
}

const body = await res.text();
const parsed = (() => {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
})();

if (parsed?.requiresMFA) {
  console.error(
    'ERROR: account requires MFA. Use a tenant admin that is not MFA-enforced.',
  );
  process.exit(1);
}

console.log(`COOKIE ${cookie}`);
console.log(`USER ${JSON.stringify(parsed?.user ?? {})}`);