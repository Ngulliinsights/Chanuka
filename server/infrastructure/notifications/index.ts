/**
 * Notifications Module - Clean Architecture
 * 
 * This module provides a clean separation between:
 * - Core services (basic notification operations)
 * - Advanced services (multi-channel, smart filtering, batching)
 * - Specialized services (scheduling, filtering, channels, alerting)
 */

// ===== CORE SERVICES (Basic Operations) =====

// Core notification service for basic CRUD operations
export { 
  NotificationService,
  CoreNotificationService,
  notificationService,
  coreNotificationService,
  type NotificationData,
  type NotificationHistory
} from './notification-service';

// Consolidated API routes
export { router as notificationRoutes } from './notification-routes';

// ===== ADVANCED SERVICES (Multi-channel & Smart Features) =====

// Notification orchestrator service with smart filtering, batching, and multi-channel delivery
export {
  NotificationOrchestratorService,
  notificationOrchestratorService,
  type NotificationRequest,
  type NotificationBatch,
  type NotificationResult,
  type BulkNotificationResult
} from '../../features/notifications/application/notification-orchestrator';

// ===== SPECIALIZED SERVICES (Domain-specific Features) =====

// Alerting service for monitoring and alerting
export {
  alertingService,
  type AlertRule,
  type AlertAction,
  type Alert
} from './alerting-service';

// Notification scheduler service for digest notifications
export {
  notificationSchedulerService,
  type ScheduledDigest,
  type DigestContent
} from '../../features/notifications/application/notification-scheduler';

// Smart notification filtering with AI/ML-based decisions
export {
  SmartNotificationFilterService,
  type FilterCriteria,
  type UserEngagementProfile,
  type FilterResult
} from './smart-notification-filter';

// Notification channel management
export { notificationChannelService } from './notification-channels';

// ===== MIGRATION GUIDE =====

/**
 * MIGRATION GUIDE:
 * 
 * BEFORE (Old imports):
 * import { NotificationService } from './notification';           // ❌ DEPRECATED
 * import { router } from './notifications';                      // ❌ DEPRECATED  
 * import { EmailService } from './email';                        // ❌ DEPRECATED
 * import { router as enhancedRouter } from './enhanced-notifications'; // ❌ DEPRECATED
 * 
 * AFTER (New imports):
 * import { notificationService, notificationRoutes } from './index'; // NOTE: emailService is currently missing
 * 
 * // For advanced features:
 * import { advancedNotificationService } from './index';
 * 
 * // For specialized functionality:
 * import { notificationSchedulerService, smartNotificationFilterService } from './index';
 */

// ===== DEFAULT EXPORTS FOR BACKWARD COMPATIBILITY =====

// Export the core service as default for simple use cases
export { notificationService as default } from './notification-service';

import { logger } from '@server/infrastructure/observability';

logger.info('📦 Notifications module loaded - Clean architecture implemented successfully', { component: 'Chanuka' });













































