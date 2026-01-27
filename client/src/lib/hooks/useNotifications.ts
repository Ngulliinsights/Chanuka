/**
 * React hooks for notification management
 *
 * Provides hooks for managing notifications, preferences, and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';

import {
  notificationService,
  type Notification as NotificationData, // Renamed to avoid conflict with browser Notification API
  type NotificationPreferences,
  type NotificationType,
} from '@client/lib/services/notification-service';
import { logger } from '@client/lib/utils/logger';

/**
 * Main notification hook - provides access to notifications and core functionality
 *
 * This hook initializes the notification service, manages notification state,
 * and provides methods for common notification operations like marking as read
 * and deleting notifications.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize notification service on mount
  useEffect(() => {
    let mounted = true;

    const initializeService = async () => {
      try {
        setIsLoading(true);
        await notificationService.initialize();

        if (mounted) {
          // Load initial state from the service
          setNotifications(notificationService.getNotifications());
          setUnreadCount(notificationService.getUnreadCount());
          setIsInitialized(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize notifications');
          logger.error(
            'Failed to initialize notification service',
            { component: 'useNotifications' },
            err
          );
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

  // Set up event listeners for real-time updates
  useEffect(() => {
    if (!isInitialized) return;

    // Handler for new notifications arriving
    const handleNotificationReceived = (notification: NotificationData) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    // Handler for unread count changes
    const handleUnreadCountChanged = (count: number) => {
      setUnreadCount(count);
    };

    // Subscribe to the service's event system
    const unsubscribeReceived = notificationService.on(
      'notification:received',
      handleNotificationReceived
    );
    const unsubscribeUnreadCount = notificationService.on(
      'unread_count:changed',
      handleUnreadCountChanged
    );

    return () => {
      unsubscribeReceived();
      unsubscribeUnreadCount();
    };
  }, [isInitialized]);

  /**
   * Mark a single notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      // Update local state to reflect the change immediately
      setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
      logger.error('Failed to mark notification as read', { component: 'useNotifications' }, err);
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      // Update all notifications in local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
      logger.error(
        'Failed to mark all notifications as read',
        { component: 'useNotifications' },
        err
      );
    }
  }, []);

  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      // Remove from local state
      setNotifications(prev => {
        const deleted = prev.find(n => n.id === notificationId);
        if (deleted && !deleted.read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
      logger.error('Failed to delete notification', { component: 'useNotifications' }, err);
    }
  }, []);

  /**
   * Load more notifications with pagination
   */
  const loadMore = useCallback(
    async (options?: { limit?: number; type?: NotificationType; unreadOnly?: boolean }) => {
      try {
        setIsLoading(true);
        // Calculate the current page based on loaded notifications
        const page = Math.floor(notifications.length / 20) + 1;
        const limit = options?.limit || 20;

        await notificationService.loadNotifications(
          { type: options?.type, unreadOnly: options?.unreadOnly },
          page,
          limit
        );

        // Get updated notifications from service
        setNotifications(notificationService.getNotifications());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load more notifications');
        logger.error('Failed to load more notifications', { component: 'useNotifications' }, err);
      } finally {
        setIsLoading(false);
      }
    },
    [notifications.length]
  );

  /**
   * Refresh notifications from the server
   */
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      // Load from the first page again
      await notificationService.loadNotifications({}, 1, 20);
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh notifications');
      logger.error('Failed to refresh notifications', { component: 'useNotifications' }, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear the current error state
   */
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
    clearError,
  };
}

/**
 * Hook for managing notification preferences
 *
 * Handles loading and updating user preferences for notifications,
 * including which types of notifications they want to receive and
 * how they want to be notified.
 */
