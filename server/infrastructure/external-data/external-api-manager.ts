/**
 * Unified External API Management Service
 * 
 * Comprehensive API management with:
 * - Multi-tier rate limiting and quota management
 * - Advanced health monitoring with circuit breakers
 * - Intelligent caching with optimization rules
 * - Cost tracking and budget alerts
 * - Failover and load balancing
 * - Performance baselines and analytics
 * - Request batching and optimization
 */

import { EventEmitter } from 'events';
// Note: ioredis needs to be installed: npm install ioredis @types/ioredis
// import { Redis } from 'ioredis';
import { ExternalAPIErrorHandler, ErrorSeverity } from '../../services/external-api-error-handler';
import { APICostMonitoringService } from '../../services/api-cost-monitoring';
import { logger } from '@shared/core';

// ============================================================================
// Core Types and Interfaces
// ============================================================================

interface APIQuota {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  requestsPerMonth: number;
  costPerRequest?: number;
  maxConcurrentRequests?: number;
}

interface RateLimitState {
  requests: number;
  resetTime: number;
  windowType: 'minute' | 'hour' | 'day' | 'month';
}

interface APIHealthStatus {
  source: string;
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  responseTime: number;
  successRate: number;
  errorRate: number;
  lastChecked: Date;
  uptime: number;
  downtimeEvents: DowntimeEvent[];
  consecutiveFailures: number;
}

interface DowntimeEvent {
  startTime: Date;
  endTime?: Date;
  reason: string;
  severity: ErrorSeverity;
}

interface APIUsageMetrics {
  source: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalCost: number;
  quotaUtilization: {
    minute: number;
    hour: number;
    day: number;
    month: number;
  };
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
    averageResponseTime: number;
  }>;
  errorBreakdown: Record<string, number>;
}

interface CacheEntry {
  data: any;
  timestamp: Date;
  ttl: number;
  hits: number;
  lastAccessed: Date;
  size: number;
}

interface APIConfiguration {
  source: string;
  baseUrl: string;
  apiKey?: string;
  quota: APIQuota;
  timeout: number;
  retryAttempts: number;
  priority: number;
  healthCheckEndpoint?: string;
  healthCheckInterval: number;
  cacheTTL: number;
  enableCaching: boolean;
  enableMetrics: boolean;
  failoverSources?: string[];
  circuitBreaker?: CircuitBreakerConfig;
}

interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxCalls: number;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  halfOpenCalls: number;
}

interface PerformanceBaseline {
  source: string;
  endpoint: string;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  successRate: number;
  lastUpdated: Date;
  sampleSize: number;
  responseTimes: number[];
}

interface OptimizationRule {
  id: string;
  source: string;
  type: 'caching' | 'batching' | 'compression' | 'prefetching';
  enabled: boolean;
  priority: number;
  config: Record<string, any>;
}

interface APIRequestResult {
  success: boolean;
  data?: any;
  cached: boolean;
  responseTime: number;
  quotaRemaining: {
    minute: number;
    hour: number;
    day: number;
    month: number;
  };
  requestId: string;
  error?: {
    type: string;
    message: string;
    [key: string]: any;
  };
}

interface QueuedRequest {
  resolve: Function;
  reject: Function;
  request: any;
}

// ============================================================================
// Main Service Class
// ============================================================================

export class UnifiedExternalAPIManagementService extends EventEmitter {
  private configurations: Map<string, APIConfiguration> = new Map();
  private rateLimiters: Map<string, Map<string, RateLimitState>> = new Map();
  private healthStatuses: Map<string, APIHealthStatus> = new Map();
  private usageMetrics: Map<string, APIUsageMetrics> = new Map();
  private responseCache: Map<string, CacheEntry> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private performanceBaselines: Map<string, PerformanceBaseline> = new Map();
  private optimizationRules: Map<string, OptimizationRule> = new Map();

  private errorHandler: ExternalAPIErrorHandler;
  private costMonitoring: APICostMonitoringService;
  // private redis: Redis; // Commented out until ioredis is installed

  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private concurrentRequests: Map<string, number> = new Map();
  private requestQueue: Map<string, Array<QueuedRequest>> = new Map();
  private batchingTimers: Map<string, NodeJS.Timeout> = new Map();
  private cleanupIntervals: NodeJS.Timeout[] = [];

