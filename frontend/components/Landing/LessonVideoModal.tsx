// Academy lesson modal — renders ANY lesson from the curriculum registry.
//
//   mode 'video'  → plays the self-hosted WebM/MP4 (real file on disk)
//   mode 'guide'  → interactive checklist + scored quiz + deep links
//   mode 'hybrid' → video first; if the file is missing/errors, the lesson
//                   degrades gracefully into the guided experience instead of
//                   showing a dead player (the old extension-swap fallback was
//                   removed because it only produced guaranteed-404 requests).
//
// Tracking: lesson_open on mount, lesson_complete when a lesson is finished,
// both via the marketing event bus. Progress lives in lib/academyProgress.ts
// (local-first, mirrors to the server ledger).

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X, BookOpen, ExternalLink, AlertCircle, RefreshCw, PlayCircle, GraduationCap, FileText } from 'lucide-react';
import type { AcademyLesson } from '../../lib/curriculum/types';
import { trackMarketingEvent } from './marketingAnalytics';
import {
  getLessonProgress,
  isLessonComplete,
  markChecklistItem,
  markLessonComplete,
  markQuizResult,
  readLessonProgress,
} from '../../lib/academyProgress';

type Deferred<T> = { kind: 'video' };

const isSandboxLesson = (lesson: AcademyLesson): boolean => lesson.pageKey === 'workflows';

function deepLinkFor(lesson: AcademyLesson): { href: string; label: string; openInNewTab?: boolean } | null {
  if (isSandboxLesson(lesson)) {
    return { href: '/landing/workflows', label: 'Try it in the live sandbox' };
  }
  if (lesson.pageKey) {
    const href = lesson.pageKey.startsWith('/') ? lesson.pageKey : `/${lesson.pageKey}`;
    return { href, label: 'Open the feature in your workspace' };
  }
  return null;
}

