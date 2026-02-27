/**
 * Notifications Feature Module - Clean Architecture
 * 
 * This module provides a clean separation following DDD principles:
 * - Domain: Entities, value objects, domain services
 * - Application: Use cases, orchestrators, application services
 * - Presentation: HTTP routes, WebSocket handlers
 * - Infrastructure: External integrations (moved to server/infrastructure/messaging)
 */

// ===== DOMAIN EXPORTS =====

// Domain entities
export { Notification } from './domain/entities/notification';

// Domain services
export {
  SmartNotificationFilterService,
  smartNotificationFilterService,
  type FilterCriteria,
  type UserEngagementProfile,
  type FilterResult
} from './domain/services/smart-notification-filter';

// Domain types
export type { CombinedBillTrackingPreferences } from './domain/types';

// ===== APPLICATION EXPORTS =====

// Application services
export {
  NotificationService,
  CoreNotificationService,
  notificationService,
  coreNotificationService,
  type NotificationData,
  type NotificationHistory,
  type NotificationStats,
  type NotificationRequest,
  type NotificationResult,
  type BulkNotificationResult
} from './application/services/notification.service';

export {
  alertingService,
  type AlertRule,
  type AlertAction,
  type Alert
} from './application/services/alerting-service';

// Orchestrators
export {
  NotificationOrchestratorService,
  notificationOrchestratorService,
  type NotificationBatch
} from './application/notification-orchestrator';

// Schedulers
export {
  notificationSchedulerService,
  type ScheduledDigest,
  type DigestContent
} from './application/notification-scheduler';

// ===== PRESENTATION EXPORTS =====

// HTTP routes
export { router as notificationRoutes } from './presentation/http/notification-routes';

// ===== INFRASTRUCTURE EXPORTS (Re-exported for convenience) =====

// Channel delivery service (now in infrastructure/messaging)
export { notificationChannelService } from '@server/infrastructure/messaging/delivery/channel.service';

// Email service (now in infrastructure/messaging)
export { getEmailService, EmailTemplates } from '@server/infrastructure/messaging/email/email-service';


