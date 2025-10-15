import { AlertDeliveryLog } from '../entities/alert-delivery-log';

/**
 * Repository interface for alert delivery logs
 */
export interface IDeliveryLogRepository {
  /**
   * Saves a delivery log
   */
  save(log: AlertDeliveryLog): Promise<void>;

  /**
   * Finds delivery logs by user ID with pagination
   */
  findByUserId(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      alertType?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    logs: AlertDeliveryLog[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }>;

  /**
   * Finds recent delivery logs within hours
   */
  findRecentByUserId(userId: string, hours: number): Promise<AlertDeliveryLog[]>;

  /**
   * Gets delivery statistics for a user
   */
  getStatsByUserId(userId: string): Promise<{
    totalLogs: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    filteredLogs: number;
    channelStats: Record<string, {
      deliveries: number;
      successRate: number;
    }>;
  }>;

  /**
   * Cleans up old delivery logs (for maintenance)
   */
  cleanupOldLogs(olderThanDays: number): Promise<number>;
}