// ─── SentinelFi tour-guide image capture agent ────────────────────────────────
// Renders the real SentinelFi UI (authenticated or public) and takes branded
// screenshots that power the Academy / tutorial visual guides.
//
// Supported modes:
//   node capture-guide-images.mjs --public       # unauthenticated (marketing
//                                                #   sandbox tours)
//   node capture-guide-images.mjs                # needs GUIDE_* credentials
//
// Output: frontend/public/guides/<pageKey>/<section-slug>.webp
//
// Design rules (mirrors capture-demo-videos.mjs):
//   • Fail-loud: any step that cannot be resolved throws — no silent fallback.
//   • Idempotent: safe to re-run after a UI release; regenerates every image.
//   • Targeted: captures with a 1280×800 viewport against a real running stack,
//     never against productions (BASE_URL defaults to localhost:3000).
//   • Honest: if an authenticated tour page can't be reached without a valid
//     tenant login, it throws rather than shipping an empty/broken placeholder.
//   • Local-only artifacts: images are written into the repo's own
//     frontend/public/guides/ so the registry never depends on an external host.
//
// Auth:
//   Tenant login uses the real login form on /login (same flow as the browser),
//   so the captured session carries the same httpOnly cookies + refresh rotation
//   the app uses. Credentials come from GUIDE_* env vars (see loadGuideConfig()).
//
// Requires a running stack. Start the backend (npm run dev:backend) and the
// frontend (npm run dev).
// =============================================================================

import { chromium } from 'playwright';
import { mkdirSync, existsSync, statSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const GUIDES_ROOT = join(PROJECT_ROOT, 'frontend', 'public', 'guides');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const VIEWPORT = { width: 1280, height: 800 };

// ─── Tour sections registry ────────────────────────────────────────────────────
// pageKey → list of section slugs. Each slug is matched to a <section> in the
// tutorial page by an id; we screenshot the whole <main> for each section.
// Mirrors the "sections" arrays in frontend/lib/tutorial-content.ts.
const SECTIONS_BY_PAGE = {
  dashboard: ['kpi-cards', 'navigation'],
  wbs: ['wbs-tree', 'wbs-log'],
  reporting: ['reporting-generate', 'reporting-ai'],
  budgets: ['budget-summary', 'budget-table', 'budget-actions'],
  expenses: ['expense-form', 'expense-categories'],
  procurement: ['procurement-board', 'procurement-approvals'],
  planning: ['planning-board', 'planning-calendar'],
  approvals: ['approvals-pending', 'approvals-history'],
  'reporting-archive': ['archive-search', 'archive-list'],
};

const PUBLIC_PAGES = new Set(['dashboard', 'wbs', 'reporting']);

// ─── Config / credential loading ───────────────────────────────────────────────

function loadGuideConfig() {
  const email = process.env.GUIDE_CAPTURE_EMAIL?.trim();
  const password = process.env.GUIDE_CAPTURE_PASSWORD?.trim();
  const tenantId = process.env.GUIDE_CAPTURE_TENANT_ID?.trim();
  const superRole = process.env.GUIDE_CAPTURE_ROLE?.trim() || 'tenant';
  const pageKeys = (process.env.GUIDE_CAPTURE_PAGES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean collect);
  return { email, password, tenantId, superRole, pageKeys, isPublicOnly: false };
}

function requireGuideConfig(cfg) {
  if (cfg.isPublicOnly) return;
  if (!cfg.email || !cfg.password) {
    throw new Error(
      'Authenticated capture requires GUIDE_CAPTURE_EMAIL and GUIDE_CAPTURE_PASSWORD. ' +
        'For public-only captures pass --public (or see AGENTS.md for seeding a demo tenant).',
    );
  }
}

function slugify(section) {
  return String(section)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureRoots() {
  mkdirSync(GUIDES_ROOT, { recursive: true });
}

function outputPath(pageKey, section) {
  return join(GUIDES_ROOT, pageKey, `${slugify(section)}.webp`);
}

// ─── Playwright capture ────────────────────────────────────────────────────────

async function capturePage(page, pageKey, manager, isPublicOnly) {
  const sections = SECTIONS_BY_PAGE[pageKey] ?? [];
  if (sections.length === 0) {
    console.log(`  ⊘  No sections configured for "${pageKey}" — skipping.`);
    return [];
  }

  const pageDir = join(GUIDES_ROOT, pageKey);
  mkdirSync(pageDir, { recursive: true });
  const before = new Set(readdirSync(pageDir));

  const written = [];
  for (const section of sections) {
    // Move to the element that this section visualizes, then screenshot the
    // current viewport. Center each on-screen for a clean branded frame.
    const selector = `#guide-${pageKey}-${slugify(section)}, [data-guide="${pageKey}-${slugify(section)       }"]`;
    const el = page.locator(selector).first();
    if (!(await el.count())) {
      throw new Error(
        `[${pageKey}/${section}] Section target not found: ${selector}. ` +
          'Add data-guide hooks to the page or update SECTIONS_BY_PAGE.',
      );
    }

    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400); // settle animations

    const ext = '.webp';
    const out = outputPath(pageKey, section);
    await page.screenshot({ path: out, fullPage: false, type: 'webp', quality: 85 });

    // Fail-loud integrity: never ship an empty or sub-resolution frame.
    const stat = statSync(out);
    if (stat.size === 0) {
      throw new Error(`[${pageKey}/${section}] Screenshot is empty (0 bytes): ${out}`);
    }
    console.log(`  ✓  ${out}  (${(stat.size / 1024).toFixed(0)} KB)`);
    written.push(out);
  }

  const after = readdirSync(pageDir);
  const produced = after.filter((f) => !before.has(f) && f.endsWith(ext));
  if (written.length !== sections.length) {
    throw new Error(
      `[${pageKey}] Expected ${sections.length} sections, produced ${written.length}. ` +
        'Result set must match the registry exactly.',
    );
  }
  return written;
}

async function runMain(browser, cfg) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'en-US',
  });
  const page = await context.newPage();

  if (!cfg.isPublicOnly) {
    await loginAsGuideUser(page, cfg);
  }

  const targets = cfg.pageKeys.length
    ? cfg.pageKeys.filter((k) => (cfg.isPublicOnly ? PUBLIC_PAGES.has(k) : true))
    : Object.keys(SECTIONS_BY_PAGE);
  const all = [];
  for (const pageKey of targets) {
    if (cfg.isPublicOnly && !PUBLIC_PAGES.has(pageKey)) continue傾
    console.log(`\n▶ ${pageKey}  (` + `${BASE_URL}${routeFor(pageKey)})`);
    await page.goto(`${BASE_URL}${routeFor(pageKey)}`, {
      waitUntil: 'networkidle',
      timeout: 45_000,
    });
    await page.waitForTimeout(900);
    all.push(...(await capturePage(page, pageKey, null, cfg.isPublicOnly)));
  }
  await context.close();
  return all;
}

