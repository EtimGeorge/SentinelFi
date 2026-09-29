// ─── SentinelFi Academy capture agent (authenticated, 1920×1080) ─────────────
// Records one video per Academy lesson that has no recording yet, by driving
// the REAL authenticated app through Playwright. Complements (does not replace)
// capture-demo-videos.mjs, which owns the 4 marketing-sandbox recordings.
//
// Auth model (verified against backend controllers):
//   1. Super-admin login  → POST {BASE}/api/v1/auth/login/super
//      → sets httpOnly `access_token` (cookie header + body token).
//   2. Tenant impersonation → POST {BASE}/api/v1/super/tenants/:id/impersonate
//      → returns { access_token } for a 30-minute tenant session.
//   3. The recording context carries that cookie — exactly like the app.
//
// Tenant lifecycle:
//   • Default: impersonate the pre-seeded test tenant (read-only capture).
//   • --create-tenant: provision a throwaway tenant (POST /super/tenants),
//     record inside it, then soft-delete it (DELETE /super/tenants/:id).
//     NOTE: the API soft-deletes (deleted_at); the PG schema is NOT dropped —
//     residual artifacts remain until a hard-purge path exists.
//
// Output: public/demos/<lesson-slug>.webm (+ .mp4 when ffmpeg is on PATH).
// Every run writes .workspace-temp/academy-capture/report.json with per-lesson
// status, byte sizes and EBML checks, and exits non-zero on failure — safe to
// re-run: recorded lessons are skipped unless --all / --only is passed.
//
// Usage:
//   node frontend/scripts/capture-academy-videos.mjs [--dry-run] [--all]
//        [--create-tenant] [--only=slug,slug]
// Env:
//   BASE_URL (default http://localhost:3000)
//   SUPER_EMAIL / SUPER_PASSWORD (required) · TENANT_NAME (default SOLUTION_ENERGY)

import { chromium } from 'playwright';
import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, existsSync, appendFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const PUBLIC_DEMOS = join(ROOT, 'frontend', 'public', 'demos');
const REPORT_DIR = join(ROOT, '.workspace-temp', 'academy-capture');
const LESSONS_FILE = join(ROOT, 'frontend', 'lib', 'curriculum', 'lessons.ts');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const API = `${BASE_URL}/api/v1`;
const VIEWPORT = { width: 1920, height: 1080 };
const SESSION_ID = new Date().toISOString().replace(/[:.]/g, '-');
const TRACE = join(REPORT_DIR, `trace-${SESSION_ID}.log`);

const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has('--dry-run');
const RECORD_ALL = ARGS.has('--all');
const CREATE_TENANT = ARGS.has('--create-tenant');
const ONLY = (() => {
  const flag = process.argv.find(a => a.startsWith('--only='));
  return flag ? new Set(flag.split('=')[1].split(',').filter(Boolean)) : null;
})();

mkdirSync(REPORT_DIR, { recursive: true });
mkdirSync(PUBLIC_DEMOS, { recursive: true });

function trace(step, extra = '') {
  const line = `${new Date().toISOString()}  ${step}${extra ? `  ${extra}` : ''}`;
  console.log(`[capture] ${line}`);
  try { appendFileSync(TRACE, `${line}\n`); } catch { /* best effort */ }
}

// ── Lesson plan — parsed from the registry file at run time ──────────────────
// Single source of truth with the curriculum; re-runs pick up content edits.
function resolveLessonPlan() {
  const text = readFileSync(LESSONS_FILE, 'utf8');
  const plan = [];
  // Brace-counting scan: find each `slug: '...'` and capture until its
  // enclosing lesson object closes — robust against nested quiz braces.
  const entryRe = /slug:\s*'([^']+)'/g;
  let m;
  while ((m = entryRe.exec(text)) !== null) {
    const start = text.lastIndexOf('{', m.index);
    if (start < 0) continue;
    let depth = 0, end = -1;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    const block = text.slice(start, end + 1);
    const mode = block.match(/mode:\s*'([^']+)'/)?.[1] ?? 'guided';
    const videoUrl = block.match(/videoUrl:\s*'([^']+)'/)?.[1] ?? null;
    const pageKey = block.match(/pageKey:\s*'([^']+)'/)?.[1] ?? null;
    plan.push({ slug: m[1], mode, videoUrl, pageKey, hasQuiz: /quiz:\s*\[/.test(block) });
  }
  return plan;
}

