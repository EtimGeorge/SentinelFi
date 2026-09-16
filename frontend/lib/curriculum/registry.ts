// ─── Curriculum registry — the single resolution layer ───────────────────────
// Aggregates guides, lessons and persona paths into one queryable graph. Any
// feature that learns content (Academy, /docs, tours, Guide Me) should ask
// this module, never reach into the raw arrays.

import { CURRICULUM_GUIDES, getCurriculumGuide, getGuideForPageKey } from './guides';
import { CURRICULUM_LESSONS, getCurriculumLesson } from './lessons';
import { PERSONA_PATHS, getPersonaPath, validatePathReferences } from './paths';
import type {
  AcademyLesson,
  Certificate,
  CurriculumGuide,
  CurriculumStats,
  LessonProgress,
  PathProgress,
  PersonaPath,
  ProgressLedger,
} from './types';

export * from './types';

export {
  CURRICULUM_GUIDES,
  CURRICULUM_LESSONS,
  PERSONA_PATHS,
  getCurriculumGuide,
  getCurriculumLesson,
  getGuideForPageKey,
  getPersonaPath,
};

export const GUIDE_CATEGORIES = [
  ...new Set(CURRICULUM_GUIDES.map((g) => g.category)),
];

/** Every lesson must belong to at least one persona path. */
export function lessonsWithoutPath(): string[] {
  const pathSlugs = new Set(PERSONA_PATHS.flatMap((p) => p.lessonSlugs));
  return CURRICULUM_LESSONS.filter((l) => !pathSlugs.has(l.slug)).map((l) => l.slug);
}

export function getLessonChecklist(lesson: AcademyLesson): string[] {
  return lesson.checklist ?? [];
}

export function getLessonGuide(lesson: AcademyLesson): CurriculumGuide | undefined {
  return lesson.guideSlug ? getCurriculumGuide(lesson.guideSlug) : undefined;
}

/** In-app deep link for a lesson (route + optional tour key). */
export function getLessonDeepLink(lesson: AcademyLesson): { href: string; tourKey?: string } | undefined {
  if (!lesson.pageKey) return undefined;
  const href = lesson.pageKey.startsWith('/') ? lesson.pageKey : `/${lesson.pageKey}`;
  const guide = lesson.pageKey.startsWith('/') ? getGuideForPageKey(href) : undefined;
  return { href, tourKey: guide && guide.slug !== lesson.slug ? `/${guide.slug}` : undefined };
}

// ─── Progress computation ────────────────────────────────────────────────────

export function getPathProgress(path: PersonaPath, ledger: ProgressLedger): PathProgress {
  const total = path.lessonSlugs.length;
  const completed = path.lessonSlugs.filter((s) => ledger[s]?.completed).length;
  return {
    pathId: path.id,
    totalLessons: total,
    completedLessons: completed,
    pct: total === 0 ? 0 : Math.round((completed / total) * 100),
    complete: total > 0 && completed === total,
  };
}

export function getCurriculumStats(ledger: ProgressLedger): CurriculumStats {
  const totalLessons = CURRICULUM_LESSONS.filter((l) =>
    PERSONA_PATHS.some((p) => p.lessonSlugs.includes(l.slug)),
  ).length;
  const lessonsCompleted = CURRICULUM_LESSONS.filter((l) => ledger[l.slug]?.completed).length;
  const paths = PERSONA_PATHS.map((p) => getPathProgress(p, ledger));
  const completedPaths = paths.filter((p) => p.complete).length;
  return {
    lessonsTotal: totalLessons,
    lessonsCompleted,
    paths,
    pct: totalLessons === 0 ? 0 : Math.round((lessonsCompleted / totalLessons) * 100),
    completedPaths,
    totalPaths: paths.length,
  };
}

/** First path the learner fully completed (drives the certificate). */
export function getCompletedPath(ledger: ProgressLedger): PersonaPath | undefined {
  return PERSONA_PATHS.find((p) => getPathProgress(p, ledger).complete);
}

const CERT_SEQ_KEY = 'sfi.academy.certificate.seq.v2';

export function issueCertificate(path: PersonaPath, ledger: ProgressLedger): Certificate {
  const nowIso = new Date().toISOString();
  const pathProgress = getPathProgress(path, ledger);
  const seq = (Number(localStorage.getItem(CERT_SEQ_KEY) || '0') % 9999) + 1000;
  localStorage.setItem(CERT_SEQ_KEY, String(seq));
  const lessonPart = path.lessonSlugs
    .map((s) => s.replace(/[^a-z0-9]/gi, ''))
    .join('-')
    .slice(0, 24);
  const hash = String(pathProgress.pct * 7 + path.lessonSlugs.length * 13 + seq)
    .padStart(8, '0')
    .slice(0, 8);
  return {
    pathId: path.id,
    code: `SF-${path.id.toUpperCase()}-${seq}-${hash}`,
    issuedAt: nowIso,
    lessonSlugs: path.lessonSlugs,
    // carry lessonPart for future server-side re-validation (kept stable)
    ...(lessonPart ? { lessonPart } : {}),
  };
}

export function certificateLeaderboardSlot(ledger: ProgressLedger, certificate: Certificate): number {
  return ledger[certificate.lessonSlugs[0]] ? 1 : 1;
}

// keep validatePathReferences accessible to the integrity tests without a bare require
export const curriculumIntegrity = {
  validatePathReferences,
  lessonsWithoutPath,
};