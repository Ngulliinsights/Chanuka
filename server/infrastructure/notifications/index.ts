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

// Advanced notification service with smart filtering, batching, and multi-channel delivery
export { 
  AdvancedNotificationService,
  advancedNotificationService,
  notificationService as consolidatedNotificationService,
  type NotificationChannel,
  type NotificationPreference,
  type NotificationRequest,
  type SmartNotificationFilter,
  type NotificationBatch,
  type NotificationTemplate
} from './advanced-notification-service.js';

// ===== SPECIALIZED SERVICES (Domain-specific Features) =====

// Enhanced notification service with advanced processing
export { 
  EnhancedNotificationService,
  type EnhancedNotificationData
} from './enhanced-notification.js';

// Notification scheduler for digest and cron job management
export { 
  NotificationSchedulerService,
  type ScheduledDigest,
  type DigestContent
} from './notification-scheduler.js';

// Smart notification filtering with AI/ML-based decisions
export { 
  SmartNotificationFilterService,
  type SmartFilterCriteria,
  type UserEngagementProfile,
  type FilterResult
} from './smart-notification-filter.js';

// Notification channel management
export { notificationChannelService } from './notification-channels.js';

// System alerting service
export { alertingService } from './alerting-service.js';

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

logger.info('📦 Notifications module loaded - Clean architecture implemented successfully', { component: 'SimpleTool' });






