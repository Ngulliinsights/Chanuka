/**
 * Circuit Breaker Middleware for External API Calls
 * Integrates the comprehensive circuit breaker pattern with server-side API calls
 */

import { BaseError, ErrorDomain, ErrorSeverity } from '@server/infrastructure/error-handling';
import { CircuitBreaker } from '@server/infrastructure/error-handling';
import { logger } from '@server/infrastructure/observability';

// Circuit breaker instances for different services
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Configuration for different external services
 */
const SERVICE_CONFIGS: Record<string, { failureThreshold?: number; resetTimeoutMs?: number }> = {
  'government-data': {
    failureThreshold: 5,
    resetTimeoutMs: 60000, // 1 minute
  },
  'social-media': {
    failureThreshold: 3,
    resetTimeoutMs: 30000, // 30 seconds
  },
  'external-api': {
    failureThreshold: 4,
    resetTimeoutMs: 45000, // 45 seconds
  },
};

/**
 * Gets or creates a circuit breaker for a specific service
 */
function getCircuitBreaker(serviceName: string): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    const config = SERVICE_CONFIGS[serviceName] || SERVICE_CONFIGS['external-api'];
    const circuitBreaker = new CircuitBreaker(serviceName, config);
    circuitBreakers.set(serviceName, circuitBreaker);
  }
  
  return circuitBreakers.get(serviceName)!;
}

/**
 * Circuit breaker wrapper for fetch calls
 */
export async function circuitBreakerFetch(
  url: string,
  options: RequestInit = {},
  serviceName: string = 'external-api'
): Promise<Response> {
  const circuitBreaker = getCircuitBreaker(serviceName);
  
  return circuitBreaker.execute(async () => {
    const response = await fetch(url, options);
    
    // Consider 5xx responses as failures for circuit breaker
    if (response.status >= 500) {
      throw new BaseError(`HTTP ${response.status}: ${response.statusText}`, {
        statusCode: response.status,
        code: 'HTTP_SERVER_ERROR',
        domain: ErrorDomain.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        context: {
          url,
          method: options.method || 'GET',
          status: response.status,
          statusText: response.statusText,
        },
        retryable: true,
      });
    }
    
    return response;
  });
}

/**
 * Circuit breaker wrapper for axios-style requests
 */
export async function circuitBreakerRequest<T = any>(
  config: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    data?: any;
    timeout?: number;
  },
  serviceName: string = 'external-api'
): Promise<T> {
  const circuitBreaker = getCircuitBreaker(serviceName);
  
  return circuitBreaker.execute(async () => {
    const controller = new AbortController();
    const timeoutId = config.timeout 
      ? setTimeout(() => controller.abort(), config.timeout)
      : undefined;
    
    try {
      const response = await fetch(config.url, {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: config.data ? JSON.stringify(config.data) : undefined,
        signal: controller.signal,
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (!response.ok) {
        throw new BaseError(`HTTP ${response.status}: ${response.statusText}`, {
          statusCode: response.status,
          code: response.status >= 500 ? 'HTTP_SERVER_ERROR' : 'HTTP_CLIENT_ERROR',
          domain: ErrorDomain.EXTERNAL_SERVICE,
          severity: response.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
          context: {
            url: config.url,
            method: config.method || 'GET',
            status: response.status,
            statusText: response.statusText,
          },
          retryable: response.status >= 500,
        });
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text() as T;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      // Handle fetch errors (network issues, timeouts, etc.)
      throw new BaseError(
        error instanceof Error ? error.message : 'Request failed',
        {
          statusCode: 503,
          code: 'NETWORK_ERROR',
          domain: ErrorDomain.NETWORK,
          severity: ErrorSeverity.HIGH,
          cause: error instanceof Error ? error : undefined,
          context: {
            url: config.url,
            method: config.method || 'GET',
          },
          retryable: true,
        }
      );
    }
  });
}

/**
 * Retry wrapper with exponential backoff
 */
export async function retryWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  serviceName: string,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  const circuitBreaker = getCircuitBreaker(serviceName);
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await circuitBreaker.execute(operation);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry if circuit breaker is open
      if (error instanceof BaseError && error.code === 'CIRCUIT_BREAKER_OPEN') {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxAttempts) {
        break;
      }
      
      // Don't retry non-retryable errors
      if (error instanceof BaseError && !error.metadata.retryable) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;
      
      logger.warn('Retrying operation after failure', {
        component: 'CircuitBreakerMiddleware',
        serviceName,
        attempt,
        maxAttempts,
        delay: totalDelay,
        error: lastError.message,
      });
      
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw new BaseError(`Operation failed after ${maxAttempts} attempts`, {
    statusCode: 503,
    code: 'MAX_RETRIES_EXCEEDED',
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.HIGH,
    cause: lastError,
    context: {
      serviceName,
      maxAttempts,
      finalError: lastError.message,
    },
    retryable: false,
  });
}

/**
 * Get circuit breaker metrics for monitoring
 */
export function getCircuitBreakerMetrics(): Record<string, unknown> {
  const metrics: Record<string, unknown> = {};
  
  for (const [serviceName, circuitBreaker] of circuitBreakers.entries()) {
    metrics[serviceName] = circuitBreaker.getStats();
  }
  
  return metrics;
}

/**
 * Reset circuit breaker for a specific service (for testing/admin purposes)
 */
export function resetCircuitBreaker(serviceName: string): void {
  const circuitBreaker = circuitBreakers.get(serviceName);
  if (circuitBreaker) {
    circuitBreaker.reset();
    logger.info({ component: 'CircuitBreakerMiddleware', serviceName }, 'Circuit breaker reset');
  }
}

/**
 * Force circuit breaker state for a specific service (for testing/admin purposes)
 */
export function forceCircuitBreakerState(
  serviceName: string,
  _state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
): void {
  const circuitBreaker = circuitBreakers.get(serviceName);
  if (circuitBreaker) {
    // Only CLOSED state is supported via reset(); OPEN/HALF_OPEN require natural transitions
    if (_state === 'CLOSED') {
      circuitBreaker.reset();
    }
    logger.warn(
      { component: 'CircuitBreakerMiddleware', serviceName, requestedState: _state },
      'Circuit breaker state force requested'
    );
  }
}

/**
 * Health check endpoint data
 */
export function getCircuitBreakerHealth(): {
  healthy: boolean;
  services: Record<string, { healthy: boolean; reason?: string }>;
} {
  const services: Record<string, { healthy: boolean; reason?: string }> = {};
  let overallHealthy = true;
  
  for (const [serviceName, circuitBreaker] of circuitBreakers.entries()) {
    const stats = circuitBreaker.getStats();
    const isHealthy = stats.state === 'CLOSED';
    services[serviceName] = {
      healthy: isHealthy,
      reason: isHealthy ? undefined : `Circuit is ${stats.state} (${stats.consecutiveFails} consecutive failures)`,
    };
    
    if (!isHealthy) {
      overallHealthy = false;
    }
  }
  
  return {
    healthy: overallHealthy,
    services,
  };
}