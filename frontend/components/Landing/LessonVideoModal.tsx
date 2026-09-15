// Academy lesson video modal — plays self-hosted demo MP4s (with an embed
// fallback for Loom/YouTube). Tracking: lesson_open on mount, lesson_complete
// when the video ends or the checklist is fully ticked.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X, BookOpen, ExternalLink } from 'lucide-react';
import type { AcademyLesson } from '../../lib/academy-content';
import { trackMarketingEvent } from './marketingAnalytics';

const LESSON_PROGRESS_KEY = 'sfi.academy.lessonProgress.v1';

export function readLessonProgress(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LESSON_PROGRESS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function markLessonComplete(slug: string): void {
  try {
    const progress = { ...readLessonProgress(), [slug]: true };
    window.localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable — completion still tracked via the event bus.
  }
  trackMarketingEvent('marketing.lesson_complete', { label: slug });
}

export const LessonVideoModal: React.FC<{
  lesson: AcademyLesson;
  onClose: () => void;
}> = ({ lesson, onClose }) => {
  const [checked, setChecked] = useState<number[]>([]);
  const [completed, setCompleted] = useState(false);

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

  const finishChecklist = () => {
    markLessonComplete(lesson.slug);
    setCompleted(true);
  };

  const toggleItem = (i: number) => {
    setChecked((prev) => {
      const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i];
      if (next.length === lesson.checklist.length) finishChecklist();
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${lesson.title} lesson`}>
      <button type="button" aria-label="Close lesson" onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-brand-dark shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-brand-dark px-5 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <BookOpen className="h-4 w-4 text-m-secondary" /> {lesson.title}
            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-400">{lesson.difficulty}</span>
          </p>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="aspect-video bg-black md:col-span-2">
            {lesson.videoType === 'self-hosted' ? (
              <video
                src={lesson.videoUrl}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full"
                onEnded={() => { markLessonComplete(lesson.slug); setCompleted(true); }}
              >
                <track kind="captions" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <iframe
                src={lesson.videoUrl}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            )}
          </div>

          <div className="flex flex-col border-t border-white/10 p-5 md:border-l md:border-t-0">
            <p className="mb-3 text-xs font-bold uppercase text-slate-400">Follow along</p>
            <ul className="space-y-2">
              {lesson.checklist.map((item, i) => (
                <li key={item}>
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

            {completed && (
              <p className="mt-3 rounded-lg border border-m-accent/30 bg-m-accent/10 p-2.5 text-xs text-m-accent">
                Lesson complete — nice work.
              </p>
            )}

            <div className="mt-auto space-y-2 pt-4">
              <Link href="/landing/workflows" className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-white/10 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/15">
                Try it in the live sandbox <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <Link href="/landing/pricing" className="m-button-primary m-button-sm w-full justify-center">
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonVideoModal;