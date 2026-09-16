/**
 * authz-suite.ts — IDOR / tenant-boundary walkthrough against a RUNNING stack.
 *
 * Logs in tenant admins from two different tenants and black-box-probes paths
 * that must NEVER leak cross-tenant data or return 200 for a foreign tenant.
 * Prints PASS/FAIL per check and exits non-zero on any violation.
 *
 * Usage (after booting compose / the stack):
 *   node security/authz-suite.ts http://localhost:3001
 *
 * Env overrides for credentials:
 *   AUTH_EMAIL_A / AUTH_PASS_A / AUTH_TENANT_A   (tenant A, e.g. solution_energy)
 *   AUTH_EMAIL_B / AUTH_PASS_B / AUTH_TENANT_B   (tenant B)
 *
 * NOTE: this is a black-box parity check, not a standing exploit harness. It
 * confirms countermeasures are present (TenantAccessGuard scoping). Adjust the
 * probe paths / resource ids as the API grows.
 */

const target = (process.argv[2] || "http://localhost:3001").replace(/\/+$/, "");
const E = process.env as Record<string, string | undefined>;

const credsA = {
  email: E.AUTH_EMAIL_A || "saencrystal.global@gmail.com",
  password: E.AUTH_PASS_A || "TestPass2026!Solar",
  tenantId: E.AUTH_TENANT_A || "solution_energy",
};
const credsB = {
  email: E.AUTH_EMAIL_B || "saencrystal@gmail.com",
  password: E.AUTH_PASS_B || "TestPass2026!Crystal",
  tenantId: E.AUTH_TENANT_B || "saencrystal_global_services",
};

type HttpMethod = "GET" | "POST";
interface Probe {
  name: string;
  method: HttpMethod;
  path: string;
  actor: "A" | "B";
}

const probes: Probe[] = [
  // Tenant B vs tenant-A-owned list endpoints: must NOT be 200-forbidden-to-B
  // (the guard returns 4xx when B is not scoped into A's objects).
  { name: "B reads projects (must stay within B)", method: "GET", path: "/api/v1/projects?limit=50", actor: "B" },
  { name: "B reads WBS budgets (must stay within B)", method: "GET", path: "/api/v1/wbs/budgets?limit=50", actor: "B" },
  { name: "B reads live expenses (must stay within B)", method: "GET", path: "/api/v1/wbs/expenses?limit=50", actor: "B" },
  { name: "B lists own users (must stay within B)", method: "GET", path: "/api/v1/auth/users?limit=50", actor: "B" },
  { name: "B reads dashboard (must stay within B)", method: "GET", path: "/api/v1/dashboard", actor: "B" },

  // Cross-resource IDOR probe: a hardened endpoint must reject a foreign
  // object id (404/403) rather than materialize it for B.
  {
    name: "B idor A project by uuid (placeholder, expect 4xx)",
    method: "GET",
    path: "/api/v1/projects/00000000-0000-0000-0000-000000000000",
    actor: "B",
  },

  // Super-admin surface: tenant users must not reach /super/*.
  { name: "B reaches super-admin surface (expect 403)", method: "GET", path: "/api/v1/super/tenants", actor: "B" },
];

async function login(creds: { email: string; password: string; tenantId: string }): Promise<string> {
  const res = await fetch(`${target}/api/v1/auth/login/tenant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  if (res.status !== 200) {
    throw new Error(
      `login failed for ${creds.email} (HTTP ${res.status}) — check credentials / provisioning.`,
    );
  }
  const setCookie = res.headers.get("set-cookie") || "";
  if (!setCookie) throw new Error(`no Set-Cookie from login for ${creds.email}`);
  return setCookie.split(";")[0];
}

async function run(): Promise<void> {
  console.log(`authz-suite target: ${target}\n`);
  const cookieA = await login(credsA);
  const cookieB = await login(credsB);
  const actorCookie: Record<"A" | "B", string> = { A: cookieA, B: cookieB };

  const failures: string[] = [];

  for (const p of probes) {
    try {
      const res = await fetch(`${target}${p.path}`, {
        method: p.method,
        headers: { Cookie: actorCookie[p.actor] },
      });
      // A probe net-200 for a foreign-actor list/read is flagged, unless it is
      // the /super surface (must be 403) or the placeholder IDOR (must be 4xx).
      let pass: boolean;
      if (p.path.startsWith("/api/v1/super/")) {
        pass = res.status === 403;
      } else if (p.path.endsWith("00000000-0000-0000-0000-000000000000")) {
        pass = res.status >= 400;
      } else {
        // Tenant-scoped list endpoints must return data *without* leaking:
        // accept 200 (scoped) but reject if the response mentions the other
        // tenant's schema/name directly.
        const text = await res.text();
        const leak =
          /solution_energy|saencrystal_global_services/i.test(text) &&
          (p.actor === "B"
            ? /solution_energy/i.test(text)
            : /saencrystal_global_services/i.test(text));
        pass = res.status === 200 && !leak;
      }
      console.log(`${pass ? "PASS" : "FAIL"}  [${p.actor}] ${p.method} ${p.path} -> HTTP ${res.status}`);
      if (!pass) failures.push(`${p.actor} ${p.method} ${p.path} -> HTTP ${res.status}`);
    } catch (err: any) {
      console.log(`ERR   [${p.actor}] ${p.method} ${p.path} -> ${err.message}`);
      failures.push(`${p.actor} ${p.method} ${p.path} -> network error ${err.message}`);
    }
  }

  console.log("");
  if (failures.length > 0) {
    console.error(`authz-suite FAILED — ${failures.length} violation(s):`);
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log("authz-suite PASSED — no cross-tenant boundary violations observed.");
}

run().catch((err) => {
  console.error("authz-suite could not run:", err.message);
  process.exit(2);
});