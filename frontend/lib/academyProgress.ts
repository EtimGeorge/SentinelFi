// ─── Academy progress store — local-first, server-authoritative ─────────────
// The learner's journey lives in localStorage (instant, offline-friendly) and
// mirrors to the backend ledger whenever the API is reachable.
//
// Storage layout:
//   sfi.academy.ledger.v2         → ProgressLedger ({ slug: LessonProgress })
//   sfi.academy.visitor.v1        → anonymous visitor id (server identity key)
//   sfi.academy.certificate.v2    → latest issued Certificate
// Migration from the legacy boolean map (lessonProgress.v1) happens once on
// first read so existing visitors keep their completed lessons.

import { trackMarketingEvent } from '../components/Landing/marketingAnalytics';
import {
  fetchAcademyProgress,
  pushAcademyProgress,
} from '../services/academyProgress';
import {
  getCompletedPath,
  getCurriculumStats,
  getPathProgress as getRegistryPathProgress,
  issueCertificate,
} from './curriculum/registry';
import { PERSONA_PATHS } from './curriculum/paths';
import type {
  AcademyLesson,
  Certificate,
  CurriculumStats,
  LessonProgress,
  PathProgress,
  ProgressLedger,
} from './curriculum/types';

const LEDGER_KEY = 'sfi.academy.ledger.v2';
const LEGACY_LEDGER_KEY = 'sfi.academy.lessonProgress.v1';
const VISITOR_KEY = 'sfi.academy.visitor.v1';
const CERT_KEY = 'sfi.academy.certificate.v2';

// ─── Storage ────────────────────────────────────────────────────────────────

function readLedger(): ProgressLedger {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as ProgressLedger;
    }
    // One-time migration of the legacy boolean map into the full ledger.
    const legacyRaw = window.localStorage.getItem(LEGACY_LEDGER_KEY);
    if (legacyRaw) {
      const legacy: Record<string, boolean> = JSON.parse(legacyRaw);
      const migrated: ProgressLedger = {};
      for (const [slug, done] of Object.entries(legacy)) {
        if (done) {
          migrated[slug] = { completed: true, completedAt: new Date().toISOString() };
        }
      }
      if (Object.keys(migrated).length > 0) {
        window.localStorage.setItem(LEDGER_KEY, JSON.stringify(migrated));
      }
      window.localStorage.removeItem(LEGACY_LEDGER_KEY);
      return migrated;
    }
  } catch {
    // Ignore storage failures.
  }
  return {};
}

function persist(ledger: ProgressLedger): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    // Storage full/blocked — completion still tracked via the event bus.
  }
  pushAcademyProgress(ledger, getVisitorId());
}

function getVisitorId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const cookie = window.localStorage.getItem(VISITOR_KEY);
    if (cookie) return cookie;
    const created = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return undefined;
  }
}

async function hydrateFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const remote = await fetchAcademyProgress(getVisitorId());
    if (!remote) return;
    const local = readLedger();
    const merged: ProgressLedger = { ...local };
    for (const [slug, state] of Object.entries(remote.ledger)) {
      const localTs = local[slug]?.completedAt ? Date.parse(local[slug].completedAt) : 0;
      const remoteTs = state?.completedAt ? Date.parse(state.completedAt) : 0;
      if (remoteTs >= localTs) merged[slug] = state;
    }
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(merged));
  } catch {
    // Server unavailable — local ledger already reflects the learner.
  }
}

// ─── Public API (used by Academy surfaces + tour overlays) ──────────────────

/** legacy boolean map — kept for any consumer that predates the full ledger */
export function readLessonProgress(): Record<string, boolean> {
  const ledger = readLedger();
  return Object.fromEntries(Object.entries(ledger).map(([k, v]) => [k, Boolean(v?.completed)]));
}

export function readLessonLedger(): ProgressLedger {
  return readLedger();
}

export function getLessonProgress(slug: string): LessonProgress | undefined {
  return readLedger()[slug];
}

export function isLessonComplete(slug: string): boolean {
  return Boolean(readLedger()[slug]?.completed);
}

export function markChecklistItem(lesson: AcademyLesson, item: string, done: boolean): boolean {
  const ledger = readLedger();
  const prev: LessonProgress = ledger[lesson.slug] ?? { completed: false };
  const checklistDone = new Set(prev.checklistDone ?? []);
  if (done) checklistDone.add(item);
  else checklistDone.delete(item);
  const next: LessonProgress = { ...prev, checklistDone: [...checklistDone] };
  const allChecked = lesson.checklist.every((c) => checklistDone.has(c));
  if (allChecked && !next.completed) {
    next.completed = true;
    next.completedAt = next.completedAt ?? new Date().toISOString();
    trackMarketingEvent('marketing.lesson_complete', { label: lesson.slug });
  }
  ledger[lesson.slug] = next;
  persist(ledger);
  return Boolean(next.completed);
}

export function markQuizResult(lesson: AcademyLesson, passed: boolean): boolean {
  const ledger = readLedger();
  const prev: LessonProgress = ledger[lesson.slug] ?? { completed: false };
  const next: LessonProgress = { ...prev, quizPassed: passed };
  const allChecked = (next.checklistDone ?? []).length === lesson.checklist.length;
  if (allChecked && !next.completed) {
    next.completed = true;
    next.completedAt = next.completedAt ?? new Date().toISOString();
    trackMarketingEvent('marketing.lesson_complete', { label: lesson.slug });
  }
  ledger[lesson.slug] = next;
  persist(ledger);
  return Boolean(next.completed);
}

export function markLessonComplete(slug: string): void {
  const ledger = readLedger();
  const prev: LessonProgress = ledger[slug] ?? { completed: false };
  if (!prev.completed) {
    ledger[slug] = { ...prev, completed: true, completedAt: new Date().toISOString() };
    persist(ledger);
    trackMarketingEvent('marketing.lesson_complete', { label: slug });
  }
}

export function getPathProgress(pathId: string): PathProgress | undefined {
  const path = PERSONA_PATHS.find((p) => p.id === pathId);
  return path ? getRegistryPathProgress(path, readLedger()) : undefined;
}

export function getStats(): CurriculumStats {
  return getCurriculumStats(readLedger());
}

// ─── Certificates ───────────────────────────────────────────────────────────

export function getCertificate(): Certificate | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CERT_KEY);
    return raw ? (JSON.parse(raw) as Certificate) : null;
  } catch {
    return null;
  }
}

export function claimCertificate(): Certificate | null {
  const ledger = readLedger();
  const path = getCompletedPath(ledger);
  if (!path) return null;
  const cert = issueCertificate(path, ledger);
  try {
    window.localStorage.setItem(CERT_KEY, JSON.stringify(cert));
  } catch {
    // Certificate is cosmetic — still returned this session.
  }
  return cert;
}

/** Best-effort mailbox for post-mount server hydration. */
export function syncAcademyProgress(): void {
  void hydrateFromServer();
}