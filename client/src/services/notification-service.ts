/**
 * Client-side Notification Service
 * Handles in-app notifications and user preferences
 */

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
  billStatusChanges: boolean;
  newComments: boolean;
  expertAnalysis: boolean;
  weeklyDigest: boolean;
  trendingBills: boolean;
  communityUpdates: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  quietHours: { start: string; end: string } | null;
}

export interface Notification {
  id: string;
  type: 'bill_status' | 'comment' | 'expert_analysis' | 'achievement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
}

export type NotificationType = Notification['type'];

type NotificationHandler = (n: Notification) => void;

class NotificationService {
  private preferences: NotificationPreferences | null = null;
  private notifications: Notification[] = [];
  private userId: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  async initialize(): Promise<void> {
    // Initialize notification service
    console.log('Notification service initialized');
  }

  // Simple event emitter API for in-app subscription
  on(eventName: 'notification:received' | 'unread_count:changed', handler: Function) {
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, new Set());
    this.listeners.get(eventName)!.add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName: string, handler: Function) {
    const s = this.listeners.get(eventName);
    if (s) s.delete(handler);
  }

  private emit(eventName: string, payload: unknown) {
    const s = this.listeners.get(eventName);
    if (s) {
      for (const h of Array.from(s)) {
        try { h(payload); } catch (e) { console.error(e); }
      }
    }
  }

  updatePreferences(preferences: NotificationPreferences, userId: string): void {
    this.preferences = preferences;
    this.userId = userId;
    console.log('Notification preferences updated for user:', userId);
  }

  async loadNotifications(userId: string, page: number, limit: number): Promise<Notification[]> {
    // Mock implementation - would load from API
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

  getNotifications(): Notification[] {
    return this.notifications;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  notifyBillStatusChange(billId: string, billTitle: string, oldStatus: string, newStatus: string): void {
    if (!this.preferences?.billStatusChanges) return;
    
    console.log(`Bill status changed: ${billTitle} from ${oldStatus} to ${newStatus}`);
    const n: Notification = {
      id: String(Date.now()),
      type: 'bill_status',
      title: `Bill status: ${billTitle}`,
      message: `${billTitle} moved from ${oldStatus} to ${newStatus}`,
      timestamp: new Date().toISOString(),
      read: false,
      data: { billId, oldStatus, newStatus }
    };
    this.notifications.unshift(n);
    this.emit('notification:received', n);
    this.emit('unread_count:changed', this.getUnreadCount());
  }

  notifyNewComment(billId: string, billTitle: string, commenterName: string): void {
    if (!this.preferences?.newComments) return;
    
    console.log(`New comment on ${billTitle} by ${commenterName}`);
    const n: Notification = {
      id: String(Date.now()),
      type: 'comment',
      title: `New comment on ${billTitle}`,
      message: `${commenterName} commented on ${billTitle}`,
      timestamp: new Date().toISOString(),
      read: false,
      data: { billId }
    };
    this.notifications.unshift(n);
    this.emit('notification:received', n);
    this.emit('unread_count:changed', this.getUnreadCount());
  }

  notifyExpertAnalysis(billId: string, billTitle: string, expertName: string): void {
    if (!this.preferences?.expertAnalysis) return;
    
    console.log(`New expert analysis on ${billTitle} by ${expertName}`);
    const n: Notification = {
      id: String(Date.now()),
      type: 'expert_analysis',
      title: `Expert analysis on ${billTitle}`,
      message: `${expertName} added analysis to ${billTitle}`,
      timestamp: new Date().toISOString(),
      read: false,
      data: { billId }
    };
    this.notifications.unshift(n);
    this.emit('notification:received', n);
    this.emit('unread_count:changed', this.getUnreadCount());
  }

  notifyAchievement(title: string, description: string): void {
    console.log(`Achievement unlocked: ${title} - ${description}`);
    const n: Notification = {
      id: String(Date.now()),
      type: 'achievement',
      title,
      message: description,
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.notifications.unshift(n);
    this.emit('notification:received', n);
    this.emit('unread_count:changed', this.getUnreadCount());
  }

  async markAsRead(notificationId: string): Promise<void> {
    const n = this.notifications.find(n => n.id === notificationId);
    if (n) n.read = true;
    this.emit('unread_count:changed', this.getUnreadCount());
  }

  async markAllAsRead(): Promise<void> {
    this.notifications.forEach(n => n.read = true);
    this.emit('unread_count:changed', this.getUnreadCount());
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.emit('unread_count:changed', this.getUnreadCount());
  }
}

export const notificationService = new NotificationService();
export default notificationService;