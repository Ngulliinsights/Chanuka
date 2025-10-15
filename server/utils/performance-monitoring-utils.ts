/**
 * Performance Monitoring Utilities - Decorators and Helpers
 *
 * Provides easy-to-use decorators and utilities for integrating
 * performance monitoring throughout the application.
 */

// import { performanceMonitoring, MonitoringLevel, SamplingStrategy } from '../services/performance-monitoring.js';

// Temporary stub implementation until performance-monitoring service is created
const performanceMonitoring = {
  measureExecution: async (name: string, fn: () => any) => {
    const start = Date.now();
    try {
      const result = await fn();
      console.log(`[PERF] ${name}: ${Date.now() - start}ms`);
      return result;
    } catch (error) {
      console.log(`[PERF] ${name} failed: ${Date.now() - start}ms`);
      throw error;
    }
  },
  recordMetric: (name: string, value: number, tags?: any, metadata?: any) => {
    console.log(`[METRIC] ${name}: ${value}`, tags, metadata);
  },
  getHealthStatus: () => ({ status: 'ok', uptime: 0 }),
  getAggregatedMetrics: () => ({}),
  getRecentAlerts: (limit: number) => [],
  getBusinessKPIs: () => ({}),
  updateConfig: (config: any) => {},
  start: () => {}
};

type MonitoringLevel = 'basic' | 'standard' | 'detailed';

type SamplingStrategy = 'none' | 'probabilistic' | 'adaptive';

const MonitoringLevel = {
  BASIC: 'basic' as MonitoringLevel,
  STANDARD: 'standard' as MonitoringLevel,
  DETAILED: 'detailed' as MonitoringLevel
};

const SamplingStrategy = {
  NONE: 'none' as SamplingStrategy,
  PROBABILISTIC: 'probabilistic' as SamplingStrategy,
  ADAPTIVE: 'adaptive' as SamplingStrategy
};

// Method decorator for measuring execution time
export function measure(threshold?: number) {
  return function (
    target: Object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    const originalMethod = descriptor.value;
    const metricName = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return await performanceMonitoring.measureExecution(
        metricName,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

// Method decorator for tracking custom metrics
export function track(metricName?: string, threshold?: number) {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = function (...args: any[]) {
      const result = originalMethod.apply(this, args);

      // Track the call
      performanceMonitoring.recordMetric(`${name}.calls`, 1, {
        class: target.constructor.name,
        method: String(propertyKey)
      });

      return result;
    };

    return descriptor;
  };
}

// Class decorator for monitoring all methods
export function monitorClass(options: {
  level?: MonitoringLevel;
  excludeMethods?: string[];
  includeExecutionTime?: boolean;
} = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const className = constructor.name;
    const excludeMethods = new Set(options.excludeMethods || []);
    excludeMethods.add('constructor'); // Always exclude constructor

    // Get all method names from the prototype
    const methodNames = Object.getOwnPropertyNames(constructor.prototype);

    for (const methodName of methodNames) {
      if (excludeMethods.has(methodName)) continue;

      const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, methodName);
      if (!descriptor || typeof descriptor.value !== 'function') continue;

      // Apply measurement decorator
      if (options.includeExecutionTime !== false) {
        measure()(
          constructor.prototype,
          methodName,
          descriptor as TypedPropertyDescriptor<any>
        );
      }

      // Apply tracking decorator
      track()(
        constructor.prototype,
        methodName,
        descriptor as TypedPropertyDescriptor<any>
      );
    }

    return constructor;
  };
}

// Utility function for tracking business metrics
export function trackBusinessMetric(
  name: string,
  value: number,
  metadata?: Record<string, any>
) {
  performanceMonitoring.recordMetric(`business.${name}`, value, {
    type: 'business_kpi'
  }, metadata);
}

// Utility function for tracking API metrics
export function trackApiMetric(
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number,
  userId?: string
) {
  const tags: Record<string, string> = {
    method,
    endpoint,
    status_code: statusCode.toString(),
    status_group: Math.floor(statusCode / 100) * 100 + 'xx'
  };

  if (userId) {
    tags.user_id = userId;
  }

  performanceMonitoring.recordMetric('api.request.duration', duration, tags);
  performanceMonitoring.recordMetric('api.request.count', 1, tags);

  if (statusCode >= 400) {
    performanceMonitoring.recordMetric('api.request.error', 1, tags);
  }
}

// Utility function for tracking database metrics
export function trackDatabaseMetric(
  operation: string,
  table: string,
  duration: number,
  success: boolean = true
) {
  performanceMonitoring.recordMetric('db.operation.duration', duration, {
    operation,
    table,
    success: success.toString()
  });

  performanceMonitoring.recordMetric('db.operation.count', 1, {
    operation,
    table,
    success: success.toString()
  });
}

