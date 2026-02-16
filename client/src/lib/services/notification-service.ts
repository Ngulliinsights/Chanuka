/**
 * Notification Service
 * Handles application notifications
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'comment' | 'bill_update' | 'recommendation' | 'system';

export interface NotificationData extends Notification {}

export class NotificationService {
  private notifications: NotificationData[] = [];
  private eventListeners: Map<string, Set<Function>> = new Map();
  private initialized = false;
  private preferences: NotificationPreferences = {
    email: true,
    push: false,
    sms: false,
    frequency: 'immediate',
  };

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    // Load preferences from storage
    this.loadPreferences();
  }

  private loadPreferences() {
    try {
      const stored = localStorage.getItem('notification-preferences');
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  private savePreferences() {
    try {
      localStorage.setItem('notification-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  updatePreferences(newPreferences: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.savePreferences();
    this.emit('preferences:updated', this.preferences);
  }

  addNotification(notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    const newNotification: NotificationData = {
      ...notification,
      id: Math.random().toString(36),
      timestamp: new Date(),
    };
    this.notifications.push(newNotification);
    this.emit('notification:received', newNotification);
    this.emit('unread_count:changed', this.getUnreadCount());
    return newNotification;
  }

  getNotifications() {
    return this.notifications;
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.emit('unread_count:changed', this.getUnreadCount());
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.emit('unread_count:changed', 0);
  }

  dismissNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.emit('unread_count:changed', this.getUnreadCount());
  }

  clearNotifications() {
    this.notifications = [];
    this.emit('unread_count:changed', 0);
  }

  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    this.eventListeners.get(event)?.forEach(callback => callback(data));
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
