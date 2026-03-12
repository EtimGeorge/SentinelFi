/**
 * Strict Mode Debugging Utility
 * 
 * React 18 Strict Mode intentionally double-mounts components in development
 * to help identify side effects. This utility helps visualize and debug
 * the mount/unmount/remount cycles.
 */

import React from 'react';

type ComponentLifecycle = {
  componentName: string;
  mountTime: number;
  unmountTime?: number;
  mountCount: number;
  effectRuns: number;
  cleanupRuns: number;
};

class StrictModeDebugger {
  private static instance: StrictModeDebugger;
  private lifecycles: Map<string, ComponentLifecycle> = new Map();
  private enabled: boolean = process.env.NODE_ENV === 'development';

  private constructor() {
    if (this.enabled) {
      console.log(
        '%c[StrictModeDebugger] Initialized - Tracking component lifecycles',
        'color: #00ff00; font-weight: bold;'
      );
    }
  }

  static getInstance(): StrictModeDebugger {
    if (!StrictModeDebugger.instance) {
      StrictModeDebugger.instance = new StrictModeDebugger();
    }
    return StrictModeDebugger.instance;
  }

  trackMount(componentName: string): () => void {
    if (!this.enabled) return () => {};

    const existing = this.lifecycles.get(componentName);
    
    if (existing) {
      existing.mountCount++;
      existing.mountTime = Date.now();
      existing.effectRuns++;
      
      console.log(
        `%c[${componentName}] 🔄 RE-MOUNT #${existing.mountCount}`,
        'color: #ff9800; font-weight: bold;',
        {
          previousUnmount: existing.unmountTime 
            ? `${Date.now() - existing.unmountTime}ms ago`
            : 'never',
          totalMounts: existing.mountCount,
        }
      );
    } else {
      const lifecycle: ComponentLifecycle = {
        componentName,
        mountTime: Date.now(),
        mountCount: 1,
        effectRuns: 1,
        cleanupRuns: 0,
      };
      
      this.lifecycles.set(componentName, lifecycle);
      
      console.log(
        `%c[${componentName}] ✅ FIRST MOUNT`,
        'color: #4caf50; font-weight: bold;'
      );
    }

    // Return cleanup function
    return () => {
      const lifecycle = this.lifecycles.get(componentName);
      if (lifecycle) {
        lifecycle.unmountTime = Date.now();
        lifecycle.cleanupRuns++;
        
        const mountDuration = Date.now() - lifecycle.mountTime;
        
        console.log(
          `%c[${componentName}] ❌ UNMOUNT after ${mountDuration}ms`,
          'color: #f44336; font-weight: bold;',
          {
            mountCount: lifecycle.mountCount,
            cleanupRuns: lifecycle.cleanupRuns,
          }
        );
      }
    };
  }

  trackEffect(componentName: string, effectName: string, deps?: React.DependencyList): () => void {
    if (!this.enabled) return () => {};


    console.log(
      `%c[${componentName}] 🔵 Effect "${effectName}" running`,
      'color: #2196f3;',
      deps ? { dependencies: deps } : {}
    );

    return () => {
      console.log(
        `%c[${componentName}] 🟡 Effect "${effectName}" cleanup`,
        'color: #ff9800;'
      );
    };
  }

  trackAsyncOperation(componentName: string, operationName: string): {
    start: () => void;
    complete: () => void;
    fail: (error: unknown) => void;
  } {
    if (!this.enabled) {
      return {
        start: () => {},
        complete: () => {},
        fail: () => {},
      };
    }

    let startTime: number;

    return {
      start: () => {
        startTime = Date.now();
        console.log(
          `%c[${componentName}] ⏱️ Async "${operationName}" started`,
          'color: #9c27b0;'
        );
      },
      complete: () => {
        const duration = Date.now() - startTime;
        console.log(
          `%c[${componentName}] ✅ Async "${operationName}" completed in ${duration}ms`,
          'color: #4caf50;'
        );
      },
      fail: (error: unknown) => {
        const duration = Date.now() - startTime;
        console.error(
          `%c[${componentName}] ❌ Async "${operationName}" failed after ${duration}ms`,
          'color: #f44336;',
          error
        );
      },
    };
  }

