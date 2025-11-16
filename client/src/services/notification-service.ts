/**
 * Notification Service - Comprehensive notification management
 * 
 * Handles in-app notifications, push notifications, email notifications,
 * and integrates with community backend service for real-time updates.
 */

import { communityBackendService } from './community-backend-service';
import { UnifiedWebSocketManager } from '../core/api/websocket';
import { notificationApiService } from '../core/api/notifications';
import { logger } from '../utils/logger';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: NotificationCategory;
  createdAt: string;
  expiresAt?: string;
  actionUrl?: string;
  actionText?: string;
  
  // Community-specific fields
  isCommunityRelated: boolean;
  communityContext?: {
    billId?: number;
    commentId?: string;
    expertId?: string;
    campaignId?: string;
    petitionId?: string;
    discussionId?: string;
  };
}

export type NotificationType = 
  | 'comment_reply'
  | 'expert_response'
  | 'mention'
  | 'moderation_action'
  | 'expert_verification'
  | 'campaign_update'
  | 'petition_milestone'
  | 'discussion_trending'
  | 'expert_insight'
  | 'bill_update'
  | 'system_alert'
  | 'security_alert';

export type NotificationCategory = 
  | 'community'
  | 'bills'
  | 'expert'
  | 'moderation'
  | 'system'
  | 'security';

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  push: boolean;
  channels: {
    comments: boolean;
    expertInsights: boolean;
    moderation: boolean;
    mentions: boolean;
    billUpdates: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily';
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

export type NotificationChannel = keyof NotificationPreferences['channels'];

class NotificationService {
  private baseUrl: string;
  private isInitialized = false;
  private notifications: Notification[] = [];
  private unreadCount = 0;
  private preferences: NotificationPreferences | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private pushSubscription: PushSubscription | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize community WebSocket extension
      const { communityWebSocketExtension } = await import('./community-websocket-extension');
      communityWebSocketExtension.initialize();

      // Set up WebSocket listeners for notifications
      this.setupWebSocketListeners();

      // Initialize push notifications
      await this.initializePushNotifications();

      // Load user preferences and initial notifications
      await this.loadUserPreferences();
      await this.loadNotifications();

      // Set up periodic sync for offline notifications
      this.setupPeriodicSync();

      this.isInitialized = true;
      logger.info('Notification service initialized', { component: 'NotificationService' });
    } catch (error) {
      logger.error('Failed to initialize notification service', { component: 'NotificationService' }, error);
      throw error;
    }
  }

  /**
   * Set up WebSocket listeners for real-time notifications
   */
  private setupWebSocketListeners(): void {
    const { communityWebSocketExtension } = require('./community-websocket-extension');

    // Listen for community notifications
    communityWebSocketExtension.on('notification:community', (data: any) => {
      this.handleIncomingNotification({
        id: `community_${Date.now()}`,
        type: data.type as NotificationType,
        title: data.title,
        message: data.message,
        data: data.data,
        read: false,
        priority: this.determinePriority(data.type),
        category: 'community',
        createdAt: data.timestamp,
        isCommunityRelated: true,
        communityContext: data.data
      });
    });

    // Listen for general WebSocket notifications
    const wsManager = UnifiedWebSocketManager.getInstance();
    wsManager.on('notification', (data: any) => {
      this.handleGeneralNotification(data);
    });
  }

  // ============================================================================
  // PUSH NOTIFICATION METHODS
  // ============================================================================

  /**
   * Initialize push notifications
   */
  private async initializePushNotifications(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      logger.warn('Push notifications not supported', { component: 'NotificationService' });
      return;
    }

    try {
      // Register service worker
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
      logger.info('Service worker registered', { component: 'NotificationService' });

      // Check for existing subscription
      this.pushSubscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (this.pushSubscription) {
        // Sync existing subscription with backend
        await this.syncPushSubscription();
      }
    } catch (error) {
      logger.error('Failed to initialize push notifications', { component: 'NotificationService' }, error);
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications(): Promise<boolean> {
    if (!this.serviceWorkerRegistration) {
      logger.warn('Service worker not available', { component: 'NotificationService' });
      return false;
    }

    try {
      // Request notification permission
      const permission = await this.requestPushPermission();
      if (!permission) {
        return false;
      }

      // Get VAPID public key from backend
      const vapidKey = await this.getVapidPublicKey();
      
      // Subscribe to push notifications
      this.pushSubscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
      });

      // Send subscription to backend
      await this.sendPushSubscriptionToBackend(this.pushSubscription);

      logger.info('Push notification subscription successful', { component: 'NotificationService' });
      return true;
    } catch (error) {
      logger.error('Failed to subscribe to push notifications', { component: 'NotificationService' }, error);
      return false;
    }
  }

  /**
   * Get VAPID public key from backend
   */
  private async getVapidPublicKey(): Promise<string> {
    return await notificationApiService.getVapidPublicKey();
  }

  /**
   * Send push subscription to backend
   */
  private async sendPushSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    await notificationApiService.sendPushSubscription(subscription, navigator.userAgent);
  }

  /**
   * Sync existing push subscription with backend
   */
  private async syncPushSubscription(): Promise<void> {
    if (!this.pushSubscription) return;

    try {
      await this.sendPushSubscriptionToBackend(this.pushSubscription);
    } catch (error) {
      logger.error('Failed to sync push subscription', { component: 'NotificationService' }, error);
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Set up periodic sync for offline notifications
   */
  private setupPeriodicSync(): void {
    // Sync notifications every 5 minutes when online
    setInterval(async () => {
      if (navigator.onLine && this.isInitialized) {
        try {
          await this.syncOfflineNotifications();
        } catch (error) {
          logger.error('Failed to sync offline notifications', { component: 'NotificationService' }, error);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Sync notifications that were received while offline
   */
  private async syncOfflineNotifications(): Promise<void> {
    const lastSyncTime = localStorage.getItem('lastNotificationSync');
    const since = lastSyncTime ? new Date(lastSyncTime).toISOString() : undefined;

    const notifications = await this.loadNotifications({ since });
    
    // Update last sync time
    localStorage.setItem('lastNotificationSync', new Date().toISOString());
    
    // Emit sync event
    this.emit('notifications:synced', { count: notifications.length });
  }

  // ============================================================================
  // API METHODS
  // ============================================================================

  /**
   * Load user notification preferences
   */
  async loadUserPreferences(): Promise<NotificationPreferences> {
    try {
      const preferences = await notificationApiService.getPreferences();
      this.preferences = preferences || this.getDefaultPreferences();

      return this.preferences!;
    } catch (error) {
      logger.error('Failed to load notification preferences', { component: 'NotificationService' }, error);
      this.preferences = this.getDefaultPreferences();
      return this.preferences!;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      await notificationApiService.updatePreferences(preferences);

      // Update local preferences
      this.preferences = { ...this.preferences!, ...preferences };

      // Emit preferences updated event
      this.emit('preferences:updated', this.preferences);

      logger.info('Notification preferences updated', { component: 'NotificationService' });
    } catch (error) {
      logger.error('Failed to update notification preferences', { component: 'NotificationService' }, error);
      throw error;
    }
  }

  /**
   * Load notifications from backend
   */
  async loadNotifications(options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    since?: string;
    category?: NotificationCategory;
  } = {}): Promise<Notification[]> {
    try {
      const notifications = await notificationApiService.getNotifications(options);

      // Update local state
      if (options.offset === 0 || !options.offset) {
        this.notifications = notifications;
      } else {
        this.notifications.push(...notifications);
      }

      // Update unread count
      this.unreadCount = this.notifications.filter(n => !n.read).length;

      return notifications;
    } catch (error) {
      logger.error('Failed to load notifications', { component: 'NotificationService' }, error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await notificationApiService.markAsRead(notificationId);

      // Update local state
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);

        this.emit('notification:read', notification);
        this.emit('unread_count:changed', this.unreadCount);
      }
    } catch (error) {
      logger.error('Failed to mark notification as read', { component: 'NotificationService' }, error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await notificationApiService.markAllAsRead();

      // Update local state
      this.notifications.forEach(n => n.read = true);
      this.unreadCount = 0;

      this.emit('notifications:all_read');
      this.emit('unread_count:changed', 0);
    } catch (error) {
      logger.error('Failed to mark all notifications as read', { component: 'NotificationService' }, error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await notificationApiService.deleteNotification(notificationId);

      // Update local state
      const index = this.notifications.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        const notification = this.notifications[index];
        if (!notification.read) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }

        this.notifications.splice(index, 1);

        this.emit('notification:deleted', notification);
        this.emit('unread_count:changed', this.unreadCount);
      }
    } catch (error) {
      logger.error('Failed to delete notification', { component: 'NotificationService' }, error);
      throw error;
    }
  }

  // ============================================================================
  // NOTIFICATION HANDLING METHODS
  // ============================================================================

  /**
   * Handle incoming notification from WebSocket
   */
  private handleIncomingNotification(notification: Notification): void {
    // Check if notifications are enabled and not in quiet hours
    if (!this.shouldDeliverNotification(notification)) {
      return;
    }

    // Add to notifications list
    this.notifications.unshift(notification);
    this.unreadCount++;

    // Emit to listeners
    this.emit('notification:received', notification);

    // Show in-app notification if enabled
    if (this.preferences?.inApp) {
      this.showInAppNotification(notification);
    }

    // Request push notification if enabled and supported
    if (this.preferences?.push && 'Notification' in window) {
      this.showPushNotification(notification);
    }

    logger.info('Notification received', { component: 'NotificationService', type: notification.type });
  }

  /**
   * Handle general WebSocket notifications
   */
  private handleGeneralNotification(data: any): void {
    const notification: Notification = {
      id: data.id || `general_${Date.now()}`,
      type: data.type || 'system_alert',
      title: data.title,
      message: data.message,
      data: data.data,
      read: false,
      priority: this.determinePriority(data.type),
      category: this.getCategoryFromType(data.type),
      createdAt: data.timestamp || new Date().toISOString(),
      isCommunityRelated: this.isCommunityNotification(data),
      communityContext: this.extractCommunityContext(data)
    };

    this.handleIncomingNotification(notification);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if notification should be delivered based on preferences and quiet hours
   */
  private shouldDeliverNotification(notification: Notification): boolean {
    if (!this.preferences) return true;

    // Check channel preferences based on notification type
    const channelMap: Record<NotificationType, keyof NotificationPreferences['channels']> = {
      'comment_reply': 'comments',
      'expert_response': 'expertInsights',
      'expert_insight': 'expertInsights',
      'expert_verification': 'expertInsights',
      'mention': 'mentions',
      'moderation_action': 'moderation',
      'campaign_update': 'billUpdates',
      'petition_milestone': 'billUpdates',
      'discussion_trending': 'comments',
      'bill_update': 'billUpdates',
      'system_alert': 'billUpdates',
      'security_alert': 'moderation'
    };

    const channelKey = channelMap[notification.type];
    if (channelKey && !this.preferences.channels[channelKey]) {
      return false;
    }

    // Check quiet hours
    if (this.preferences.quietHours?.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const { startTime, endTime } = this.preferences.quietHours;
      
      // Simple time range check (doesn't handle overnight ranges)
      if (startTime <= endTime) {
        if (currentTime >= startTime && currentTime <= endTime) {
          return notification.priority === 'urgent';
        }
      }
    }

    return true;
  }

  /**
   * Determine notification priority based on type
   */
  private determinePriority(type: string): 'low' | 'medium' | 'high' | 'urgent' {
    const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
      'mention': 'high',
      'expert_response': 'high',
      'expert_insight': 'high',
      'expert_verification': 'medium',
      'moderation_action': 'medium',
      'comment_reply': 'medium',
      'bill_update': 'medium',
      'campaign_update': 'medium',
      'petition_milestone': 'medium',
      'discussion_trending': 'low',
      'system_alert': 'low',
      'security_alert': 'urgent'
    };

    return priorityMap[type] || 'medium';
  }

  /**
   * Get category from notification type
   */
  private getCategoryFromType(type: string): NotificationCategory {
    const categoryMap: Record<string, NotificationCategory> = {
      'comment_reply': 'community',
      'expert_response': 'expert',
      'expert_insight': 'expert',
      'expert_verification': 'expert',
      'mention': 'community',
      'moderation_action': 'moderation',
      'campaign_update': 'community',
      'petition_milestone': 'community',
      'discussion_trending': 'community',
      'bill_update': 'bills',
      'system_alert': 'system',
      'security_alert': 'security'
    };

    return categoryMap[type] || 'system';
  }

  /**
   * Check if notification is community-related
   */
  private isCommunityNotification(notification: any): boolean {
    const communityTypes = [
      'comment_reply', 'expert_response', 'mention', 'moderation_action',
      'expert_verification', 'campaign_update', 'petition_milestone',
      'discussion_trending', 'expert_insight'
    ];
    return communityTypes.includes(notification.type);
  }

  /**
   * Extract community context from notification
   */
  private extractCommunityContext(notification: any): any {
    if (!this.isCommunityNotification(notification)) {
      return null;
    }

    return {
      billId: notification.data?.billId,
      commentId: notification.data?.commentId,
      expertId: notification.data?.expertId,
      campaignId: notification.data?.campaignId,
      petitionId: notification.data?.petitionId,
      discussionId: notification.data?.discussionId
    };
  }

  /**
   * Show in-app notification
   */
  private showInAppNotification(notification: Notification): void {
    // This would integrate with a toast/notification component
    this.emit('notification:show_in_app', notification);
  }

  /**
   * Show push notification
   */
  private showPushNotification(notification: Notification): void {
    if ('Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        data: notification.data
      });
    }
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(): NotificationPreferences {
    return {
      inApp: true,
      email: true,
      push: false,
      channels: {
        comments: true,
        expertInsights: true,
        moderation: true,
        mentions: true,
        billUpdates: true
      },
      frequency: 'immediate'
    };
  }


  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  /**
   * Add event listener
   */
  on(event: string, callback: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners || listeners.size === 0) return;

    const listenerArray = Array.from(listeners);
    
    listenerArray.forEach(callback => {
      try {
        queueMicrotask(() => callback(data));
      } catch (error) {
        logger.error(`Error in notification event listener for '${event}':`, { component: 'NotificationService' }, error);
      }
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get current notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.unreadCount;
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences | null {
    return this.preferences;
  }

  /**
   * Request push notification permission
   */
  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (window.Notification.permission === 'granted') {
      return true;
    }

    if (window.Notification.permission === 'denied') {
      return false;
    }

    const permission = await window.Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.eventListeners.clear();
    const { communityWebSocketExtension } = require('./community-websocket-extension');
    communityWebSocketExtension.cleanup();
    
    this.isInitialized = false;
    logger.info('Notification service cleaned up', { component: 'NotificationService' });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export types and class for testing
export { NotificationService };