// ─── Academy progress — quiz-gated completion ────────────────────────────────
// Regression gate for the completion rules in lib/academyProgress.ts:
//   • a lesson WITH a quiz must never complete from the checklist alone
//   • a FAILED quiz must never complete a lesson
//   • completion requires every checklist item (membership, not count parity —
//     the old length === length check could be satisfied by wrong items)
//   • quiz-less lessons still complete on the checklist alone

import {
  markChecklistItem,
  markQuizResult,
  isLessonComplete,
  readLessonLedger,
} from '../lib/academyProgress';
import type { AcademyLesson } from '../lib/curriculum/types';

// Keep the unit hermetic: no network calls, no marketing events.
jest.mock('../services/academyProgress', () => ({
  fetchAcademyProgress: jest.fn(async () => null),
  pushAcademyProgress: jest.fn(async () => undefined),
}));
jest.mock('../components/Landing/marketingAnalytics', () => ({
  trackMarketingEvent: jest.fn(),
}));

const quizLesson = (over: Partial<AcademyLesson> = {}): AcademyLesson => ({
  slug: 'lesson-with-quiz',
  title: 'Lesson With Quiz',
  difficulty: 'Beginner',
  duration: '1m',
  desc: 'A lesson fixture whose completion requires the quiz to be passed.',
  mode: 'hybrid',
  checklist: ['Watch the overview', 'Try the workflow', 'Check the audit trail'],
  quiz: [{ question: 'What gates completion?', options: ['Nothing', 'The quiz'], answer: 1 }],
  pathIds: ['tenant-admin'],
  ...over,
});

const noQuizLesson = quizLesson({
  slug: 'lesson-no-quiz',
  title: 'Lesson Without Quiz',
  quiz: undefined,
});

describe('quiz-gated lesson completion', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('does NOT complete a quiz lesson when only the checklist is done', () => {
    const lesson = quizLesson();
    for (const item of lesson.checklist) markChecklistItem(lesson, item, true);
    expect(isLessonComplete('lesson-with-quiz')).toBe(false);
    expect(readLessonLedger()['lesson-with-quiz']?.quizPassed).toBeUndefined();
  });

  it('does NOT complete a quiz lesson on a failed quiz, even with a full checklist', () => {
    const lesson = quizLesson();
    for (const item of lesson.checklist) markChecklistItem(lesson, item, true);
    expect(markQuizResult(lesson, false)).toBe(false);
    expect(isLessonComplete('lesson-with-quiz')).toBe(false);
  });

  it('completes only when every checklist item (by content) is done AND the quiz passed', () => {
    const lesson = quizLesson();
    for (const item of lesson.checklist) markChecklistItem(lesson, item, true);
    expect(isLessonComplete('lesson-with-quiz')).toBe(false); // quiz still pending
    expect(markQuizResult(lesson, true)).toBe(true);
    expect(isLessonComplete('lesson-with-quiz')).toBe(true);
    expect(readLessonLedger()['lesson-with-quiz']?.quizPassed).toBe(true);
  });

  it('cannot be tricked by a wrong checklist of the right length', () => {
    const lesson = quizLesson();
    // Tick the right number of items but the WRONG ones (same length, different content)
    markChecklistItem(lesson, 'Watch the overview', true);
    markChecklistItem(lesson, 'a fabricated item', true);
    markChecklistItem(lesson, 'another wrong item', true);
    expect(markQuizResult(lesson, true)).toBe(false);
    expect(isLessonComplete('lesson-with-quiz')).toBe(false);
  });

  it('still completes a quiz-less lesson on the checklist alone', () => {
    const lesson = noQuizLesson;
    for (const item of lesson.checklist) markChecklistItem(lesson, item, true);
    expect(isLessonComplete('lesson-no-quiz')).toBe(true);
  });

  it('unchecking an item de-checks completion state for quiz lessons', () => {
    const lesson = quizLesson();
    for (const item of lesson.checklist) markChecklistItem(lesson, item, true);
    markQuizResult(lesson, true);
    expect(isLessonComplete('lesson-with-quiz')).toBe(true);
    // Unchecking does not retroactively revoke completion (recorded completion
    // stays), but the checklist ledger must reflect the unchecked item.
    markChecklistItem(lesson, lesson.checklist[0], false);
    expect(readLessonLedger()['lesson-with-quiz']?.checklistDone).not.toContain(lesson.checklist[0]);
  });
});
