// ─── SentinelFi Curriculum — shared types ─────────────────────────────────────
// One content model powering every learning surface:
//   • /docs       → reference manual (auth-gated, course of record)
//   • /training   → Academy (public, persona learning paths)
//   • in-app TourOverlay + /tutorial/[page] → guided tours
//   • AI tutor grounding (Guide Me) → contextual coaching
//
// The doc markdown files in repo-root /docs are the prose source of truth.
// This registry is the connective tissue: it maps docs → routes → lessons →
// persona paths, and the integrity tests in __tests__/curriculum.test.ts
// prove the whole graph is complete (no dangling videos / files / pageKeys).

export type Difficulty =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Executive'
  | 'Governance'
  | 'IT Ops';

/** How a lesson is delivered when a learner opens it. */
export type MediaMode = 'video' | 'guided' | 'hybrid';

export interface GuideStep {
  title: string;
  description: string;
}

export interface GuideSection {
  heading: string;
  steps: GuideStep[];
}

export interface QuizItem {
  question: string;
  options: string[];
  /** 0-based index of the correct option. */
  answer: number;
}

/**
 * A reference guide (doc). Mirrors the user-guide markdown files under
 * repo-root `docs/`; `filePath` is relative to that root.
 */
export interface CurriculumGuide {
  slug: string;
  title: string;
  category: string;
  description: string;
  filePath: string;
  /** Real app route the guide documents (deep link). */
  pageKey?: string;
  /** Persona path ids this guide serves (map to persona paths). */
  roles?: string[];
  order: number;
}

/**
 * An Academy lesson. `mode` decides how the modal renders it:
 *   video  → plays `videoUrl`
 *   guided → interactive checklist + quiz + deep links (no recording needed)
 *   hybrid → video when available, always falls back to guided content
 */
export interface AcademyLesson {
  slug: string;
  title: string;
  difficulty: Difficulty;
  duration: string;
  desc: string;
  mode: MediaMode;
  videoUrl?: string;
  videoType?: 'self-hosted' | 'embed';
  poster?: string;
  /** Links to the reference guide in /docs (the "read more" source). */
  guideSlug?: string;
  /** In-app route + tour key for the live product. */
  pageKey?: string;
  checklist: string[];
  quiz?: QuizItem[];
  /** Persona path ids this lesson belongs to. */
  pathIds: string[];
}

export interface PersonaPath {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Difficulty/metadata tag shown on Academy cards. */
  tag: string;
  lessonSlugs: string[];
}

// ─── Progress shapes ──────────────────────────────────────────────────────────

export interface LessonProgress {
  completed: boolean;
  completedAt?: string;
  /** Text of checklist items ticked so far (partial progress). */
  checklistDone?: string[];
  quizPassed?: boolean;
  lastWatchedAt?: string;
}

export type ProgressLedger = Record<string, LessonProgress>;

export interface PathProgress {
  pathId: string;
  completedLessons: number;
  totalLessons: number;
  pct: number;
  complete: boolean;
}

export interface CurriculumStats {
  lessonsCompleted: number;
  lessonsTotal: number;
  paths: PathProgress[];
  pct: number;
  completedPaths: number;
  totalPaths: number;
}

export interface Certificate {
  pathId: string;
  code: string;
  issuedAt: string;
  lessonSlugs: string[];
}