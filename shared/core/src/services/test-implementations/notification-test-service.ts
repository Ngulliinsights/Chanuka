/**
 * Notification Test Service Implementation
 *
 * Test-specific implementation of INotificationService that uses dependency injection
 * with the new testing infrastructure. Provides business logic operations
 * for notifications using mock delivery mechanisms.
 */

import { ok, err } from '../../primitives';
import type { Result } from '../../primitives';
import type {
  INotificationService,
  NotificationChannel,
  NotificationRequest,
  NotificationResult
} from '../interfaces/notification-service.interface';

export class NotificationTestService implements INotificationService {
  private sentNotifications: NotificationResult[] = [];
  private userPreferences: Map<string, {
    channels: NotificationChannel[];
    quietHours?: { start: string; end: string };
    frequency: 'immediate' | 'daily' | 'weekly';
    categories: string[];
  }> = new Map();

  constructor() {
    // Initialize with default preferences for testing
    this.initializeDefaultPreferences();
  }

  private initializeDefaultPreferences(): void {
    // Default preferences for test users
    this.userPreferences.set('test-user-1', {
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: true },
        { type: 'sms', enabled: false },
        { type: 'push', enabled: true }
      ],
      frequency: 'immediate',
      categories: ['bills', 'comments', 'system']
    });

    this.userPreferences.set('test-user-2', {
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'email', enabled: false },
        { type: 'sms', enabled: true },
        { type: 'push', enabled: false }
      ],
      frequency: 'daily',
      categories: ['bills', 'system']
    });
  }

  async sendNotification(request: NotificationRequest): Promise<Result<NotificationResult, Error>> {
    try {
      // Business logic validation
      if (!request.userId?.trim()) {
        return err(new Error('User ID is required'));
      }

      if (!request.title?.trim()) {
        return err(new Error('Notification title is required'));
      }

      if (!request.message?.trim()) {
        return err(new Error('Notification message is required'));
      }

      // Get user preferences
      const preferences = this.userPreferences.get(request.userId);
      if (!preferences) {
        return err(new Error(`User preferences not found for user: ${request.user_id}`));
      }

      // Check if notification category is enabled
      if (!preferences.categories.includes(request.type)) {
        return err(new Error(`Notification category '${request.type}' is not enabled for user`));
      }

      // Determine channels to use
      const channelsToUse = request.channels || preferences.channels.filter(c => c.enabled);

      if (channelsToUse.length === 0) {
        return err(new Error('No notification channels available'));
      }

      // Simulate delivery with business logic
      const result: NotificationResult = {
        messageId: `test-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'sent',
        channelsAttempted: channelsToUse.map(c => c.type),
        channelsSucceeded: channelsToUse.map(c => c.type), // All succeed in test mode
        timestamp: new Date()
      };

      // Simulate delivery delays and failures for testing
      if (request.priority === 'urgent') {
        // Urgent notifications always succeed immediately
      } else if (Math.random() < 0.05) { // 5% failure rate for non-urgent
        result.status = 'failed';
        result.error = 'Simulated delivery failure';
        result.channelsSucceeded = [];
      }

      // Store for testing purposes
      this.sentNotifications.push(result);

      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to send notification'));
    }
  }

  async sendBulkNotifications(requests: NotificationRequest[]): Promise<Result<NotificationResult[], Error>> {
    try {
      if (!requests || requests.length === 0) {
        return err(new Error('At least one notification request is required'));
      }

      if (requests.length > 100) {
        return err(new Error('Cannot send more than 100 notifications at once'));
      }

      const results: NotificationResult[] = [];

      // Process each notification
      for (const request of requests) {
        const result = await this.sendNotification(request);
        if (result.isErr()) {
          return err(result.error);
        }
        results.push(result.value);
      }

      return ok(results);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to send bulk notifications'));
    }
  }

  async getUserPreferences(user_id: string): Promise<Result<{
    channels: NotificationChannel[];
    quietHours?: { start: string; end: string };
    frequency: 'immediate' | 'daily' | 'weekly';
    categories: string[];
  }, Error>> {
    try {
      if (!userId?.trim()) {
        return err(new Error('User ID is required'));
      }

      const preferences = this.userPreferences.get(userId);
      if (!preferences) {
        return err(new Error(`User preferences not found for user: ${user_id}`));
      }

      return ok(preferences);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to get user preferences'));
    }
  }

  async updateUserPreferences(
    user_id: string,
    preferences: {
      channels?: NotificationChannel[];
      quietHours?: { start: string; end: string };
      frequency?: 'immediate' | 'daily' | 'weekly';
      categories?: string[];
    }
  ): Promise<Result<void, Error>> {
    try {
      if (!userId?.trim()) {
        return err(new Error('User ID is required'));
      }

      const existingPreferences = this.userPreferences.get(userId);
      if (!existingPreferences) {
        return err(new Error(`User preferences not found for user: ${user_id}`));
      }

      // Business logic validation
      if (preferences.channels) {
        for (const channel of preferences.channels) {
          if (!['sms', 'push', 'email', 'in_app'].includes(channel.type)) {
            return err(new Error(`Invalid channel type: ${channel.type}`));
          }
        }
      }

      if (preferences.frequency && !['immediate', 'daily', 'weekly'].includes(preferences.frequency)) {
        return err(new Error(`Invalid frequency: ${preferences.frequency}`));
      }

      // Update preferences
      const updatedPreferences = {
        ...existingPreferences,
        ...preferences
      };

      this.userPreferences.set(userId, updatedPreferences);

      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update user preferences'));
    }
  }

  async testConnectivity(): Promise<Result<{
    sms: { connected: boolean; error?: string };
    push: { connected: boolean; error?: string };
    email: { connected: boolean; error?: string };
  }, Error>> {
    try {
      // Simulate connectivity tests
      return ok({
        sms: { connected: true },
        push: { connected: true },
        email: { connected: true }
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to test connectivity'));
    }
  }

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
  } {
    const failedCount = this.sentNotifications.filter(n => n.status === 'failed').length;

    return {
      providers: {
        sms: 'Test SMS Provider',
        push: 'Test Push Provider',
        email: 'Test Email Provider'
      },
      configured: true,
      pendingRetries: 0,
      totalSent: this.sentNotifications.filter(n => n.status === 'sent').length,
      totalFailed: failedCount
    };
  }

  cleanup(): void {
    this.sentNotifications = [];
    this.userPreferences.clear();
    this.initializeDefaultPreferences();
  }

  /**
   * Test helper: Get all sent notifications
   */
  getSentNotifications(): NotificationResult[] {
    return [...this.sentNotifications];
  }

  /**
   * Test helper: Clear sent notifications
   */
  clearSentNotifications(): void {
    this.sentNotifications = [];
  }

  /**
   * Test helper: Set user preferences for testing
   */
  setUserPreferences(user_id: string, preferences: {
    channels: NotificationChannel[];
    quietHours?: { start: string; end: string };
    frequency: 'immediate' | 'daily' | 'weekly';
    categories: string[];
  }): void {
    this.userPreferences.set(userId, preferences);
  }
}

