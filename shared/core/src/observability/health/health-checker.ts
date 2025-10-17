import { performance } from 'perf_hooks';
import {
  HealthStatus,
  HealthCheckResult,
  HealthCheck,
  HealthReport,
  HealthOrchestratorOptions,
  HealthMetrics,
  RetryPolicy,
  DEFAULT_CONFIG,
  healthOrchestratorOptionsSchema,
} from './types';

// ==================== Health Check Orchestrator ====================

export class HealthCheckOrchestrator {
  private checks = new Map<string, HealthCheck>();
  private options: Required<HealthOrchestratorOptions>;
  private cache = new Map<string, { result: HealthCheckResult; timestamp: number }>();
  private metrics: HealthMetrics = {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    averageResponseTime: 0,
    uptime: 0,
    checksByStatus: {
      healthy: 0,
      unhealthy: 0,
      degraded: 0,
      unknown: 0,
    },
    checksByComponent: Object.create(null) as Record<string, number>,
  };
  private startTime = Date.now();

  constructor(options: HealthOrchestratorOptions = {}) {
    const validatedOptions = healthOrchestratorOptionsSchema.parse(options);
    this.options = {
      defaultTimeout: validatedOptions.defaultTimeout ?? DEFAULT_CONFIG.DEFAULT_TIMEOUT_MS,
      defaultInterval: validatedOptions.defaultInterval ?? DEFAULT_CONFIG.DEFAULT_INTERVAL_MS,
      maxConcurrentChecks: validatedOptions.maxConcurrentChecks ?? DEFAULT_CONFIG.MAX_CONCURRENT_CHECKS,
      enableCaching: validatedOptions.enableCaching ?? true,
      cacheTtl: validatedOptions.cacheTtl ?? DEFAULT_CONFIG.CACHE_TTL_MS,
      enableMetrics: validatedOptions.enableMetrics ?? true,
      enableTracing: validatedOptions.enableTracing ?? false,
      failFast: validatedOptions.failFast ?? false,
      retryPolicy: validatedOptions.retryPolicy ?? DEFAULT_CONFIG.RETRY_POLICY,
    };
  }

  /**
   * Register a health check
   */
  register(check: HealthCheck): void {
    this.checks.set(check.name, {
      ...check,
      timeout: check.timeout ?? this.options.defaultTimeout,
      interval: check.interval ?? this.options.defaultInterval,
      enabled: check.enabled ?? true,
    });
  }

  /**
   * Unregister a health check
   */
  unregister(name: string): boolean {
    return this.checks.delete(name);
  }

  /**
   * Get a registered health check
   */
  getCheck(name: string): HealthCheck | undefined {
    return this.checks.get(name);
  }

  /**
   * List all registered health checks
   */
  listChecks(): HealthCheck[] {
    return Array.from(this.checks.values());
  }

  /**
   * Run all enabled health checks
   */
  async runAllChecks(): Promise<HealthReport> {
    const startTime = performance.now();
    const enabledChecks = Array.from(this.checks.values()).filter(check => check.enabled);

    if (enabledChecks.length === 0) {
      return this.createEmptyReport();
    }

    // Run checks with concurrency control
    const results = await this.runChecksConcurrently(enabledChecks);

    const duration = performance.now() - startTime;
    const report = this.createReport(results, duration);

    // Update metrics
    if (this.options.enableMetrics) {
      this.updateMetrics(report);
    }

    return report;
  }

  /**
   * Run a specific health check
   */
  async runCheck(name: string): Promise<HealthCheckResult> {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }

    if (!check.enabled) {
      throw new Error(`Health check '${name}' is disabled`);
    }

    // Check cache first
    if (this.options.enableCaching) {
      const cached = this.getCachedResult(name);
      if (cached) {
        return cached;
      }
    }

    const result = await this.executeCheckWithRetry(check);

    // Cache the result
    if (this.options.enableCaching) {
      this.setCachedResult(name, result);
    }

