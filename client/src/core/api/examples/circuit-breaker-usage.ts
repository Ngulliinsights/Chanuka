/**
 * Circuit Breaker Usage Examples
 *
 * This file demonstrates how to use the circuit breaker system
 * for robust API communication with automatic retry and monitoring.
 */

import { BaseError, ErrorDomain, ErrorSeverity } from '@client/core/error';

import { apiClients, createCircuitBreakerClient } from '../circuit-breaker-client';
import {
  circuitBreakerMonitor,
  getServiceHealth,
  getErrorCorrelations,
  recordError,
} from '../circuit-breaker-monitor';
import { retryOperation, createRetryHandler } from '../retry-handler';

// ============================================================================
// Basic Usage Examples
// ============================================================================

/**
 * Example 1: Using pre-configured API clients
 */
export async function basicApiUsage() {
  try {
    // Use the pre-configured government data client
    const response = await apiClients.governmentData.get('/bills/recent');
    console.log('Bills data:', response.data);

    // Use the internal API client for user data
    const userResponse = await apiClients.internalApi.get('/users/profile');
    console.log('User profile:', userResponse.data);
  } catch (error) {
    if (error instanceof Error) {
      console.error('API Error:', {
        message: error.message,
        name: error.name,
      });
    } else {
      console.error('Unknown error:', error);
    }
  }
}

/**
 * Example 2: Creating a custom circuit breaker client
 */
export function createCustomClient() {
  const customClient = createCircuitBreakerClient({
    serviceName: 'analytics-service',
    baseUrl: 'https://analytics.example.com/api',
    timeout: 8000,
    retryConfig: {
      maxAttempts: 5,
      baseDelay: 1500,
      maxDelay: 30000,
      backoffMultiplier: 1.8,
      jitterFactor: 0.15,
    },
    defaultHeaders: {
      'X-API-Version': '2.0',
      Accept: 'application/json',
    },
  });

  return customClient;
}

/**
 * Example 3: Using retry operations directly
 */
export async function directRetryUsage() {
  try {
    // Retry a specific operation with custom configuration
    const result = await retryOperation(
      async () => {
        const response = await fetch('/api/external/data');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      },
      'external-service',
      {
        maxAttempts: 4,
        baseDelay: 2000,
        maxDelay: 20000,
      }
    );

    console.log('External data:', result);
  } catch (error) {
    console.error('Failed after all retries:', error);
  }
}

// ============================================================================
// Advanced Usage Examples
// ============================================================================

/**
 * Example 4: Monitoring circuit breaker events
 */
export function setupCircuitBreakerMonitoring() {
  // Listen to all circuit breaker events
  circuitBreakerMonitor.addEventListener('*', event => {
    console.log(`Circuit breaker event for ${event.serviceName}:`, {
      state: event.state,
      metrics: event.metrics,
      timestamp: event.timestamp,
    });

    // Send alerts for critical events
    if (event.state === 'open') {
      sendAlert(`Circuit breaker opened for ${event.serviceName}`, event);
    }
  });

  // Listen to specific service events
  circuitBreakerMonitor.addEventListener('government-data', event => {
    if (event.state === 'open') {
      // Implement fallback for government data service
      enableGovernmentDataFallback();
    } else if (event.state === 'closed') {
      disableGovernmentDataFallback();
    }
  });
}

/**
 * Example 5: Health monitoring and dashboard data
 */
export function getHealthDashboardData() {
  // Get overall service health
  const serviceHealth = getServiceHealth();

  // Get error correlations for troubleshooting
  const activeErrors = getErrorCorrelations(false);
  const resolvedErrors = getErrorCorrelations(true);

  // Get monitoring status
  const monitoringStatus = circuitBreakerMonitor.getMonitoringStatus();

  return {
    services: serviceHealth.map(service => ({
      name: service.serviceName,
      status: service.healthy ? 'healthy' : 'unhealthy',
      state: service.state,
      failureRate: service.failureRate,
      averageResponseTime: service.averageResponseTime,
      totalRequests: service.totalRequests,
      lastFailure: service.lastFailure,
      reason: service.reason,
    })),

    errors: {
      active: activeErrors.length,
      resolved: resolvedErrors.length,
      correlations: activeErrors.map(correlation => ({
        id: correlation.correlationId,
        services: correlation.services,
        errorCount: correlation.errors.length,
        duration: Date.now() - correlation.startTime.getTime(),
        recoveryAttempts: correlation.recoveryAttempts,
      })),
    },

    monitoring: {
      isActive: monitoringStatus.isMonitoring,
      servicesMonitored: monitoringStatus.servicesMonitored,
      activeCorrelations: monitoringStatus.activeCorrelations,
    },
  };
}

