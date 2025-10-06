/**
 * Health Monitoring Module
 * 
 * Comprehensive health monitoring system with dependency validation,
 * timeout protection, and detailed system metrics
 */

// Core types and interfaces
export type {
  HealthStatus,
  HealthCheck,
  HealthResult,
  OverallHealth
} from './types';

// Main health checker
export { 
  HealthChecker,
  type HealthCheckerConfig 
} from './health-checker';

// Built-in health checks
export { 
  RedisHealthCheck,
  type RedisHealthConfig 
} from './checks/redis-check';

export { 
  DatabaseHealthCheck,
  createDatabaseHealthCheck,
  type DatabaseHealthConfig,
  type DatabaseService 
} from './checks/database-check';

export { 
  MemoryHealthCheck,
  createMemoryHealthCheck,
  type MemoryHealthConfig 
} from './checks/memory-check';

// Middleware and endpoints
export {
  createHealthEndpoints,
  healthCheckEndpoint,
  createHealthRouter,
  type HealthEndpointConfig
} from './middleware';

// Convenience functions for common setups
export function createBasicHealthChecker(config?: {
  timeout?: number;
  parallel?: boolean;
  cache?: number;
}): HealthChecker {
  return new HealthChecker({
    defaultTimeout: config?.timeout || 5000,
    parallelExecution: config?.parallel !== false,
    cacheMs: config?.cache || 0
  });
}

export function createProductionHealthChecker(): HealthChecker {
  return new HealthChecker({
    defaultTimeout: 5000,
    parallelExecution: true,
    failFast: false,
    cacheMs: 30000, // 30 second cache
    environment: 'production'
  });
}

export function createDevelopmentHealthChecker(): HealthChecker {
  return new HealthChecker({
    defaultTimeout: 10000, // More lenient timeout
    parallelExecution: true,
    failFast: false,
    cacheMs: 0, // No caching in development
    environment: 'development'
  });
}

// Factory function for complete health monitoring setup
export function setupHealthMonitoring(options: {
  redis?: any;
  database?: any;
  memoryConfig?: any;
  checkerConfig?: any;
  endpointConfig?: any;
} = {}) {
  const checker = options.checkerConfig ? 
    new HealthChecker(options.checkerConfig) :
    createBasicHealthChecker();

  // Add memory check (always available)
  checker.registerCheck(
    options.memoryConfig ? 
      new MemoryHealthCheck(options.memoryConfig) :
      createMemoryHealthCheck()
  );

  // Add Redis check if Redis instance provided
  if (options.redis) {
    checker.registerCheck(new RedisHealthCheck(options.redis));
  }

  // Add database check if database instance provided
  if (options.database) {
    checker.registerCheck(
      createDatabaseHealthCheck(options.database)
    );
  }

  // Create endpoints
  const endpoints = createHealthEndpoints(checker, options.endpointConfig);

  return {
    checker,
    endpoints,
    // Express.js integration helper
    attachToApp: (app: any) => {
      app.get('/health', endpoints.health);
      app.get('/health/ready', endpoints.readiness);
      app.get('/health/live', endpoints.liveness);
      app.get('/health/metrics', endpoints.metrics);
      return app;
    }
  };
}