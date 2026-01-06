/**
 * Notification Service - Notifications Feature
 *
 * Manages in-app notifications, user preferences, and real-time notification delivery
 */

export interface NotificationPreferences {
  /** Enable in-app notification display */
  inApp: boolean;
  /** Enable email notifications */
  email: boolean;
  /** Enable push notifications via service worker */
  push: boolean;
  /** Enable SMS text message notifications */
  sms: boolean;
  /** Notify when tracked bills change status */
  billStatusChanges: boolean;
  /** Notify when someone comments on a bill */
  newComments: boolean;
  /** Notify when experts publish new analysis */
  expertAnalysis: boolean;
  /** Send weekly digest of activity */
  weeklyDigest: boolean;
  /** Notify about trending bills in user's areas of interest */
  trendingBills: boolean;
  /** Notify about community updates and announcements */
  communityUpdates: boolean;
  /** Delivery frequency for batched notifications */
  frequency: 'immediate' | 'daily' | 'weekly' | 'hourly';
}

export interface NotificationData {
  id: string;
  type: 'bill_update' | 'comment' | 'analysis' | 'system' | 'community';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationEvent {
  type: 'notification_received' | 'notification_read' | 'notification_dismissed' | 'preferences_updated';
  data: NotificationData | NotificationPreferences;
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: NotificationData[] = [];
  private preferences: NotificationPreferences;
  private listeners: Array<(event: NotificationEvent) => void> = [];

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  constructor() {
    this.preferences = this.getDefaultPreferences();
    this.loadPreferences();
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      inApp: true,
      email: true,
      push: false,
      sms: false,
      billStatusChanges: true,
      newComments: true,
      expertAnalysis: true,
      weeklyDigest: true,
      trendingBills: false,
      communityUpdates: true,
      frequency: 'immediate'
    };
  }

  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem('notification-preferences');
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('notification-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  /**
   * Add a new notification
   */
  addNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>): void {
    const fullNotification: NotificationData = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    };

    // Check if this type of notification is enabled
    if (!this.isNotificationEnabled(notification.type)) {
      return;
    }

    this.notifications.unshift(fullNotification);

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.emit({
      type: 'notification_received',
      data: fullNotification
    });

    // Show browser notification if enabled
    if (this.preferences.push && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: fullNotification.id
      });
    }
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.emit({
        type: 'notification_read',
        data: notification
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    let hasChanges = false;
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.emit({
        type: 'notification_read',
        data: this.notifications[0] // Send first notification as representative
      });
    }
  }

  /**
   * Remove notification
   */
  dismissNotification(notificationId: string): void {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
      const notification = this.notifications.splice(index, 1)[0];
      this.emit({
        type: 'notification_dismissed',
        data: notification
      });
    }
  }

  /**
   * Get all notifications
   */
  getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): NotificationData[] {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * Get notification count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Update notification preferences
   */
  updatePreferences(newPreferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.savePreferences();

    this.emit({
      type: 'preferences_updated',
      data: this.preferences
    });

    // Request push notification permission if enabled
    if (newPreferences.push && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Subscribe to notification events
   */
  subscribe(listener: (event: NotificationEvent) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = [];
  }

  private isNotificationEnabled(type: NotificationData['type']): boolean {
    if (!this.preferences.inApp) return false;

    switch (type) {
      case 'bill_update':
        return this.preferences.billStatusChanges;
      case 'comment':
        return this.preferences.newComments;
      case 'analysis':
        return this.preferences.expertAnalysis;
      case 'community':
        return this.preferences.communityUpdates;
      case 'system':
        return true; // System notifications are always enabled
      default:
        return true;
    }
  }

  private emit(event: NotificationEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  /**
   * Generate notification for bill status change
   */
  notifyBillStatusChange(billId: string, billTitle: string, newStatus: string): void {
    this.addNotification({
      type: 'bill_update',
      title: 'Bill Status Update',
      message: `${billTitle} is now ${newStatus}`,
      priority: 'medium',
      category: 'bills',
      actionUrl: `/bills/${billId}`,
      metadata: { billId, newStatus }
    });
  }

  /**
   * Generate notification for new comment
   */
  notifyNewComment(billId: string, billTitle: string, commenterName: string): void {
    this.addNotification({
      type: 'comment',
      title: 'New Comment',
      message: `${commenterName} commented on ${billTitle}`,
      priority: 'low',
      category: 'comments',
      actionUrl: `/bills/${billId}#comments`,
      metadata: { billId, commenterName }
    });
  }

  /**
   * Generate notification for expert analysis
   */
  notifyExpertAnalysis(billId: string, billTitle: string, expertName: string): void {
    this.addNotification({
      type: 'analysis',
      title: 'New Expert Analysis',
      message: `${expertName} published analysis for ${billTitle}`,
      priority: 'high',
      category: 'analysis',
      actionUrl: `/bills/${billId}/analysis`,
      metadata: { billId, expertName }
    });
  }
}

export const notificationService = NotificationService.getInstance();
