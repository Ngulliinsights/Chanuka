/**
 * Resilience Patterns
 *
 * A self-contained resilience toolkit for protecting calls to external systems.
 * Consolidates the retry/timeout/fallback/bulkhead patterns from
 * recovery-patterns.ts and the incomplete ServiceCircuitBreaker stub from
 * error-configuration.ts into one coherent module.
 *
 * Included patterns:
 *  - withRetry            — exponential back-off with configurable jitter
 *  - withTimeout          — enforces a hard time limit on any promise
 *  - withFallback         — substitutes a safe default when an operation fails
 *  - withRetryAndFallback — combines the two most common strategies
 *  - BulkheadExecutor     — caps concurrency; queues excess work instead of dropping it
 *  - CircuitBreaker       — prevents cascading failures via CLOSED→OPEN→HALF_OPEN state machine
 *  - RecoveryChain        — composes multiple strategies into a priority-ordered chain
 *
 * Design contract:
 *  - Does NOT import Boom, neverthrow, Express, or error-factory.ts.
 *  - Callers may wrap returned errors in Result types via result-types.ts.
 *  - All timings are in milliseconds throughout to avoid unit confusion.
 *  - The circuit breaker is instance-based so each protected dependency
 *    gets its own independent state.
 *
 * Dependency rule: resilience.ts → types.ts (RetryOptions, CircuitBreakerOptions, CircuitState), logger
 */

