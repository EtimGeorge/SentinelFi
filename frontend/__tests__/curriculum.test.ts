// ─── Curriculum integrity — the content gate ─────────────────────────────────
// Proves the whole learning graph is wired to REAL assets before it ships:
//   • every doc row points at an existing markdown file  (repo docs/)
//   • every video/hybrid lesson points at an existing media file on disk
//     (no more dead .mp4 URLs — the exact regression that broke the Academy)
//   • every guided lesson resolves to a guide/pageKey, not just a URL string
//   • every persona path references real lessons and every lesson is reachable
//   • quiz answers are in range; slugs are unique across the graph; docs and
//     academy catalogs are identical to the registry (single source of truth)

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ACADEMY_LESSONS, getLesson } from '../lib/academy-content';
import { DOCS, DOC_CATEGORIES } from '../lib/userDocs';
import { TUTORIAL_CONTENT, getAllTutorialKeys } from '../lib/tutorial-content';
import {
  CURRICULUM_GUIDES,
  CURRICULUM_LESSONS,
  PERSONA_PATHS,
  curriculumIntegrity,
  getCurriculumGuide,
  getCurriculumLesson,
  getPersonaPath,
  GUIDE_CATEGORIES,
} from '../lib/curriculum/registry';

const repoRoot = join(process.cwd(), '..');
const docsRoot = join(repoRoot, 'docs');
const publicRoot = join(repoRoot, 'frontend', 'public');

const docFileExists = (filePath: string): boolean => {
  // Legacy paths were resolved from frontend cwd as `../docs/<filePath>`.
  const candidate = filePath.startsWith('docs') ? join(repoRoot, filePath) : join(docsRoot, filePath);
  return existsSync(candidate);
};

