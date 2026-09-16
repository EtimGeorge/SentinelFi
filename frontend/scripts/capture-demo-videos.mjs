// ─── SentinelFi DemoSandbox video capture (Playwright) ──────────────────────
// Records the interactive marketing sandbox on /landing/workflows for each
// role (CEO / PM / AUDIT) plus a combined walkthrough, all without
// authentication. Output: public/demos/<slug>.webm (+ .mp4 if ffmpeg available).
//
// These videos feed the ACADEMY_LESSONS array in frontend/lib/academy-content.ts
// and can also be embedded on marketing pages.
//
// Prerequisites:
//   1. Dev server running: npm run dev:frontend   (serves on localhost:3000)
//   2. Playwright browsers: npx playwright install chromium
//
// Usage:
//   node frontend/scripts/capture-demo-videos.mjs
//
// Outputs (WebM — Playwright native video API):
//   public/demos/demo-sandbox-ceo.webm
//   public/demos/demo-sandbox-pm.webm
//   public/demos/demo-sandbox-audit.webm
//   public/demos/demo-sandbox-walkthrough.webm   (all 3 roles in sequence)
//
// Optional MP4 conversion (Safari needs MP4; Chrome/Firefox/Edge play WebM):
//   If ffmpeg is on PATH, .mp4 variants are created automatically.
//   Otherwise the script prints the exact ffmpeg command to run.
//
// Timing:
//   Sandbox auto-advances every 3200 ms. After clicking "Auto-play tour" we
//   wait for the "Scenario complete." banner. Per-role ~12-14s; walkthrough ~45s.
//
// UI coupling:
//   Selectors target the DemoSandbox component. If the UI changes this script
//   will throw — that is intentional. Re-run and verify before committing.
//
// Regenerate after every UI release that touches /landing/workflows or the
// DemoSandbox component.

