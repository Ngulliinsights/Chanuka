import { notificationService, NotificationData } from '@/infrastructure/notifications/notification-service.js';
import { logger  } from '@shared/core/src/index.js';

export interface UserNotificationData extends Omit<NotificationData, 'user_id'> { user_id: string;
 }

export interface BulkUserNotificationData extends Omit<NotificationData, 'user_id'> {
  user_ids: string[];
}

export interface UserActivityNotification { user_id: string;
  activityType: 'login' | 'logout' | 'profile_update' | 'verification_submitted' | 'verification_approved' | 'verification_rejected';
  details?: string;
  relatedBillId?: number;
 }

/**
 * User Notification Service
 *
 * Handles user-specific notifications including:
 * - User activity notifications (login, logout, profile updates)
 * - Verification status notifications
 * - Account-related notifications
 * - Bulk notifications for user groups
 * - User preference-based filtering
 */
export class UserNotificationService {
  constructor() {
    logger.info('✅ User Notification Service initialized');
  }

  /**
   * Send notification to a specific user
   */
  async sendUserNotification(data: UserNotificationData): Promise<any> {
    try {
      const notification = await notificationService.createNotification(data);
      logger.info(`📱 User notification sent to ${data.user_id}: ${data.title}`);
      return notification;
    } catch (error) {
      logger.error(`❌ Failed to send notification to user ${data.user_id}`, { error });
      throw error;
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkUserNotifications(data: BulkUserNotificationData): Promise<{ success: number; failed: number; errors: Array<{ user_id: string; error: string  }> }> {
    try {
      const result = await notificationService.createBulkNotifications(data.user_ids, {
        type: data.type,
        title: data.title,
        message: data.message,
        relatedBillId: data.relatedBillId,
        metadata: data.metadata
      });

      logger.info(`📬 Bulk user notifications sent: ${result.success} success, ${result.failed} failed`);
      return result;
    } catch (error) {
      logger.error('❌ Failed to send bulk user notifications', { error });
      throw error;
    }
  }

  /**
   * Send user activity notification
   */
  async sendUserActivityNotification(activity: UserActivityNotification): Promise<any> {
    const notificationData = this.buildActivityNotificationData(activity);
    return this.sendUserNotification(notificationData);
  }

  /**
   * Send verification status notification
   */
  async sendVerificationStatusNotification(
    user_id: string,
    verification_id: string,
    status: 'submitted' | 'approved' | 'rejected' | 'pending',
    billTitle?: string,
    reason?: string
  ): Promise<any> { const title = this.getVerificationStatusTitle(status);
    const message = this.getVerificationStatusMessage(status, billTitle, reason);

    return this.sendUserNotification({
      user_id,
      type: 'verification_status',
      title,
      message,
      metadata: {
        verification_id,
        status,
        billTitle,
        reason
       }
    });
  }

  /**
   * Send welcome notification for new users
   */
  async sendWelcomeNotification(user_id: string, userName: string): Promise<any> { return this.sendUserNotification({
      user_id,
      type: 'system_alert',
      title: 'Welcome to Chanuka!',
      message: `Welcome ${userName }! Your account has been created successfully. Start exploring legislation and participating in civic engagement.`,
      metadata: {
        welcome: true,
        userName
      }
    });
  }

  /**
   * Send account security notification
   */
  async sendSecurityNotification(
    user_id: string,
    securityEvent: 'password_changed' | 'email_changed' | 'login_from_new_device' | 'suspicious_activity',
    details?: string
  ): Promise<any> { const title = this.getSecurityEventTitle(securityEvent);
    const message = this.getSecurityEventMessage(securityEvent, details);

    return this.sendUserNotification({
      user_id,
      type: 'system_alert',
      title,
      message,
      metadata: {
        securityEvent,
        details
       }
    });
  }

  /**
   * Send profile update notification
   */
  async sendProfileUpdateNotification(user_id: string, updatedFields: string[]): Promise<any> { return this.sendUserNotification({
      user_id,
      type: 'system_alert',
      title: 'Profile Updated',
      message: `Your profile has been updated. Changes: ${updatedFields.join(', ') }`,
      metadata: {
        profileUpdate: true,
        updatedFields
      }
    });
  }

  /**
   * Get user notifications with filtering
   */
  async getUserNotifications(
    user_id: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {}
  ): Promise<any[]> { return notificationService.getUserNotifications(user_id, options);
   }

  /**
   * Mark user notification as read
   */
  async markNotificationAsRead(user_id: string, notification_id: number): Promise<void> { return notificationService.markAsRead(user_id, notification_id);
   }

  /**
   * Mark all user notifications as read
   */
  async markAllNotificationsAsRead(user_id: string): Promise<void> { return notificationService.markAllAsRead(user_id);
   }

  /**
   * Get unread notification count for user
   */
  async getUnreadNotificationCount(user_id: string): Promise<number> { return notificationService.getUnreadCount(user_id);
   }

  /**
   * Delete user notification
   */
  async deleteNotification(user_id: string, notification_id: number): Promise<void> { return notificationService.deleteNotification(user_id, notification_id);
   }

  /**
   * Get user notification statistics
   */
  async getUserNotificationStats(user_id: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    recentActivity: number;
  }> { return notificationService.getNotificationStats(user_id);
   }

  /**
   * Build activity notification data
   */
  private buildActivityNotificationData(activity: UserActivityNotification): UserNotificationData { const { user_id, activityType, details, relatedBillId  } = activity;

    let title: string;
    let message: string;
    let type: NotificationData['type'];

    switch (activityType) {
      case 'login':
        title = 'New Login Detected';
        message = 'You have successfully logged in to your Chanuka account.';
        type = 'system_alert';
        break;
      case 'logout':
        title = 'Logged Out';
        message = 'You have been logged out of your Chanuka account.';
        type = 'system_alert';
        break;
      case 'profile_update':
        title = 'Profile Updated';
        message = 'Your profile information has been updated successfully.';
        type = 'system_alert';
        break;
      case 'verification_submitted':
        title = 'Verification Submitted';
        message = `Your citizen verification has been submitted${details ? ` for: ${details}` : ''}.`;
        type = 'verification_status';
        break;
      case 'verification_approved':
        title = 'Verification Approved';
        message = `Your citizen verification has been approved${details ? `: ${details}` : ''}.`;
        type = 'verification_status';
        break;
      case 'verification_rejected':
        title = 'Verification Update';
        message = `Your citizen verification status has changed${details ? `: ${details}` : ''}.`;
        type = 'verification_status';
        break;
      default:
        title = 'Account Activity';
        message = `Account activity: ${activityType}${details ? ` - ${details}` : ''}`;
        type = 'system_alert';
    }

    return { user_id,
      type,
      title,
      message,
      relatedBillId,
      metadata: {
        activityType,
        details
       }
    };
  }

  /**
   * Get verification status title
   */
  private getVerificationStatusTitle(status: string): string {
    switch (status) {
      case 'submitted': return 'Verification Submitted';
      case 'approved': return 'Verification Approved';
      case 'rejected': return 'Verification Update';
      case 'pending': return 'Verification Pending';
      default: return 'Verification Status Update';
    }
  }

  /**
   * Get verification status message
   */
  private getVerificationStatusMessage(status: string, billTitle?: string, reason?: string): string {
    const billInfo = billTitle ? ` for "${billTitle}"` : '';

    switch (status) {
      case 'submitted':
        return `Your citizen verification${billInfo} has been submitted and is under review.`;
      case 'approved':
        return `Congratulations! Your citizen verification${billInfo} has been approved.${reason ? ` ${reason}` : ''}`;
      case 'rejected':
        return `Your citizen verification${billInfo} requires attention.${reason ? ` ${reason}` : ''}`;
      case 'pending':
        return `Your citizen verification${billInfo} is pending review.`;
      default:
        return `Your verification status${billInfo} has been updated.`;
    }
  }

  /**
   * Get security event title
   */
  private getSecurityEventTitle(event: string): string {
    switch (event) {
      case 'password_changed': return 'Password Changed';
      case 'email_changed': return 'Email Address Changed';
      case 'login_from_new_device': return 'New Device Login';
      case 'suspicious_activity': return 'Security Alert';
      default: return 'Security Notification';
    }
  }

  /**
   * Get security event message
   */
  private getSecurityEventMessage(event: string, details?: string): string {
    switch (event) {
      case 'password_changed':
        return 'Your password has been changed successfully. If you did not make this change, please contact support immediately.';
      case 'email_changed':
        return 'Your email address has been changed. Please verify your new email address.';
      case 'login_from_new_device':
        return `New login detected${details ? ` from: ${details}` : ''}. If this wasn't you, please change your password immediately.`;
      case 'suspicious_activity':
        return `Suspicious activity detected on your account${details ? `: ${details}` : ''}. Please review your account security.`;
      default:
        return 'A security event has occurred on your account. Please check your account settings.';
    }
  }

  /**
   * Get service status
   */
  getStatus(): { initialized: boolean; notificationServiceAvailable: boolean } {
    const status = notificationService.getStatus();
    return {
      initialized: true,
      notificationServiceAvailable: status.initialized
    };
  }
}

// Export singleton instance
export const userNotificationService = new UserNotificationService();






