import { logger } from '../observability/core/logger';
import {
  CircuitBreakerOptions,
  CircuitBreakerStats,
  CircuitState,
  RetryOptions,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class TimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`'${operation}' timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export class CircuitOpenError extends Error {
  constructor(circuitName: string) {
    super(`Circuit '${circuitName}' is OPEN — request rejected to protect downstream`);
    this.name = 'CircuitOpenError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry Pattern
// ─────────────────────────────────────────────────────────────────────────────

const RETRY_DEFAULTS: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry'>> = {
  maxAttempts:       3,
  initialDelayMs:    200,
  maxDelayMs:        10_000,
  backoffMultiplier: 2,
};

/**
 * Retries `fn` with full jitter exponential back-off when a retryable error
 * is thrown. Non-retryable errors are rethrown immediately without wasting
 * additional attempts.
 *
 * Full jitter: actual delay = random(0, calculated_delay). This avoids the
 * thundering-herd problem when many callers retry simultaneously after a
 * service recovers.
 *
 * @throws The last error encountered when all attempts are exhausted.
 */
export async function withRetry<T>(
  fn:            () => Promise<T>,
  operationName: string,
  options:       RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    retryableErrors = defaultIsRetryable,
    onRetry,
  } = { ...RETRY_DEFAULTS, ...options };

  let lastError: unknown;
  let baseDelay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`[${operationName}] attempt ${attempt}/${maxAttempts}`);
      return await fn();
    } catch (error) {
      lastError = error;

      if (!retryableErrors(error)) {
        // FIX: pino requires object first, message string second
        logger.warn(
          { error: errorMessage(error) },
          `[${operationName}] non-retryable error on attempt ${attempt}`,
        );
        throw error;
      }

      if (attempt === maxAttempts) break;

      // Full jitter: wait somewhere between 0 and the calculated back-off cap
      const capped   = Math.min(baseDelay, maxDelayMs);
      const jittered = Math.floor(Math.random() * capped);
      baseDelay      = Math.floor(baseDelay * backoffMultiplier);

      // FIX: pino requires object first, message string second
      logger.warn(
        { error: errorMessage(error), nextAttempt: attempt + 1, maxAttempts },
        `[${operationName}] attempt ${attempt} failed; retrying in ${jittered}ms`,
      );

      onRetry?.(attempt, error, jittered);
      await sleep(jittered);
    }
  }

  // FIX: pino requires object first, message string second
  logger.error(
    { error: errorMessage(lastError) },
    `[${operationName}] all ${maxAttempts} attempts failed`,
  );
  throw lastError;
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeout Pattern
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Races `promise` against a timeout. If the timeout fires first, the returned
 * promise rejects with `TimeoutError`. The original promise is not cancelled
 * (JS has no cancellation primitive), but its result is discarded.
 *
 * For CPU-bound work use worker threads. For I/O that supports abort signals
 * (e.g. fetch) pass an AbortController and cancel it on timeout.
 */
export function withTimeout<T>(
  promise:       Promise<T>,
  timeoutMs:     number,
  operationName: string,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new TimeoutError(operationName, timeoutMs)),
      timeoutMs,
    );
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Pattern
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes `fn`. On any failure, returns `fallbackValue` instead of throwing.
 * The error is logged at WARN so it is visible without being fatal.
 *
 * Use when a degraded response is always preferable to an error (e.g. cached
 * data, empty list, default configuration).
 */
export async function withFallback<T>(
  fn:            () => Promise<T>,
  fallbackValue: T,
  operationName: string,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // FIX: pino requires object first, message string second
    logger.warn(
      { error: errorMessage(error) },
      `[${operationName}] using fallback after error`,
    );
    return fallbackValue;
  }
}

/**
 * Combines retry and fallback. Retries on transient failures first; if all
 * attempts fail, returns the fallback value instead of throwing.
 */
export async function withRetryAndFallback<T>(
  fn:            () => Promise<T>,
  fallbackValue: T,
  operationName: string,
  retryOptions?: RetryOptions,
): Promise<T> {
  return withFallback(
    () => withRetry(fn, operationName, retryOptions),
    fallbackValue,
    operationName,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulkhead Pattern
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Limits the number of concurrently executing operations to prevent a single
 * slow dependency from consuming all available resources (connection pools,
 * thread pool slots, etc.).
 *
 * Excess requests are queued in memory (not dropped). Set `maxQueueSize` to
 * cap the queue and reject requests that overflow it.
 *
 * Implementation note — `resolve` is typed `(value: any) => void` rather than
 * the narrower `(value: T | PromiseLike<T>) => void` because the queue must
 * hold pending tasks with heterogeneous `T` values. Type safety is preserved at
 * the boundary: `execute<T>` only ever resolves its outer `Promise<T>` with a
 * value produced by `run<T>`, which returns `Promise<T>`.
 */
export class BulkheadExecutor {
  private activeCount = 0;
  private queueLength = 0;

  private readonly pendingQueue: Array<{
    fn:      () => Promise<unknown>;
    // FIX: must be `any`, not `unknown` — contravariance prevents storing
    // `(value: T | PromiseLike<T>) => void` where `(value: unknown) => void` is declared.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolve: (value: any) => void;
    reject:  (error: unknown) => void;
  }> = [];

  constructor(
    private readonly maxConcurrency: number = 10,
    private readonly maxQueueSize:   number = Infinity,
    private readonly name:           string = 'bulkhead',
  ) {
    if (maxConcurrency < 1) throw new Error('maxConcurrency must be ≥ 1');
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.maxConcurrency) {
      return this.run(fn);
    }

    if (this.queueLength >= this.maxQueueSize) {
      throw new Error(
        `Bulkhead '${this.name}' queue is full (max=${this.maxQueueSize}). Request rejected.`,
      );
    }

    return new Promise<T>((resolve, reject) => {
      this.pendingQueue.push({ fn: fn as () => Promise<unknown>, resolve, reject });
      this.queueLength++;
    });
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      this.drainQueue();
    }
  }

  private drainQueue(): void {
    if (this.pendingQueue.length > 0 && this.activeCount < this.maxConcurrency) {
      const next = this.pendingQueue.shift()!;
      this.queueLength--;
      this.run(next.fn).then(next.resolve, next.reject);
    }
  }

  getStats(): { active: number; queued: number; maxConcurrency: number; name: string } {
    return {
      active:         this.activeCount,
      queued:         this.queueLength,
      maxConcurrency: this.maxConcurrency,
      name:           this.name,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Circuit Breaker Pattern
// ─────────────────────────────────────────────────────────────────────────────

const CIRCUIT_DEFAULTS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  resetTimeoutMs:   60_000,
  rollingWindowMs:  120_000,
};

/**
 * A proper state-machine circuit breaker.
 *
 * States:
 *  CLOSED    — all requests pass through; failures are counted.
 *  OPEN      — all requests are rejected immediately with CircuitOpenError
 *              until `resetTimeoutMs` elapses.
 *  HALF_OPEN — one probe request is allowed through; on success the circuit
 *              closes again; on failure it returns to OPEN.
 *
 * Thread safety: JavaScript is single-threaded so no mutex is needed.
 * The probe lock (`halfOpenProbePending`) prevents concurrent probes when
 * multiple requests arrive in the HALF_OPEN window.
 *
 * Each protected external dependency should have its own CircuitBreaker
 * instance — do not share one breaker across multiple services.
 *
 * @example
 * const breaker = new CircuitBreaker('payment-service', { failureThreshold: 3 });
 * const result  = await breaker.execute(() => paymentApi.charge(amount));
 */
export class CircuitBreaker {
  private state:                CircuitState  = CircuitState.CLOSED;
  private consecutiveFails:     number        = 0;
  private lastFailureTime:      number | null = null;
  private halfOpenProbePending: boolean       = false;
  private totalSuccess:         number        = 0;
  private totalFailure:         number        = 0;

  private readonly opts: Required<CircuitBreakerOptions>;

  constructor(
    public readonly name: string,
    options: Partial<CircuitBreakerOptions> = {},
  ) {
    this.opts = { ...CIRCUIT_DEFAULTS, ...options };
  }

  /**
   * Executes `fn` subject to circuit-breaker logic.
   * @throws CircuitOpenError if the circuit is OPEN
   * @throws The original error if the operation fails (and records the failure)
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.evaluateState();

    if (this.state === CircuitState.OPEN) {
      // FIX: pino requires object first, message string second
      logger.warn(
        { consecutiveFails: this.consecutiveFails, lastFailureTime: this.lastFailureTime },
        `[CircuitBreaker:${this.name}] OPEN — request rejected`,
      );
      throw new CircuitOpenError(this.name);
    }

    if (this.state === CircuitState.HALF_OPEN && this.halfOpenProbePending) {
      // Another probe is already in-flight; reject concurrent requests
      throw new CircuitOpenError(this.name);
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenProbePending = true;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    } finally {
      if (this.state === CircuitState.HALF_OPEN) {
        this.halfOpenProbePending = false;
      }
    }
  }

  /**
   * Executes `fn`; if the circuit is open or the call fails, returns `fallback()` instead.
   * Useful when a degraded response is acceptable.
   */
  async executeWithFallback<T>(
    fn:       () => Promise<T>,
    fallback: () => T | Promise<T>,
  ): Promise<T> {
    try {
      return await this.execute(fn);
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        logger.warn(`[CircuitBreaker:${this.name}] using fallback`);
      } else {
        // FIX: pino requires object first, message string second
        logger.error(
          { error: errorMessage(error) },
          `[CircuitBreaker:${this.name}] operation failed; using fallback`,
        );
      }
      return fallback();
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state:            this.state,
      consecutiveFails: this.consecutiveFails,
      lastFailureTime:  this.lastFailureTime,
      totalSuccess:     this.totalSuccess,
      totalFailure:     this.totalFailure,
    };
  }

  /** Manually reset the breaker to CLOSED. Useful in test environments. */
  reset(): void {
    this.state                = CircuitState.CLOSED;
    this.consecutiveFails     = 0;
    this.lastFailureTime      = null;
    this.halfOpenProbePending = false;
    logger.info(`[CircuitBreaker:${this.name}] manually reset to CLOSED`);
  }

  // ── Private state machine ──────────────────────────────────────────────────

  private recordSuccess(): void {
    this.totalSuccess++;
    if (this.state === CircuitState.HALF_OPEN) {
      logger.info(`[CircuitBreaker:${this.name}] probe succeeded — closing circuit`);
      this.state            = CircuitState.CLOSED;
      this.consecutiveFails = 0;
      this.lastFailureTime  = null;
    } else {
      // Reset rolling window on success in CLOSED state
      this.consecutiveFails = 0;
    }
  }

  private recordFailure(): void {
    this.totalFailure++;
    this.consecutiveFails++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      logger.warn(`[CircuitBreaker:${this.name}] probe failed — reopening circuit`);
      this.state = CircuitState.OPEN;
      return;
    }

    if (
      this.state === CircuitState.CLOSED &&
      this.consecutiveFails >= this.opts.failureThreshold
    ) {
      // FIX: pino requires object first, message string second
      logger.error(
        { resetTimeoutMs: this.opts.resetTimeoutMs },
        `[CircuitBreaker:${this.name}] failure threshold reached ` +
          `(${this.consecutiveFails}/${this.opts.failureThreshold}) — opening circuit`,
      );
      this.state = CircuitState.OPEN;
    }
  }

  /**
   * Called before every request. Checks whether we should move from OPEN
   * to HALF_OPEN based on elapsed time since last failure.
   */
  private evaluateState(): void {
    if (
      this.state === CircuitState.OPEN &&
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.opts.resetTimeoutMs
    ) {
      logger.info(`[CircuitBreaker:${this.name}] reset timeout elapsed — entering HALF_OPEN`);
      this.state = CircuitState.HALF_OPEN;
    }

    // Rolling window: reset failure count if no failure has occurred recently
    if (
      this.state === CircuitState.CLOSED &&
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= (this.opts.rollingWindowMs ?? Infinity)
    ) {
      this.consecutiveFails = 0;
      this.lastFailureTime  = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Chain
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Composes multiple recovery strategies into a priority-ordered chain.
 * Strategies are tried in the order they are added. The first success short-
 * circuits the chain. If all strategies fail, the last error is rethrown.
 *
 * @example
 * const result = await new RecoveryChain<Bill>()
 *   .addRetry(() => api.fetchBill(id), { maxAttempts: 3 })
 *   .addFallback(() => cache.getBill(id), null)
 *   .execute();
 */
export class RecoveryChain<T> {
  private readonly strategies: Array<() => Promise<T>> = [];

  addRetry(fn: () => Promise<T>, options?: RetryOptions): this {
    this.strategies.push(() => withRetry(fn, 'chain-retry', options));
    return this;
  }

  addTimeout(fn: () => Promise<T>, timeoutMs: number, name = 'chain-timeout'): this {
    this.strategies.push(() => withTimeout(fn(), timeoutMs, name));
    return this;
  }

  addFallback(fn: () => Promise<T>, fallbackValue: T): this {
    this.strategies.push(() => withFallback(fn, fallbackValue, 'chain-fallback'));
    return this;
  }

  /** Adds a custom strategy function. If it throws, the chain continues to the next. */
  addStrategy(strategy: () => Promise<T>): this {
    this.strategies.push(strategy);
    return this;
  }

  async execute(): Promise<T> {
    if (this.strategies.length === 0) {
      throw new Error('RecoveryChain has no strategies');
    }

    let lastError: unknown;
    for (const strategy of this.strategies) {
      try {
        return await strategy();
      } catch (error) {
        lastError = error;
        // continue to next strategy
      }
    }

    throw lastError;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Retryability Heuristics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default predicate for deciding whether an error warrants a retry.
 * Covers the most common transient failure signals from Node.js networking,
 * HTTP status codes, and our own TimeoutError.
 */
export function defaultIsRetryable(error: unknown): boolean {
  if (error instanceof TimeoutError)     return true;
  if (error instanceof CircuitOpenError) return false;

  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT'    ||
      code === 'ENOTFOUND'    ||
      code === 'ECONNRESET'
    ) return true;
  }

  if (typeof error === 'object' && error !== null) {
    const status =
      (error as { status?: number; statusCode?: number }).status ??
      (error as { status?: number; statusCode?: number }).statusCode;
    if (status === 408 || status === 429 || (status !== undefined && status >= 500)) {
      return true;
    }
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Utilities
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}