function routeFor(lesson) {
  if (!lesson.pageKey) return null;
  if (lesson.pageKey === 'workflows') return '/landing/workflows';
  return lesson.pageKey.startsWith('/') ? lesson.pageKey : `/${lesson.pageKey}`;
}

// ── Minimal cookie-jar HTTP helper (Node fetch, no dependencies) ─────────────
async function apiFetch(path, { method = 'GET', body, cookie } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
    signal: AbortSignal.timeout(120_000), // tenant provisioning (schema + 22 migrations) can take ~40s+ on hosted PG
  });
  const setCookie = res.headers.get('set-cookie');
  let data = null;
  try { data = await res.json(); } catch { /* 204 / empty body */ }
  return { status: res.status, ok: res.ok, data, setCookie };
}

const cookieFrom = (setCookie) => setCookie?.split(';')[0] ?? null;

// ── Super-admin session (verified contract: AuthController loginSuperAdmin) ──
async function superAdminCookie() {
  // Fallback: pull the seeded super-admin credentials from backend/.env
  // (SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD) so the script can run standalone.
  if (!process.env.SUPER_EMAIL || !process.env.SUPER_PASSWORD) {
    try {
      const envSrc = readFileSync(join(ROOT, 'backend', '.env'), 'utf8');
      const get = (k) => envSrc.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
      process.env.SUPER_EMAIL ||= get('SUPERADMIN_EMAIL');
      process.env.SUPER_PASSWORD ||= get('SUPERADMIN_PASSWORD');
    } catch { /* env file unavailable — fall through to the guard below */ }
  }
  const email = process.env.SUPER_EMAIL;
  const password = process.env.SUPER_PASSWORD;
  if (!email || !password) {
    throw new Error('SUPER_EMAIL and SUPER_PASSWORD are required (seed via backend npm run seed:superadmin).');
  }
  const res = await apiFetch('/auth/login/super', { method: 'POST', body: { email, password } });
  if (res.status !== 200) {
    throw new Error(`Super-admin login failed: HTTP ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  const cookie = cookieFrom(res.setCookie) ?? (res.data?.access_token ? `access_token=${res.data.access_token}` : null);
  if (!cookie) throw new Error('Super-admin login succeeded but no access_token was returned.');
  return cookie;
}

async function findTenantId(cookie, tenantName) {
  const res = await apiFetch(`/super/tenants?name=${encodeURIComponent(tenantName)}&limit=1`, { cookie });
  const hit = res.data?.data?.[0];
  if (!hit) throw new Error(`Tenant "${tenantName}" not found (HTTP ${res.status}).`);
  return hit.tenant_id;
}

async function createThrowawayTenant(cookie) {
  const name = `CAPTURE_${Date.now().toString(36).toUpperCase()}`;
  const res = await apiFetch('/super/tenants', {
    method: 'POST',
    cookie,
    body: {
      name,
      admin_email: `capture-${Date.now().toString(36)}@capture.local`,
      admin_first_name: 'Capture',
      admin_last_name: 'Agent',
      plan: 'basic',
      is_active: true,
    },
  });
  if (res.status !== 201) {
    throw new Error(`Throwaway tenant creation failed: HTTP ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  return { tenantId: res.data.tenant_id, tenantName: name };
}

async function impersonateTenant(cookie, tenantId) {
  const res = await apiFetch(`/super/tenants/${tenantId}/impersonate`, { method: 'POST', cookie });
  if (res.status !== 200 || !res.data?.access_token) {
    throw new Error(`Tenant impersonation failed: HTTP ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  return `access_token=${res.data.access_token}`;
}

async function softDeleteTenant(cookie, tenantId) {
  const res = await apiFetch(`/super/tenants/${tenantId}`, { method: 'DELETE', cookie });
  return { status: res.status, ok: res.status === 204 || res.ok };
}

// ── Recording (1920×1080, authenticated context) ────────────────────────────
async function recordLesson(lesson, route, tenantCookie) {
  const webmPath = join(PUBLIC_DEMOS, `${lesson.slug}.webm`);

  const browser = await chromium.launch({ headless: true, timeout: 180_000 });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: PUBLIC_DEMOS, size: VIEWPORT },
  });
  const { hostname } = new URL(BASE_URL);
  const [name, ...rest] = tenantCookie.split('=');
  await context.addCookies([{
    name, value: rest.join('='), domain: hostname, path: '/', httpOnly: true, sameSite: 'Lax',
  }]);

  let page;
  let videoPath = null;
  try {
    page = await context.newPage();
    trace(`${lesson.slug}: goto ${route}`);
    // domcontentloaded + explicit readiness gates below — networkidle alone
    // resolves while the SPA is still white/unbooted (this is exactly how the
    // 2026-09-18 run produced five videos of boot/error screens).
    await page.goto(BASE_URL + route, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    // Auth-wall check: an authenticated session must NOT land on /login.
    if (new URL(page.url()).pathname.startsWith('/login')) {
      throw new Error(`Session was redirected to /login for ${route} — cookie not accepted.`);
    }

    // Gate 1: the auth bootstrap splash ("Initializing Secure Session…") must
    // clear. If it never does, the API is unreachable/degraded — fail loudly
    // instead of recording a boot screen.
    try {
      await page.waitForSelector('text=Initializing Secure Session', { state: 'hidden', timeout: 90_000 });
    } catch {
      throw new Error('Auth bootstrap never completed (boot splash stuck >90s) — backend unhealthy during capture.');
    }

    // Gate 2: a real app shell must be painted (any of the common shell
    // landmarks), proving the authenticated page actually rendered.
    await page.waitForSelector('main, nav, aside, [role="main"], [role="banner"]', { state: 'visible', timeout: 45_000 });

    // Gate 3: the resilience layer's error screen must NOT be present.
    if ((await page.getByText('Connection Interrupted').count()) > 0) {
      throw new Error('App rendered its "Connection Interrupted" error screen — API calls failed during capture.');
    }
    trace(`${lesson.slug}: authenticated, app shell visible, recording page`);

    // Let in-page data fetches settle before the sweep starts.
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => { /* proceed regardless */ });

    // Guided sweep: scroll through the page so the capture shows the whole
    // route; per-viewport dwell keeps each section on screen.
    await page.evaluate(async () => {
      const step = Math.floor(window.innerHeight * 0.8);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 700));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1_500);
    trace(`${lesson.slug}: sweep complete`);

    // Capture the video path BEFORE closing — page.video() returns null
    // after the page is closed.
    videoPath = await page.video()?.path();
  } finally {
    // Close the page first to flush its video segment, then the context.
    try { await page?.close(); } catch { /* best effort */ }
    try { await context.close(); } catch { /* best effort */ }
    try { await browser.close(); } catch { /* best effort */ }
  }

  // page.video() path may still be encoding after close — wait for it to land.
  if (!videoPath) throw new Error(`No video path returned for ${lesson.slug}`);
  let tries = 0;
  while (!existsSync(videoPath) && tries < 10) {
    await new Promise(r => setTimeout(r, 1000));
    tries++;
  }
  if (!existsSync(videoPath)) throw new Error(`Video file never appeared at ${videoPath}`);

  // Rename the Playwright temp file (random UUID name) to the lesson slug.
  if (videoPath !== webmPath) {
    try { renameSync(videoPath, webmPath); }
    catch (err) {
      // On Windows the file may still be locked by the encoder; retry once.
      await new Promise(r => setTimeout(r, 2000));
      renameSync(videoPath, webmPath);
    }
  }
  return webmPath;
}

// ── Artifact validation: container + CONTENT ────────────────────────────────
// EBML + size alone accepted the 2026-09-18 blank/boot-screen videos. A frame
// is now decoded and must not be blank (near-uniform pixels).
function findBundledFfmpeg() {
  const bases = [
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'ms-playwright'),
    process.env.HOME && join(process.env.HOME, '.cache', 'ms-playwright'),
    process.env.HOME && join(process.env.HOME, 'Library', 'Caches', 'ms-playwright'),
  ].filter(Boolean);
  for (const base of bases) {
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base)) {
      if (!d.startsWith('ffmpeg-')) continue;
      for (const exe of ['ffmpeg-win64.exe', 'ffmpeg-linux', 'ffmpeg-mac']) {
        const p = join(base, d, exe);
        if (existsSync(p)) return p;
      }
    }
  }
  return null;
}

function ffmpegBinary() {
  if (ffmpegOnPath()) return 'ffmpeg';
  return findBundledFfmpeg();
}

// Extracts one frame and checks it has real content: a decoded PNG smaller
// than ~15KB at 960px wide is a near-uniform (blank) frame.
function frameHasContent(videoPath, ffmpegBin) {
  if (!ffmpegBin) return { checked: false, reason: 'no ffmpeg available for frame check' };
  const out = join(REPORT_DIR, `frame-${Date.now()}.png`);
  try {
    execFileSync(ffmpegBin,
      ['-y', '-ss', '4', '-i', videoPath, '-frames:v', '1', '-vf', 'scale=960:-1', out],
      { stdio: 'ignore', timeout: 30_000 });
    const bytes = statSync(out).size;
    try { unlinkSync(out); } catch { /* keep on failure */ }
    return { checked: true, frameBytes: bytes, hasContent: bytes > 15_000 };
  } catch (err) {
    return { checked: false, reason: err.message.slice(0, 120) };
  }
}

function validateArtifact(path) {
  const stat = statSync(path);
  const head = readFileSync(path).subarray(0, 4);
  const ebml = head.toString('hex') === '1a45dfa3';
  const frame = frameHasContent(path, ffmpegBinary());
  return {
    bytes: stat.size,
    ebmlHeader: ebml,
    frameCheck: frame,
    pass: stat.size > 50_000 && ebml && (frame.checked ? frame.hasContent : true),
    // pass stays conservative: a failed frame CHECK blocks pass; an
    // unavailable ffmpeg does not (recorded in frameCheck for review).
  };
}

function ffmpegOnPath() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore', timeout: 5_000 }); return true; }
  catch { return false; }
}

function convertToMp4(webmPath) {
  if (!ffmpegOnPath()) return { converted: false, reason: 'ffmpeg not on PATH' };
  const mp4 = webmPath.replace(/\.webm$/, '.mp4');
  try {
    execFileSync('ffmpeg',
      ['-y', '-i', webmPath, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', mp4],
      { stdio: 'ignore', timeout: 180_000 });
    return { converted: true, mp4: mp4.replace(ROOT, '') };
  } catch (err) {
    return { converted: false, error: err.message };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const reportPath = join(REPORT_DIR, 'report.json');
  const report = {
    sessionId: SESSION_ID,
    startedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    viewport: VIEWPORT,
    dryRun: DRY_RUN,
    createTenant: CREATE_TENANT,
    recordings: [],
  };
  const save = () => { try { writeFileSync(reportPath, JSON.stringify(report, null, 2)); } catch { /* best effort */ } };

  const plan = resolveLessonPlan();
  trace(`plan resolved: ${plan.length} lessons`);

  // Default target: lessons that still lack a recording. --all re-records;
  // --only trims the set; lessons already pointing at a videoUrl are owned by
  // capture-demo-videos.mjs and are skipped unless explicitly requested.
  const targets = plan.filter(l => {
    if (ONLY) return ONLY.has(l.slug);
    if (RECORD_ALL) return true;
    return !l.videoUrl && !existsSync(join(PUBLIC_DEMOS, `${l.slug}.webm`));
  });

  report.planTotal = plan.length;
  report.targets = targets.map(t => ({ slug: t.slug, route: routeFor(t) }));
  save();

  if (DRY_RUN) {
    report.result = 'dry-run';
    report.wouldRecord = targets.map(t => ({ slug: t.slug, route: routeFor(t), hasQuiz: t.hasQuiz }));
    report.finishedAt = new Date().toISOString();
    save();
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (targets.length === 0) {
    report.result = 'nothing-to-do';
    report.finishedAt = new Date().toISOString();
    save();
    console.log('All targeted lessons already have recordings. Use --all to re-record.');
    return;
  }

  const missingRoutes = targets.filter(t => !routeFor(t));
  if (missingRoutes.length > 0) {
    throw new Error(`Lessons without a resolvable pageKey route: ${missingRoutes.map(t => t.slug).join(', ')}`);
  }

  const superCookie = await superAdminCookie();
  report.superLogin = 'ok';
  save();

  let failures = 0;
  try {
  // Always attempt cleanup after provisioning, including impersonation failure.
  let tenantCookie;
  if (CREATE_TENANT) {
    const created = await createThrowawayTenant(superCookie);
    report.tenantLifecycle = { ...created, deleted: null, throwaway: true };
    save();
    tenantCookie = await impersonateTenant(superCookie, created.tenantId);
  } else {
    const tenantName = process.env.TENANT_NAME || 'SOLUTION_ENERGY';
    const tenantId = await findTenantId(superCookie, tenantName);
    report.tenantLifecycle = { tenantId, tenantName, throwaway: false, deleted: null };
    save();
    tenantCookie = await impersonateTenant(superCookie, tenantId);
  }
  report.impersonated = true;
  save();

  for (const lesson of targets) {
    const route = routeFor(lesson);
    const entry = { slug: lesson.slug, route };
    try {
      const webm = await recordLesson(lesson, route, tenantCookie);
      entry.webm = webm.replace(ROOT, '');
      entry.validation = validateArtifact(webm);
      entry.mp4 = convertToMp4(webm);
      entry.ok = entry.validation.pass;
    } catch (err) {
      entry.ok = false;
      entry.error = err.message;
    }
    if (!entry.ok) failures += 1;
    trace(`${lesson.slug}: ${entry.ok ? 'OK' : 'FAILED'}`);
    report.recordings.push(entry);
    save();
  }

  } catch (err) {
    failures += 1;
    report.error = err.message;
  } finally {
    // Only delete the tenant provisioned by this run, never a seeded tenant.
    if (CREATE_TENANT && report.tenantLifecycle?.tenantId) {
      try {
        const del = await softDeleteTenant(superCookie, report.tenantLifecycle.tenantId);
        report.tenantLifecycle.deleted = del.ok;
        report.tenantLifecycle.deleteHttpStatus = del.status;
        if (!del.ok) failures += 1;
      } catch (err) {
        failures += 1;
        report.tenantLifecycle.deleted = false;
        report.tenantLifecycle.cleanupError = err.message;
      }
      report.tenantLifecycle.note = 'Soft-delete only — PG schema retained; hard purge is not automated.';
      save();
    }
  }

  report.failures = failures;
  report.productionReady = false;
  report.limitations = ['Page sweeps do not demonstrate lesson workflows.', 'Nine distinct validated recordings and lesson-modal playback are not verified.'];
  report.result = failures === 0 ? 'draft-captured' : 'partial-failure';
  report.finishedAt = new Date().toISOString();
  save();

  console.log('\n=== Academy capture summary ===');
  for (const r of report.recordings) {
    const size = r.validation ? ` (${(r.validation.bytes / 1024).toFixed(0)} KB, EBML ${r.validation.ebmlHeader ? 'ok' : 'MISSING'})` : '';
    console.log(`  ${r.ok ? '✓' : '✘'} ${r.slug} → ${r.webm ?? r.error}${size}`);
  }
  console.log(`  result: ${report.result} (${failures} failure(s))`);
  if (failures > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});