  printSummary(): void {
    if (!this.enabled || this.lifecycles.size === 0) return;

    console.group('%c📊 Component Lifecycle Summary', 'color: #00bcd4; font-size: 14px; font-weight: bold;');
    
    this.lifecycles.forEach((lifecycle, componentName) => {
      const status = lifecycle.unmountTime ? '❌ Unmounted' : '✅ Mounted';
      const totalLifetime = lifecycle.unmountTime 
        ? lifecycle.unmountTime - lifecycle.mountTime 
        : Date.now() - lifecycle.mountTime;

      console.log(
        `%c${componentName}`,
        'font-weight: bold;',
        {
          status,
          mounts: lifecycle.mountCount,
          effects: lifecycle.effectRuns,
          cleanups: lifecycle.cleanupRuns,
          lifetime: `${totalLifetime}ms`,
        }
      );
    });

    console.groupEnd();
  }

  detectStrictModeIssues(): void {
    if (!this.enabled) return;

    const issues: string[] = [];

    this.lifecycles.forEach((lifecycle, componentName) => {
      // Issue 1: Component mounted multiple times in quick succession
      if (lifecycle.mountCount > 2) {
        issues.push(
          `⚠️ ${componentName} mounted ${lifecycle.mountCount} times - possible infinite loop`
        );
      }

      // Issue 2: Cleanup runs don't match effect runs
      if (lifecycle.cleanupRuns > lifecycle.effectRuns) {
        issues.push(
          `⚠️ ${componentName} has more cleanups (${lifecycle.cleanupRuns}) than effects (${lifecycle.effectRuns})`
        );
      }

      // Issue 3: Component unmounted very quickly after mount
      if (lifecycle.unmountTime) {
        const lifetime = lifecycle.unmountTime - lifecycle.mountTime;
        if (lifetime < 100) {
          issues.push(
            `⚠️ ${componentName} unmounted after only ${lifetime}ms - likely Strict Mode double-mount`
          );
        }
      }
    });

    if (issues.length > 0) {
      console.group('%c🔍 Potential Strict Mode Issues Detected', 'color: #ff9800; font-size: 14px; font-weight: bold;');
      issues.forEach(issue => console.warn(issue));
      console.groupEnd();
    } else {
      console.log(
        '%c✅ No Strict Mode issues detected',
        'color: #4caf50; font-weight: bold;'
      );
    }
  }

  reset(): void {
    this.lifecycles.clear();
    if (this.enabled) {
      console.log('%c[StrictModeDebugger] Reset', 'color: #9e9e9e;');
    }
  }
}

export const strictModeDebugger = StrictModeDebugger.getInstance();

// ============================================================================
// REACT HOOKS FOR EASY INTEGRATION
// ============================================================================

export function useStrictModeDebug(componentName: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  React.useEffect(() => {
    const cleanup = strictModeDebugger.trackMount(componentName);
    return cleanup;
  }, [componentName]);
}

export function useEffectDebug(
  componentName: string,
  effectName: string,
  effect: React.EffectCallback,
  deps?: React.DependencyList
): void {
  if (process.env.NODE_ENV !== 'development') {
    // In production, just run the normal effect
    React.useEffect(effect, deps);
    return;
  }

  React.useEffect(() => {
    const effectCleanup = strictModeDebugger.trackEffect(componentName, effectName, deps);
    const userCleanup = effect();

    return () => {
      if (userCleanup) userCleanup();
      effectCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ============================================================================
// WINDOW UTILITIES (for browser console debugging)
// ============================================================================

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugStrictMode = {
    summary: () => strictModeDebugger.printSummary(),
    issues: () => strictModeDebugger.detectStrictModeIssues(),
    reset: () => strictModeDebugger.reset(),
  };

  console.log(
    '%c💡 Debug Commands Available:',
    'color: #00bcd4; font-size: 12px; font-weight: bold;',
    '\n  window.debugStrictMode.summary() - View lifecycle summary' +
    '\n  window.debugStrictMode.issues() - Detect potential issues' +
    '\n  window.debugStrictMode.reset() - Clear tracking data'
  );
}
