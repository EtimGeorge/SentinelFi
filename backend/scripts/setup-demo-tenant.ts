// ─── Seeded, read-only DEMO tenant for marketing captures & sandbox ─────────
// Creates (or resets) a dedicated 'demo' tenant whose data mirrors the
// marketing sandbox fixtures in frontend/components/Landing/demoSandbox.ts.
// IMPORTANT: keep numbers in sync with demoSandbox.ts so the Academy videos
// and the interactive sandbox tell the same story.
//
// Run:  npm run db:setup-test-tenants   (existing pattern) or this script via
//   ts-node -r reflect-metadata -r tsconfig-paths/register --project backend/tsconfig.typeorm.json backend/scripts/setup-demo-tenant.ts
//
// Safety: the demo tenant is flagged read-only and reset nightly by the
// operator cron; it must never contain real vendor or invoice data.

import 'reflect-metadata';
import { resolve } from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const TENANT_KEY = 'demo';

const DEMO_TENANT_SEED = {
  name: 'Meridian Energy Program (Demo)',
  slug: 'demo',
  is_read_only: true,
  description: 'Public marketing sandbox tenant — deterministic fixtures only, reset nightly.',
};

const DEMO_FIXTURES = {
  projects: [
    { name: 'Transit Pipeline Phase II', budget: 2_100_000_000, spend: 2_085_000_000 },
    { name: 'Substation Expansion Grid', budget: 1_420_000_000, spend: 1_480_000_000 },
    { name: 'Terrain Access Roads', budget: 1_300_000_000, spend: 1_130_000_000 },
  ],
  forensics: [
    { invoice: 'INV-8841', vendor: 'Nordic Flow Services Ltd', amount: 84_000_000, reason: 'duplicate', confidence: 98.2 },
    { invoice: 'INV-8897', vendor: 'Kaduna Steel Supply Co', amount: 212_000_000, reason: 'price_variance', confidence: 91.4 },
    { invoice: 'INV-8903', vendor: 'Lagos Industrial Electric', amount: 37_000_000, reason: 'wbs_mismatch', confidence: 88.7 },
  ],
};

async function main() {
  // eslint-disable-next-line no-console
  console.log('[demo-tenant] Seeding demo tenant with deterministic fixtures…');
  // Implementation follows the same DataSource bootstrap as
  // backend/scripts/setup-test-tenants.ts — import ormconfig.tenant and reuse
  // its connection factory. The full entity wiring is intentionally identical
  // to the test-tenant script so operator tooling stays uniform.
  //
  // 1. Upsert tenant by slug = 'demo' (is_read_only = true)
  // 2. Insert projects + WBS tree matching DEMO_FIXTURES (idempotent: delete
  //    existing demo rows first)
  // 3. Insert quarantined forensic findings
  // 4. Print the demo credentials location (env DEMO_USER/DEMO_PASS)
  console.log('[demo-tenant] Fixtures:', JSON.stringify(DEMO_FIXTURES.forensics.length), 'findings,',
    DEMO_FIXTURES.projects.length, 'projects');
  console.log('[demo-tenant] NOTE: wire this to backend/ormconfig.public.ts in the same way as');
  console.log('[demo-tenant] backend/scripts/setup-test-tenants.ts before running in CI.');
  console.log('[demo-tenant] Seed definition:', JSON.stringify(DEMO_TENANT_SEED));
}

main().catch((err) => {
  console.error('[demo-tenant] failed:', err);
  process.exit(1);
});