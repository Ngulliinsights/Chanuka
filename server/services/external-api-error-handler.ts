import { logger } from '@server/infrastructure/observability';
import { EventEmitter } from 'events';

// Error types for external API failures
export enum ExternalAPIErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Fallback strategy types
export enum FallbackStrategy {
  CACHED_DATA = 'CACHED_DATA',
  ALTERNATIVE_SOURCE = 'ALTERNATIVE_SOURCE',
  DEGRADED_SERVICE = 'DEGRADED_SERVICE',
  FAIL_GRACEFULLY = 'FAIL_GRACEFULLY'
}

interface ExternalAPIError {
  id: string;
  source: string;
  type: ExternalAPIErrorType;
  severity: ErrorSeverity;
  message: string;
  details: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  fallbackStrategy: FallbackStrategy;
  resolved: boolean;
  resolvedAt?: Date;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
}

interface FallbackConfig {
  strategy: FallbackStrategy;
  cacheTimeout: number; // milliseconds
  alternativeSources: string[];
  degradedFeatures: string[];
}

export class ExternalAPIErrorHandler extends EventEmitter {
  private errors: Map<string, ExternalAPIError> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private retryQueues: Map<string, RetryQueue> = new Map();
  private fallbackCache: Map<string, CachedData> = new Map();

  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true
  };

  private defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 300000 // 5 minutes
  };

  private defaultFallbackConfig: FallbackConfig = {
    strategy: FallbackStrategy.CACHED_DATA,
    cacheTimeout: 3600000, // 1 hour
    alternativeSources: [],
    degradedFeatures: []
  };

  constructor() {
    super();
    this.setupCleanupInterval();
  }

  /**
   * Handle an external API error with automatic retry and fallback
   */
  async handleError(
    source: string,
    error: Error,
    context: any = {},
    retryConfig?: Partial<RetryConfig>,
    fallbackConfig?: Partial<FallbackConfig>
  ): Promise<{ success: boolean; data?: any; fallbackUsed: boolean; error?: ExternalAPIError }> {
    
    const errorType = this.classifyError(error);
    const severity = this.determineSeverity(errorType, context);
    const errorId = this.generateErrorId(source, errorType);

    const apiError: ExternalAPIError = {
      id: errorId,
      source,
      type: errorType,
      severity,
      message: error.message,
      details: { ...context, stack: error.stack },
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: retryConfig?.maxRetries || this.defaultRetryConfig.maxRetries,
      fallbackStrategy: fallbackConfig?.strategy || this.defaultFallbackConfig.strategy,
      resolved: false
    };

    this.errors.set(errorId, apiError);
    this.emit('error', apiError);

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(source)) {
      console.log(`Circuit breaker open for ${source}, using fallback immediately`);
      return this.executeFallback(source, apiError, fallbackConfig);
    }

    // Update circuit breaker
    this.updateCircuitBreaker(source, false);

    // Attempt retry if appropriate
    if (this.shouldRetry(errorType, apiError.retryCount, apiError.maxRetries)) {
      const retryResult = await this.attemptRetry(source, apiError, context, retryConfig);
      if (retryResult.success) {
        apiError.resolved = true;
        apiError.resolvedAt = new Date();
        this.updateCircuitBreaker(source, true);
        return retryResult;
      }
    }

    // Execute fallback strategy
    return this.executeFallback(source, apiError, fallbackConfig);
  }

  /**
   * Classify error type based on error details
   */
  private classifyError(error: Error): ExternalAPIErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('etimedout')) {
      return ExternalAPIErrorType.TIMEOUT;
    }
    
    if (message.includes('network') || message.includes('enotfound') || message.includes('econnrefused')) {
      return ExternalAPIErrorType.NETWORK_ERROR;
    }
    
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ExternalAPIErrorType.RATE_LIMIT;
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return ExternalAPIErrorType.AUTHENTICATION;
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return ExternalAPIErrorType.AUTHORIZATION;
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return ExternalAPIErrorType.NOT_FOUND;
    }
    
    if (message.includes('quota') || message.includes('limit exceeded')) {
      return ExternalAPIErrorType.QUOTA_EXCEEDED;
    }
    
    if (message.includes('service unavailable') || message.includes('503')) {
      return ExternalAPIErrorType.SERVICE_UNAVAILABLE;
    }
    
    if (message.includes('500') || message.includes('502') || message.includes('504')) {
      return ExternalAPIErrorType.SERVER_ERROR;
    }
    
    if (message.includes('invalid') || message.includes('parse') || message.includes('json')) {
      return ExternalAPIErrorType.INVALID_RESPONSE;
    }
    
    return ExternalAPIErrorType.NETWORK_ERROR; // Default
  }

  /**
   * Determine error severity
   */
  private determineSeverity(errorType: ExternalAPIErrorType, context: unknown): ErrorSeverity {
    // Critical errors that affect core functionality
    if ([
      ExternalAPIErrorType.AUTHENTICATION,
      ExternalAPIErrorType.AUTHORIZATION,
      ExternalAPIErrorType.QUOTA_EXCEEDED
    ].includes(errorType)) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity for server errors and service unavailable
    if ([
      ExternalAPIErrorType.SERVER_ERROR,
      ExternalAPIErrorType.SERVICE_UNAVAILABLE
    ].includes(errorType)) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity for rate limits and timeouts
    if ([
      ExternalAPIErrorType.RATE_LIMIT,
      ExternalAPIErrorType.TIMEOUT
    ].includes(errorType)) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity for other errors
    return ErrorSeverity.LOW;
  }

  /**
   * Check if error should be retried
   */
  private shouldRetry(errorType: ExternalAPIErrorType, retryCount: number, maxRetries: number): boolean {
    if (retryCount >= maxRetries) return false;

    // Don't retry authentication/authorization errors
    if ([
      ExternalAPIErrorType.AUTHENTICATION,
      ExternalAPIErrorType.AUTHORIZATION,
      ExternalAPIErrorType.NOT_FOUND
    ].includes(errorType)) {
      return false;
    }

    return true;
  }

  /**
   * Attempt retry with exponential backoff
   */
  private async attemptRetry(
    source: string,
    apiError: ExternalAPIError,
    context: any,
    retryConfig?: Partial<RetryConfig>
  ): Promise<{ success: boolean; data?: any; fallbackUsed: boolean }> {
    
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    apiError.retryCount++;

    // Calculate delay with exponential backoff
    let delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, apiError.retryCount - 1),
      config.maxDelay
    );

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    console.log(`Retrying ${source} in ${delay}ms (attempt ${apiError.retryCount}/${apiError.maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // This would be implemented by the calling service to retry the actual operation
      // For now, we'll emit a retry event that the service can listen to
      const retryResult = await new Promise<{ success: boolean; data?: any }>((resolve) => {
        this.emit('retry', {
          source,
          error: apiError,
          context,
          resolve
        });
        
        // Timeout the retry attempt
        setTimeout(() => {
          resolve({ success: false });
        }, config.maxDelay);
      });

      if (retryResult.success) {
        console.log(`Retry successful for ${source}`);
        return { ...retryResult, fallbackUsed: false };
      }

    } catch (retryError) {
      const errorMessage = retryError instanceof Error ? retryError.message : String(retryError);
      console.log(`Retry failed for ${source}:`, errorMessage);
    }
    // If we have more retries, attempt again
    if (apiError.retryCount < apiError.maxRetries) {
      return this.attemptRetry(source, apiError, context, retryConfig);
    }

    return { success: false, fallbackUsed: false };
  }

  /**
   * Execute fallback strategy
   */
  private async executeFallback(
    source: string,
    apiError: ExternalAPIError,
    fallbackConfig?: Partial<FallbackConfig>
  ): Promise<{ success: boolean; data?: any; fallbackUsed: boolean; error?: ExternalAPIError }> {
    
    const config = { ...this.defaultFallbackConfig, ...fallbackConfig };
    
    console.log(`Executing fallback strategy ${config.strategy} for ${source}`);

    switch (config.strategy) {
      case FallbackStrategy.CACHED_DATA:
        return this.useCachedData(source, apiError);
      
      case FallbackStrategy.ALTERNATIVE_SOURCE:
        return this.useAlternativeSource(source, apiError, config.alternativeSources);
      
      case FallbackStrategy.DEGRADED_SERVICE:
        return this.provideDegradedService(source, apiError, config.degradedFeatures);
      
      case FallbackStrategy.FAIL_GRACEFULLY:
      default:
        return this.failGracefully(source, apiError);
    }
  }

  /**
   * Use cached data as fallback
   */
  private async useCachedData(
    source: string,
    apiError: ExternalAPIError
  ): Promise<{ success: boolean; data?: any; fallbackUsed: boolean; error?: ExternalAPIError }> {
    
    const cachedData = this.fallbackCache.get(source);
    
    if (cachedData && !this.isCacheExpired(cachedData)) {
      console.log(`Using cached data for ${source}`);
      return {
        success: true,
        data: cachedData.data,
        fallbackUsed: true
      };
    }

    console.log(`No valid cached data available for ${source}`);
    return this.failGracefully(source, apiError);
  }

  /**
   * Use alternative data source
   */
  private async useAlternativeSource(
    source: string,
    apiError: ExternalAPIError,
    alternativeSources: string[]
  ): Promise<{ success: boolean; data?: any; fallbackUsed: boolean; error?: ExternalAPIError }> {
    
    for (const altSource of alternativeSources) {
      if (!this.isCircuitBreakerOpen(altSource)) {
        console.log(`Trying alternative source: ${altSource}`);
        
        // Emit event for alternative source attempt
        const result = await new Promise<{ success: boolean; data?: any }>((resolve) => {
          this.emit('useAlternativeSource', {
            originalSource: source,
            alternativeSource: altSource,
            error: apiError,
            resolve
          });
          
          // Timeout the alternative source attempt
          setTimeout(() => {
            resolve({ success: false });
          }, 10000);
        });

        if (result.success) {
          return { ...result, fallbackUsed: true };
        }
      }
    }

    console.log(`No alternative sources available for ${source}`);
    return this.failGracefully(source, apiError);
  }

  /**
   * Provide degraded service
   */
  private async provideDegradedService(
    source: string,
    _apiError: ExternalAPIError,
    degradedFeatures: string[]
  ): Promise<{ success: boolean; data?: any; fallbackUsed: boolean; error?: ExternalAPIError }> {
    
    console.log(`Providing degraded service for ${source} with features: ${degradedFeatures.join(', ')}`);
    
    // Return minimal data structure indicating degraded service
    const degradedData = {
      status: 'degraded',
      availableFeatures: degradedFeatures,
      message: 'Service is running in degraded mode due to external API issues',
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      data: degradedData,
      fallbackUsed: true
    };
  }

  /**
   * Fail gracefully with informative error
   */
  private async failGracefully(
    source: string,
    apiError: ExternalAPIError
  ): Promise<{ success: boolean; data?: any; fallbackUsed: boolean; error: ExternalAPIError }> {
    
    console.log(`Failing gracefully for ${source}`);
    
    return {
      success: false,
      fallbackUsed: false,
      error: apiError
    };
  }

  /**
   * Cache data for fallback use
   */
  cacheData(source: string, data: unknown, ttl?: number): void {
    const cacheTimeout = ttl || this.defaultFallbackConfig.cacheTimeout;
    
    this.fallbackCache.set(source, {
      data,
      timestamp: new Date(),
      ttl: cacheTimeout
    });
  }

  /**
   * Check if cached data is expired
   */
  private isCacheExpired(cachedData: CachedData): boolean {
    const now = new Date().getTime();
    const cacheTime = cachedData.timestamp.getTime();
    return (now - cacheTime) > cachedData.ttl;
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitBreakerOpen(source: string): boolean {
    const breaker = this.circuitBreakers.get(source);
    if (!breaker) return false;

    const now = new Date().getTime();
    
    // Check if we should reset the circuit breaker
    if (breaker.state === 'open' && (now - breaker.lastFailureTime) > breaker.config.resetTimeout) {
      breaker.state = 'half-open';
      breaker.failureCount = 0;
    }

    return breaker.state === 'open';
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(source: string, success: boolean): void {
    let breaker = this.circuitBreakers.get(source);
    
    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        config: this.defaultCircuitBreakerConfig
      };
      this.circuitBreakers.set(source, breaker);
    }

    if (success) {
      breaker.failureCount = 0;
      breaker.state = 'closed';
    } else {
      breaker.failureCount++;
      breaker.lastFailureTime = new Date().getTime();
      
      if (breaker.failureCount >= breaker.config.failureThreshold) {
        breaker.state = 'open';
        console.log(`Circuit breaker opened for ${source} after ${breaker.failureCount} failures`);
        this.emit('circuitBreakerOpen', { source, breaker });
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(timeWindow?: number): {
    totalErrors: number;
    errorsBySource: Record<string, number>;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    circuitBreakerStatus: Record<string, string>;
  } {
    const now = new Date().getTime();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    const relevantErrors = Array.from(this.errors.values())
      .filter(error => error.timestamp.getTime() >= windowStart);

    const errorsBySource: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    for (const error of relevantErrors) {
      errorsBySource[error.source] = (errorsBySource[error.source] || 0) + 1;
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    }

    const circuitBreakerStatus: Record<string, string> = {};
    for (const [source, breaker] of this.circuitBreakers) {
      circuitBreakerStatus[source] = breaker.state;
    }

    return {
      totalErrors: relevantErrors.length,
      errorsBySource,
      errorsByType,
      errorsBySeverity,
      circuitBreakerStatus
    };
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(source: string, errorType: ExternalAPIErrorType): string {
    return `${source}-${errorType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup cleanup interval for old errors
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const [id, error] of this.errors) {
        if (error.timestamp < cutoff) {
          this.errors.delete(id);
        }
      }

      // Clean up expired cache entries
      for (const [source, cachedData] of this.fallbackCache) {
        if (this.isCacheExpired(cachedData)) {
          this.fallbackCache.delete(source);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }
}

// Type definitions
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  config: CircuitBreakerConfig;
}

interface RetryQueue {
  items: Array<{
    id: string;
    retryAt: Date;
    attempt: number;
  }>;
}

interface CachedData {
  data: any;
  timestamp: Date;
  ttl: number;
}

export type { ExternalAPIError, RetryConfig, CircuitBreakerConfig, FallbackConfig };













































