/**
 * Client-side Notification Service
 * 
 * Manages in-app notifications, user preferences, and real-time notification delivery.
 * This service acts as a central hub for notification state management and provides
 * a type-safe event system for components to subscribe to notification updates.
 * 
 * Key responsibilities:
 * - Store and manage notification state in memory
 * - Handle user notification preferences
 * - Emit events when notifications are received or updated
 * - Provide methods for common notification operations
 * - Generate notifications for various app events
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User notification preferences controlling which notifications are enabled
 * and how they should be delivered.
 * 
 * These preferences affect both in-app notifications and external channels
 * like email, push, and SMS. Each boolean flag enables or disables a specific
 * notification category or delivery channel.
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
  /** Optional quiet hours when notifications should be suppressed */
  quietHours: { 
    start: string; 
    end: string; 
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
  } | null;
}

/**
 * A single notification instance with all its metadata.
 * 
 * Notifications represent important events or updates that users should be
 * aware of. Each notification has a type that determines its category,
 * which affects how it's displayed and which preference settings control it.
 */
export interface Notification {
  /** Unique identifier for this notification */
  id: string;
  /** Category of notification affecting display and filtering */
  type: 'bill_status' | 'comment' | 'expert_analysis' | 'achievement';
  /** Primary title shown prominently in notification UI */
  title: string;
  /** Detailed message explaining what happened */
  message: string;
  /** ISO timestamp of when notification was created */
  timestamp: string;
  /** Whether user has read this notification */
  read: boolean;
  /** Additional structured data specific to notification type */
  data?: Record<string, unknown>;
  /** Category for grouping and filtering notifications */
  category?: 'community' | 'bills' | 'expert' | 'moderation' | 'system' | 'security' | string;
  /** Priority level for visual emphasis */
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  /** URL to navigate to when notification is clicked */
  actionUrl?: string;
  /** Creation timestamp for sorting and display */
  createdAt?: string;
}

/**
 * Union type of all possible notification types.
 * Useful for type-safe filtering and type guards.
 */
export type NotificationType = Notification['type'];

/**
 * Filter options for loading notifications from API.
 * All fields are optional to support flexible querying.
 */
export interface LoadNotificationsOptions {
  /** Filter by notification type */
  type?: NotificationType;
  /** Only load unread notifications */
  unreadOnly?: boolean;
  /** Maximum number of notifications to return */
  limit?: number;
  /** Filter by notification category */
  category?: string;
}

// ============================================================================
// Event System Types
// ============================================================================

/**
 * Map of event names to their payload types.
 * This creates type safety for the event system - TypeScript knows exactly
 * what data each event should carry.
 */
interface NotificationEvents {
  /** Fired when a new notification is received */
  'notification:received': Notification;
  /** Fired when the unread count changes */
  'unread_count:changed': number;
}

/**
 * Type-safe event handler that receives the correct payload type
 * based on which event it's handling.
 */
type EventHandler<K extends keyof NotificationEvents> = (
  payload: NotificationEvents[K]
) => void;

/**
 * Non-generic event handler type for storage in the listeners map.
 */
type NotificationEventHandler = (payload: Notification | number) => void;

/**
 * Unsubscribe function returned when subscribing to events.
 * Call this function to stop listening to an event.
 */
type UnsubscribeFn = () => void;

// ============================================================================
// Notification Service Class
// ============================================================================

/**
 * Main notification service managing notification state and delivery.
 * 
 * This service follows the singleton pattern - a single instance is created
 * and exported for use throughout the application. It maintains in-memory
 * state of notifications and preferences, and provides a pub-sub event system
 * for real-time updates.
 * 
 * The service is designed to work with both mock data (for development) and
 * real API endpoints (for production). It provides a consistent interface
 * regardless of the backend implementation.
 * 
 * @example
 * ```typescript
 * // Subscribe to new notifications
 * const unsubscribe = notificationService.on('notification:received', (notification) => {
 *   console.log('New notification:', notification.title);
 *   showToast(notification);
 * });
 * 
 * // Later, unsubscribe
 * unsubscribe();
 * 
 * // Mark notification as read
 * await notificationService.markAsRead(notificationId);
 * ```
 */
class NotificationService {
  // State management
  private preferences: NotificationPreferences | null = null;
  private notifications: Notification[] = [];
  
