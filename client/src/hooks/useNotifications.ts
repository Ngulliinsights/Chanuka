/**
 * React hooks for notification management
 * 
 * Provides hooks for managing notifications, preferences, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '@client/utils/logger';

import { 
  notificationService, 
  Notification, 
  NotificationPreferences, 
  NotificationType 
} from '@client/services/notification-service';

/**
 * Main notification hook - provides access to notifications and core functionality
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize notification service
  useEffect(() => {
    let mounted = true;

    const initializeService = async () => {
      try {
        setIsLoading(true);
        await notificationService.initialize();
        
        if (mounted) {
          setNotifications(notificationService.getNotifications());
          setUnreadCount(notificationService.getUnreadCount());
          setIsInitialized(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize notifications');
          logger.error('Failed to initialize notification service', { component: 'useNotifications' }, err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeService();

    return () => {
      mounted = false;
    };
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!isInitialized) return;

    const handleNotificationReceived = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleNotificationRead = () => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    };

    const handleUnreadCountChanged = (count: number) => {
      setUnreadCount(count);
    };

    const handleAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    };

    const handleNotificationDeleted = () => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    };

    const handleBulkRead = () => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    };

    const handleSynced = (data: { count: number }) => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
      logger.info('Notifications synced', { component: 'useNotifications', count: data.count });
    };

    // Subscribe to events
    const unsubscribeReceived = notificationService.on('notification:received', handleNotificationReceived);
    const unsubscribeRead = notificationService.on('notification:read', handleNotificationRead);
    const unsubscribeUnreadCount = notificationService.on('unread_count:changed', handleUnreadCountChanged);
    const unsubscribeAllRead = notificationService.on('notifications:all_read', handleAllRead);
    const unsubscribeDeleted = notificationService.on('notification:deleted', handleNotificationDeleted);
    const unsubscribeBulkRead = notificationService.on('notifications:bulk_read', handleBulkRead);
    const unsubscribeSynced = notificationService.on('notifications:synced', handleSynced);

    return () => {
      unsubscribeReceived();
      unsubscribeRead();
      unsubscribeUnreadCount();
      unsubscribeAllRead();
      unsubscribeDeleted();
      unsubscribeBulkRead();
      unsubscribeSynced();
    };
  }, [isInitialized]);

  // Memoized functions
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
      logger.error('Failed to mark notification as read', { component: 'useNotifications' }, err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
      logger.error('Failed to mark all notifications as read', { component: 'useNotifications' }, err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
      logger.error('Failed to delete notification', { component: 'useNotifications' }, err);
    }
  }, []);

  const loadMore = useCallback(async (options?: { 
    limit?: number; 
    category?: NotificationCategory;
    unreadOnly?: boolean;
  }) => {
    try {
      setIsLoading(true);
      await notificationService.loadNotifications({
        offset: notifications.length,
        limit: options?.limit || 20,
        category: options?.category,
        unreadOnly: options?.unreadOnly
      });
      setNotifications(notificationService.getNotifications());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more notifications');
      logger.error('Failed to load more notifications', { component: 'useNotifications' }, err);
    } finally {
      setIsLoading(false);
    }
  }, [notifications.length]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      await notificationService.loadNotifications({ offset: 0 });
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh notifications');
      logger.error('Failed to refresh notifications', { component: 'useNotifications' }, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    isInitialized,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    refresh,
    clearError
  };
}

/**
 * Hook for managing notification preferences
 */
