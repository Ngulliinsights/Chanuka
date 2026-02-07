/**
 * Notification Service
 * Handles application notifications
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
}

export interface NotificationData extends Notification {}

export class NotificationService {
  private notifications: NotificationData[] = [];

  addNotification(notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    const newNotification: NotificationData = {
      ...notification,
      id: Math.random().toString(36),
      timestamp: new Date(),
    };
    this.notifications.push(newNotification);
    return newNotification;
  }

  getNotifications() {
    return this.notifications;
  }

  clearNotifications() {
    this.notifications = [];
  }
}

export const notificationService = new NotificationService();
export default notificationService;


export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}