  // Event system - maps event names to sets of handlers
  // Using Map<string, Set<Function>> allows us to have multiple handlers per event
  private listeners: Map<keyof NotificationEvents, Set<NotificationEventHandler>> = new Map();

  /**
   * Initializes the notification service.
   * 
   * This method should be called once when the application starts. In a real
   * implementation, this would set up WebSocket connections, load initial
   * notification data, register service workers, etc.
   * 
   * For now, it's a placeholder that confirms initialization completed.
   */
  async initialize(): Promise<void> {
    console.log('Notification service initialized');
    // In production, this would:
    // - Establish WebSocket connection for real-time notifications
    // - Load cached notifications from local storage
    // - Register service worker for push notifications
    // - Load user preferences from API
  }

  // ==========================================================================
  // Event System Methods
  // ==========================================================================

  /**
   * Subscribes to a notification event with type-safe handler.
   * 
   * The event system allows components to react to notification changes
   * without polling. When you subscribe, you provide a handler function
   * that will be called whenever the event fires. TypeScript ensures your
   * handler receives the correct payload type for that specific event.
   * 
   * The returned unsubscribe function should be called when your component
   * unmounts or when you no longer need to listen. This prevents memory leaks.
   * 
   * @param eventName - Name of the event to listen for
   * @param handler - Function to call when event fires
   * @returns Unsubscribe function to stop listening
   * 
   * @example
   * ```typescript
   * useEffect(() => {
   *   const unsubscribe = notificationService.on('notification:received', (notification) => {
   *     setNotifications(prev => [notification, ...prev]);
   *   });
   *   return unsubscribe; // Cleanup on unmount
   * }, []);
   * ```
   */
  on<K extends keyof NotificationEvents>(
    eventName: K,
    handler: EventHandler<K>
  ): UnsubscribeFn {
    // Create the set of handlers for this event if it doesn't exist yet
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    
    // Add this handler to the set
    this.listeners.get(eventName)!.add(handler as NotificationEventHandler);
    
    // Return a function that removes this specific handler
    return () => this.off(eventName, handler);
  }

  /**
   * Unsubscribes a handler from an event.
   * 
   * This is called internally by the unsubscribe function returned from `on()`.
   * You typically don't need to call this directly unless you're managing
   * subscriptions manually.
   * 
   * @param eventName - Name of the event to stop listening to
   * @param handler - The handler function to remove
   */
  private off<K extends keyof NotificationEvents>(
    eventName: K,
    handler: EventHandler<K>
  ): void {
    const handlerSet = this.listeners.get(eventName);
    if (handlerSet) {
      handlerSet.delete(handler as NotificationEventHandler);
    }
  }

  /**
   * Emits an event to all subscribed handlers.
   * 
   * This is the internal method that fires events. When something happens
   * that subscribers care about (like receiving a new notification), we
   * call emit with the event name and payload. All handlers subscribed to
   * that event are called with the payload.
   * 
   * Handlers are called in a try-catch to ensure one failing handler doesn't
   * prevent others from running.
   * 
   * @param eventName - Name of the event to fire
   * @param payload - Data to send to handlers
   */
  private emit<K extends keyof NotificationEvents>(
    eventName: K,
    payload: NotificationEvents[K]
  ): void {
    const handlerSet = this.listeners.get(eventName);
    if (handlerSet) {
      // Convert Set to Array to safely iterate even if handlers modify the set
      for (const handler of Array.from(handlerSet)) {
        try {
          handler(payload);
        } catch (error) {
          // Log but don't throw - one bad handler shouldn't break everything
          console.error(`Error in ${eventName} handler:`, error);
        }
      }
    }
  }

  // ==========================================================================
  // Preference Management
  // ==========================================================================

  /**
   * Updates notification preferences for a user.
   * 
   * Preferences control which notifications are enabled and how they're
   * delivered. This method stores preferences in memory for quick access
   * when deciding whether to show a notification.
   * 
   * In production, this would also persist preferences to the backend API
   * to sync across devices.
   * 
   * @param preferences - New preference settings
   * @param userId - ID of the user these preferences belong to
   */
  updatePreferences(preferences: NotificationPreferences, userId: string): void {
    this.preferences = preferences;
    console.log('Notification preferences updated for user:', userId);
    
    // In production, this would:
    // - Send updated preferences to API
    // - Update local storage cache
    // - Adjust push subscription based on push preference
  }

