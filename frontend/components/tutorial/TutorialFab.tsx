import React, { useState } from 'react';
import { HelpCircle, Map, Play, X } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { getTutorial } from '../../lib/tutorial-content';
import Link from 'next/link';

interface TutorialFabProps {
  pageKey: string;
}

/**
 * Help & Tutorial launcher — top button of the right-corner Action Dock.
 *
 * Lives directly above the Messenger FAB: the dock column is standardized as
 * [ Tutorial (44px) ] --gap-3-- [ Messenger (56px) ] anchored at the same
 * corner offsets, so the two never drift apart. Positions encode the stack
 * geometry of the messenger FAB (56px + 12px gap):
 *   mobile:  bottom-20 (80px, above BottomTabBar) + 68  → bottom-[148px]
 *   desktop: bottom-6  (24px)                    + 68  → bottom-[92px]
 */
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
      className="fixed right-4 sm:right-6 bottom-[148px] md:bottom-[92px] z-[9980] flex flex-col items-end gap-2"
      id="sentinel-tutorial-dock"
    >
      {/* Popup Menu */}
      {isMenuOpen && (
        <div className="w-[200px] overflow-hidden rounded-2xl border border-brand-primary/25 bg-brand-dark/95 backdrop-blur-3xl p-1.5 elev-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Page label */}
          <div className="border-b border-white/5 px-2.5 py-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500">
              {tutorial.icon} {tutorial.title}
            </p>
          </div>

          {/* Start tour */}
          {hasTour && (
            <button
              onClick={handleStartTour}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-indigo-300 transition-colors hover:bg-brand-primary/15 hover:text-white"
            >
              <Play size={13} className="shrink-0 text-indigo-400" />
              <span>{isCompleted ? 'Restart Tour' : 'Start Page Tour'}</span>
              {!isCompleted && (
                <span className="ml-auto rounded-full bg-brand-primary px-1.5 py-0.5 text-[11px] font-bold text-white">
                  NEW
                </span>
              )}
            </button>
          )}

          {/* Full guide */}
          <Link
            href={`/tutorial/${pageKey}`}
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-indigo-300 transition-colors hover:bg-brand-primary/15 hover:text-white"
          >
            <Map size={13} className="shrink-0 text-indigo-400" />
            Full Step-by-Step Guide
          </Link>
        </div>
      )}

      {/* FAB Button */}
      <button
        id="sentinel-tutorial-fab"
        onClick={() => setIsMenuOpen((o) => !o)}
        aria-label="Help & Tutorial"
        aria-expanded={isMenuOpen}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMenuOpen
            ? 'border-indigo-400/60 bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]'
            : 'border-indigo-400/40 bg-indigo-500/15 text-indigo-300 elev-sm hover:bg-indigo-500/25 hover:text-white'
        }`}
        data-tour="tutorial-fab"
      >
        {isMenuOpen ? <X size={16} /> : <HelpCircle size={18} />}
        {/* Unread dot if tour not yet completed */}
        {!isCompleted && !isMenuOpen && hasTour && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-dark bg-brand-primary" />
        )}
      </button>
    </div>
  );
};
