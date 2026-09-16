import React, { useState } from 'react';
import Link from 'next/link';
import MarketingLayout from '../components/Landing/MarketingLayout';
import LessonVideoModal from '../components/Landing/LessonVideoModal';
import {
  claimCertificate,
  getCertificate,
  getPathProgress,
  getStats,
  readLessonProgress,
  syncAcademyProgress,
} from '../lib/academyProgress';
import {
  PERSONA_PATHS,
  getCurriculumLesson,
  getCurriculumGuide,
} from '../lib/curriculum/registry';
import type { AcademyLesson, Certificate, PersonaPath } from '../lib/curriculum/types';
import { Play, BookOpen, GraduationCap, Clock, Signal, CheckCircle2, Sparkles, Award, ArrowRight } from 'lucide-react';
import { NextPage } from 'next';

const PATH_PREF_KEY = 'sfi.academy.path.v1';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const TrainingPage: NextPageWithLayout = () => {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [progressTick, setProgressTick] = useState(0);
  const [certificate, setCertificate] = useState<Certificate | null>(() => getCertificate());

  const [activePathId, setActivePathId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(PATH_PREF_KEY);
      if (saved && PERSONA_PATHS.some((p) => p.id === saved)) return saved;
    }
    return 'tenant-admin';
  });

  // Re-read progress when the modal closes so completion badges refresh.
  const progress = readLessonProgress();
  const stats = getStats();
  const activePath: PersonaPath | undefined = PERSONA_PATHS.find((p) => p.id === activePathId);
  const pathProgress = activePath ? getPathProgress(activePath.id) : undefined;
  const activeLesson = activeSlug ? getCurriculumLesson(activeSlug) ?? null : null;
  const activePathCert = certificate && certificate.pathId === activePath?.id ? certificate : null;

  React.useEffect(() => {
    syncAcademyProgress();
  }, []);

  const selectPath = (id: string) => {
    setActivePathId(id);
    try {
      window.localStorage.setItem(PATH_PREF_KEY, id);
    } catch {
      // Preference persistence is best-effort.
    }
    setProgressTick((t) => t + 1);
  };

  const handleClaim = () => {
    if (!activePath) return;
    setCertificate(claimCertificate());
    setProgressTick((t) => t + 1);
  };

  const pathLessons = activePath
    ? activePath.lessonSlugs
        .map((slug) => getCurriculumLesson(slug))
        .filter((l): l is AcademyLesson => Boolean(l))
    : [];

  return (
    <section className="py-24 container mx-auto px-6">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-black m-heading mb-8 gradient-text">
          Master the Sentinel Ecosystem.
        </h1>
        <p className="text-xl text-m-text-muted leading-relaxed">
          Choose your role, follow your path: walkthrough videos, interactive
          modules and the full reference manual — from WBS architecture to
          AI-driven financial forensics. No account needed to start.
        </p>
      </div>

      {/* Overall progress */}
      <div className="max-w-4xl mx-auto mb-14 glass-card p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-m-primary" />
              Your progress
            </p>
            <p className="mt-1 text-sm text-m-text-muted">
              {stats.lessonsCompleted} of {stats.lessonsTotal} lessons · {stats.completedPaths} of {stats.totalPaths} paths complete
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-m-accent transition-all" style={{ width: `${stats.pct}%` }} />
            </div>
            <span className="text-sm font-black text-m-accent">{stats.pct}%</span>
          </div>
        </div>
      </div>

      {/* Persona path selector */}
      <div className="mb-6">
        <p className="mb-3 text-xs font-bold uppercase text-m-text-muted">Which one are you?</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PERSONA_PATHS.map((path) => {
            const pp = pathProgress && path.id === activePathId ? pathProgress : getPathProgress(path.id);
            const selected = path.id === activePathId;
            return (
              <button
                key={path.id}
                type="button"
                onClick={() => selectPath(path.id)}
                aria-pressed={selected}
                className={`glass-card p-4 text-left transition-all ${selected ? 'ring-2 ring-m-primary/70 bg-m-primary/5' : 'hover:bg-white/5'}`}
              >
                <span className="text-2xl" aria-hidden>{path.icon}</span>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className={`text-sm font-bold ${selected ? 'text-m-primary' : 'text-white'}`}>{path.title}</span>
                  {pp.complete && <CheckCircle2 className="h-4 w-4 shrink-0 text-m-accent" aria-label="Path complete" />}
                </div>
                <p className="mt-1 text-xs text-m-text-muted">{pp.completedLessons}/{pp.totalLessons} lessons</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-m-accent transition-all" style={{ width: `${pp.pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activePath && (
        <>
          {/* Active path header */}
          <div className="glass-card mb-10 p-6 md:p-8 md:flex md:items-center md:justify-between md:gap-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-tighter text-m-text-muted flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-m-secondary" />
                {activePath.tag} learning path
              </p>
              <h2 className="mt-1 text-2xl font-black m-heading text-white">{activePath.icon} {activePath.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-m-text-muted">{activePath.description}</p>
            </div>
            <div className="mt-6 md:mt-0 md:shrink-0 text-center md:text-right">
              <p className="text-xs font-bold uppercase tracking-tighter text-m-text-muted">Path progress</p>
              <p className="mt-1 text-3xl font-black text-m-accent">
                {pathProgress?.pct ?? 0}
                <span className="text-base text-m-text-muted">%</span>
              </p>
            </div>
          </div>

          {/* Certificate panel */}
          {pathProgress?.complete && (
            <div className="mb-10 glass-card p-6 md:p-8 border-m-accent/30">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-m-accent/20">
                    <Award className="h-8 w-8 text-m-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-m-accent">Path completed</p>
                    {activePathCert ? (
                      <p className="mt-1 text-sm text-white font-mono">{activePathCert.code}</p>
                    ) : (
                      <p className="mt-1 text-sm text-m-text-muted">Claim your Academy certificate.</p>
                    )}
                  </div>
                </div>
                {activePathCert ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) void navigator.clipboard.writeText(activePathCert.code);
                    }}
                    className="m-button-primary m-button-sm"
                  >
                    Copy certificate code
                  </button>
                ) : (
                  <button type="button" onClick={handleClaim} className="m-button-primary m-button-sm">
                    Claim certificate
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lessons grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pathLessons.map((lesson, idx) => (
              <TrainingCard
                key={lesson.slug}
                lesson={lesson}
                position={idx + 1}
                total={pathLessons.length}
                completed={Boolean(progress[lesson.slug])}
                onOpen={() => setActiveSlug(lesson.slug)}
              />
            ))}
          </div>
        </>
      )}

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
        <Link href="/contact" className="m-button-primary text-xl px-12 py-5">
          Request Enterprise Training
        </Link>
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

const TrainingCard = ({ lesson, position, total, completed, onOpen }: {
  lesson: AcademyLesson;
  position: number;
  total: number;
  completed: boolean;
  onOpen: () => void;
}) => {
  const guide = lesson.guideSlug ? getCurriculumGuide(lesson.guideSlug) : undefined;
  return (
    <div className="glass-card group overflow-hidden flex flex-col text-left">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col text-left"
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
            <div className="absolute top-4 right-4 px-2 py-0.5 rounded bg-m-accent/20 text-m-accent text-xs font-black uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Done
            </div>
          )}
          <div className={`absolute bottom-4 right-4 px-2 py-0.5 rounded text-xs font-black uppercase tracking-tighter ${
            lesson.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
            lesson.difficulty === 'Intermediate' ? 'bg-blue-500/20 text-blue-400' :
            lesson.difficulty === 'Advanced' ? 'bg-purple-500/20 text-purple-400' :
            lesson.difficulty === 'Governance' ? 'bg-amber-500/20 text-amber-400' :
            lesson.difficulty === 'IT Ops' ? 'bg-cyan-500/20 text-cyan-400' :
            'bg-m-accent/20 text-m-accent'
          }`}>
            {lesson.difficulty}
          </div>
          {lesson.mode !== 'video' && (
            <div className="absolute bottom-4 left-4 px-2 py-0.5 rounded bg-brand-primary/20 text-brand-primary text-xs font-black uppercase tracking-tighter">
              {lesson.mode === 'hybrid' ? 'Video + Interactive' : 'Interactive'}
            </div>
          )}
        </div>
        <div className="p-8 flex-1 flex flex-col">
          <p className="text-xs font-bold uppercase tracking-tighter text-m-text-muted mb-2">
            Lesson {position} of {total}
          </p>
          <h3 className="text-xl font-bold mb-4 m-heading text-white group-hover:text-m-primary transition-colors">{lesson.title}</h3>
          <p className="text-sm text-m-text-muted leading-relaxed mb-8 flex-1">{lesson.desc}</p>
          <div className="flex items-center gap-4 text-xs font-bold text-white pt-6 border-t border-white/5 group-hover:gap-6 transition-all">
            <BookOpen className="w-4 h-4 text-m-secondary" />
            {completed ? 'Replay lesson' : 'Start lesson'}
            <ArrowRight className="w-3.5 h-3.5 ml-auto text-m-text-muted" />
          </div>
        </div>
      </button>
      {guide && (
        <div className="px-8 pb-6">
          <Link
            href={`/docs/${guide.slug}`}
            className="text-xs text-m-text-muted transition-colors hover:text-m-secondary"
          >
            Reference guide: <span className="font-bold text-m-secondary">{guide.title}</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default TrainingPage;