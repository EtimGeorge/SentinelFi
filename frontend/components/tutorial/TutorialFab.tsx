import React, { useState } from 'react';
import { HelpCircle, Map, Play, X } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { getTutorial } from '../../lib/tutorial-content';
import Link from 'next/link';

interface TutorialFabProps {
  pageKey: string;
}

export const TutorialFab: React.FC<TutorialFabProps> = ({ pageKey }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const tour = useTour();
  const tutorial = getTutorial(pageKey);
  const hasTour = tutorial.tourSteps.length > 0;
  const isCompleted = tour.completedTours.includes(pageKey);

  const handleStartTour = () => {
    setIsMenuOpen(false);
    tour.startTour(pageKey);
  };

  if (tour.isActive) return null; // Hide the FAB while tour is running

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 96, // Above the AI orb (which is at bottom: 24)
        right: 24,
        zIndex: 9980,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Popup Menu */}
      {isMenuOpen && (
        <div
          style={{
            background: 'linear-gradient(160deg, #12121f, #0f0f1a)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 14,
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            padding: '6px',
            width: 200,
            overflow: 'hidden',
            animation: 'tutorialFabSlideUp 0.2s ease forwards',
          }}
        >
          <style>{`
            @keyframes tutorialFabSlideUp {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Page label */}
          <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {tutorial.icon} {tutorial.title}
            </p>
          </div>

          {/* Start tour */}
          {hasTour && (
            <button
              onClick={handleStartTour}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '9px 10px', background: 'transparent',
                border: 'none', color: '#c7d2fe', fontSize: 12, cursor: 'pointer',
                borderRadius: 8, textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Play size={13} style={{ color: '#818cf8', flexShrink: 0 }} />
              <span>{isCompleted ? 'Restart Tour' : 'Start Page Tour'}</span>
              {!isCompleted && (
                <span style={{
                  marginLeft: 'auto', fontSize: 9, background: '#6366f1',
                  color: '#fff', padding: '1px 5px', borderRadius: 99, fontWeight: 700,
                }}>NEW</span>
              )}
            </button>
          )}

          {/* Full guide */}
          <Link
            href={`/tutorial/${pageKey}`}
            onClick={() => setIsMenuOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 10px', color: '#c7d2fe', fontSize: 12,
              textDecoration: 'none', borderRadius: 8,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Map size={13} style={{ color: '#818cf8', flexShrink: 0 }} />
            Full Step-by-Step Guide
          </Link>
        </div>
      )}

      {/* FAB Button */}
      <button
        id="sentinel-tutorial-fab"
        onClick={() => setIsMenuOpen(o => !o)}
        title="Help & Tutorial"
        style={{
          width: 44, height: 44,
          borderRadius: '50%',
          background: isMenuOpen
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.4)',
          boxShadow: isMenuOpen
            ? '0 0 20px rgba(99,102,241,0.5)'
            : '0 4px 12px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#c7d2fe',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {isMenuOpen ? <X size={16} /> : <HelpCircle size={18} />}
        {/* Unread dot if tour not yet completed */}
        {!isCompleted && !isMenuOpen && hasTour && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 10, height: 10, borderRadius: '50%',
            background: '#6366f1', border: '2px solid #0B0F1A',
          }} />
        )}
      </button>
    </div>
  );
};