import { chromium } from 'playwright';
import { mkdirSync, existsSync, statSync, readdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const PUBLIC_DEMOS = join(PROJECT_ROOT, 'frontend', 'public', 'demos');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const VIEWPORT = { width: 1280, height: 720 };

const ROLES = [
  { key: 'CEO',    label: 'Executive (CEO)',     slug: 'demo-sandbox-ceo' },
  { key: 'PM',     label: 'Project Manager',     slug: 'demo-sandbox-pm' },
  { key: 'AUDIT',  label: 'Auditor',            slug: 'demo-sandbox-audit' },
];

function ensureDemosDir() {
  mkdirSync(PUBLIC_DEMOS, { recursive: true });
  return PUBLIC_DEMOS;
}

async function waitForScenarioComplete(page, timeoutMs = 20_000) {
  await page.waitForSelector('text=Scenario complete.', {
    state: 'visible',
    timeout: timeoutMs,
  });
}

async function startAutoPlay(page) {
  await page.click('button:has-text("Auto-play tour")');
  await page.waitForTimeout(600);
}

async function switchRole(page, roleKey) {
  const role = ROLES.find((r) => r.key === roleKey);
  if (!role) throw new Error(`Unknown role: ${roleKey}`);
  await page.click(`button:has-text("${role.label}")`);
  await page.waitForSelector('text=Guided scenario · 1/3', {
    state: 'visible',
    timeout: 5_000,
  });
}

async function ffmpegAvailable() {
  try {
    const { execSync } = require('node:child_process');
    execSync('ffmpeg -version', { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function convertWebmToMp4(webmPath) {
  if (!ffmpegAvailable()) {
    console.log(
      `  ⊘  ffmpeg not found — skipping MP4 for ${webmPath}\n` +
        `     Run manually:\n` +
        `       ffmpeg -i "${webmPath}" -c:v libx264 -preset medium -crf 23 ` +
        `"${webmPath.replace('.webm', '.mp4')}"`,
    );
    return null;
  }
  const mp4Path = webmPath.replace(/\.webm$/, '.mp4');
  const { execSync } = require('node:child_process');
  try {
    execSync(
      `ffmpeg -y -i "${webmPath}" -c:v libx264 -preset medium -crf 23 ` +
        `-c:a aac -b:a 128k "${mp4Path}"`,
      { stdio: 'inherit', timeout: 120_000 },
    );
    console.log(`  ✓  Converted  ${mp4Path}`);
    return mp4Path;
  } catch (err) {
    console.error(`  ✘  ffmpeg failed:`, err.message);
    return null;
  }
}

async function recordRoleVideo(
  browser,
  role,
  demosDir,
) {
  const webmPath = join(demosDir, `${role.slug}.webm`);
  console.log(`\n▶ ${role.key}  →  ${role.slug}.webm`);

  // Track existing files to find the new one after recording.
  const beforeFiles = new Set(readdirSync(demosDir));

  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: {
      dir: demosDir,
      size: VIEWPORT,
    },
  });

  const page = await context.newPage();

  try {
    await page.goto(BASE_URL + '/landing/workflows', {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    await page.waitForSelector('text=Guided scenario', {
      state: 'visible',
      timeout: 10_000,
    });

    if (role.key !== 'CEO') {
      await switchRole(page, role.key);
    }

    await startAutoPlay(page);
    await waitForScenarioComplete(page);
  } finally {
    await context.close();
  }

  // Find the newly created video file (Playwright uses hashed names).
  const afterFiles = readdirSync(demosDir);
  const newFile = afterFiles.find((f) => !beforeFiles.has(f) && f.endsWith('.webm'));
  if (!newFile) {
    throw new Error(
      `No new .webm file found in ${demosDir} after recording ${role.key}`,
    );
  }

  const tempPath = join(demosDir, newFile);
  if (tempPath !== webmPath) {
    renameSync(tempPath, webmPath);
  }

  console.log(`  ✓  ${webmPath}  (${(statSync(webmPath).size / 1024).toFixed(0)} KB)`);
  convertWebmToMp4(webmPath);
  return webmPath;
}

async function recordWalkthroughVideo(browser, demosDir) {
  console.log('\n▶ Walkthrough  →  demo-sandbox-walkthrough.webm');
  const walkWebm = join(demosDir, 'demo-sandbox-walkthrough.webm');

  // Track existing files to find the new one after recording.
  const beforeFiles = new Set(readdirSync(demosDir));

  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: {
      dir: demosDir,
      size: VIEWPORT,
    },
  });

  const page = await context.newPage();

  try {
    await page.goto(BASE_URL + '/landing/workflows', {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    await page.waitForSelector('text=Guided scenario', {
      state: 'visible',
      timeout: 10_000,
    });

    await startAutoPlay(page);
    await waitForScenarioComplete(page);

    await switchRole(page, 'PM');
    await page.waitForTimeout(800);
    await startAutoPlay(page);
    await waitForScenarioComplete(page);

    await switchRole(page, 'AUDIT');
    await page.waitForTimeout(800);
    await startAutoPlay(page);
    await waitForScenarioComplete(page);
  } finally {
    await context.close();
  }

  // Find the newly created video file (Playwright uses hashed names).
  const afterFiles = readdirSync(demosDir);
  const newFile = afterFiles.find((f) => !beforeFiles.has(f) && f.endsWith('.webm'));
  if (!newFile) {
    throw new Error(
      `No new .webm file found in ${demosDir} after recording walkthrough`,
    );
  }

  const tempPath = join(demosDir, newFile);
  if (tempPath !== walkWebm) {
    renameSync(tempPath, walkWebm);
  }

  console.log(`  ✓  ${walkWebm}  (${(statSync(walkWebm).size / 1024).toFixed(0)} KB)`);
  convertWebmToMp4(walkWebm);
  return walkWebm;
}

async function main() {
  console.log('═'.repeat(56));
  console.log('  SentinelFi · DemoSandbox Video Capture');
  console.log('  URL     :', BASE_URL + '/landing/workflows');
  console.log('  Viewport:', `${VIEWPORT.width}×${VIEWPORT.height}  (16:9)`);
  console.log('═'.repeat(56));

  const demosDir = ensureDemosDir();

  const browser = await chromium.launch({ headless: true });
  try {
    // ── Per-role recordings ────────────────────────────────────────────────
    for (const role of ROLES) {
      await recordRoleVideo(browser, role, demosDir);
    }

    // ── Combined walkthrough ───────────────────────────────────────────────
    await recordWalkthroughVideo(browser, demosDir);

    // ── summary ────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(56));
    console.log('  Done.  Output:');
    const produced = [
      ...ROLES.map((r) => join(demosDir, `${r.slug}.webm`)),
      join(demosDir, 'demo-sandbox-walkthrough.webm'),
    ];
    const seen = new Set();
    for (const base of produced) {
      for (const ext of ['.webm', '.mp4']) {
        const f = base.replace(/\.webm$/, ext);
        if (!seen.has(f) && existsSync(f)) {
          seen.add(f);
          const kb = (statSync(f).size / 1024).toFixed(0);
          console.log(
            `  ${f.replace(PROJECT_ROOT, '').replace(/^\//, '')}  (${kb} KB)`,
          );
        }
      }
    }
    console.log('═'.repeat(56));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});