  /**
   * Gets the current user's notification preferences.
   * 
   * @returns Current preferences or null if not loaded yet
   */
  getUserPreferences(_userId: string): Promise<NotificationPreferences | null> {
    // In production, this would fetch from API
    // For now, return the in-memory preferences
    return Promise.resolve(this.preferences);
  }

  // ==========================================================================
  // Notification Loading and Retrieval
  // ==========================================================================

  /**
   * Loads notifications from the server with pagination and filtering.
   * 
   * This method fetches notifications in batches, which is important for
   * performance when users have many notifications. The filters allow
   * loading only relevant notifications (e.g., only unread, only bill updates).
   * 
   * Currently returns mock data for development. In production, this would
   * make an API call using the provided parameters.
   * 
   * @param options - Filter options for which notifications to load
   * @param page - Page number for pagination (1-indexed)
   * @param limit - Maximum number of notifications to return
   * @returns Array of notifications matching the criteria
   */
  async loadNotifications(
    options: LoadNotificationsOptions,
    page: number,
    limit: number
  ): Promise<Notification[]> {
    // Mock implementation - in production would call API like:
    // const response = await api.getNotifications({ ...options, page, limit });
    // this.notifications = response.data;
    
    console.log('Loading notifications:', { options, page, limit });
    
    this.notifications = [
      {
        id: '1',
        type: 'bill_status',
        title: 'Bill Status Update',
        message: 'Bill XYZ has moved to committee review',
        timestamp: new Date().toISOString(),
        read: false,
      },
    ];
    
    return this.notifications;
  }

  /**
   * Gets all notifications currently loaded in memory.
   * 
   * This returns the cached notification list without making any API calls.
   * Useful for components that just need to display the current state.
   * 
   * @returns Array of all loaded notifications
   */
  getNotifications(): Notification[] {
    return this.notifications;
  }

  /**
   * Counts how many unread notifications the user has.
   * 
   * This count is used for badge displays in the UI. It's calculated from
   * the in-memory notification list for speed.
   * 
   * @returns Number of unread notifications
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // ==========================================================================
  // Notification Generation Methods
  // ==========================================================================

  /**
   * Creates and emits a notification about a bill status change.
   * 
   * This is called when a bill the user is tracking changes status (e.g.,
   * moves from committee to floor vote). Before creating the notification,
   * it checks the user's preferences to ensure they want this type of alert.
   * 
   * @param billId - Unique identifier of the bill
   * @param billTitle - Human-readable bill title
   * @param oldStatus - Previous status of the bill
   * @param newStatus - New status of the bill
   */
  notifyBillStatusChange(
    billId: string,
    billTitle: string,
    oldStatus: string,
    newStatus: string
  ): void {
    // Respect user preferences - don't notify if they've disabled this type
    if (!this.preferences?.billStatusChanges) return;
    
    console.log(`Bill status changed: ${billTitle} from ${oldStatus} to ${newStatus}`);
    
    const notification: Notification = {
      id: String(Date.now()), // In production, use UUID or server-generated ID
      type: 'bill_status',
      title: `Bill status: ${billTitle}`,
      message: `${billTitle} moved from ${oldStatus} to ${newStatus}`,
      timestamp: new Date().toISOString(),
      read: false,
      data: { billId, oldStatus, newStatus }
    };
    
    // Add to the front of the list (newest first)
    this.notifications.unshift(notification);
    
    // Notify all subscribers
    this.emit('notification:received', notification);
    this.emit('unread_count:changed', this.getUnreadCount());
  }

  /**
   * Creates and emits a notification about a new comment on a bill.
   * 
   * This is triggered when someone comments on a bill the user is following.
   * It helps users stay engaged with discussions on bills they care about.
   * 
   * @param billId - Unique identifier of the bill
   * @param billTitle - Human-readable bill title
   * @param commenterName - Name of the person who commented
   */
  notifyNewComment(
    billId: string,
    billTitle: string,
    commenterName: string
  ): void {
    if (!this.preferences?.newComments) return;
    
    console.log(`New comment on ${billTitle} by ${commenterName}`);
    
    const notification: Notification = {
      id: String(Date.now()),
      type: 'comment',
      title: `New comment on ${billTitle}`,
      message: `${commenterName} commented on ${billTitle}`,
      timestamp: new Date().toISOString(),
      read: false,
      data: { billId }
    };
    
    this.notifications.unshift(notification);
    this.emit('notification:received', notification);
    this.emit('unread_count:changed', this.getUnreadCount());
  }