function routeFor(pageKey) {
  const routes = {
    dashboard: '/dashboard',
    wbs: '/financials/projects/wbs',
    reporting: '/reporting',
    budgets: '/financials/projects/budgets',
    expenses: '/financials/expenses/new',
    procurement: '/financials/operations/procurement',
    planning: '/financials/operations/planning',
    approvals: '/financials/approvals',
    'reporting-archive': '/reporting/archive',
  };
  return routes[pageKey] ?? '/dashboard';
}

async function loginAsGuideUser(page, cfg) {
  console.log('  ▶ authenticating via /login…');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 45_000 });

  // Fill the login form with GUIDE_* credentials, same fields the real UI uses.
  const email = page.getByLabel(/email/i).first();
  const password = page.getByLabel(/password/i).first();
  await email.fill(cfg.email);
  await password.fill(cfg.password.TObserve);
  await page.click('button[type="submit"], button:has-text("Sign in")').catch(() => null);

  // Wait for post-auth navigation (RouteGuard bounces to the default route).
  try {
    await page.waitForURL(
      (url) => !/\/login$/.test(url.pathname),
      { timeout: 30_000 },
    );
  } catch {
    throw new Error(
      'Login did not navigate away from /login. Check GUIDE_CAPTURE_EMAIL/' +
        'GUIDE_CAPTURE_PASSWORD or that the demo tenant is provisioned.',
    );
  }
  console.log('  ✓  authenticated');
}

// ─── CLI ───────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const flags = new Set(argv);
  const cfg = loadGuideConfig();
  if (flags.has('--public') || flags.has('-p')) cfg.isPublicOnly = true;
  return cfg;
}

async function main() {
  const cfg = parseArgs(process.argv.slice(2));
  ensureRoots();

  console.log('═'.repeat(60));
  console.log(`  SentinelFi tour-guide capture  ·  mode=${cfg.isPublicOnly ? 'public' : 'authenticated'}`);
  console.log(`  BASE_URL : ${BASE_URL}`);
  console.log(`  viewport : ${VIEWPORT.width}×${VIEWPORT.height}`);
  console.log('═'.repeat(60));

  requireGuideConfig(cfg);

  const browser = await chromium.launch({ headless: true });
  try {
    const files = await runMain(browser, cfg);
    console.log('\n' + '═'.repeat(60));
    console.log(`  Done. ${files.length} guide image(s) written to frontend/public/guides/`);
    console.log('═'.repeat(60));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