// Utility function for tracking cache metrics
export function trackCacheMetric(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  duration?: number
) {
  const tags = {
    operation,
    cache_key: key
  };

  performanceMonitoring.recordMetric('cache.operation.count', 1, tags);

  if (duration !== undefined) {
    performanceMonitoring.recordMetric('cache.operation.duration', duration, tags);
  }
}

// Utility function for tracking user actions
export function trackUserAction(
  action: string,
  userId: string,
  metadata?: Record<string, any>
) {
  performanceMonitoring.recordMetric('user.action.count', 1, {
    action,
    user_id: userId
  }, metadata);
}

// Utility function for tracking errors
export function trackError(
  errorType: string,
  errorMessage: string,
  metadata?: Record<string, any>
) {
  performanceMonitoring.recordMetric('error.count', 1, {
    error_type: errorType,
    error_message: errorMessage.substring(0, 100) // Truncate long messages
  }, metadata);
}

// Utility function for tracking resource usage
export function trackResourceUsage(
  resource: string,
  usage: number,
  unit: string,
  metadata?: Record<string, any>
) {
  performanceMonitoring.recordMetric(`resource.${resource}.usage`, usage, {
    unit
  }, metadata);
}

// Middleware for automatic API monitoring
export function createApiMonitoringMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const originalEnd = res.end;

    res.end = function(...args: any[]) {
      const duration = Date.now() - startTime;

      trackApiMetric(
        req.method,
        req.route?.path || req.path,
        res.statusCode,
        duration,
        req.user?.id
      );

      originalEnd.apply(this, args);
    };

    next();
  };
}

// Helper function to get monitoring status
export function getMonitoringStatus() {
  return performanceMonitoring.getHealthStatus();
}

// Helper function to get aggregated metrics
export function getAggregatedMetrics() {
  return performanceMonitoring.getAggregatedMetrics();
}

// Helper function to get recent alerts
export function getRecentAlerts(limit = 10) {
  return performanceMonitoring.getRecentAlerts(limit);
}

// Helper function to get business KPIs
export function getBusinessKPIs() {
  return performanceMonitoring.getBusinessKPIs();
}

// Helper function to update monitoring configuration
export function updateMonitoringConfig(config: Partial<any>) {
  performanceMonitoring.updateConfig(config);
}

// Environment-specific configuration helpers
export function getEnvironmentSpecificConfig(env: string): Partial<any> {
  switch (env) {
    case 'production':
      return {
        level: MonitoringLevel.STANDARD,
        sampling: {
          strategy: SamplingStrategy.ADAPTIVE,
          rate: 0.05, // 5% sampling in production
          adaptiveThreshold: 2000,
          burstThreshold: 10000
        },
        alerting: {
          enabled: true,
          anomalyDetection: true,
          regressionDetection: true,
          thresholds: {
            response_time_p95: 3000, // 3 seconds in production
            error_rate: 0.01,        // 1% error rate
            throughput_drop: 0.1     // 10% throughput drop
          }
        },
        memory: {
          maxMetrics: 50000, // Lower memory usage in production
          cleanupInterval: 10   // More frequent cleanup
        }
      };

    case 'staging':
      return {
        level: MonitoringLevel.DETAILED,
        sampling: {
          strategy: SamplingStrategy.PROBABILISTIC,
          rate: 0.2, // 20% sampling in staging
          adaptiveThreshold: 1000,
          burstThreshold: 5000
        },
        alerting: {
          enabled: true,
          anomalyDetection: true,
          regressionDetection: true,
          thresholds: {
            response_time_p95: 5000,
            error_rate: 0.05,
            throughput_drop: 0.2
          }
        }
      };

    case 'development':
    default:
      return {
        level: MonitoringLevel.DETAILED,
        sampling: {
          strategy: SamplingStrategy.NONE, // Full monitoring in development
          rate: 1.0,
          adaptiveThreshold: 500,
          burstThreshold: 2000
        },
        alerting: {
          enabled: false, // Disable alerts in development
          anomalyDetection: false,
          regressionDetection: false,
          thresholds: {} // Empty thresholds when disabled
        },
        memory: {
          maxMetrics: 100000, // Higher memory usage in development
          cleanupInterval: 30   // Less frequent cleanup
        }
      };
  }
}

// Initialize monitoring with environment-specific config
export function initializeMonitoring(env: string = process.env.NODE_ENV || 'development') {
  const envConfig = getEnvironmentSpecificConfig(env);
  performanceMonitoring.updateConfig(envConfig);
  performanceMonitoring.start();

  console.log(`✅ Performance monitoring initialized for ${env} environment`);
}






