import React from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowLeft, Play, BookOpen, ChevronRight, CheckCircle, Map, Sparkles,
} from 'lucide-react';
import { PageTutorial, getTutorial, getAllTutorialKeys, TUTORIAL_CONTENT } from '../../lib/tutorial-content';
import { useTour } from '../../contexts/TourContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TutorialPageProps {
  tutorial: PageTutorial;
  allKeys: string[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TutorialPage: React.FC<TutorialPageProps> = ({ tutorial, allKeys }) => {
  const tour = useTour();
  const router = useRouter();
  const isCompleted = tour.completedTours.includes(tutorial.pageKey);

  const handleStartTour = () => {
    // Navigate to the actual page, then trigger the tour
    router.push(`/${tutorial.pageKey}`).then(() => {
      setTimeout(() => tour.startTour(tutorial.pageKey), 500);
    });
  };

  return (
    <>
      <Head>
        <title>{tutorial.title} — SentinelFi Guide</title>
        <meta name="description" content={tutorial.description} />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0B0F1A 0%, #0f0f1a 100%)',
        color: '#fff',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>

        {/* ── Top Nav ──────────────────────────────────────────────────────── */}
        <nav style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          background: 'rgba(11,15,26,0.9)',
          backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <Link
            href="/dashboard"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none',
              transition: 'color 0.15s',
            }}
          >
            <ArrowLeft size={14} /> Back to App
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Map size={13} /> Tutorial Guide
          </span>
        </nav>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* ── Hero Header ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{tutorial.icon}</div>
            <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}>
              {tutorial.title}
            </h1>
            <p style={{ margin: '0 0 24px', fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              {tutorial.description}
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {tutorial.tourSteps.length > 0 && (
                <button
                  onClick={handleStartTour}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', color: '#fff', borderRadius: 10,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                    transition: 'filter 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  <Play size={14} />
                  {isCompleted ? 'Restart Interactive Tour' : 'Start Interactive Tour'}
                </button>
              )}
              <Link
                href={`/${tutorial.pageKey}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.7)', borderRadius: 10,
                  fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                Open Page <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* ── AI Tutor CTA ─────────────────────────────────────────────── */}
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(90deg, rgba(99,102,241,0.12), rgba(14,165,233,0.08))',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 48,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Sparkles size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#c7d2fe' }}>
                Ask the AI Guide
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                Navigate back to the page and click the AI orb → "Guide Me" to get real-time, step-by-step coaching on any action.
              </p>
            </div>
          </div>

          {/* ── Tour Steps Overview ───────────────────────────────────────── */}
          {tutorial.tourSteps.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Play size={16} style={{ color: '#818cf8' }} />
                Tour Overview ({tutorial.tourSteps.length} steps)
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tutorial.tourSteps.map((step, i) => (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 10,
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
                      border: '1px solid rgba(99,102,241,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#a5b4fc',
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                        {step.title}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                        {step.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Detailed Sections ─────────────────────────────────────────── */}
          {tutorial.sections.map((section, si) => (
            <section key={si} style={{ marginBottom: 40 }}>
              <h2 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={16} style={{ color: '#818cf8' }} />
                {section.heading}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {section.steps.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderLeft: '3px solid rgba(99,102,241,0.5)',
                      borderRadius: '0 10px 10px 0',
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(99,102,241,0.2)',
                      border: '1px solid rgba(99,102,241,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#a5b4fc',
                      marginTop: 2,
                    }}>
                      {step.number}
                    </div>
                    <div>
                      <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                        {step.title}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55 }}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* ── Other Guides ─────────────────────────────────────────────── */}
          <section style={{ marginTop: 56 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
              Other Guides
            </h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {allKeys.filter(k => k !== tutorial.pageKey).map(key => {
                const t = TUTORIAL_CONTENT[key];
                return (
                  <Link
                    key={key}
                    href={`/tutorial/${key}`}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: 12, color: 'rgba(255,255,255,0.6)',
                      textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  >
                    <span>{t.icon}</span> {t.title}
                  </Link>
                );
              })}
            </div>
          </section>

        </div>
      </div>
    </>
  );
};

// ─── Static Generation ────────────────────────────────────────────────────────

export const getStaticPaths: GetStaticPaths = async () => {
  const keys = getAllTutorialKeys();
  return {
    paths: keys.map(key => ({ params: { page: key } })),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<TutorialPageProps> = async ({ params }) => {
  const pageKey = params?.page as string;
  const tutorial = getTutorial(pageKey);
  const allKeys = getAllTutorialKeys();

  return {
    props: {
      tutorial,
      allKeys,
    },
    revalidate: 3600,
  };
};

export default TutorialPage;
