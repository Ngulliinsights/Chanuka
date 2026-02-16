// Infrastructure Domain - Consolidated
// Uses shared/core for common functionality, keeps server-specific services

// Database (consolidated with shared/database)
export * from './database';

// Observability (monitoring, logging, performance)
export * from './observability';

// Notifications (server-specific, using shared primitives)
export * from './notifications';

// External Data (server-specific, using shared utilities)
export * from './external-data';

// WebSocket (server-specific - consolidated)
export { 
  WebSocketService, 
  createWebSocketService, 
  createUnifiedWebSocketService,
  BackwardCompatibleWebSocketService 
} from './websocket';

// Demo Data (server-specific)
export { DemoDataService } from './demo-data';

// Re-export logger from observability (the canonical server logger)
export { logger } from './observability';

export {
  database,
  withTransaction,
  withReadConnection
} from '@server/infrastructure/database/connection';













