export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        const prefs = await notificationService.loadUserPreferences();
        setPreferences(prefs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
        logger.error('Failed to load notification preferences', { component: 'useNotificationPreferences' }, err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Listen for preference updates
  useEffect(() => {
    const handlePreferencesUpdated = (updatedPrefs: NotificationPreferences) => {
      setPreferences(updatedPrefs);
      setHasChanges(false);
    };

    const unsubscribe = notificationService.on('preferences:updated', handlePreferencesUpdated);
    return unsubscribe;
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    try {
      setIsLoading(true);
      await notificationService.updatePreferences(updates);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      logger.error('Failed to update notification preferences', { component: 'useNotificationPreferences' }, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateLocalPreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferences(prev => prev ? { ...prev, ...updates } : null);
    setHasChanges(true);
  }, []);

  const resetPreferences = useCallback(() => {
    if (preferences) {
      setPreferences(notificationService.getPreferences());
      setHasChanges(false);
    }
  }, [preferences]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    preferences,
    isLoading,
    error,
    hasChanges,
    updatePreferences,
    updateLocalPreferences,
    resetPreferences,
    clearError
  };
}

/**
 * Hook for push notification management
 */
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check support and permission on mount
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Check subscription status
  useEffect(() => {
    if (!isSupported) return;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (err) {
        logger.error('Failed to check push subscription status', { component: 'usePushNotifications' }, err);
      }
    };

    checkSubscription();
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported');
      return false;
    }

    try {
      const granted = await notificationService.requestPushPermission();
      setPermission(Notification.permission);
      return granted;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permission');
      logger.error('Failed to request push notification permission', { component: 'usePushNotifications' }, err);
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported');
      return false;
    }

    try {
      setIsLoading(true);
      const success = await notificationService.subscribeToPushNotifications();
      setIsSubscribed(success);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe to push notifications');
      logger.error('Failed to subscribe to push notifications', { component: 'usePushNotifications' }, err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const success = await notificationService.unsubscribeFromPushNotifications();
      setIsSubscribed(!success);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe from push notifications');
      logger.error('Failed to unsubscribe from push notifications', { component: 'usePushNotifications' }, err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
    clearError
  };
}

/**
 * Hook for notification history and filtering
 */
export function useNotificationHistory() {
  const [history, setHistory] = useState<Notification[]>([]);
  const [categories, setCategories] = useState<Record<NotificationCategory, number>>({} as Record<NotificationCategory, number>);
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (options: {
    limit?: number;
    offset?: number;
    category?: NotificationCategory;
    type?: NotificationType;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dateFrom?: string;
    dateTo?: string;
    readStatus?: 'read' | 'unread' | 'all';
  } = {}) => {
    try {
      setIsLoading(true);
      const result = await notificationService.getNotificationHistory(options);
      
      if (options.offset === 0 || !options.offset) {
        setHistory(result.notifications);
      } else {
        setHistory(prev => [...prev, ...result.notifications]);
      }
      
      setCategories(result.categories);
      setPriorities(result.priorities);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification history');
      logger.error('Failed to load notification history', { component: 'useNotificationHistory' }, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bulkMarkAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationService.bulkMarkAsRead(notificationIds);
      // Update local state
      setHistory(prev => prev.map(n => 
        notificationIds.includes(n.id) ? { ...n, read: true } : n
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notifications as read');
      logger.error('Failed to bulk mark notifications as read', { component: 'useNotificationHistory' }, err);
    }
  }, []);

  const bulkDelete = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationService.bulkDeleteNotifications(notificationIds);
      // Update local state
      setHistory(prev => prev.filter(n => !notificationIds.includes(n.id)));
      setTotal(prev => prev - notificationIds.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notifications');
      logger.error('Failed to bulk delete notifications', { component: 'useNotificationHistory' }, err);
    }
  }, []);

  const archiveOld = useCallback(async (olderThanDays: number = 30) => {
    try {
      setIsLoading(true);
      const result = await notificationService.archiveOldNotifications(olderThanDays);
      
      // Reload history to reflect changes
      await loadHistory();
      
      return result.archived;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive old notifications');
      logger.error('Failed to archive old notifications', { component: 'useNotificationHistory' }, err);
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [loadHistory]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    history,
    categories,
    priorities,
    total,
    isLoading,
    error,
    loadHistory,
    bulkMarkAsRead,
    bulkDelete,
    archiveOld,
    clearError
  };
}

/**
 * Hook for email notification management
 */
export function useEmailNotifications() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailHistory, setEmailHistory] = useState<Array<{
    id: string;
    subject: string;
    sentAt: string;
    status: 'sent' | 'delivered' | 'opened' | 'failed';
    notificationIds: string[];
  }>>([]);

  const configureEmail = useCallback(async (config: {
    enabled: boolean;
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    categories: NotificationCategory[];
    digestTime?: string;
  }) => {
    try {
      setIsLoading(true);
      await notificationService.configureEmailNotifications(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure email notifications');
      logger.error('Failed to configure email notifications', { component: 'useEmailNotifications' }, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendTestEmail = useCallback(async () => {
    try {
      setIsLoading(true);
      await notificationService.sendTestEmailNotification();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
      logger.error('Failed to send test email notification', { component: 'useEmailNotifications' }, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadEmailHistory = useCallback(async (options: {
    limit?: number;
    offset?: number;
    dateFrom?: string;
    dateTo?: string;
  } = {}) => {
    try {
      setIsLoading(true);
      const result = await notificationService.getEmailNotificationHistory(options);
      
      if (options.offset === 0 || !options.offset) {
        setEmailHistory(result.emails);
      } else {
        setEmailHistory(prev => [...prev, ...result.emails]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email history');
      logger.error('Failed to load email notification history', { component: 'useEmailNotifications' }, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    emailHistory,
    configureEmail,
    sendTestEmail,
    loadEmailHistory,
    clearError
  };
}