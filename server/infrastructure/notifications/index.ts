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
} from './notification-service.js';

// Consolidated API routes
export { router as notificationRoutes } from './notification-routes.js';

// ===== ADVANCED SERVICES (Multi-channel & Smart Features) =====

// Notification orchestrator service with smart filtering, batching, and multi-channel delivery
export {
  NotificationOrchestratorService,
  notificationOrchestratorService,
  type NotificationRequest,
  type NotificationBatch,
  type NotificationResult,
  type BulkNotificationResult
} from './notification-orchestrator.js';

// ===== SPECIALIZED SERVICES (Domain-specific Features) =====

// Alerting service for monitoring and alerting
export {
  alertingService,
  type AlertRule,
  type AlertAction,
  type Alert
} from './alerting-service.js';

// Notification scheduler service for digest notifications
export {
  notificationSchedulerService,
  type ScheduledDigest,
  type DigestContent
} from './notification-scheduler.js';

// Smart notification filtering with AI/ML-based decisions
export {
  SmartNotificationFilterService,
  type FilterCriteria,
  type UserEngagementProfile,
  type FilterResult
} from './smart-notification-filter.js';

// Notification channel management
export { notificationChannelService } from './notification-channels.js';

// ===== MIGRATION GUIDE =====

/**
 * MIGRATION GUIDE:
 * 
 * BEFORE (Old imports):
 * import { NotificationService } from './notification.js';           // ❌ DEPRECATED
 * import { router } from './notifications.js';                      // ❌ DEPRECATED  
 * import { EmailService } from './email.js';                        // ❌ DEPRECATED
 * import { router as enhancedRouter } from './enhanced-notifications.js'; // ❌ DEPRECATED
 * 
 * AFTER (New imports):
 * import { notificationService, notificationRoutes } from './index.js'; // NOTE: emailService is currently missing
 * 
 * // For advanced features:
 * import { advancedNotificationService } from './index.js';
 * 
 * // For specialized functionality:
 * import { notificationSchedulerService, smartNotificationFilterService } from './index.js';
 */

// ===== DEFAULT EXPORTS FOR BACKWARD COMPATIBILITY =====

// Export the core service as default for simple use cases
export { notificationService as default } from './notification-service.js';

import { logger   } from '@shared/core/index.js';

logger.info('📦 Notifications module loaded - Clean architecture implemented successfully', { component: 'Chanuka' });













