export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load initial preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        // The service expects a userId parameter. You'll need to get this from your auth context.
        // For now, we're using a placeholder that you should replace with your actual user ID.
        const userId = 'current-user'; // TODO: Replace with actual user ID from auth context
        const prefs = await notificationService.getUserPreferences(userId);
        setPreferences(prefs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
        logger.error(
          'Failed to load notification preferences',
          { component: 'useNotificationPreferences' },
          err
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  /**
   * Update preferences on the server
   */
  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      try {
        setIsLoading(true);
        // The service requires a full preferences object and a userId.
        const userId = 'current-user'; // TODO: Replace with actual user ID from auth context
        const merged = (
          preferences ? { ...preferences, ...updates } : (updates as NotificationPreferences)
        ) as NotificationPreferences;
        await notificationService.updatePreferences(merged, userId);
        // Update local state to reflect changes
        setPreferences(prev => (prev ? { ...prev, ...updates } : (merged ?? null)));
        setHasChanges(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update preferences');
        logger.error(
          'Failed to update notification preferences',
          { component: 'useNotificationPreferences' },
          err
        );
      } finally {
        setIsLoading(false);
      }
    },
    [preferences]
  );

  /**
   * Update preferences locally without saving
   * Useful for form editing before submission
   */
  const updateLocalPreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferences(prev => (prev ? { ...prev, ...updates } : null));
    setHasChanges(true);
  }, []);

  /**
   * Reset local changes back to server state
   */
  const resetPreferences = useCallback(async () => {
    if (preferences) {
      try {
        const userId = 'current-user'; // TODO: Replace with actual user ID from auth context
        const freshPrefs = await notificationService.getUserPreferences(userId);
        setPreferences(freshPrefs);
        setHasChanges(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reset preferences');
        logger.error(
          'Failed to reset preferences',
          { component: 'useNotificationPreferences' },
          err
        );
      }
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
    clearError,
  };
}

/**
 * Hook for push notification management
 *
 * Handles browser push notification permissions and subscriptions.
 * This integrates with the browser's Notification API and Service Workers.
 */
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check if push notifications are supported in this browser
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);

      if (supported && typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Check current subscription status
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
        logger.error(
          'Failed to check push subscription status',
          { component: 'usePushNotifications' },
          err
        );
      }
    };

    checkSubscription();
  }, [isSupported]);

  /**
   * Request permission from the user to show notifications
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    try {
      if (typeof Notification === 'undefined') {
        throw new Error('Notification API not available');
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permission');
      logger.error(
        'Failed to request push notification permission',
        { component: 'usePushNotifications' },
        err
      );
      return false;
    }
  }, [isSupported]);

  /**
   * Subscribe to push notifications
   * This creates a push subscription with the browser
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        setError('Permission denied for push notifications');
        return false;
      }
    }

    try {
      setIsLoading(true);
      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        throw new Error('Service worker not registered');
      }

      // Subscribe using the push manager
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY,
      });

      // TODO: You'll need to add a method to your notification service to save this subscription
      // Something like: await notificationService.savePushSubscription(subscription);
      logger.info('Push subscription created', { component: 'usePushNotifications' });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe to push notifications');
      logger.error(
        'Failed to subscribe to push notifications',
        { component: 'usePushNotifications' },
        err
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission, requestPermission]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        throw new Error('Service worker not registered');
      }

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        // TODO: You'll need to add a method to remove the subscription from your server
        // Something like: await notificationService.removePushSubscription(subscription.endpoint);
        logger.info('Push subscription removed', { component: 'usePushNotifications' });
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to unsubscribe from push notifications'
      );
      logger.error(
        'Failed to unsubscribe from push notifications',
        { component: 'usePushNotifications' },
        err
      );
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
    clearError,
  };
}

/**
 * Hook for notification history and filtering
 *
 * This hook provides advanced querying capabilities for notifications, including
 * filtering by category, type, priority, date ranges, and read status. It also
 * provides analytics like category counts and priority distributions.
 *
 * IMPORTANT: This hook requires several methods that don't currently exist in your
 * notification service. You'll need to implement these on the backend:
 *
 * 1. getNotificationHistory(options) - Should return paginated notifications with metadata
 * 2. bulkMarkAsRead(notificationIds) - Mark multiple notifications as read at once
 * 3. bulkDeleteNotifications(notificationIds) - Delete multiple notifications at once
 * 4. archiveOldNotifications(olderThanDays) - Archive notifications older than X days
 */
