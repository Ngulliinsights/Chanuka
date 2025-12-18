/**
 * Notification Service - Core Real-time Module
 * 
 * Handles real-time notifications through WebSocket connections,
 * including user notifications, system alerts, and push notifications.
 */

import { UnifiedWebSocketManager } from '../manager';
import { 
  WebSocketNotification, 
  WebSocketMessage 
} from '../types';
import { logger } from '@client/utils/logger';

export class NotificationService {
  private wsManager: UnifiedWebSocketManager;
  private notifications: WebSocketNotification[] = [];
  private maxNotifications = 100;
  private isSubscribed = false;
  private isInitialized = false;

  constructor(wsManager: UnifiedWebSocketManager) {
    this.wsManager = wsManager;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up WebSocket event handlers
      this.setupEventHandlers();

      // Subscribe to user notifications
      this.subscribeToNotifications();

      this.isInitialized = true;

      logger.info('NotificationService initialized', {
        component: 'NotificationService'
      });
    } catch (error) {
      logger.error('Failed to initialize NotificationService', {
        component: 'NotificationService'
      }, error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Unsubscribe from notifications
      this.unsubscribeFromNotifications();

      // Clear notifications
      this.notifications = [];

      this.isInitialized = false;

      logger.info('NotificationService shut down', {
        component: 'NotificationService'
      });
    } catch (error) {
      logger.error('Error during NotificationService shutdown', {
        component: 'NotificationService'
      }, error);
    }
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  subscribeToNotifications(): string {
    if (this.isSubscribed) {
      logger.debug('Already subscribed to notifications', {
        component: 'NotificationService'
      });
      return 'user_notifications';
    }

    const subscriptionId = this.wsManager.subscribe(
      'user_notifications',
      (message) => this.handleNotificationMessage(message)
    );

    this.isSubscribed = true;

    logger.info('Subscribed to user notifications', {
      component: 'NotificationService',
      subscriptionId
    });

    return subscriptionId;
  }

  unsubscribeFromNotifications(): void {
    if (!this.isSubscribed) return;

    // Note: In a real implementation, you'd need to track the subscription ID
    this.isSubscribed = false;

    logger.info('Unsubscribed from user notifications', {
      component: 'NotificationService'
    });
  }

  getSubscriptionCount(): number {
    return this.isSubscribed ? 1 : 0;
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  handleMessage(message: WebSocketMessage): void {
    try {
      if (message.type === 'notification') {
        this.handleNotificationMessage(message);
      } else if (message.type === 'notification_read') {
        this.handleNotificationReadMessage(message);
      } else if (message.type === 'notification_clear') {
        this.handleNotificationClearMessage(message);
      }
    } catch (error) {
      logger.error('Error handling notification message', {
        component: 'NotificationService',
        messageType: message.type
      }, error);
    }
  }

  private handleNotificationMessage(message: WebSocketMessage): void {
    try {
      const data = message as any;
      
      const notification: WebSocketNotification = {
        id: data.id || data.notification?.id || `notification_${Date.now()}`,
        type: data.type || data.notification?.type || 'info',
        title: data.title || data.notification?.title || 'Notification',
        message: data.message || data.notification?.message || '',
        priority: data.priority || data.notification?.priority || 'normal',
        data: data.data || data.notification?.data,
        timestamp: data.timestamp || data.notification?.timestamp || new Date().toISOString(),
        read: false
      };

      this.addNotification(notification);

      logger.debug('Processed notification', {
        component: 'NotificationService',
        notificationId: notification.id,
        type: notification.type,
        priority: notification.priority
      });
    } catch (error) {
      logger.error('Error handling notification message', {
        component: 'NotificationService'
      }, error);
    }
  }

  private handleNotificationReadMessage(message: WebSocketMessage): void {
    try {
      const data = message as any;
      const notificationId = data.notification_id || data.notificationId || data.id;
      
      if (notificationId) {
        this.markAsRead(notificationId);
      }
    } catch (error) {
      logger.error('Error handling notification read message', {
        component: 'NotificationService'
      }, error);
    }
  }

  private handleNotificationClearMessage(message: WebSocketMessage): void {
    try {
      const data = message as any;
      
      if (data.clear_all) {
        this.clearAllNotifications();
      } else if (data.notification_id || data.notificationId) {
        this.removeNotification(data.notification_id || data.notificationId);
      }
    } catch (error) {
      logger.error('Error handling notification clear message', {
        component: 'NotificationService'
      }, error);
    }
  }

  // ============================================================================
  // Notification Management
  // ============================================================================

  private addNotification(notification: WebSocketNotification): void {
    // Add to beginning of array
    this.notifications = [notification, ...this.notifications];

    // Keep only the most recent notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    logger.debug('Added notification', {
      component: 'NotificationService',
      notificationId: notification.id,
      totalNotifications: this.notifications.length
    });
  }

  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId);
    
    if (notification && !notification.read) {
      notification.read = true;
      
      logger.debug('Marked notification as read', {
        component: 'NotificationService',
        notificationId
      });
      
      return true;
    }
    
    return false;
  }

  markAllAsRead(): number {
    let markedCount = 0;
    
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        markedCount++;
      }
    });

    if (markedCount > 0) {
      logger.info('Marked all notifications as read', {
        component: 'NotificationService',
        markedCount
      });
    }

    return markedCount;
  }

  removeNotification(notificationId: string): boolean {
    const initialLength = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    
    const removed = this.notifications.length < initialLength;
    
    if (removed) {
      logger.debug('Removed notification', {
        component: 'NotificationService',
        notificationId
      });
    }
    
    return removed;
  }

  clearAllNotifications(): void {
    const clearedCount = this.notifications.length;
    this.notifications = [];
    
    logger.info('Cleared all notifications', {
      component: 'NotificationService',
      clearedCount
    });
  }

  clearReadNotifications(): number {
    const initialLength = this.notifications.length;
    this.notifications = this.notifications.filter(n => !n.read);
    
    const clearedCount = initialLength - this.notifications.length;
    
    if (clearedCount > 0) {
      logger.info('Cleared read notifications', {
        component: 'NotificationService',
        clearedCount
      });
    }
    
    return clearedCount;
  }

  // ============================================================================
  // Data Access
  // ============================================================================

  getAllNotifications(): WebSocketNotification[] {
    return [...this.notifications];
  }

  getUnreadNotifications(): WebSocketNotification[] {
    return this.notifications.filter(n => !n.read);
  }

  getNotificationsByType(type: WebSocketNotification['type']): WebSocketNotification[] {
    return this.notifications.filter(n => n.type === type);
  }

  getNotificationsByPriority(priority: WebSocketNotification['priority']): WebSocketNotification[] {
    return this.notifications.filter(n => n.priority === priority);
  }

  getNotification(notificationId: string): WebSocketNotification | null {
    return this.notifications.find(n => n.id === notificationId) || null;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getRecentNotifications(limit: number = 10): WebSocketNotification[] {
    return this.notifications.slice(0, limit);
  }

  // ============================================================================
  // Notification Actions
  // ============================================================================

  sendMarkAsReadUpdate(notificationId: string): void {
    const message = {
      type: 'mark_notification_read',
      data: {
        notification_id: notificationId,
        timestamp: new Date().toISOString()
      }
    };

    this.wsManager.send(message);

    logger.debug('Sent mark as read update', {
      component: 'NotificationService',
      notificationId
    });
  }

  sendClearNotificationUpdate(notificationId: string): void {
    const message = {
      type: 'clear_notification',
      data: {
        notification_id: notificationId,
        timestamp: new Date().toISOString()
      }
    };

    this.wsManager.send(message);

    logger.debug('Sent clear notification update', {
      component: 'NotificationService',
      notificationId
    });
  }

  sendClearAllNotificationsUpdate(): void {
    const message = {
      type: 'clear_all_notifications',
      data: {
        timestamp: new Date().toISOString()
      }
    };

    this.wsManager.send(message);

    logger.debug('Sent clear all notifications update', {
      component: 'NotificationService'
    });
  }

  // ============================================================================
  // Event Handlers Setup
  // ============================================================================

  private setupEventHandlers(): void {
    this.wsManager.on('connected', () => {
      // Re-subscribe to notifications on reconnection
      if (this.isSubscribed) {
        this.isSubscribed = false;
        this.subscribeToNotifications();
      }

      logger.info('Re-subscribed to notifications after reconnection', {
        component: 'NotificationService'
      });
    });

    this.wsManager.on('disconnected', () => {
      logger.warn('WebSocket disconnected, notifications paused', {
        component: 'NotificationService'
      });
    });
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  getStats(): {
    totalNotifications: number;
    unreadNotifications: number;
    notificationsByType: Record<string, number>;
    notificationsByPriority: Record<string, number>;
    isSubscribed: boolean;
  } {
    const notificationsByType: Record<string, number> = {};
    const notificationsByPriority: Record<string, number> = {};

    this.notifications.forEach(notification => {
      notificationsByType[notification.type] = (notificationsByType[notification.type] || 0) + 1;
      notificationsByPriority[notification.priority] = (notificationsByPriority[notification.priority] || 0) + 1;
    });

    return {
      totalNotifications: this.notifications.length,
      unreadNotifications: this.getUnreadCount(),
      notificationsByType,
      notificationsByPriority,
      isSubscribed: this.isSubscribed
    };
  }
}