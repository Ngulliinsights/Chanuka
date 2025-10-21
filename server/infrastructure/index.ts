// Infrastructure Domain - Consolidated
// Uses shared/core for common functionality, keeps server-specific services

// Database (consolidated with shared/database)
export * from './database';

// Cache (consolidated with shared/core/src/caching)
export * from './cache';

// Monitoring (consolidated with shared/core/src/observability)
export * from './monitoring';

// Notifications (server-specific, using shared primitives)
export * from './notifications';

// External Data (server-specific, using shared utilities)
export * from './external-data';

// WebSocket (server-specific)
export { WebSocketService } from './websocket';

// Demo Data (server-specific)
export { DemoDataService } from './demo-data';

// Re-export shared core services for convenience
export { 
  logger,
  createObservabilityStack,
  createCacheService,
  createCorrelationManager
} from '../../shared/core/src/observability';

export {
  database,
  withTransaction,
  withReadConnection
} from '../../shared/database/connection';

// Legacy compatibility exports
export { cacheService } from './cache';
export { performanceMonitor, measureAsync, measureSync } from './monitoring';











