/**
 * Example 6: Error correlation and recovery
 */
export async function handleCorrelatedErrors() {
  const correlationId = 'user-action-' + Date.now();

  try {
    // Multiple related operations with shared correlation ID
    const [userProfile, userPreferences, userActivity] = await Promise.allSettled([
      apiClients.internalApi.get('/users/profile', { correlationId }),
      apiClients.internalApi.get('/users/preferences', { correlationId }),
      apiClients.internalApi.get('/users/activity', { correlationId }),
    ]);

    // Check for failures and correlate them
    const failures = [userProfile, userPreferences, userActivity]
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason);

    if (failures.length > 0) {
      // Record correlated errors
      failures.forEach(error => {
        if (error instanceof BaseError) {
          recordError(error);
        }
      });

      // Attempt recovery if possible
      await attemptErrorRecovery(correlationId);
    }
  } catch (error) {
    console.error('Correlated operation failed:', error);
  }
}

/**
 * Example 7: Custom retry handler with business logic
 */
export async function businessLogicWithRetry() {
  const retryHandler = createRetryHandler('payment-service', {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryableErrorCodes: ['PAYMENT_PROCESSING', 'TEMPORARY_UNAVAILABLE'],
  });

  const result = await retryHandler.execute(async () => {
    const response = await fetch('/api/payments/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 100.0,
        currency: 'USD',
        paymentMethod: 'card',
      }),
    });

    if (!response.ok) {
      // Create business-specific error
      throw new BaseError(`Payment processing failed: ${response.statusText}`, {
        statusCode: response.status,
        code: response.status === 429 ? 'RATE_LIMITED' : 'PAYMENT_PROCESSING',
        domain: ErrorDomain.BUSINESS_LOGIC,
        severity: ErrorSeverity.HIGH,
        retryable: response.status >= 500 || response.status === 429,
        context: {
          paymentAmount: 100.0,
          paymentCurrency: 'USD',
        },
      });
    }

    return response.json();
  });

  if (result.success) {
    console.log('Payment processed successfully:', result.data);
  } else {
    console.error('Payment failed after retries:', result.error);
    // Implement fallback payment method or user notification
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

async function sendAlert(message: string, event: unknown) {
  // Implementation for sending alerts (email, Slack, etc.)
  console.warn('ALERT:', message, event);
}

function enableGovernmentDataFallback() {
  // Implementation for enabling fallback data source
  console.log('Enabling government data fallback');
}

function disableGovernmentDataFallback() {
  // Implementation for disabling fallback data source
  console.log('Disabling government data fallback');
}

async function attemptErrorRecovery(correlationId: string) {
  // Implementation for attempting error recovery
  console.log('Attempting error recovery for correlation:', correlationId);

  // Example: Clear cache, refresh tokens, etc.
  try {
    // Simulate recovery action
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mark correlation as resolved if recovery succeeds
    circuitBreakerMonitor.resolveCorrelation(correlationId);

    console.log('Error recovery successful for correlation:', correlationId);
  } catch (error) {
    console.error('Error recovery failed for correlation:', correlationId, error);
  }
}

// ============================================================================
// React Hook Examples (for use in React components)
// ============================================================================

/**
 * Example 8: React hook for circuit breaker monitoring
 */
export function useCircuitBreakerHealth() {
  // This would be implemented as a proper React hook in a React component file
  // Here's the logic that would go inside the hook:

  const getHealthData = () => {
    const services = getServiceHealth();
    const errors = getErrorCorrelations(false);

    return {
      services,
      hasUnhealthyServices: services.some(s => !s.healthy),
      activeErrorCount: errors.length,
      overallHealth: services.every(s => s.healthy) ? 'healthy' : 'degraded',
    };
  };

  return getHealthData;
}

/**
 * Example 9: React hook for API calls with circuit breaker
 */
export function useApiWithCircuitBreaker() {
  // This would be implemented as a proper React hook in a React component file
  // Here's the logic that would go inside the hook:

  const makeApiCall = async (endpoint: string, options: unknown = {}) => {
    try {
      const response = await apiClients.internalApi.get(endpoint, options);
      return { data: response.data, error: null, loading: false };
    } catch (error) {
      return {
        data: null,
        error: error instanceof BaseError ? error : new Error('Unknown error'),
        loading: false,
      };
    }
  };

  return { makeApiCall };
}

// Export all examples for easy importing
export const examples = {
  basicApiUsage,
  createCustomClient,
  directRetryUsage,
  setupCircuitBreakerMonitoring,
  getHealthDashboardData,
  handleCorrelatedErrors,
  businessLogicWithRetry,
  useCircuitBreakerHealth,
  useApiWithCircuitBreaker,
};
