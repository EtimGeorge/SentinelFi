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
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', color: '#fff', borderRadius: 12,
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(99,102,241,0.5)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.filter = 'brightness(1)';
                  }}
                >
                  <Play size={16} fill="currentColor" />
                  {isCompleted ? 'Restart Interactive Tour' : 'Start Interactive Tour'}
                </button>
              )}
              <Link
                href={`/${tutorial.pageKey}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 24px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0', borderRadius: 12,
                  fontSize: 14, fontWeight: 700, textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                Go to Live Page <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          {/* ── Visual Guide (Video / Image) ───────────────────────────── */}
          <div style={{
            marginBottom: 56,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            overflow: 'hidden',
            aspectRatio: '16/9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
          }}>
            {tutorial.videoUrl ? (
              <iframe
                src={tutorial.videoUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'rgba(99,102,241,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', color: '#6366f1',
                }}>
                  <Play size={32} />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Interactive Navigation Guide</h3>
                <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 400 }}>
                  A visual walkthrough for the {tutorial.title} is being prepared.
                  Use the 'Start Interactive Tour' above for a live guided experience.
                </p>
              </div>
            )}
            {/* Glossy overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
            }} />
          </div>

          {/* ── AI Tutor CTA ─────────────────────────────────────────────── */}
          <div style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(14,165,233,0.06) 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 20,
            marginBottom: 56,
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 10px 20px rgba(99,102,241,0.3)',
            }}>
              <Sparkles size={24} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                Ask the AI Tutor
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Want a personalized walkthrough? Launch the AI Assistant from the header orb and toggle <strong>'Guide Me'</strong>. 
                Our AI will give you real-time, context-aware coaching as you navigate the live interface.
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

              {/* Section Gallery */}
              {section.images && section.images.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: section.images.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 16,
                  marginTop: 20,
                }}>
                  {section.images.map((img, imi) => (
                    <div 
                      key={imi}
                      style={{
                        borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.02)',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                      }}
                    >
                      <img 
                        src={img} 
                        alt={`${section.heading} visual ${imi + 1}`}
                        style={{ width: '100%', display: 'block', height: 'auto', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '8px 12px', background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)', fontSize: 10, color: '#fff',
                        fontWeight: 500, borderTop: '1px solid rgba(255,255,255,0.1)',
                      }}>
                        Visual Reference for Section {si + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* ── Other Guides ─────────────────────────────────────────────── */}
          <section style={{ marginTop: 56 }}>
            <h2 style={{ margin: '0 0 16px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
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
