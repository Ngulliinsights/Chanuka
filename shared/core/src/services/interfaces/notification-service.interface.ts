/**
 * Notification Service Interface
 *
 * Defines the contract for notification business logic operations, abstracting away
 * direct notification provider usage while maintaining the same functionality.
 */

import type { Result } from '../../primitives';

export interface NotificationChannel {
  /** Channel type identifier */
  type: 'sms' | 'push' | 'email' | 'in_app';
  /** Whether the channel is enabled */
  enabled: boolean;
  /** Channel-specific configuration */
  config?: Record<string, any>;
}

export interface NotificationRequest {
  /** User ID to send notification to */
  user_id: string;
  /** Notification type */
  type: string;
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Additional data payload */
  data?: Record<string, any>;
  /** Priority level */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  /** Channels to send through */
  channels?: NotificationChannel[];
  /** Related entity IDs */
  relatedIds?: {
    bill_id?: string;
    comment_id?: string;
    user_id?: string;
  };
}

export interface NotificationResult {
  /** Unique message ID */
  messageId: string;
  /** Delivery status */
  status: 'sent' | 'failed' | 'pending';
  /** Channels that were attempted */
  channelsAttempted: string[];
  /** Channels that succeeded */
  channelsSucceeded: string[];
  /** Error details if any */
  error?: string;
  /** Timestamp of delivery */
  timestamp: Date;
}

export interface INotificationService {
  /**
   * Sends a notification to a user through specified channels
   * @param request Notification request details
   * @returns Promise resolving to delivery result
   */
  sendNotification(request: NotificationRequest): Promise<Result<NotificationResult, Error>>;

  /**
   * Sends notifications to multiple users
   * @param requests Array of notification requests
   * @returns Promise resolving to array of delivery results
   */
  sendBulkNotifications(requests: NotificationRequest[]): Promise<Result<NotificationResult[], Error>>;

  /**
   * Gets user notification preferences
   * @param userId User ID
   * @returns Promise resolving to user preferences
   */
  getUserPreferences(user_id: string): Promise<Result<{
    channels: NotificationChannel[];
    quietHours?: { start: string; end: string };
    frequency: 'immediate' | 'daily' | 'weekly';
    categories: string[];
  }, Error>>;

  /**
   * Updates user notification preferences
   * @param userId User ID
   * @param preferences Updated preferences
   * @returns Promise resolving to success result
   */
  updateUserPreferences(
    user_id: string,
    preferences: {
      channels?: NotificationChannel[];
      quietHours?: { start: string; end: string };
      frequency?: 'immediate' | 'daily' | 'weekly';
      categories?: string[];
    }
  ): Promise<Result<void, Error>>;

  /**
   * Tests connectivity to notification providers
   * @returns Promise resolving to connectivity status
   */
  testConnectivity(): Promise<Result<{
    sms: { connected: boolean; error?: string };
    push: { connected: boolean; error?: string };
    email: { connected: boolean; error?: string };
  }, Error>>;

  /**
   * Gets service status and statistics
   * @returns Service status information
   */
  getStatus(): {
    providers: {
      sms: string;
      push: string;
      email: string;
    };
    configured: boolean;
    pendingRetries: number;
    totalSent: number;
    totalFailed: number;
  };

  /**
   * Cleans up service resources
   */
  cleanup(): void;
}

