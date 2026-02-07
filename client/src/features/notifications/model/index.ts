/**
 * Notifications Model Layer
 *
 * Centralized exports for notifications domain models and services
 */

export { notificationService } from './notification-service';

export type {
  NotificationPreferences,
  Notification,
  NotificationData,
  NotificationEvent,
} from './notification-service';