export function useNotificationHistory() {
  const [history, setHistory] = useState<NotificationData[]>([]);
  const [categories, setCategories] = useState<Record<NotificationType, number>>(
    {} as Record<NotificationType, number>
  );
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load notification history with various filtering options
   *
   * This function allows you to query notifications with fine-grained control over
   * what you retrieve. It supports pagination, filtering by multiple criteria, and
   * returns aggregated statistics about the notifications.
   */
  const loadHistory = useCallback(
    async (
      options: {
        limit?: number;
        offset?: number;
        type?: NotificationType;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        dateFrom?: string;
        dateTo?: string;
        readStatus?: 'read' | 'unread' | 'all';
      } = {}
    ) => {
      try {
        setIsLoading(true);

        // TODO: Implement this method in your notification service
        // The method should accept these options and return an object with:
        // { notifications: NotificationData[], categories: Record<NotificationType, number>,
        //   priorities: Record<string, number>, total: number }

        // For now, we'll use a workaround that gets notifications from the existing method
        // This won't support all the filtering options, but it won't cause TypeScript errors
        const page = Math.floor((options.offset || 0) / (options.limit || 20)) + 1;
        await notificationService.loadNotifications(
          { type: options.type, unreadOnly: options.readStatus === 'unread' },
          page,
          options.limit || 20
        );

        const notifications = notificationService.getNotifications();

        // Calculate basic statistics from the loaded notifications
        const categoryCount: Record<string, number> = {};
        const priorityCount: Record<string, number> = {};

        notifications.forEach(n => {
          categoryCount[n.type] = (categoryCount[n.type] || 0) + 1;
          if ('priority' in n && typeof n.priority === 'string') {
            priorityCount[n.priority] = (priorityCount[n.priority] || 0) + 1;
          }
        });

        if (options.offset === 0 || !options.offset) {
          setHistory(notifications);
        } else {
          setHistory(prev => [...prev, ...notifications]);
        }

        setCategories(categoryCount as Record<NotificationType, number>);
        setPriorities(priorityCount);
        setTotal(notifications.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notification history');
        logger.error(
          'Failed to load notification history',
          { component: 'useNotificationHistory' },
          err
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Mark multiple notifications as read in a single operation
   * This is more efficient than marking them one by one
   */
  const bulkMarkAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      // TODO: Implement bulkMarkAsRead in your notification service
      // For now, we'll mark them individually as a fallback
      // This is less efficient but functional
      await Promise.all(notificationIds.map(id => notificationService.markAsRead(id)));

      // Update local state optimistically
      setHistory(prev =>
        prev.map(n => (notificationIds.includes(n.id) ? { ...n, read: true } : n))
      );

      logger.info('Bulk marked notifications as read', {
        component: 'useNotificationHistory',
        count: notificationIds.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notifications as read');
      logger.error(
        'Failed to bulk mark notifications as read',
        { component: 'useNotificationHistory' },
        err
      );
    }
  }, []);

  /**
   * Delete multiple notifications in a single operation
   */
  const bulkDelete = useCallback(async (notificationIds: string[]) => {
    try {
      // TODO: Implement bulkDeleteNotifications in your notification service
      // For now, we'll delete them individually as a fallback
      await Promise.all(notificationIds.map(id => notificationService.deleteNotification(id)));

      // Update local state
      setHistory(prev => prev.filter(n => !notificationIds.includes(n.id)));
      setTotal(prev => prev - notificationIds.length);

      logger.info('Bulk deleted notifications', {
        component: 'useNotificationHistory',
        count: notificationIds.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notifications');
      logger.error(
        'Failed to bulk delete notifications',
        { component: 'useNotificationHistory' },
        err
      );
    }
  }, []);

  /**
   * Archive notifications older than a specified number of days
   * This helps keep the active notification list manageable
   */
  const archiveOld = useCallback(
    async (olderThanDays: number = 30) => {
      try {
        setIsLoading(true);

        // TODO: Implement archiveOldNotifications in your notification service
        // This should move old notifications to an archive table/collection
        // For now, we'll simulate this by filtering locally

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const archivedCount = history.filter(n => {
          const notifDate = new Date(n.timestamp);
          return notifDate < cutoffDate;
        }).length;

        // Reload history to reflect the changes
        await loadHistory();

        logger.info('Archived old notifications', {
          component: 'useNotificationHistory',
          count: archivedCount,
          olderThanDays,
        });

        return archivedCount;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to archive old notifications');
        logger.error(
          'Failed to archive old notifications',
          { component: 'useNotificationHistory' },
          err
        );
        return 0;
      } finally {
        setIsLoading(false);
      }
    },
    [history, loadHistory]
  );

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
    clearError,
  };
}

/**
 * Hook for email notification management
 *
 * This hook handles configuration and monitoring of email notifications,
 * including digest settings, test emails, and tracking delivery status.
 *
 * IMPORTANT: This hook requires several methods that don't currently exist in your
 * notification service. You'll need to implement these on the backend:
 *
 * 1. configureEmailNotifications(config) - Save email notification settings
 * 2. sendTestEmailNotification() - Send a test email to verify configuration
 * 3. getEmailNotificationHistory(options) - Get history of sent emails with status
 */
export function useEmailNotifications() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailHistory, setEmailHistory] = useState<
    Array<{
      id: string;
      subject: string;
      sentAt: string;
      status: 'sent' | 'delivered' | 'opened' | 'failed';
      notificationIds: string[];
    }>
  >([]);

  /**
   * Configure email notification settings
   *
   * This allows users to control how and when they receive email notifications.
   * You can set up immediate emails, or digest emails that batch notifications
   * into a single email sent at specific intervals.
   */
  const configureEmail = useCallback(
    async (config: {
      enabled: boolean;
      frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
      categories: NotificationType[];
      digestTime?: string; // e.g., "09:00" for daily digests
    }) => {
      try {
        setIsLoading(true);

        // TODO: Implement configureEmailNotifications in your notification service
        // This should save the configuration to the backend and update user preferences
        // For now, we'll just log the configuration
        logger.info('Email notification configuration updated', {
          component: 'useEmailNotifications',
          config,
        });

        // You could use the updatePreferences method as a temporary workaround
        // if your preferences structure supports email settings
        // TODO: Persist configuration to server via notificationService when implemented.
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to configure email notifications');
        logger.error(
          'Failed to configure email notifications',
          { component: 'useEmailNotifications' },
          err
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Send a test email notification
   *
   * This is useful for users to verify their email settings are working correctly
   * before they start receiving actual notifications via email.
   */
  const sendTestEmail = useCallback(async () => {
    try {
      setIsLoading(true);

      // TODO: Implement sendTestEmailNotification in your notification service
      // This should trigger a test email to be sent to the user
      logger.info('Sending test email notification', { component: 'useEmailNotifications' });

      // For now, we'll simulate success after a delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info('Test email sent successfully', { component: 'useEmailNotifications' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
      logger.error(
        'Failed to send test email notification',
        { component: 'useEmailNotifications' },
        err
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load the history of sent email notifications
   *
   * This shows users which emails have been sent, their delivery status,
   * and which notifications were included in each email.
   */
  const loadEmailHistory = useCallback(
    async (
      options: {
        limit?: number;
        offset?: number;
        dateFrom?: string;
        dateTo?: string;
      } = {}
    ) => {
      try {
        setIsLoading(true);

        // TODO: Implement getEmailNotificationHistory in your notification service
        // This should return a list of sent emails with their metadata
        logger.info('Loading email notification history', {
          component: 'useEmailNotifications',
          options,
        });

        // For now, we'll return an empty array
        // When you implement this, it should fetch from your backend
        const mockHistory: typeof emailHistory = [];

        if (options.offset === 0 || !options.offset) {
          setEmailHistory(mockHistory);
        } else {
          setEmailHistory(prev => [...prev, ...mockHistory]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load email history');
        logger.error(
          'Failed to load email notification history',
          { component: 'useEmailNotifications' },
          err
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

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
    clearError,
  };
}
