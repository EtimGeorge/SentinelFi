// ─── Legacy facade — Academy lesson catalog ─────────────────────────────────
// New canonical source: lib/curriculum/lessons.ts (via the registry). This
// module exists so existing consumers (training page, LessonVideoModal,
// marketing analytics, demo sandbox) keep working while the system migrates.
// Getter names/signatures are preserved. New consumers should import from
// lib/curriculum/registry directly.

import type { AcademyLesson } from './curriculum/types';
import { getCurriculumLesson, CURRICULUM_LESSONS } from './curriculum/registry';

export type FindableLesson = AcademyLesson;

export const ACADEMY_LESSONS: AcademyLesson[] = CURRICULUM_LESSONS;

export function getLesson(slug: string): FindableLesson | undefined {
  return getCurriculumLesson(slug);
}

export { CURRICULUM_LESSONS as ALL_LESSONS };