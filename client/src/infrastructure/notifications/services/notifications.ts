/**
 * Notifications Service
 * Integrates with centralized infrastructure for consistency
 */
import { globalApiClient } from '@client/infrastructure/api/client';

export interface NotificationPreference {
  type: string;
  channels: ('email' | 'in-app' | 'sms')[];
  enabled: boolean;
}

export interface UserNotifications {
  unread: number;
  preferences: NotificationPreference[];
}

export const notificationsService = {
  async getNotifications(): Promise<UserNotifications> {
    const response = await globalApiClient.get('/api/notifications');
    return response.data;
  },

  async updatePreference(type: string, channels: string[], enabled: boolean): Promise<void> {
    await globalApiClient.patch('/api/notifications/preferences', {
      type,
      channels,
      enabled,
    });
  },

  async markAsRead(notificationId: string): Promise<void> {
    await globalApiClient.patch(`/api/notifications/${notificationId}/read`);
  },

  async getUnreadCount(): Promise<number> {
    const response = await globalApiClient.get('/api/notifications/unread-count');
    return response.data.count;
  },
};
