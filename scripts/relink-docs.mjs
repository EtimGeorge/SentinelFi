#!/usr/bin/env node
/**
 * relink-docs.mjs
 * Reorganizes docs/ into a professional structure and rewrites every internal
 * markdown link so the whole tree keeps resolving after files move.
 *
 * Layout (repo-relative, forward slashes):
 *   docs/MASTER_DOCUMENTATION.md        portal index (stays)
 *   docs/product/…                      user & tenant facing (served in-app)
 *   docs/technical/…                    development / platform team
 *   docs/internal/…                     security secrets, audits, status (never shipped)
 *   docs/business/…                     commercial, strategy, PRDs
 *
 * Usage:
 *   node scripts/relink-docs.mjs          # rewrite links in place
 *   node scripts/relink-docs.mjs --check  # verify every internal link resolves
 */

import fs from 'fs';
import path from 'path';
import posix from 'path/posix';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');
const SLASH = '/';

const rel = (p) => p.split(path.sep).join(SLASH);
const abs = (r) => path.join(ROOT, ...r.split(SLASH));

// ---------------------------------------------------------------------------
// 1. MOVE MAP  oldRepoRel -> newRepoRel  (forward slashes)
// ---------------------------------------------------------------------------
const MOVE = {};
const mv = (from, to) => { MOVE[from] = to; };

// product/  (user & tenant facing — the only docs served by the /docs page)
for (const f of fs.readdirSync(path.join(ROOT, 'docs', 'user-guides'))) {
  if (f.startsWith('.')) continue;
  mv(`docs/user-guides/${f}`, `docs/product/user-guides/${f}`);
}
mv('docs/PRODUCT_DOCUMENTATION.md', 'docs/product/PRODUCT_DOCUMENTATION.md');
mv('docs/USER_INTERFACE_GUIDE.md', 'docs/product/USER_INTERFACE_GUIDE.md');
mv('docs/USER_PROCESS_GUIDE.md', 'docs/product/USER_PROCESS_GUIDE.md');
mv('docs/financial-management-guide.md', 'docs/product/financial-management-guide.md');
mv('docs/session-and-autosave-guide.md', 'docs/product/session-and-autosave-guide.md');
mv('docs/PAYMENT_FLOW_GUIDE.md', 'docs/product/PAYMENT_FLOW_GUIDE.md');

// technical/  (development & platform team)
for (const f of fs.readdirSync(path.join(ROOT, 'docs'))) {
  if (/^ARCH-\d{3}-/.test(f) && f.endsWith('.md')) {
    mv(`docs/${f}`, `docs/technical/${f}`);
  }
}
mv('docs/DATABASE_OPERATIONS.md', 'docs/technical/DATABASE_OPERATIONS.md');
mv('docs/DEVELOPER_GUIDE.md', 'docs/technical/DEVELOPER_GUIDE.md');
mv('docs/EMAIL_SETUP_GUIDE.md', 'docs/technical/EMAIL_SETUP_GUIDE.md');
mv('docs/ENTERPRISE_DEPLOYMENT.md', 'docs/technical/ENTERPRISE_DEPLOYMENT.md');
mv('docs/OPERATOR_MANUAL.md', 'docs/technical/OPERATOR_MANUAL.md');
mv('docs/PAYMENT_SYSTEM_GUIDE.md', 'docs/technical/PAYMENT_SYSTEM_GUIDE.md');
mv('docs/STRUCTURE_MAP.md', 'docs/technical/STRUCTURE_MAP.md');
mv('docs/UI_UX_REDESIGN_PLAN.md', 'docs/technical/UI_UX_REDESIGN_PLAN.md');
mv('docs/UI_UX_REDESIGN_STATUS.md', 'docs/technical/UI_UX_REDESIGN_STATUS.md');
mv('docs/sentinelfi-ui-design-brief.md', 'docs/technical/sentinelfi-ui-design-brief.md');
mv('docs/features/reporting_and_wbs_engine.md', 'docs/technical/features/reporting_and_wbs_engine.md');
mv('docs/backend/ai-agent.md', 'docs/technical/backend/ai-agent.md');
mv('docs/backend/database_management_guide.md', 'docs/technical/backend/database_management_guide.md');
mv('docs/backend/npm-runs.md', 'docs/technical/backend/npm-runs.md');
mv('docs/backend/production_readiness_implementation.md', 'docs/technical/backend/production_readiness_implementation.md');