const mediaFileExists = (videoUrl: string): boolean => {
  if (/^https?:\/\//.test(videoUrl)) return true;
  const clean = videoUrl.replace(/^\//, '');
  return existsSync(join(publicRoot, clean));
};

describe('curriculum guides (docs registry)', () => {
  it('documents exactly the files that exist on disk', () => {
    expect(CURRICULUM_GUIDES.length).toBeGreaterThanOrEqual(18);
    for (const guide of CURRICULUM_GUIDES) {
      expect(docFileExists(guide.filePath)).toBe(true);
    }
  });

  it('has unique slugs, titles and file paths', () => {
    const slugs = CURRICULUM_GUIDES.map((g) => g.slug);
    const titles = CURRICULUM_GUIDES.map((g) => g.title);
    const paths = CURRICULUM_GUIDES.map((g) => g.filePath);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('exposes every pageKey as a valid / prefixed route (or none)', () => {
    for (const guide of CURRICULUM_GUIDES) {
      if (!guide.pageKey) continue;
      expect(guide.pageKey.startsWith('/')).toBe(true);
      expect(guide.category.length).toBeGreaterThan(0);
      expect(guide.description.length).toBeGreaterThan(10);
    }
  });

  it('keeps DOC_CATEGORIES in sync with the guide categories', () => {
    const categories = Array.from(new Set(CURRICULUM_GUIDES.map((g) => g.category)));
    expect(DOC_CATEGORIES).toEqual(categories);
    expect(GUIDE_CATEGORIES).toEqual(categories);
  });

  it('resolves every guide via the registry', () => {
    for (const guide of CURRICULUM_GUIDES) {
      expect(getCurriculumGuide(guide.slug)).toBe(guide);
    }
    expect(getCurriculumGuide('does-not-exist')).toBeUndefined();
  });
});

describe('academy lessons (media + content integrity)', () => {
  it('keeps the legacy facade identical to the curriculum registry', () => {
    expect(ACADEMY_LESSONS).toBe(CURRICULUM_LESSONS);
    expect(getLesson('demo-sandbox-ceo')).toBe(getCurriculumLesson('demo-sandbox-ceo'));
  });

  it('has unique slugs, titles and non-empty checklists', () => {
    const slugs = ACADEMY_LESSONS.map((l) => l.slug);
    const titles = ACADEMY_LESSONS.map((l) => l.title);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(titles).size).toBe(titles.length);
    for (const lesson of ACADEMY_LESSONS) {
      expect(lesson.checklist.length).toBeGreaterThan(0);
      expect(lesson.desc.length).toBeGreaterThan(20);
      expect(getLesson(lesson.slug)).toBe(lesson);
    }
  });

  it('points every video lesson at a file that actually exists', () => {
    const videoLessons = ACADEMY_LESSONS.filter((l) => l.videoUrl);
    expect(videoLessons.length).toBeGreaterThanOrEqual(3);
    for (const lesson of videoLessons) {
      expect(['video', 'hybrid']).toContain(lesson.mode);
      expect(mediaFileExists(lesson.videoUrl as string)).toBe(true);
    }
  });

  it('gives guided lessons real content, not dead URLs', () => {
    for (const lesson of ACADEMY_LESSONS.filter((l) => !l.videoUrl || l.mode === 'guided')) {
      expect(lesson.mode).toBe('guided');
      // Every guided lesson has an in-app deep link or a reference manual.
      if (!lesson.pageKey) expect(lesson.guideSlug).toBeDefined();
      if (lesson.guideSlug) expect(getCurriculumGuide(lesson.guideSlug)).toBeDefined();
    }
  });

  it('keeps quiz answers in range and options non-trivial', () => {
    for (const lesson of ACADEMY_LESSONS) {
      if (!lesson.quiz) continue;
      expect(lesson.quiz.length).toBeGreaterThan(0);
      for (const q of lesson.quiz) {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.length).toBeGreaterThan(q.answer);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.question.length).toBeGreaterThan(10);
      }
    }
  });

  it('returns undefined for unknown slugs', () => {
    expect(getLesson('nope')).toBeUndefined();
    expect(getCurriculumLesson('nope')).toBeUndefined();
  });
});

describe('persona learning paths', () => {
  it('references only real lessons and keeps paths non-repeating', () => {
    expect(curriculumIntegrity.validatePathReferences()).toEqual([]);
    expect(curriculumIntegrity.lessonsWithoutPath()).toEqual([]);
    for (const path of PERSONA_PATHS) {
      expect(path.lessonSlugs.length).toBeGreaterThan(0);
      expect(new Set(path.lessonSlugs).size).toBe(path.lessonSlugs.length);
      expect(getPersonaPath(path.id)).toBe(path);
    }
  });

  it('covers the documented roles with meaningful paths', () => {
    const ids = PERSONA_PATHS.map((p) => p.id);
    for (const expected of ['tenant-admin', 'executive', 'finance-ops', 'project-manager', 'auditor', 'it-ops']) {
      expect(ids).toContain(expected);
    }
  });
});

describe('tutorial content references real registry guides', () => {
  it('exposes tour keys that map to a real tutorial pageKey', () => {
    const keys = getAllTutorialKeys();
    expect(keys.length).toBeGreaterThanOrEqual(3);
    for (const key of keys) {
      const tutorial = TUTORIAL_CONTENT[key];
      expect(tutorial).toBeDefined();
      expect(tutorial.pageKey).toBe(key);
      expect(tutorial.title.length).toBeGreaterThan(0);
      expect(Array.isArray(tutorial.sections)).toBe(true);
    }
  });
});

describe('docs facade parity', () => {
  it('exposes the same guides as the registry', () => {
    expect(DOCS.length).toBe(CURRICULUM_GUIDES.length);
    for (const doc of DOCS) {
      const guide = getCurriculumGuide(doc.slug);
      expect(guide).toBeDefined();
      expect(doc.title).toBe(guide?.title);
      expect(doc.filePath).toBe(guide?.filePath);
    }
  });
});