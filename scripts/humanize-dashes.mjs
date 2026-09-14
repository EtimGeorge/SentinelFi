#!/usr/bin/env node
/**
 * humanize-dashes.mjs
 * Removes AI-style em/en dashes (U+2014, U+2013, U+2015) from human-facing
 * copy across the repo and replaces them with natural punctuation:
 *
 *   - "word — word" (both sides lowercase, prose)  ->  "word, word"
 *   - "Label — rest" or " — " elsewhere            ->  "Label - rest"
 *   - any remaining unspaced dash run ("'—'", "a—b") -> "-"
 *
 * Usage:
 *   node scripts/humanize-dashes.mjs              # scan defaults (docs/ + frontend src)
 *   node scripts/humanize-dashes.mjs --list       # dry-run: list files + counts only
 *
 * Default scope: every .md/.ts/.tsx/.js under docs/ and frontend/ (excluding
 * node_modules/, .next/, dist/, .env files, and in-progress WIP source files).
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

const DEFAULT_ROOTS = ['docs', 'frontend'];
const EXTENSIONS = new Set(['.md', '.ts', '.tsx', '.js']);
const EXCLUDE_DIRS = new Set(['node_modules', '.next', 'dist', 'build', '.git', 'src-graph', 'graphify-out']);
const EXCLUDE_FILES = new Set([
  // In-progress user work: skip so the pass never pollutes uncommitted WIP.
  'frontend\\components\\hooks\\useDashboardMetrics.ts',
  'frontend\\pages\\admin\\index.tsx',
  'frontend\\pages\\clients\\[id].tsx',
  'frontend\\pages\\dashboard\\ceo.tsx',
  'frontend\\pages\\dashboard\\home.tsx',
  'frontend\\pages\\super\\billing.tsx',
]);
const EXCLUDE_NAME_PATTERNS = [/^\.env/, /^package-lock\.json$/, /^pnpm-lock\.yaml$/, /^yarn\.lock$/];

const DASH = /[\u2014\u2013\u2015]+/g;

function humanize(text) {
  // 1. Prose: "word — word" (both sides lowercase letters) -> ", "
  let out = text.replace(
    /(?<=[a-z]) [\u2014\u2013\u2015]+ (?=[a-z])/gu,
    ', '
  );
  // 2. Labels / headers: "Label — Rest" -> " - "
  out = out.replace(/ [\u2014\u2013\u2015]+ /gu, ' - ');
  // 3. Any remaining (unspaced) dash runs -> "-" ("'—'" placeholders, "a—b")
  out = out.replace(DASH, '-');
  return out;
}

function cleanArtifacts(text) {
  return text
    .replace(/ \u002C /g, ', ')          // ", " (space before comma) from rule 1
    .replace(/  -{1,3}  /g, ' - ')       // double spaces left by rule 2
    .replace(/,\s{2,}(?=[A-Za-z0-9$])/g, ', '); // ",  word" prose artifacts (leave trailing-comma lists alone)
}

function collectFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(ROOT, full).split(path.sep).join('\\');
      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile()) {
        if (!EXTENSIONS.has(path.extname(entry.name))) continue;
        if (EXCLUDE_NAME_PATTERNS.some((re) => re.test(entry.name))) continue;
        if (EXCLUDE_FILES.has(rel)) continue;
        out.push(full);
      }
    }
  };
  for (const root of DEFAULT_ROOTS) {
    const p = path.join(ROOT, root);
    if (fs.existsSync(p)) walk(p);
  }
  return out;
}

const dryRun = process.argv.includes('--list');

let total = 0;
let changed = 0;
for (const file of collectFiles()) {
  const raw = fs.readFileSync(file, 'utf8');
  const before = (raw.match(DASH) || []).length;
  total += before;
  const fixed = cleanArtifacts(humanize(raw));
  const after = (fixed.match(DASH) || []).length;
  if (!dryRun && fixed !== raw) {
    fs.writeFileSync(file, fixed, 'utf8');
  }
  if (fixed !== raw) {
    changed += 1;
    console.log(`${String(before).padStart(3)} -> ${String(after).padStart(3)}  ${path.relative(ROOT, file)}`);
  }
}

console.log(`\n${dryRun ? 'WOULD FIX' : 'FIXED'} ${changed} file(s), ${total} dash(es) total.`);