    return result;
  }

  /**
   * Run checks concurrently with limit
   */
  private async runChecksConcurrently(checks: HealthCheck[]): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {};
    const semaphore = new Semaphore(this.options.maxConcurrentChecks);

    const promises = checks.map(async (check) => {
      const release = await semaphore.acquire();

      try {
        // Check dependencies first
        if (check.dependencies && check.dependencies.length > 0) {
          const dependencyResults = await Promise.all(
            check.dependencies.map(dep => this.runCheck(dep).catch(() => null))
          );

          const failedDeps = check.dependencies.filter((_, index) => {
            const result = dependencyResults[index];
            return !result || result.status !== 'healthy';
          });

          if (failedDeps.length > 0) {
            results[check.name] = {
              status: 'unhealthy',
              message: `Dependencies failed: ${failedDeps.join(', ')}`,
              timestamp: new Date(),
              duration: 0,
            };
            return;
          }
        }

        const result = await this.executeCheckWithRetry(check);
        results[check.name] = result;

        // Fail fast if enabled and check failed
        if (this.options.failFast && result.status === 'unhealthy') {
          throw new Error(`Health check '${check.name}' failed with failFast enabled`);
        }
      } finally {
        release();
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Execute a health check with retry logic
   */
  private async executeCheckWithRetry(check: HealthCheck): Promise<HealthCheckResult> {
    const retryPolicy = this.options.retryPolicy;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        const result = await this.executeCheck(check);

        // If successful or this is the last attempt, return the result
        if (result.status === 'healthy' || attempt === retryPolicy.maxAttempts) {
          return result;
        }

        // If degraded and we allow it, return the result
        if (result.status === 'degraded') {
          return result;
        }

        lastError = result.error || new Error(result.message || 'Health check failed');

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // Wait before retry (except on last attempt)
      if (attempt < retryPolicy.maxAttempts) {
        const delay = Math.min(
          retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier, attempt - 1),
          retryPolicy.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All attempts failed
    return {
      status: 'unhealthy',
      message: `Health check failed after ${retryPolicy.maxAttempts} attempts`,
      timestamp: new Date(),
      duration: 0,
      ...(lastError && { error: lastError }),
    };
  }

  /**
   * Execute a single health check with timeout
   */
  private async executeCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = performance.now();

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), check.timeout);
      });

      const result = await Promise.race([
        check.check(),
        timeoutPromise,
      ]);

      const duration = performance.now() - startTime;

      return {
        ...result,
        timestamp: new Date(),
        duration,
      };

    } catch (error) {
      const duration = performance.now() - startTime;

      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        duration,
        ...(error instanceof Error && { error }),
      };
    }
  }

  /**
   * Create a health report from results
   */
  private createReport(results: Record<string, HealthCheckResult>, duration: number): HealthReport {
    const checks = Object.values(results);
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unknown: checks.filter(c => c.status === 'unknown').length,
    };

    // Determine overall status
    let overallStatus: HealthStatus = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    } else if (summary.unknown > 0) {
      overallStatus = 'unknown';
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      duration,
      checks: results,
      summary,
    };
  }

  /**
   * Create an empty health report
   */
  private createEmptyReport(): HealthReport {
    return {
      status: 'unknown',
      timestamp: new Date(),
      duration: 0,
      checks: {},
      summary: {
        total: 0,
        healthy: 0,
        unhealthy: 0,
        degraded: 0,
        unknown: 0,
      },
    };
  }

  /**
   * Get cached result if valid
   */
  private getCachedResult(name: string): HealthCheckResult | null {
    const cached = this.cache.get(name);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.options.cacheTtl) {
      this.cache.delete(name);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache a result
   */
  private setCachedResult(name: string, result: HealthCheckResult): void {
    this.cache.set(name, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Update metrics based on report
   */
  private updateMetrics(report: HealthReport): void {
    this.metrics.totalChecks++;
    this.metrics.lastCheckTime = report.timestamp;

    // Reset status counts
    this.metrics.checksByStatus = {
      healthy: 0,
      unhealthy: 0,
      degraded: 0,
      unknown: 0,
    };

    // Update status counts and component counts
    for (const [name, result] of Object.entries(report.checks)) {
      this.metrics.checksByStatus[result.status]++;

      const component = name.split(':')[0]; // Extract component from check name
      if (component) {
        const existing = component in this.metrics.checksByComponent
          ? this.metrics.checksByComponent[component]!
          : 0;
        this.metrics.checksByComponent[component] = existing + 1;
      }

      if (result.status === 'healthy') {
        this.metrics.successfulChecks++;
      } else {
        this.metrics.failedChecks++;
      }

      // Update average response time
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * (this.metrics.totalChecks - 1) + result.duration) /
        this.metrics.totalChecks;
    }

    this.metrics.uptime = (Date.now() - this.startTime) / 1000;
  }

  /**
   * Get current health metrics
   */
  getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all cached results
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Enable or disable a health check
   */
  setCheckEnabled(name: string, enabled: boolean): boolean {
    const check = this.checks.get(name);
    if (check) {
      check.enabled = enabled;
      return true;
    }
    return false;
  }
}

// ==================== Semaphore for Concurrency Control ====================

class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) next();
    }
  }
}

// ==================== Default Health Check Orchestrator ====================

export const healthOrchestrator = new HealthCheckOrchestrator();