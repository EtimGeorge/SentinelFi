/**
 * Resilience Utilities for SentinelFi Frontend
 * This module provides advanced networking primitives to handle common issues like:
 * 1. Double-mounting in React Strict Mode (via Deduplication)
 * 2. Premature request abortion (via SmartAbortController)
 * 3. Backend instability (via CircuitBreaker)
 * 4. Request queuing during initialization
 */

import axios from 'axios';

/**
 * SmartAbortController: A reference-counted abort controller.
 * It ensures that a request is only aborted when ALL subscribers have released their signal
 * AND the controller is explicitly forced to abort.
 *
 * CRITICAL FIX: The previous implementation aborted the controller on releaseSignal()
 * when refCount hit 0. This canceled in-flight requests AFTER they completed, causing
 * race conditions and spurious AbortError exceptions. The fix: releaseSignal() only
 * decrements the count, it never auto-aborts. Call forceAbort() explicitly when
 * you need to cancel pending requests.
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
      // NEVER auto-abort on release, the request may have already completed.
      // Auto-aborting caused spurious errors on completed requests.
      // The controller will be garbage collected naturally.
      // Call forceAbort() explicitly when you need to cancel pending requests.
      if (this.refCount === 0) {
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

  getRefCount(): number {
    return this.refCount;
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

  cancelInFlight(key: string): void {
    this.inFlight.delete(key);
  }

  clearAll(): void {
    this.inFlight.clear();
  }
}

/**
 * CircuitBreaker: Prevents hammering a failing backend.
 * It "opens" after a certain number of failures, triggering an immediate cool-down period.
 *
 * UPGRADE: Added half-open state with half-max-requests to allow gradual recovery
 * testing instead of all-or-nothing recovery.
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private consecutiveSuccesses = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private halfOpenRequests = 0;

  constructor(
    private readonly maxFailures: number = 3, private readonly resetTimeoutMs: number = 30000, private readonly halfOpenMaxRequests: number = 2
  ) {}

  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit protection active. Please try again later.');
    }

    try {
      const result = await action();
      this.recordSuccess();
      return result;
    } catch (error: any) {
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
        this.halfOpenRequests = 0;
        return false;
      }
      return true;
    }
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenRequests >= this.halfOpenMaxRequests) {
        return true;
      }
      return false;
    }
    return false;
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.consecutiveSuccesses = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.halfOpenRequests = 0;
      console.warn(`[CircuitBreaker] ⚠️ Half-open test failed. Circuit re-OPENED.`);
    } else if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
      console.warn(`[CircuitBreaker] ⚠️ Circuit OPEN after ${this.failures} failures. Cooling down for ${this.resetTimeoutMs}ms.`);
    }
  }

  private recordSuccess(): void {
    this.consecutiveSuccesses++;
    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests++;
      if (this.halfOpenRequests >= this.halfOpenMaxRequests) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.consecutiveSuccesses = 0;
        this.halfOpenRequests = 0;
        console.warn(`[CircuitBreaker] ✅ Circuit CLOSED after successful recovery.`);
      }
    }
    if (this.state === 'CLOSED') {
      if (this.consecutiveSuccesses >= this.maxFailures) {
        this.failures = 0;
      }
    }
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.consecutiveSuccesses = 0;
    this.halfOpenRequests = 0;
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
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

/**
 * OfflineQueue: Queues requests when the network is offline
 * and replays them when connectivity is restored.
 */
export class OfflineQueue {
  private queue: Array<{
    url: string;
    method: string;
    data?: any;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timestamp: number;
  }> = [];
  private isOnline = true;
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly MAX_QUEUE_AGE_MS = 5 * 60 * 1000;

  constructor() {
    this.setupOnlineListener();
  }

  private setupOnlineListener(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flush();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  enqueue(url: string, method: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      this.queue = this.queue.filter(
        (item) => now - item.timestamp < this.MAX_QUEUE_AGE_MS
      );

      if (this.queue.length >= this.MAX_QUEUE_SIZE) {
        reject(new Error('Offline queue full. Request dropped.'));
        return;
      }

      this.queue.push({ url, method, data, resolve, reject, timestamp: now });
    });
  }

  async flush(): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) return;

    const pending = [...this.queue];
    this.queue = [];

    for (const item of pending) {
      try {
        const { apiClient } = await import('./api');
        const response = await apiClient[item.method.toLowerCase()](item.url, item.data);
        item.resolve(response);
      } catch (err) {
        item.reject(err);
      }
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }
}

/**
 * RequestLogger: Tracks request performance and error rates for diagnostics.
 */
export class RequestLogger {
  private static instance: RequestLogger;
  private metrics = new Map<string, { total: number; errors: number; avgTime: number }>();
  private readonly MAX_ENTRIES = 100;

  static getInstance(): RequestLogger {
    if (!RequestLogger.instance) {
      RequestLogger.instance = new RequestLogger();
    }
    return RequestLogger.instance;
  }

  record(url: string, duration: number, success: boolean): void {
    const key = url;
    const existing = this.metrics.get(key) || { total: 0, errors: 0, avgTime: 0 };
    existing.total++;
    if (!success) existing.errors++;
    existing.avgTime = (existing.avgTime * (existing.total - 1) + duration) / existing.total;
    if (this.metrics.size >= this.MAX_ENTRIES && !this.metrics.has(key)) {
      const firstKey = this.metrics.keys().next().value;
      if (firstKey) this.metrics.delete(firstKey);
    }
    this.metrics.set(key, existing);
  }

  getMetrics(): Map<string, { total: number; errors: number; avgTime: number }> {
    return new Map(this.metrics);
  }

  getErrorRate(url: string): number {
    const entry = this.metrics.get(url);
    if (!entry || entry.total === 0) return 0;
    return entry.errors / entry.total;
  }
}

// Singleton instances for global deduplication (e.g., auth check)
export const globalDeduplicator = new RequestDeduplicator();
export const authCircuitBreaker = new CircuitBreaker(3, 30000);
export const apiCircuitBreaker = new CircuitBreaker(5, 60000);
export const smartAbortController = new SmartAbortController();
export const offlineQueue = new OfflineQueue();
export const requestLogger = RequestLogger.getInstance();
