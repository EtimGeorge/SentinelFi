import React, { useState } from 'react';
import MarketingLayout from '../components/Landing/MarketingLayout';
import LessonVideoModal, { readLessonProgress } from '../components/Landing/LessonVideoModal';
import { ACADEMY_LESSONS } from '../lib/academy-content';
import { Play, BookOpen, GraduationCap, Clock, Signal, CheckCircle2 } from 'lucide-react';

import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const TrainingPage: NextPageWithLayout = () => {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [progressTick, setProgressTick] = useState(0);
  const activeLesson = ACADEMY_LESSONS.find((l) => l.slug === activeSlug) ?? null;
  // Re-read progress when the modal closes so completion badges refresh.
  const progress = progressTick >= 0 ? readLessonProgress() : {};

  return (
    <section className="py-24 container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-24">
          <h1 className="text-5xl md:text-6xl font-black m-heading mb-8 gradient-text">
            Master the Sentinel Ecosystem.
          </h1>
          <p className="text-xl text-m-text-muted leading-relaxed">
            From work breakdown architecture to AI-driven financial forensics.
            Watch the recorded walkthrough, tick the checklist, then try it live
            in the sandbox — no account needed.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ACADEMY_LESSONS.map((lesson) => (
            <TrainingCard
              key={lesson.slug}
              lesson={lesson}
              completed={Boolean(progress[lesson.slug])}
              onOpen={() => setActiveSlug(lesson.slug)}
            />
          ))}
        </div>

        {/* The Live Session CTA */}
        <div className="mt-32 glass-card p-12 md:p-20 relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 right-0 p-8">
            <Signal className="w-12 h-12 text-m-primary animate-pulse" />
          </div>
          <GraduationCap className="w-16 h-16 text-m-primary mb-8" />
          <h2 className="text-4xl font-bold m-heading mb-6 text-white">Need a Specialized Briefing?</h2>
          <p className="text-m-text-muted max-w-xl mb-12">
            Our governance engineers can provide a custom, on-premise training
            canvas for your executive team.
          </p>
          <a href="/contact" className="m-button-primary text-xl px-12 py-5">
            Request Enterprise Training
          </a>
        </div>

        {activeLesson && (
          <LessonVideoModal
            key={activeLesson.slug}
            lesson={activeLesson}
            onClose={() => {
              setActiveSlug(null);
              setProgressTick((t) => t + 1);
            }}
          />
        )}
      </section>
  );
};

TrainingPage.getLayout = (page: React.ReactElement) => {
  return <MarketingLayout title="Sentinel Academy | Enterprise Training Canvas">{page}</MarketingLayout>;
};

const TrainingCard = ({ lesson, completed, onOpen }: {
  lesson: (typeof ACADEMY_LESSONS)[number];
  completed: boolean;
  onOpen: () => void;
}) => (
  <button
    type="button"
    onClick={onOpen}
    className="glass-card group overflow-hidden flex flex-col text-left"
    aria-label={`Open lesson: ${lesson.title}`}
  >
    <div className="aspect-video bg-white/5 border-b border-white/5 flex items-center justify-center relative">
      <div className="w-14 h-14 bg-m-primary/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
        <Play className="w-6 h-6 text-m-primary fill-m-primary" />
      </div>
      <div className="absolute top-4 left-4 px-3 py-1 bg-m-dark/60 rounded-full text-xs font-bold text-m-text-muted flex items-center gap-1.5 backdrop-blur-sm">
        <Clock className="w-3 h-3" /> {lesson.duration}
      </div>
      {completed && (
        <div className="absolute top-4 right-4 px-2 py-0.5 rounded bg-m-accent/20 text-m-accent text-[10px] font-black uppercase flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Done
        </div>
      )}
      <div className={`absolute bottom-4 right-4 px-2 py-0.5 rounded text-xs font-black uppercase tracking-tighter ${
        lesson.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
        lesson.difficulty === 'Intermediate' ? 'bg-blue-500/20 text-blue-400' :
        lesson.difficulty === 'Advanced' ? 'bg-purple-500/20 text-purple-400' :
        'bg-m-accent/20 text-m-accent'
      }`}>
        {lesson.difficulty}
      </div>
    </div>
    <div className="p-8 flex-1 flex flex-col">
      <h3 className="text-xl font-bold mb-4 m-heading text-white group-hover:text-m-primary transition-colors">{lesson.title}</h3>
      <p className="text-sm text-m-text-muted leading-relaxed mb-8 flex-1">{lesson.desc}</p>
      <div className="flex items-center gap-4 text-xs font-bold text-white pt-6 border-t border-white/5 group-hover:gap-6 transition-all">
        <BookOpen className="w-4 h-4 text-m-secondary" />
        {completed ? 'Replay lesson' : 'Start lesson'}
      </div>
    </div>
  </button>
);

export default TrainingPage;