  constructor(redisUrl?: string) {
    super();
    this.errorHandler = new ExternalAPIErrorHandler();
    this.costMonitoring = new APICostMonitoringService();
    // this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');

    this.initializeDefaultConfigurations();
    this.setupCleanupIntervals();
    this.setupEventListeners();
  }

  // ========================================================================
  // Configuration Management
  // ========================================================================

  private initializeDefaultConfigurations(): void {
    // Parliament of Canada API
    this.addAPIConfiguration({
      source: 'parliament-ca',
      baseUrl: 'https://www.ourcommons.ca/members/en/search/xml',
      quota: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        requestsPerMonth: 300000,
        costPerRequest: 0.001,
        maxConcurrentRequests: 5
      },
      timeout: 30000,
      retryAttempts: 3,
      priority: 10,
      healthCheckEndpoint: '/health',
      healthCheckInterval: 60000,
      cacheTTL: 300000,
      enableCaching: true,
      enableMetrics: true,
      failoverSources: ['openparliament'],
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        recoveryTimeout: 60000,
        halfOpenMaxCalls: 3
      }
    });

    // Ontario Legislature API
    this.addAPIConfiguration({
      source: 'ontario-legislature',
      baseUrl: 'https://www.ola.org/en/legislative-business/bills',
      quota: {
        requestsPerMinute: 30,
        requestsPerHour: 500,
        requestsPerDay: 5000,
        requestsPerMonth: 150000,
        costPerRequest: 0.002,
        maxConcurrentRequests: 3
      },
      timeout: 30000,
      retryAttempts: 3,
      priority: 8,
      healthCheckInterval: 120000,
      cacheTTL: 600000,
      enableCaching: true,
      enableMetrics: true,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        recoveryTimeout: 60000,
        halfOpenMaxCalls: 3
      }
    });

    // OpenParliament.ca API
    this.addAPIConfiguration({
      source: 'openparliament',
      baseUrl: 'https://openparliament.ca/api',
      quota: {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 20000,
        requestsPerMonth: 600000,
        costPerRequest: 0.0005,
        maxConcurrentRequests: 8
      },
      timeout: 30000,
      retryAttempts: 3,
      priority: 7,
      healthCheckEndpoint: '/status',
      healthCheckInterval: 90000,
      cacheTTL: 180000,
      enableCaching: true,
      enableMetrics: true,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        recoveryTimeout: 60000,
        halfOpenMaxCalls: 3
      }
    });
  }

  addAPIConfiguration(config: APIConfiguration): void {
    this.configurations.set(config.source, config);
    this.initializeSourceManagement(config);
    console.log(`✅ Configured API source: ${config.source}`);
  }

  private initializeSourceManagement(config: APIConfiguration): void {
    // Initialize rate limiters
    const rateLimitMap = new Map<string, RateLimitState>();
    const now = Date.now();
    rateLimitMap.set('minute', { requests: 0, resetTime: now + 60000, windowType: 'minute' });
    rateLimitMap.set('hour', { requests: 0, resetTime: now + 3600000, windowType: 'hour' });
    rateLimitMap.set('day', { requests: 0, resetTime: now + 86400000, windowType: 'day' });
    rateLimitMap.set('month', { requests: 0, resetTime: now + 2592000000, windowType: 'month' });
    this.rateLimiters.set(config.source, rateLimitMap);

    // Initialize health status
    this.healthStatuses.set(config.source, {
      source: config.source,
      status: 'healthy',
      responseTime: 0,
      // successRate is a proportion (0-1) used throughout update logic
      successRate: 1,
      errorRate: 0,
      lastChecked: new Date(),
      uptime: 100,
      downtimeEvents: [],
      consecutiveFailures: 0
    });

    // Initialize usage metrics
    this.usageMetrics.set(config.source, {
      source: config.source,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalCost: 0,
      quotaUtilization: { minute: 0, hour: 0, day: 0, month: 0 },
      topEndpoints: [],
      errorBreakdown: {}
    });

    // Initialize circuit breaker if enabled
    if (config.circuitBreaker?.enabled) {
      this.circuitBreakers.set(config.source, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        halfOpenCalls: 0
      });
    }

    // Initialize concurrent request counter
    this.concurrentRequests.set(config.source, 0);

    // Start health monitoring
    this.startHealthMonitoring(config.source);
  }

  // ========================================================================
  // Request Execution
  // ========================================================================

  async makeRequest(
    source: string,
    endpoint: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
      bypassCache?: boolean;
      priority?: 'low' | 'normal' | 'high';
      params?: Record<string, any>;
    } = {}
  ): Promise<APIRequestResult> {
    const startTime = Date.now();
    const config = this.configurations.get(source);

    if (!config) {
      throw new Error(`Unknown API source: ${source}`);
    }

    const requestId = this.generateRequestId();

    try {
      // Check circuit breaker first
      if (config.circuitBreaker?.enabled) {
        const circuitCheck = this.checkCircuitBreaker(source);
        if (!circuitCheck.allowed) {
          return this.createErrorResponse(source, requestId, 'CIRCUIT_BREAKER_OPEN',
            `Circuit breaker is open for ${source}. Recovery in ${circuitCheck.recoveryTime}ms`, startTime);
        }
      }

      // Check cache
      if (!options.bypassCache && config.enableCaching) {
        const cached = this.getCachedResponse(source, endpoint, options.params);
        if (cached) {
          this.updateMetrics(source, endpoint, Date.now() - startTime, true, true);
          return {
            success: true,
            data: cached.data,
            cached: true,
            responseTime: Date.now() - startTime,
            quotaRemaining: this.getQuotaRemaining(source),
            requestId
          };
        }
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(source);
      if (!rateLimitCheck.allowed) {
        return this.createErrorResponse(source, requestId, 'RATE_LIMIT_EXCEEDED',
          `Rate limit exceeded. Reset in ${rateLimitCheck.resetIn}ms`, startTime);
      }

      // Check concurrent requests
      const currentConcurrent = this.concurrentRequests.get(source) || 0;
      if (config.quota.maxConcurrentRequests && currentConcurrent >= config.quota.maxConcurrentRequests) {
        return this.createErrorResponse(source, requestId, 'CONCURRENT_LIMIT_EXCEEDED',
          'Maximum concurrent requests exceeded', startTime);
      }

      // Execute request
      this.concurrentRequests.set(source, currentConcurrent + 1);

      try {
        const result = await this.executeHTTPRequest(source, endpoint, options);

        // Update circuit breaker on success
        if (config.circuitBreaker?.enabled) {
          this.recordCircuitBreakerSuccess(source);
        }

        // Cache successful responses
        if (result.success && config.enableCaching && !options.bypassCache) {
          this.cacheResponse(source, endpoint, options.params, result.data, config.cacheTTL);
        }

        // Update metrics and performance baselines
        this.updateMetrics(source, endpoint, result.responseTime, result.success, false);
        this.updatePerformanceBaseline(source, endpoint, result.responseTime, result.success);
        this.updateRateLimit(source);

        if (result.success) {
          this.costMonitoring.recordRequestCost(source, 1);
        }

        return {
          ...result,
          cached: false,
          quotaRemaining: this.getQuotaRemaining(source),
          requestId
        };

      } finally {
        this.concurrentRequests.set(source, Math.max(0, currentConcurrent));
      }

    } catch (error) {
      // Update circuit breaker on failure
      if (config.circuitBreaker?.enabled) {
        this.recordCircuitBreakerFailure(source);
      }

      // Attempt failover if configured
      if (config.failoverSources && config.failoverSources.length > 0) {
        const failoverResult = await this.attemptFailover(source, endpoint, options, config.failoverSources);
        if (failoverResult) {
          return failoverResult;
        }
      }

      this.updateMetrics(source, endpoint, Date.now() - startTime, false, false);
      return this.createErrorResponse(source, requestId, 'REQUEST_FAILED',
        error instanceof Error ? error.message : 'Unknown error', startTime);
    }
  }

  private async executeHTTPRequest(
    source: string,
    endpoint: string,
    options: any
  ): Promise<{ success: boolean; data?: any; responseTime: number }> {
    const config = this.configurations.get(source)!;
    const startTime = Date.now();

    const url = `${config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Chanuka-Legislative-Platform/1.0',
      ...options.headers
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      this.updateHealthStatus(source, responseTime, true);

      return { success: true, data, responseTime };

    } catch (error) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      this.updateHealthStatus(source, responseTime, false);
      throw error;
    }
  }

  // ========================================================================
  // Circuit Breaker Logic
  // ========================================================================

  private checkCircuitBreaker(source: string): { allowed: boolean; recoveryTime?: number } {
    const breaker = this.circuitBreakers.get(source);
    const config = this.configurations.get(source)?.circuitBreaker;

    if (!breaker || !config) {
      return { allowed: true };
    }

    const now = Date.now();

    switch (breaker.state) {
      case 'closed':
        return { allowed: true };

      case 'open':
        if (now >= breaker.nextAttemptTime) {
          breaker.state = 'half-open';
          breaker.halfOpenCalls = 0;
          this.emit('circuitBreakerHalfOpen', { source });
          return { allowed: true };
        }
        return {
          allowed: false,
          recoveryTime: breaker.nextAttemptTime - now
        };

      case 'half-open':
        if (breaker.halfOpenCalls < config.halfOpenMaxCalls) {
          breaker.halfOpenCalls++;
          return { allowed: true };
        }
        return { allowed: false };
    }
  }

  private recordCircuitBreakerSuccess(source: string): void {
    const breaker = this.circuitBreakers.get(source);
    if (!breaker) return;

    if (breaker.state === 'half-open') {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      this.emit('circuitBreakerClosed', { source });
    } else if (breaker.state === 'closed') {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
    }
  }

  private recordCircuitBreakerFailure(source: string): void {
    const breaker = this.circuitBreakers.get(source);
    const config = this.configurations.get(source)?.circuitBreaker;

    if (!breaker || !config) return;

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failureCount >= config.failureThreshold) {
      breaker.state = 'open';
      breaker.nextAttemptTime = Date.now() + config.recoveryTimeout;
      this.emit('circuitBreakerOpen', { source, failureCount: breaker.failureCount });
    }
  }

  // ========================================================================
  // Rate Limiting
  // ========================================================================

  private async checkRateLimit(source: string): Promise<{ allowed: boolean; resetIn?: number }> {
    const config = this.configurations.get(source)!;
    const rateLimitMap = this.rateLimiters.get(source)!;
    const now = Date.now();

    const windows = [
      { key: 'minute', limit: config.quota.requestsPerMinute, duration: 60000 },
      { key: 'hour', limit: config.quota.requestsPerHour, duration: 3600000 },
      { key: 'day', limit: config.quota.requestsPerDay, duration: 86400000 },
      { key: 'month', limit: config.quota.requestsPerMonth, duration: 2592000000 }
    ];

    for (const window of windows) {
      const limiter = rateLimitMap.get(window.key)!;

      if (now >= limiter.resetTime) {
        limiter.requests = 0;
        limiter.resetTime = now + window.duration;
      }

      if (limiter.requests >= window.limit) {
        return {
          allowed: false,
          resetIn: limiter.resetTime - now
        };
      }
    }

    return { allowed: true };
  }

  private updateRateLimit(source: string): void {
    const rateLimitMap = this.rateLimiters.get(source)!;

    for (const [key, limiter] of Array.from(rateLimitMap.entries())) {
      limiter.requests++;
    }
  }

  private getQuotaRemaining(source: string): {
    minute: number;
    hour: number;
    day: number;
    month: number;
  } {
    const config = this.configurations.get(source)!;
    const rateLimitMap = this.rateLimiters.get(source)!;

    return {
      minute: config.quota.requestsPerMinute - (rateLimitMap.get('minute')?.requests || 0),
      hour: config.quota.requestsPerHour - (rateLimitMap.get('hour')?.requests || 0),
      day: config.quota.requestsPerDay - (rateLimitMap.get('day')?.requests || 0),
      month: config.quota.requestsPerMonth - (rateLimitMap.get('month')?.requests || 0)
    };
  }

  // ========================================================================
  // Caching
  // ========================================================================

  private cacheResponse(source: string, endpoint: string, params: any, data: any, ttl: number): void {
    const cacheKey = this.generateCacheKey(source, endpoint, params);
    const dataSize = JSON.stringify(data).length;

    this.responseCache.set(cacheKey, {
      data,
      timestamp: new Date(),
      ttl,
      hits: 0,
      lastAccessed: new Date(),
      size: dataSize
    });

    this.emit('cacheSet', { source, endpoint, size: dataSize });
  }

  private getCachedResponse(source: string, endpoint: string, params: any): CacheEntry | null {
    const cacheKey = this.generateCacheKey(source, endpoint, params);
    const cached = this.responseCache.get(cacheKey);

    if (!cached) return null;

    const now = new Date();
    const age = now.getTime() - cached.timestamp.getTime();

    if (age > cached.ttl) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    cached.hits++;
    cached.lastAccessed = now;

    this.emit('cacheHit', { source, endpoint, hits: cached.hits });

    return cached;
  }

  private generateCacheKey(source: string, endpoint: string, params: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${source}:${endpoint}:${paramsStr}`;
  }

  clearCache(source?: string): number {
    let clearedCount = 0;

    if (source) {
      const keysToDelete = Array.from(this.responseCache.keys()).filter(key => key.startsWith(`${source}:`));
      keysToDelete.forEach(key => {
        this.responseCache.delete(key);
        clearedCount++;
      });
    } else {
      clearedCount = this.responseCache.size;
      this.responseCache.clear();
    }

    this.emit('cacheCleared', { source, clearedCount });
    return clearedCount;
  }

  // ========================================================================
  // Health Monitoring
  // ========================================================================

  private startHealthMonitoring(source: string): void {
    const config = this.configurations.get(source)!;

    if (this.healthCheckIntervals.has(source)) {
      clearInterval(this.healthCheckIntervals.get(source)!);
    }

    const interval = setInterval(async () => {
      await this.performHealthCheck(source);
    }, config.healthCheckInterval);

    this.healthCheckIntervals.set(source, interval);
    this.performHealthCheck(source);
  }

  private async performHealthCheck(source: string): Promise<void> {
    const config = this.configurations.get(source)!;

    try {
      const startTime = Date.now();
      const healthEndpoint = config.healthCheckEndpoint || '/health';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${config.baseUrl}${healthEndpoint}`, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        this.updateHealthStatus(source, responseTime, true);
      } else {
        this.updateHealthStatus(source, responseTime, false);
        this.recordDowntimeEvent(source, `Health check failed: HTTP ${response.status}`, ErrorSeverity.MEDIUM);
      }

    } catch (error) {
      this.updateHealthStatus(source, 0, false);
      this.recordDowntimeEvent(source, `Health check failed: ${error instanceof Error ? error.message : String(error)}`, ErrorSeverity.HIGH);
    }
  }

  private updateHealthStatus(source: string, responseTime: number, success: boolean): void {
    let healthStatus = this.healthStatuses.get(source);
    if (!healthStatus) {
      // Lazily initialize a default health status if missing to avoid runtime errors
      healthStatus = {
        source,
        status: 'degraded',
        responseTime: responseTime || 0,
        successRate: success ? 1 : 0,
        errorRate: success ? 0 : 1,
        lastChecked: new Date(),
        uptime: 0,
        downtimeEvents: [],
        consecutiveFailures: success ? 0 : 1
      } as APIHealthStatus;
      this.healthStatuses.set(source, healthStatus);
    }

    if (responseTime > 0) {
      healthStatus.responseTime = healthStatus.responseTime === 0
        ? responseTime
        : (healthStatus.responseTime * 0.8) + (responseTime * 0.2);
    }

  // Ensure numeric values
  healthStatus.successRate = typeof healthStatus.successRate === 'number' ? healthStatus.successRate : 0;
  healthStatus.errorRate = typeof healthStatus.errorRate === 'number' ? healthStatus.errorRate : 0;
  const totalChecks = healthStatus.successRate + healthStatus.errorRate;
    if (success) {
      healthStatus.successRate = ((healthStatus.successRate * totalChecks) + 1) / (totalChecks + 1);
      healthStatus.errorRate = (healthStatus.errorRate * totalChecks) / (totalChecks + 1);
      healthStatus.consecutiveFailures = 0;
    } else {
      healthStatus.errorRate = ((healthStatus.errorRate * totalChecks) + 1) / (totalChecks + 1);
      healthStatus.successRate = (healthStatus.successRate * totalChecks) / (totalChecks + 1);
      healthStatus.consecutiveFailures++;
    }

    if (healthStatus.successRate >= 0.95) {
      healthStatus.status = 'healthy';
    } else if (healthStatus.successRate >= 0.8) {
      healthStatus.status = 'degraded';
    } else {
      healthStatus.status = 'down';
    }

    healthStatus.lastChecked = new Date();

    this.emit('healthStatusChange', { source, status: healthStatus.status, responseTime });
  }

  private recordDowntimeEvent(source: string, reason: string, severity: ErrorSeverity): void {
    let healthStatus = this.healthStatuses.get(source);

    // If no health status exists for the source, initialize a minimal default to avoid crashes
    if (!healthStatus) {
      logger.warn(`recordDowntimeEvent called for unregistered source '${source}'. Initializing default health status.`);
      healthStatus = {
        source,
        status: 'down',
        responseTime: 0,
        successRate: 0,
        errorRate: 1,
        lastChecked: new Date(),
        uptime: 0,
        downtimeEvents: [],
        consecutiveFailures: 1
      } as APIHealthStatus;
      this.healthStatuses.set(source, healthStatus);
    }

    const lastEvent = healthStatus.downtimeEvents[healthStatus.downtimeEvents.length - 1];

    if (lastEvent && !lastEvent.endTime && lastEvent.reason === reason) {
      return;
    }

    healthStatus.downtimeEvents.push({
      startTime: new Date(),
      reason,
      severity
    });

    if (healthStatus.downtimeEvents.length > 50) {
      healthStatus.downtimeEvents = healthStatus.downtimeEvents.slice(-50);
    }

    this.emit('downtimeEvent', { source, reason, severity });
  }

  // ========================================================================
  // Performance Baselines
  // ========================================================================

  private updatePerformanceBaseline(source: string, endpoint: string, responseTime: number, success: boolean): void {
    const key = `${source}:${endpoint}`;
    let baseline = this.performanceBaselines.get(key);

    if (!baseline) {
      baseline = {
        source,
        endpoint,
        averageResponseTime: responseTime,
        p95ResponseTime: responseTime,
        p99ResponseTime: responseTime,
        successRate: success ? 100 : 0,
        lastUpdated: new Date(),
        sampleSize: 1,
        responseTimes: [responseTime]
      };
      this.performanceBaselines.set(key, baseline);
    } else {
      baseline.responseTimes.push(responseTime);
      if (baseline.responseTimes.length > 1000) {
        baseline.responseTimes = baseline.responseTimes.slice(-1000);
      }

      baseline.sampleSize++;
      baseline.averageResponseTime = (baseline.averageResponseTime * (baseline.sampleSize - 1) + responseTime) / baseline.sampleSize;

      const sorted = [...baseline.responseTimes].sort((a, b) => a - b);
      baseline.p95ResponseTime = sorted[Math.floor(sorted.length * 0.95)];
      baseline.p99ResponseTime = sorted[Math.floor(sorted.length * 0.99)];

      baseline.successRate = success
        ? (baseline.successRate * (baseline.sampleSize - 1) + 100) / baseline.sampleSize
        : (baseline.successRate * (baseline.sampleSize - 1)) / baseline.sampleSize;

      baseline.lastUpdated = new Date();
    }

    if (responseTime > baseline.p99ResponseTime * 1.5) {
      this.emit('performanceAnomaly', { source, endpoint, responseTime, baseline: baseline.p99ResponseTime });
    }
  }

  // ========================================================================
  // Failover Management
  // ========================================================================

  private async attemptFailover(
    source: string,
    endpoint: string,
    options: any,
    failoverSources: string[]
  ): Promise<APIRequestResult | null> {
    for (const fallbackSource of failoverSources) {
      const fallbackConfig = this.configurations.get(fallbackSource);
      if (!fallbackConfig) continue;

      const fallbackHealth = this.healthStatuses.get(fallbackSource);
      if (fallbackHealth?.status === 'down') continue;

      try {
        console.log(`🔄 Attempting failover from ${source} to ${fallbackSource}`);

        const result = await this.makeRequest(fallbackSource, endpoint, options);

        if (result.success) {
          this.emit('failoverSuccess', { primary: source, fallback: fallbackSource });
          return result;
        }
      } catch (error) {
        console.error(`Failover to ${fallbackSource} failed:`, error);
      }
    }

    this.emit('failoverFailed', { source, attemptedSources: failoverSources });
    return null;
  }

  // ========================================================================
  // Metrics and Analytics
  // ========================================================================

  private updateMetrics(source: string, endpoint: string, responseTime: number, success: boolean, fromCache: boolean): void {
    const metrics = this.usageMetrics.get(source)!;
    const config = this.configurations.get(source)!;

    metrics.totalRequests++;

    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    metrics.averageResponseTime = metrics.averageResponseTime === 0
      ? responseTime
      : (metrics.averageResponseTime * 0.9) + (responseTime * 0.1);

    if (!fromCache && config.quota.costPerRequest) {
      metrics.totalCost += config.quota.costPerRequest;
    }

    const rateLimitMap = this.rateLimiters.get(source)!;
    metrics.quotaUtilization = {
      minute: ((rateLimitMap.get('minute')?.requests || 0) / config.quota.requestsPerMinute) * 100,
      hour: ((rateLimitMap.get('hour')?.requests || 0) / config.quota.requestsPerHour) * 100,
      day: ((rateLimitMap.get('day')?.requests || 0) / config.quota.requestsPerDay) * 100,
      month: ((rateLimitMap.get('month')?.requests || 0) / config.quota.requestsPerMonth) * 100
    };

    const existingEndpoint = metrics.topEndpoints.find(e => e.endpoint === endpoint);
    if (existingEndpoint) {
      existingEndpoint.requests++;
      existingEndpoint.averageResponseTime = (existingEndpoint.averageResponseTime * 0.9) + (responseTime * 0.1);
    } else {
      metrics.topEndpoints.push({ endpoint, requests: 1, averageResponseTime: responseTime });
    }

    metrics.topEndpoints.sort((a, b) => b.requests - a.requests);
    metrics.topEndpoints = metrics.topEndpoints.slice(0, 10);
  }

  getAPIAnalytics(source?: string) {
    const sources = source ? [source] : Array.from(this.usageMetrics.keys());
    const metricsData = sources.map(s => this.usageMetrics.get(s)!).filter(Boolean);

    const totalRequests = metricsData.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalCost = metricsData.reduce((sum, m) => sum + m.totalCost, 0);
    const totalSuccessful = metricsData.reduce((sum, m) => sum + m.successfulRequests, 0);

    const averageResponseTime = metricsData.length > 0
      ? metricsData.reduce((sum, m) => sum + m.averageResponseTime, 0) / metricsData.length
      : 0;

    const overallSuccessRate = totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0;

    const totalCacheHits = Array.from(this.responseCache.values()).reduce((sum, cache) => sum + cache.hits, 0);
    const cacheHitRate = totalRequests > 0 ? (totalCacheHits / totalRequests) * 100 : 0;

    const topPerformingSources = metricsData
      .sort((a, b) => (b.successfulRequests / b.totalRequests) - (a.successfulRequests / a.totalRequests))
      .slice(0, 5)
      .map(m => m.source);

    const costBreakdown: Record<string, number> = {};
    metricsData.forEach(m => { costBreakdown[m.source] = m.totalCost; });

    return {
      sources: metricsData,
      totalRequests,
      totalCost,
      averageResponseTime,
      overallSuccessRate,
      cacheHitRate,
      topPerformingSources,
      costBreakdown
    };
  }

  getHealthStatus(source?: string): APIHealthStatus[] {
    if (source) {
      const status = this.healthStatuses.get(source);
      return status ? [status] : [];
    }
    return Array.from(this.healthStatuses.values());
  }

  getPerformanceBaselines(source?: string): PerformanceBaseline[] {
    if (source) {
      return Array.from(this.performanceBaselines.values())
        .filter(b => b.source === source);
    }
    return Array.from(this.performanceBaselines.values());
  }

  getCacheStatistics() {
    const entries = Array.from(this.responseCache.entries());
    const totalEntries = entries.length;
    const totalSize = entries.reduce((sum, [, cache]) => sum + cache.size, 0);
    const totalHits = entries.reduce((sum, [, cache]) => sum + cache.hits, 0);
    const totalRequests = Array.from(this.usageMetrics.values()).reduce((sum, m) => sum + m.totalRequests, 0);

    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    const topCachedEndpoints = entries
      .map(([key, cache]) => ({
        key,
        hits: cache.hits,
        size: cache.size,
        lastAccessed: cache.lastAccessed
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    return { totalEntries, totalSize, hitRate, topCachedEndpoints };
  }

  getCostMonitoring(): APICostMonitoringService {
    return this.costMonitoring;
  }

  getCostReport() {
    return this.costMonitoring.getCostReport();
  }

  // ========================================================================
  // Event Listeners
  // ========================================================================

  private setupEventListeners(): void {
    this.errorHandler.on('error', (error) => {
      const metrics = this.usageMetrics.get(error.source);
      if (metrics) {
        metrics.errorBreakdown[error.type] = (metrics.errorBreakdown[error.type] || 0) + 1;
      }
    });

    this.errorHandler.on('circuitBreakerOpen', ({ source }) => {
      const healthStatus = this.healthStatuses.get(source);
      if (healthStatus) {
        healthStatus.status = 'down';
        this.recordDowntimeEvent(source, 'Circuit breaker opened', ErrorSeverity.CRITICAL);
      }
    });

    this.costMonitoring.on('costAlert', (alert) => {
      console.warn(`💰 Cost alert for ${alert.source}: ${alert.message}`);
      this.emit('costAlert', alert);
    });

    this.costMonitoring.on('budgetConfigUpdated', (event) => {
      console.log(`💰 Budget configuration updated for ${event.source}`);
      this.emit('budgetConfigUpdated', event);
    });
  }

  // ========================================================================
  // Cleanup and Lifecycle
  // ========================================================================

  private setupCleanupIntervals(): void {
    this.clearCleanupIntervals();

    const cacheCleanupInterval = setInterval(() => {
      const now = new Date();
      let expiredCount = 0;

      for (const [key, cache] of Array.from(this.responseCache.entries())) {
        const age = now.getTime() - cache.timestamp.getTime();
        if (age > cache.ttl) {
          this.responseCache.delete(key);
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        this.emit('cacheExpired', { expiredCount });
      }
    }, 300000);

    const rateLimitCleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [source, rateLimitMap] of Array.from(this.rateLimiters.entries())) {
        for (const [window, limiter] of Array.from(rateLimitMap.entries())) {
          if (now >= limiter.resetTime) {
            limiter.requests = 0;
            limiter.resetTime = now + this.getWindowDuration(limiter.windowType);
          }
        }
      }
    }, 60000);

    this.cleanupIntervals.push(cacheCleanupInterval, rateLimitCleanupInterval);
  }

  private clearCleanupIntervals(): void {
    this.cleanupIntervals.forEach(interval => clearInterval(interval));
    this.cleanupIntervals = [];
  }

  private getWindowDuration(windowType: 'minute' | 'hour' | 'day' | 'month'): number {
    switch (windowType) {
      case 'minute': return 60000;
      case 'hour': return 3600000;
      case 'day': return 86400000;
      case 'month': return 2592000000;
      default: return 60000;
    }
  }

  shutdown(): void {
    this.clearCleanupIntervals();

    for (const interval of Array.from(this.healthCheckIntervals.values())) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();

    for (const timer of Array.from(this.batchingTimers.values())) {
      clearTimeout(timer);
    }
    this.batchingTimers.clear();

    this.configurations.clear();
    this.rateLimiters.clear();
    this.healthStatuses.clear();
    this.usageMetrics.clear();
    this.responseCache.clear();
    this.circuitBreakers.clear();
    this.performanceBaselines.clear();
    this.concurrentRequests.clear();
    this.requestQueue.clear();

    // this.redis.disconnect(); // Uncomment when Redis is available

    this.emit('shutdown');
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createErrorResponse(
    source: string,
    requestId: string,
    errorType: string,
    message: string,
    startTime: number
  ): APIRequestResult {
    return {
      success: false,
      cached: false,
      responseTime: Date.now() - startTime,
      quotaRemaining: this.getQuotaRemaining(source),
      requestId,
      error: {
        type: errorType,
        message
      }
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  APIQuota,
  APIHealthStatus,
  APIUsageMetrics,
  APIConfiguration,
  DowntimeEvent,
  CircuitBreakerConfig,
  CircuitBreakerState,
  PerformanceBaseline,
  OptimizationRule,
  APIRequestResult,
  ErrorSeverity
};











































