// Infrastructure Domain - Consolidated
// Uses shared/core for common functionality, keeps server-specific services

// Database (consolidated with shared/database)
export * from './database';

// Observability (monitoring, logging, performance)
// NOTE: exports AlertRule, AlertAction from error-handling/types via observability chain
export * from './observability';

// Notifications (server-specific, using shared primitives)
// Use named exports to avoid duplicate AlertRule/AlertAction conflict with observability
export {
  NotificationService,
  CoreNotificationService,
  notificationService,
  coreNotificationService,
  type NotificationData,
  type NotificationHistory,
  notificationRoutes,
  NotificationOrchestratorService,
  notificationOrchestratorService,
  type NotificationRequest,
  type NotificationBatch,
  type NotificationResult,
  type BulkNotificationResult,
  alertingService,
  type Alert,
  notificationSchedulerService,
  type ScheduledDigest,
  type DigestContent,
  SmartNotificationFilterService,
  type FilterCriteria,
  type UserEngagementProfile,
  type FilterResult,
  notificationChannelService,
} from './notifications';

// External Data (server-specific, using shared utilities)
export * from './external-data';

// WebSocket (server-specific - consolidated)
export {
  WebSocketService,
  createWebSocketService,
  createUnifiedWebSocketService,
  UnifiedWebSocketService,
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