export { readLessonProgress };
export default function LessonVideoModal({ lesson, onClose }: { lesson: AcademyLesson; onClose: () => void }) {
  const progress = getLessonProgress(lesson.slug);
  const [checked, setChecked] = useState<number[]>(() => {
    const done = progress?.checklistDone ?? [];
    return lesson.checklist.map((item, i) => (done.includes(item) ? i : -1)).filter((i) => i >= 0);
  });
  const [videoActive, setVideoActive] = useState<boolean>(Boolean(lesson.videoUrl) && lesson.mode !== 'guided');
  const [videoError, setVideoError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [completed, setCompleted] = useState<boolean>(isLessonComplete(lesson.slug));
  const [answers, setAnswers] = useState<(number | null)[]>(lesson.quiz ? lesson.quiz.map(() => null) : []);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(progress?.quizPassed ?? null);

  // Close on Escape; lock scroll while open.
  useEffect(() => {
    trackMarketingEvent('marketing.lesson_open', { label: lesson.slug });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lesson.slug, onClose]);

  // Reset state when the modal re-opens with a different lesson.
  useEffect(() => {
    const fresh = getLessonProgress(lesson.slug);
    setChecked(lesson.checklist.map((item, i) => (fresh?.checklistDone?.includes(item) ? i : -1)).filter((i) => i >= 0));
    setVideoActive(Boolean(lesson.videoUrl) && lesson.mode !== 'guided');
    setVideoError(null);
    setLoading(Boolean(lesson.videoUrl));
    setCompleted(isLessonComplete(lesson.slug));
    setAnswers(lesson.quiz ? lesson.quiz.map(() => null) : []);
    setQuizPassed(fresh?.quizPassed ?? null);
  }, [lesson.slug, lesson.videoUrl, lesson.mode, lesson.checklist, lesson.quiz]);

  const handleVideoError = () => {
    if (loading) setLoading(false);
    setVideoActive(false);
    setVideoError(
      lesson.videoUrl?.endsWith('.mp4')
        ? 'The recording is unavailable. Continue with the interactive lesson instead.'
        : 'This recording needs a codec your browser has not loaded. Continue with the interactive lesson instead.',
    );
  };

  const handleRetry = () => {
    setVideoError(null);
    setLoading(true);
    setVideoActive(true);
  };

  const onComplete = () => {
    if (completed) return;
    markLessonComplete(lesson.slug);
    setCompleted(true);
  };

  const toggleItem = (i: number) => {
    setChecked((prev) => {
      const wasChecked = prev.includes(i);
      const next = wasChecked ? prev.filter((x) => x !== i) : [...prev, i];
      const finished = markChecklistItem(lesson, lesson.checklist[i], !wasChecked) || next.length === lesson.checklist.length;
      if (finished) setCompleted(true);
      return next;
    });
  };

  const submitQuiz = () => {
    if (!lesson.quiz || answers.some((a) => a === null)) return;
    const correct = lesson.quiz.filter((q, i) => q.answer === answers[i]).length;
    const passed = correct === lesson.quiz.length;
    const finished = markQuizResult(lesson, passed) || lesson.checklist.every((_, i) => checked.includes(i));
    setQuizPassed(passed);
    if (finished) setCompleted(true);
  };

  const deepLink = deepLinkFor(lesson);
  const showGuideLink = Boolean(lesson.guideSlug) && lesson.guideSlug !== lesson.slug;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${lesson.title} lesson`}>
      <button type="button" aria-label="Close lesson" onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-brand-dark elev-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-brand-dark px-5 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <BookOpen className="h-4 w-4 text-m-secondary" />
            <span className="truncate">{lesson.title}</span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs uppercase text-slate-400">{lesson.difficulty}</span>
            <span className={`rounded px-2 py-0.5 text-xs uppercase ${lesson.mode === 'video' ? 'bg-brand-primary/15 text-brand-primary' : 'bg-m-accent/15 text-m-accent'}`}>
              {lesson.mode === 'video' ? 'Video' : 'Interactive'}
            </span>
          </p>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="relative aspect-video bg-black md:col-span-2">
            {videoActive ? (
              <>
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-400">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-m-accent" />
                      Loading video…
                    </div>
                  </div>
                )}
                {videoError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                    <p className="max-w-sm text-sm text-slate-300">{videoError}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-primary/90"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Retry video
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoActive(false)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
                      >
                        <PlayCircle className="h-3.5 w-3.5" /> Continue guided
                      </button>
                    </div>
                  </div>
                ) : (
                  <video
                    key={lesson.slug}
                    className="h-full w-full"
                    controls
                    playsInline
                    preload="auto"
                    onCanPlay={() => setLoading(false)}
                    onError={handleVideoError}
                    onEnded={onComplete}
                    aria-label={lesson.title}
                  >
                    <source src={lesson.videoUrl} type={lesson.videoUrl?.endsWith('.mp4') ? 'video/mp4' : 'video/webm'} />
                    Your browser does not support the video tag.
                  </video>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col justify-center gap-4 p-6 md:p-8">
                <p className="max-w-prose text-sm leading-relaxed text-slate-300">{lesson.desc}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-m-accent/10 px-3 py-1.5 text-xs font-bold text-m-accent">
                    <GraduationCap className="h-3.5 w-3.5" /> Checklist-driven lesson
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300">
                    <FileText className="h-3.5 w-3.5" /> Reference manual on your right
                  </span>
                  {deepLink && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary/10 px-3 py-1.5 text-xs font-bold text-brand-primary">
                      <PlayCircle className="h-3.5 w-3.5" /> Hands-on tasks in the app
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col border-t border-white/10 p-5 md:border-l md:border-t-0">
            <p className="mb-3 text-xs font-bold uppercase text-slate-400">Follow along</p>
            <ul className="space-y-2">
              {lesson.checklist.map((item, i) => (
                <li key={`${lesson.slug}-${item}`}>
                  <button
                    type="button"
                    onClick={() => toggleItem(i)}
                    className={`flex w-full items-start gap-2 rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      checked.includes(i) ? 'border-m-accent/40 bg-m-accent/10 text-slate-200' : 'border-white/10 text-slate-400 hover:text-white'
                    }`}
                    aria-pressed={checked.includes(i)}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked.includes(i) ? 'border-m-accent bg-m-accent text-white' : 'border-white/30'}`}>
                      {checked.includes(i) ? <Check className="h-3 w-3" aria-hidden /> : null}
                    </span>
                    {item}
                  </button>
                </li>
              ))}
            </ul>

            {lesson.quiz && lesson.quiz.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                <p className="text-xs font-bold uppercase text-slate-400">Check your understanding</p>
                {lesson.quiz.map((q, qi) => (
                  <fieldset key={`${lesson.slug}-q${qi}`}>
                    <p className="mb-1.5 text-xs text-slate-200">{q.question}</p>
                    <div className="space-y-1">
                      {q.options.map((opt, oi) => {
                        const selected = answers[qi] === oi;
                        const reveal = quizPassed !== null;
                        const isRight = reveal && q.answer === oi;
                        const isWrong = reveal && selected && q.answer !== oi;
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={reveal}
                            onClick={() => setAnswers((prev) => prev.map((a, x) => (x === qi ? oi : a)))}
                            className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-colors disabled:cursor-default ${
                              isRight
                                ? 'border-m-accent/50 bg-m-accent/15 text-m-accent'
                                : isWrong
                                  ? 'border-red-400/50 bg-red-400/10 text-red-300'
                                  : selected
                                    ? 'border-brand-primary/50 bg-brand-primary/10 text-white'
                                    : 'border-white/10 text-slate-400 hover:border-white/30'
                            }`}
                          >
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-xs ${selected ? 'border-brand-primary text-white' : 'border-white/30'}`}>
                              {selected ? '✓' : String.fromCharCode(97 + oi)}
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
                {quizPassed === null ? (
                  <button
                    type="button"
                    onClick={submitQuiz}
                    disabled={answers.some((a) => a === null)}
                    className="w-full rounded-md bg-m-accent px-3 py-2 text-xs font-bold text-brand-dark transition-colors hover:bg-m-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Score quiz
                  </button>
                ) : (
                  <p className={`rounded-lg border p-2.5 text-xs ${quizPassed ? 'border-m-accent/30 bg-m-accent/10 text-m-accent' : 'border-red-400/30 bg-red-400/10 text-red-300'}`}>
                    {quizPassed ? 'Perfect — the workflow is clear. Nice work.' : 'Review the guide below and retake the quiz to lock in the lesson.'}
                  </p>
                )}
              </div>
            )}

            {completed && (
              <p className="mt-3 rounded-lg border border-m-accent/30 bg-m-accent/10 p-2.5 text-xs text-m-accent">
                Lesson complete — nice work.
              </p>
            )}

            <div className="mt-auto space-y-2 pt-4">
              {showGuideLink && (
                <Link
                  href={`/docs/${lesson.guideSlug}`}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-white/10 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/15"
                >
                  Read the full guide <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
              {deepLink && (
                <Link href={deepLink.href} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-white/10 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/15">
                  {deepLink.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
              <Link href="/landing/pricing" className="m-button-primary m-button-sm w-full justify-center">
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}