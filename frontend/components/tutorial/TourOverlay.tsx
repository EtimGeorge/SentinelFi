import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Map } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { useRouter } from 'next/router';
import Link from 'next/link';

// ─── Spotlight mask that darkens everything except the target element ─────────

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const DEFAULT_RECT: SpotlightRect = { top: 0, left: 0, width: 0, height: 0 };

export const TourOverlay: React.FC = () => {
  const tour = useTour();
  const router = useRouter();
  const [rect, setRect] = useState<SpotlightRect>(DEFAULT_RECT);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [isCentered, setIsCentered] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  // Measure the target element and update spotlight position
  const measureTarget = useCallback(() => {
    const step = tour.currentStep;
    if (!step || !tour.isActive) {
      setIsCentered(true);
      return;
    }

    if (!step.targetSelector) {
      setIsCentered(true);
      setRect(DEFAULT_RECT);
      return;
    }

    setIsCentered(false);
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      // Element not found — fallback to centered
      setIsCentered(true);
      return;
    }

    const r = el.getBoundingClientRect();
    const PADDING = 8;
    const newRect = {
      top: r.top - PADDING + window.scrollY,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    };
    setRect(newRect);

    // Determine popover position based on placement hint
    const placement = step.placement ?? 'bottom';
    const popover = { top: 0, left: 0 };
    const POPOVER_W = 340;
    const POPOVER_H = 200;

    switch (placement) {
      case 'bottom':
        popover.top = newRect.top + newRect.height + 16;
        popover.left = Math.min(newRect.left, window.innerWidth - POPOVER_W - 16);
        break;
      case 'top':
        popover.top = newRect.top - POPOVER_H - 16;
        popover.left = Math.min(newRect.left, window.innerWidth - POPOVER_W - 16);
        break;
      case 'right':
        popover.top = newRect.top;
        popover.left = newRect.left + newRect.width + 16;
        break;
      case 'left':
        popover.top = newRect.top;
        popover.left = newRect.left - POPOVER_W - 16;
        break;
    }

    // Clamp to viewport
    popover.top = Math.max(8, Math.min(popover.top, window.innerHeight - POPOVER_H - 8));
    popover.left = Math.max(8, Math.min(popover.left, window.innerWidth - POPOVER_W - 8));

    setPopoverPos(popover);
  }, [tour.currentStep, tour.isActive]);

  // Re-measure on step change and scroll
  useEffect(() => {
    if (!tour.isActive) return;
    measureTarget();

    // Scroll to target
    if (tour.currentStep?.targetSelector) {
      const el = document.querySelector(tour.currentStep.targetSelector);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const onResize = () => measureTarget();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tour.currentStep, tour.isActive, measureTarget]);

  // Keyboard navigation
  useEffect(() => {
    if (!tour.isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') tour.nextStep();
      if (e.key === 'ArrowLeft') tour.prevStep();
      if (e.key === 'Escape') tour.endTour();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [tour]);

  if (!tour.isActive || !tour.currentStep) return null;

  const step = tour.currentStep;

  return (
    <>
      {/* Dark overlay with cutout */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          pointerEvents: 'none',
        }}
      >
        {!isCentered && (
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            <defs>
              <mask id="tour-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={rect.left}
                  y={rect.top}
                  width={rect.width}
                  height={rect.height}
                  rx={10}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.72)"
              mask="url(#tour-spotlight-mask)"
            />
            {/* Glowing border around target */}
            <rect
              x={rect.left}
              y={rect.top}
              width={rect.width}
              height={rect.height}
              rx={10}
              fill="none"
              stroke="#6366f1"
              strokeWidth={2}
              style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.8))' }}
            />
          </svg>
        )}

        {isCentered && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.72)',
          }} />
        )}
      </div>

      {/* Clickable backdrop to close */}
      <div
        onClick={tour.endTour}
        style={{ position: 'fixed', inset: 0, zIndex: 9991, cursor: 'default' }}
      />

      {/* Popover / Step card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: isCentered ? 'fixed' : 'fixed',
          top: isCentered ? '50%' : `${popoverPos.top}px`,
          left: isCentered ? '50%' : `${popoverPos.left}px`,
          transform: isCentered ? 'translate(-50%, -50%)' : 'none',
          zIndex: 9992,
          width: 340,
          background: 'linear-gradient(160deg, #12121f, #0f0f1a)',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.15)',
          overflow: 'hidden',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 14px',
          background: 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(14,165,233,0.08))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Step {tour.currentIndex + 1} of {tour.totalSteps}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link
              href={`/tutorial/${tour.pageKey}`}
              onClick={tour.endTour}
              style={{
                fontSize: 10, color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              <Map size={10} /> Full Guide
            </Link>
            <button
              onClick={tour.endTour}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)', padding: '2px', lineHeight: 0,
              }}
              title="Close tour (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '14px 16px' }}>
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {step.title}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>
            {step.content}
          </p>

          {/* Progress bar */}
          <div style={{
            marginTop: 14, height: 3, borderRadius: 99,
            background: 'rgba(255,255,255,0.08)',
          }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${tour.progress}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Footer Controls */}
        <div style={{
          padding: '10px 14px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
        }}>
          {/* Try it link */}
          {step.actionHref ? (
            <Link
              href={step.actionHref}
              onClick={tour.endTour}
              style={{
                fontSize: 11, fontWeight: 600, color: '#a5b4fc',
                textDecoration: 'none', padding: '5px 10px',
                background: 'rgba(99,102,241,0.15)', borderRadius: 8,
                border: '1px solid rgba(99,102,241,0.3)',
              }}
            >
              {step.actionLabel ?? 'Try it →'}
            </Link>
          ) : (
            <span />
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {tour.currentIndex > 0 && (
              <button
                onClick={tour.prevStep}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)', borderRadius: 8, cursor: 'pointer',
                  padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <ChevronLeft size={12} /> Prev
              </button>
            )}
            <button
              onClick={tour.nextStep}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer',
                padding: '5px 12px', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              {tour.currentIndex === tour.totalSteps - 1 ? 'Done ✓' : (<>Next <ChevronRight size={12} /></>)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