  /**
   * Creates and emits a notification about new expert analysis.
   * 
   * When an expert publishes analysis on a bill, users who follow that bill
   * or that expert get notified. This helps surface high-quality content.
   * 
   * @param billId - Unique identifier of the bill
   * @param billTitle - Human-readable bill title
   * @param expertName - Name of the expert who wrote the analysis
   */
  notifyExpertAnalysis(
    billId: string,
    billTitle: string,
    expertName: string
  ): void {
    if (!this.preferences?.expertAnalysis) return;
    
    console.log(`New expert analysis on ${billTitle} by ${expertName}`);
    
    const notification: Notification = {
      id: String(Date.now()),
      type: 'expert_analysis',
      title: `Expert analysis on ${billTitle}`,
      message: `${expertName} added analysis to ${billTitle}`,
      timestamp: new Date().toISOString(),
      read: false,
      data: { billId }
    };
    
    this.notifications.unshift(notification);
    this.emit('notification:received', notification);
    this.emit('unread_count:changed', this.getUnreadCount());
  }

  /**
   * Creates and emits a notification about an achievement.
   * 
   * Achievements gamify the experience and encourage user engagement.
   * These notifications don't have preference checks because achievements
   * are typically considered important milestones users want to know about.
   * 
   * @param title - Achievement title
   * @param description - Detailed description of what was achieved
   */
  notifyAchievement(title: string, description: string): void {
    console.log(`Achievement unlocked: ${title} - ${description}`);
    
    const notification: Notification = {
      id: String(Date.now()),
      type: 'achievement',
      title,
      message: description,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    this.notifications.unshift(notification);
    this.emit('notification:received', notification);
    this.emit('unread_count:changed', this.getUnreadCount());
  }

  // ==========================================================================
  // Notification Status Management
  // ==========================================================================

  /**
   * Marks a specific notification as read.
   * 
   * This updates the notification's read status and recalculates the unread
   * count. In production, this would also sync the read status to the server.
   * 
   * @param notificationId - ID of the notification to mark as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.emit('unread_count:changed', this.getUnreadCount());
      
      // In production, would call API: await api.markNotificationRead(notificationId);
    }
  }

  /**
   * Marks all notifications as read.
   * 
   * This is a batch operation typically triggered by a "Mark all as read"
   * button in the notification center. Much more efficient than marking
   * notifications one by one.
   */
  async markAllAsRead(): Promise<void> {
    this.notifications.forEach(n => n.read = true);
    this.emit('unread_count:changed', this.getUnreadCount());
    
    // In production, would call API: await api.markAllNotificationsRead();
  }

  /**
   * Permanently deletes a notification.
   * 
   * Removes the notification from the list. In production, this would also
   * delete it from the server so it doesn't reappear on other devices.
   * 
   * @param notificationId - ID of the notification to delete
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const wasUnread = this.notifications.find(n => n.id === notificationId)?.read === false;
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    
    // Only emit count change if we deleted an unread notification
    if (wasUnread) {
      this.emit('unread_count:changed', this.getUnreadCount());
    }
    
    // In production, would call API: await api.deleteNotification(notificationId);
  }
}

// ============================================================================
// Global Instance Export
// ============================================================================

/**
 * Global singleton instance of the notification service.
 * 
 * Import and use this instance throughout your application. Having a single
 * instance ensures consistent state and prevents duplicate event handlers.
 * 
 * @example
 * ```typescript
 * import { notificationService } from '@client/services/notification-service';
 * 
 * // In a React component
 * useEffect(() => {
 *   notificationService.initialize();
 * }, []);
 * 
 * // Subscribe to notifications
 * const unsubscribe = notificationService.on('notification:received', handleNewNotification);
 * ```
 */
export const notificationService = new NotificationService();

/**
 * Default export for convenience.
 * Allows both named and default imports.
 */
export default notificationService;