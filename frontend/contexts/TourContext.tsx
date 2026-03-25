import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { TourStep, getTutorial } from '../lib/tutorial-content';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourState {
  isActive: boolean;
  pageKey: string;
  steps: TourStep[];
  currentIndex: number;
  completedTours: string[];
}

interface TourContextValue extends TourState {
  startTour: (pageKey: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  skipToStep: (index: number) => void;
  startStepById: (pageKey: string, stepId: string) => void;
  currentStep: TourStep | null;
  totalSteps: number;
  progress: number; // 0–100
}

// ─── Context ─────────────────────────────────────────────────────────────────

const TourContext = createContext<TourContextValue | null>(null);

const COMPLETED_TOURS_KEY = 'sentinelfi:completedTours';

// ─── Provider ─────────────────────────────────────────────────────────────────

export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TourState>(() => {
    let completedTours: string[] = [];
    try {
      const stored = localStorage.getItem(COMPLETED_TOURS_KEY);
      if (stored) completedTours = JSON.parse(stored);
    } catch {
      // localStorage not available (SSR)
    }
    return {
      isActive: false,
      pageKey: '',
      steps: [],
      currentIndex: 0,
      completedTours,
    };
  });

  const persistCompleted = useCallback((tours: string[]) => {
    try {
      localStorage.setItem(COMPLETED_TOURS_KEY, JSON.stringify(tours));
    } catch { /* noop */ }
  }, []);

  const startTour = useCallback((pageKey: string) => {
    const tutorial = getTutorial(pageKey);
    if (!tutorial.tourSteps.length) return;
    setState(s => ({
      ...s,
      isActive: true,
      pageKey,
      steps: tutorial.tourSteps,
      currentIndex: 0,
    }));
  }, []);

  const endTour = useCallback(() => {
    setState(s => {
      const newCompleted = s.completedTours.includes(s.pageKey)
        ? s.completedTours
        : [...s.completedTours, s.pageKey];
      persistCompleted(newCompleted);
      return { ...s, isActive: false, steps: [], currentIndex: 0, completedTours: newCompleted };
    });
  }, [persistCompleted]);

  const nextStep = useCallback(() => {
    setState(s => {
      if (s.currentIndex >= s.steps.length - 1) {
        // Last step — end the tour
        const newCompleted = s.completedTours.includes(s.pageKey)
          ? s.completedTours
          : [...s.completedTours, s.pageKey];
        persistCompleted(newCompleted);
        return { ...s, isActive: false, steps: [], currentIndex: 0, completedTours: newCompleted };
      }
      return { ...s, currentIndex: s.currentIndex + 1 };
    });
  }, [persistCompleted]);

  const prevStep = useCallback(() => {
    setState(s => ({
      ...s,
      currentIndex: Math.max(0, s.currentIndex - 1),
    }));
  }, []);

  const skipToStep = useCallback((index: number) => {
    setState(s => ({
      ...s,
      currentIndex: Math.min(index, s.steps.length - 1),
    }));
  }, []);

  const startStepById = useCallback((pageKey: string, stepId: string) => {
    const tutorial = getTutorial(pageKey);
    const stepIndex = tutorial.tourSteps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;

    setState(s => ({
      ...s,
      isActive: true,
      pageKey,
      steps: tutorial.tourSteps,
      currentIndex: stepIndex,
    }));
  }, []);

  const currentStep = state.isActive && state.steps.length > 0
    ? state.steps[state.currentIndex]
    : null;

  const totalSteps = state.steps.length;
  const progress = totalSteps > 0 ? Math.round(((state.currentIndex + 1) / totalSteps) * 100) : 0;

  return (
    <TourContext.Provider value={{
      ...state,
      startTour,
      nextStep,
      prevStep,
      endTour,
      skipToStep,
      startStepById,
      currentStep,
      totalSteps,
      progress,
    }}>
      {children}
    </TourContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useTour = (): TourContextValue => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>');
  return ctx;
};
