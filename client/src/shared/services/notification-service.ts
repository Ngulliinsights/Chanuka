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
