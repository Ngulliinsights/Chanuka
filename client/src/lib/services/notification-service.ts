/**
 * Notification Service
 */

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actions?: NotificationAction[];
  metadata?: any;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: () => void;
  primary?: boolean;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  billUpdates: boolean;
  analyticsEmails: boolean;
  digestFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
}

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private listeners: Array<(notifications: Notification[]) => void> = [];

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      read: false
    };

    this.notifications.unshift(newNotification);
    this.notifyListeners();
    return id;
  }

  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  deleteNotification(id: string): Promise<void> {
    this.removeNotification(id);
    return Promise.resolve();
  }

  loadNotifications(filter: any, page: number, limit: number): Promise<void> {
    return Promise.resolve();
  }

  getUserPreferences(userId: string): Promise<NotificationPreferences> {
    return Promise.resolve({
      emailNotifications: true,
      pushNotifications: true,
      billUpdates: true,
      analyticsEmails: false,
      digestFrequency: 'daily'
    });
  }

  updatePreferences(prefs: NotificationPreferences, userId: string): Promise<void> {
    return Promise.resolve();
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (event === 'notification:received') {
      const listener = (notifications: Notification[]) => {
        if (notifications.length > 0) {
          callback(notifications[0]);
        }
      };
      return this.subscribe(listener);
    }
    return () => {};
  }

  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Convenience methods
  info(title: string, message: string, actions?: NotificationAction[]): string {
    return this.addNotification({
      type: NotificationType.INFO,
      title,
      message,
      actions
    });
  }

  success(title: string, message: string, actions?: NotificationAction[]): string {
    return this.addNotification({
      type: NotificationType.SUCCESS,
      title,
      message,
      actions
    });
  }

  warning(title: string, message: string, actions?: NotificationAction[]): string {
    return this.addNotification({
      type: NotificationType.WARNING,
      title,
      message,
      actions
    });
  }

  error(title: string, message: string, actions?: NotificationAction[]): string {
    return this.addNotification({
      type: NotificationType.ERROR,
      title,
      message,
      actions
    });
  }
}

export const notificationService = NotificationService.getInstance();
