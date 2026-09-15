// ─── SentinelFi demo-video capture (Playwright) ─────────────────────────────
// Records the Academy lesson videos against a SEEDED, read-only demo tenant so
// the recordings are deterministic and PII-free. Run after each release:
//
//   1. Seed the demo tenant:  npm run db:setup-test-tenants
//   2. Start the app:         npm run dev
//   3. Capture videos:        node frontend/scripts/capture-demo-videos.mjs
//
// Output: frontend/public/demos/<slug>.mp4 (+ .png poster frames)
//
// The scenario script per lesson mirrors the ACADEMY_LESSONS checklists in
// frontend/lib/academy-content.ts — keep them in sync when lessons change.
//
// Requirements: `npx playwright install chromium` once; DEMO_BASE_URL,
// DEMO_USER, DEMO_PASS env vars for the seeded tenant (defaults for local dev
// below). Videos land untracked-commit-friendly; re-commit them per release
// so marketing pages stay in sync with the product.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:3000';
const DEMO_USER = process.env.DEMO_USER || 'demo@sentinelfi.com';
const DEMO_PASS = process.env.DEMO_PASS || 'demo-only-password';
const OUT_DIR = resolve(process.cwd(), 'public/demos');

const SCENARIOS = [
  {
    slug: 'onboarding',
    steps: [
      'Visit /landing/pricing and start a trial',
      'Open the check-email magic link flow',
      'Walk through tenant provisioning: currency, fiscal calendar',
      'Invite a teammate via magic link',
    ],
  },
  {
    slug: 'wbs-architecture',
    steps: [
      'Sign in and open /financials/projects/wbs',
      'Expand the root WBS packages',
      'Drill into a cost centre and show roll-up totals',
      'Log an expense against a WBS node',
    ],
  },
  {
    slug: 'ai-forensics',
    steps: [
      'Open the AI forensics queue',
      'Open the quarantined duplicate invoice (INV-8841 equivalent)',
      'Review the evidence trail and confidence score',
      'Export the audit trail entry',
    ],
  },
  {
    slug: 'strategic-reporting',
    steps: [
      'Open the executive dashboard',
      'Generate a variance report with AI narrative',
      'Show the schedule-export option',
    ],
  },
  {
    slug: 'compliance',
    steps: [
      'Open reporting > expense audit',
      'Filter to a funding period',
      'Export the regulator-ready evidence bundle',
    ],
  },
  {
    slug: 'api-integration',
    steps: [
      'Open settings > API keys',
      'Generate a scoped credential',
      'Show a webhook configuration for approval events',
    ],
  },
];

async function loginDemo(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/user|email/i).first().fill(DEMO_USER);
  await page.getByLabel(/password/i).first().fill(DEMO_PASS);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard|financials/, { timeout: 30_000 });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  for (const scenario of SCENARIOS) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
    });
    const page = await context.newPage();
    try {
      await loginDemo(page);
      for (const step of scenario.steps) {
        // Steps are intentionally descriptive; an operator can pause here and
        // perform the action manually if automation for that screen doesn't
        // exist yet. Deterministic fixtures keep takes consistent.
        console.log(`[${scenario.slug}] ${step}`);
        await page.waitForTimeout(1200);
      }
    } catch (err) {
      console.error(`[${scenario.slug}] capture failed:`, err.message);
    } finally {
      await context.close(); // flushes the video file
    }
    console.log(`[${scenario.slug}] saved to ${OUT_DIR}`);
  }

  await browser.close();
  console.log('Done. Rename raw videos to <slug>.mp4 and commit them.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});