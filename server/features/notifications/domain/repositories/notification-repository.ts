import { Notification } from '../entities/notification';

export interface NotificationRepository {
  // Basic CRUD operations
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
  update(notification: Notification): Promise<void>;
  delete(id: string): Promise<void>;

  // Query operations
  findUnreadByUserId(userId: string): Promise<Notification[]>;
  findByType(userId: string, type: string): Promise<Notification[]>;
  findByRelatedBill(billId: string): Promise<Notification[]>;
  findPendingDeliveries(): Promise<Notification[]>;

  // Bulk operations
  markAsRead(ids: string[]): Promise<void>;
  markAsDelivered(ids: string[]): Promise<void>;
  markAsFailed(ids: string[]): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;

  // Statistics
  countUnreadByUserId(userId: string): Promise<number>;
  countByUserId(userId: string): Promise<number>;
  countPendingDeliveries(): Promise<number>;
}