// internal/  (secrets, audits, status — never shipped to the app)
mv('docs/backend/sentinelfi_audit_report.md', 'docs/internal/audit/sentinelfi_audit_report.md');
mv('docs/SECRET_KEYS_GUIDE.md', 'docs/internal/SECRET_KEYS_GUIDE.md');
mv('docs/IMPLEMENTATION_GAPS_AND_REMEDIATION_PLAN.md', 'docs/internal/IMPLEMENTATION_GAPS_AND_REMEDIATION_PLAN.md');
mv('docs/IMPLEMENTATION_STATUS.md', 'docs/internal/IMPLEMENTATION_STATUS.md');
mv('docs/CLEANUP_PROPOSAL.md', 'docs/internal/CLEANUP_PROPOSAL.md');

// business/  (commercial & strategy)
mv('docs/FREE_DEPLOYMENT_STRATEGY.md', 'docs/business/FREE_DEPLOYMENT_STRATEGY.md');
mv('docs/INVESTOR_PITCH_GUIDE.md', 'docs/business/INVESTOR_PITCH_GUIDE.md');
mv('docs/prd_multi_tenancy_and_onboarding.md', 'docs/business/prd_multi_tenancy_and_onboarding.md');

// Directory targets referenced as links ("docs/user-guides" -> "...") resolve
// through the same map, but are never executed as file moves.
const DIRS = {
  'docs/user-guides': 'docs/product/user-guides',
  'docs/features': 'docs/technical/features',
  'docs/backend': 'docs/technical/backend',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function splitFragment(target) {
  const i = target.indexOf('#');
  if (i === -1) return [target, ''];
  return [target.slice(0, i), target.slice(i)];
}

function resolveTarget(baseDir, target) {
  const [part, frag] = splitFragment(target);
  if (!part) return null;                       // pure anchor
  if (SCHEME.test(part)) return null;           // external url / mailto / file
  const clean = posix.normalize(part.replace(/\\/g, SLASH));
  if (clean === '.') return null;
  const resolved = posix.normalize(posix.join(baseDir, clean));
  return { resolved, frag };
}

// ---------------------------------------------------------------------------
// 2. Apply moves (git mv if not --check)
// ---------------------------------------------------------------------------
if (!CHECK) {
  for (const [from, to] of Object.entries(MOVE)) {
    const src = abs(from);
    const dst = abs(to);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.renameSync(src, dst);
  }
}

// ---------------------------------------------------------------------------
// 3. Rewrite links / verify
// ---------------------------------------------------------------------------
const newPathOf = (repoRel) => MOVE[repoRel] ?? DIRS[repoRel] ?? repoRel;

function markdownFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
    }
  };
  walk(abs('docs'));
  if (fs.existsSync(abs('README.md'))) out.push(abs('README.md'));
  return out;
}

let changedFiles = 0;
let missing = [];

for (const file of markdownFiles()) {
  const raw = fs.readFileSync(file, 'utf8');
  const fileRel = rel(path.relative(ROOT, file));          // repo-relative forward slash
  const oldDir = posix.dirname(fileRel);
  const newFileRel = newPathOf(fileRel);
  const newDir = posix.dirname(newFileRel);

  const rewrite = (target) => {
    const hit = resolveTarget(oldDir, target);
    if (!hit) return null;
    const newTargetRel = newPathOf(hit.resolved);
    if (!CHECK) {
      const link = posix.relative(newDir, newTargetRel) || '.';
      return `${link}${hit.frag}`;
    }
    const absolute = abs(newTargetRel);
    if (!fs.existsSync(absolute)) {
      missing.push(`${newFileRel} -> ${target}  (resolves to ${newTargetRel})`);
    }
    return null;
  };

  let out = raw.replace(
    /(\[[^\]]*\]\()([^)\s][^)]*)(\))/g,
    (m, pre, target, post) => {
      const r = rewrite(target);
      return r === null ? m : `${pre}${r}${post}`;
    }
  );
  out = out.replace(
    /^\[\s*[^\]]+\]:\s*(.+?)\s*$/gm,
    (m, target) => {
      if (resolveTarget(oldDir, target) === null) return m;
      const hit = resolveTarget(oldDir, target);
      const newTargetRel = newPathOf(hit.resolved);
      if (CHECK) {
        if (!fs.existsSync(abs(newTargetRel))) missing.push(`${newFileRel} :def -> ${target}`);
        return m;
      }
      const link = posix.relative(newDir, newTargetRel) || '.';
      return m.replace(target, `${link}${hit.frag}`);
    }
  );

  if (!CHECK && out !== raw) {
    fs.writeFileSync(file, out, 'utf8');
    changedFiles += 1;
    console.log(`relinked ${fileRel}`);
  }
}

if (CHECK) {
  if (missing.length) {
    console.error(`\n${missing.length} broken link(s):`);
    for (const m of missing) console.error('  ' + m);
    process.exit(1);
  }
  console.log('\nAll internal links resolve.');
} else {
  console.log(`\nMoved ${Object.keys(MOVE).length} docs, relinked ${changedFiles} file(s).`);
}