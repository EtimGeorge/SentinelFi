/**
 * Resilience Utilities for SentinelFi Frontend
 * This module provides advanced networking primitives to handle common issues like:
 * 1. Double-mounting in React Strict Mode (via Deduplication)
 * 2. Premature request abortion (via SmartAbortController)
 * 3. Backend instability (via CircuitBreaker)
 */

import axios from 'axios';

/**
 * SmartAbortController: A reference-counted abort controller.
 * It ensures that a request is only aborted when ALL subscribers have released their signal.
 * This is perfect for React Strict Mode where a component mounts, unmounts, and mounts again rapidly.
 */
export class SmartAbortController {
  private controller: AbortController | null = null;
  private refCount = 0;

  createSignal(): AbortSignal {
    if (!this.controller || this.controller.signal.aborted) {
      this.controller = new AbortController();
      this.refCount = 0;
    }
    this.refCount++;
    return this.controller.signal;
  }

  releaseSignal(): void {
    if (this.refCount > 0) {
      this.refCount--;
      if (this.refCount === 0 && this.controller) {
        this.controller.abort();
        this.controller = null;
      }
    }
  }

  forceAbort(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
      this.refCount = 0;
    }
  }
}

/**
 * RequestDeduplicator: Prevents the same request from being sent multiple times if 
 * one is already in flight.
 */
export class RequestDeduplicator {
  private inFlight = new Map<string, Promise<any>>();

  async execute<T>(key: string, executor: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = executor().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }
}

/**
 * CircuitBreaker: Prevents hammering a failing backend.
 * It "opens" after a certain number of failures, triggering an immediate cool-down period.
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly maxFailures: number = 3,
    private readonly resetTimeoutMs: number = 30000 // 30 seconds
  ) {}

  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit protection active. Please try again later.');
    }

    try {
      const result = await action();
      this.reset();
      return result;
    } catch (error: any) {
      // Don't count cancellations as circuit-breaking failures
      if (this.isCancellation(error)) {
        throw error;
      }

      this.recordFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
    }
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private isCancellation(error: any): boolean {
    return (
      axios.isCancel(error) ||
      error.name === 'AbortError' ||
      error.name === 'CanceledError' ||
      error.code === 'ERR_CANCELED'
    );
  }
}

// Singleton instances for global deduplication (e.g., auth check)
export const globalDeduplicator = new RequestDeduplicator();
export const authCircuitBreaker = new CircuitBreaker(3, 30000);
