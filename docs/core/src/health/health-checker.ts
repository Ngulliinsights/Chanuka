import { HealthStatus, HealthCheck, HealthResult, OverallHealth } from './types';
import { Logger } from '../logging';

export interface HealthCheckerConfig {
  defaultTimeout?: number;
  parallelExecution?: boolean;
  failFast?: boolean;
  cacheMs?: number;
  includeTags?: string[];
  excludeTags?: string[];
  environment?: string;
  version?: string;
}

interface CachedResult {
  result: HealthResult;
  timestamp: number;
}

export class HealthChecker {
  private checks: Map<string, HealthCheck> = new Map();
  private cache: Map<string, CachedResult> = new Map();
  private lastResults: Map<string, HealthResult> = new Map();
  private startTime: number = Date.now();
  private logger: Logger;
  private config: Required<HealthCheckerConfig>;

  constructor(config: HealthCheckerConfig = {}) {
    this.config = {
      defaultTimeout: 5000,
      parallelExecution: true,
      failFast: false,
      cacheMs: 0,
      includeTags: [],
      excludeTags: [],
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      ...config
    };

    this.logger = Logger.getInstance();
  }

  /**
   * Register a health check
   */
  registerCheck(check: HealthCheck): void {
    if (this.checks.has(check.name)) {
      throw new Error(`Health check with name '${check.name}' already exists`);
    }
    
    this.checks.set(check.name, check);
    
    this.logger.info('Health check registered', {
      name: check.name,
      critical: check.critical || false,
      tags: check.tags || [],
      timeout: check.timeout || this.config.defaultTimeout
    });
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(checkName: string): boolean {
    const removed = this.checks.delete(checkName);
    this.cache.delete(checkName);
    this.lastResults.delete(checkName);
    
    if (removed) {
      this.logger.info('Health check unregistered', { name: checkName });
    }
    
    return removed;
  }

  /**
   * Run all health checks and return overall health status
   */
  async checkHealth(): Promise<OverallHealth> {
    const filteredChecks = this.getFilteredChecks();
    
    if (filteredChecks.length === 0) {
      return this.buildEmptyResponse();
    }

    const checkResults = await this.executeChecks(filteredChecks);
    return this.buildHealthResponse(checkResults);
  }

  /**
   * Get filtered checks based on include/exclude tags
   */
  private getFilteredChecks(): Array<{ name: string; check: HealthCheck }> {
    const allChecks = Array.from(this.checks.entries()).map(([name, check]) => ({ name, check }));
    
    return allChecks.filter(({ check }) => {
      // Filter by include tags
      if (this.config.includeTags.length > 0) {
        const checkTags = check.tags || [];
        if (!this.config.includeTags.some(tag => checkTags.includes(tag))) {
          return false;
        }
      }
      
      // Filter by exclude tags
      if (this.config.excludeTags.length > 0) {
        const checkTags = check.tags || [];
        if (this.config.excludeTags.some(tag => checkTags.includes(tag))) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Execute health checks (parallel or sequential)
   */
  private async executeChecks(
    filteredChecks: Array<{ name: string; check: HealthCheck }>
  ): Promise<Array<{ name: string; result: HealthResult; check: HealthCheck }>> {
    if (this.config.parallelExecution) {
      return this.executeChecksParallel(filteredChecks);
    } else {
      return this.executeChecksSequential(filteredChecks);
    }
  }

  /**
   * Execute checks in parallel
   */
  private async executeChecksParallel(
    filteredChecks: Array<{ name: string; check: HealthCheck }>
  ): Promise<Array<{ name: string; result: HealthResult; check: HealthCheck }>> {
    const promises = filteredChecks.map(async ({ name, check }) => {
      const result = await this.executeCheck(name, check);
      return { name, result, check };
    });

    return Promise.all(promises);
  }

  /**
   * Execute checks sequentially with optional fail-fast
   */
  private async executeChecksSequential(
    filteredChecks: Array<{ name: string; check: HealthCheck }>
  ): Promise<Array<{ name: string; result: HealthResult; check: HealthCheck }>> {
    const results = [];
    
    for (const { name, check } of filteredChecks) {
      const result = await this.executeCheck(name, check);
      results.push({ name, result, check });
      
      // Fail fast if configured and this is a critical check that failed
      if (this.config.failFast && check.critical && result.status === 'unhealthy') {
        this.logger.warn('Failing fast due to critical check failure', { checkName: name });
        break;
      }
    }
    
    return results;
  }

  /**
   * Execute a single health check with timeout protection
   */
  private async executeCheck(name: string, check: HealthCheck): Promise<HealthResult> {
    // Check cache first
    if (this.config.cacheMs > 0) {
      const cached = this.cache.get(name);
      if (cached && Date.now() - cached.timestamp < this.config.cacheMs) {
        this.logger.debug('Using cached health check result', { checkName: name });
        return cached.result;
      }
    }

    const start = Date.now();
    
    try {
      const timeoutMs = check.timeout || this.config.defaultTimeout;
      
      // Execute check with timeout protection using Promise.race
      const result = await Promise.race([
        check.check(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
        )
      ]);
      
      const latencyMs = Date.now() - start;
      
      // Ensure result has required fields
      const timestampedResult: HealthResult = {
        status: result.status,
        latencyMs: result.latencyMs || latencyMs,
        timestamp: new Date().toISOString(),
        ...result
      };
      
      // Cache the result if caching is enabled
      if (this.config.cacheMs > 0) {
        this.cache.set(name, {
          result: timestampedResult,
          timestamp: Date.now()
        });
      }
      
      // Store last result
      this.lastResults.set(name, timestampedResult);
      
      // Log the result for monitoring
      this.logger.debug('Health check completed', {
        checkName: name,
        status: result.status,
        latencyMs: timestampedResult.latencyMs,
        critical: check.critical || false
      });
      
      return timestampedResult;
      
    } catch (error: any) {
      const latencyMs = Date.now() - start;
      const errorResult: HealthResult = {
        status: 'unhealthy',
        latencyMs,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      // Store last result
      this.lastResults.set(name, errorResult);
      
      this.logger.error('Health check failed', {
        checkName: name,
        error: error.message,
        latencyMs,
        critical: check.critical || false
      });
      
      return errorResult;
    }
  }

  /**
   * Build health response from check results
   */
  private buildHealthResponse(
    checkResults: Array<{ name: string; result: HealthResult; check: HealthCheck }>
  ): OverallHealth {
    const checks: Record<string, HealthResult & { critical: boolean; tags: string[] }> = {};
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;
    let criticalFailures = 0;
    
    for (const { name, result, check } of checkResults) {
      checks[name] = {
        ...result,
        critical: check.critical || false,
        tags: check.tags || []
      };
      
      switch (result.status) {
        case 'healthy':
          healthyCount++;
          break;
        case 'degraded':
          degradedCount++;
          break;
        case 'unhealthy':
          unhealthyCount++;
          if (check.critical) {
            criticalFailures++;
          }
          break;
      }
    }
    
    // Determine overall status
    const overallStatus = this.determineOverallStatus(criticalFailures, degradedCount, unhealthyCount);
    
    return {
      status: overallStatus,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: this.config.environment,
      version: this.config.version,
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        total: checkResults.length,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        critical_failures: criticalFailures
      }
    };
  }

  /**
   * Build empty response when no checks are registered
   */
  private buildEmptyResponse(): OverallHealth {
    return {
      status: 'healthy',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: this.config.environment,
      version: this.config.version,
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        total: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        critical_failures: 0
      }
    };
  }

  /**
   * Determine overall system health status
   */
  private determineOverallStatus(
    criticalFailures: number,
    degradedCount: number,
    unhealthyCount: number
  ): HealthStatus {
    if (criticalFailures > 0) {
      return 'unhealthy';
    }
    if (unhealthyCount > 0 || degradedCount > 0) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Get the last results from all checks
   */
  getLastResults(): Map<string, HealthResult> {
    return new Map(this.lastResults);
  }

  /**
   * Get a specific check result
   */
  getCheckResult(checkName: string): HealthResult | undefined {
    return this.lastResults.get(checkName);
  }

  /**
   * Clear all cached results
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Health check cache cleared');
  }

  /**
   * Get health checker statistics
   */
  getStats(): {
    registeredChecks: number;
    cachedResults: number;
    uptime: number;
    config: HealthCheckerConfig;
  } {
    return {
      registeredChecks: this.checks.size,
      cachedResults: this.cache.size,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      config: { ...this.config }
    };
  }
}
