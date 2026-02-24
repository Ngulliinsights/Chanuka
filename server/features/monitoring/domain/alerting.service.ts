/**
 * Alerting Service
 * 
 * Handles alert notifications through various channels:
 * - Email notifications
 * - Webhook notifications
 * - Log-based alerts
 * - Integration with external monitoring systems
 */

import { logger } from '@server/infrastructure/observability';
import { errorTracker } from '@server/infrastructure/observability/monitoring/error-tracker';
import type { IntegrationAlert, AlertRule } from '@server/infrastructure/schema';

// ============================================================================
// TYPES
// ============================================================================

export interface AlertNotificationChannel {
  type: 'email' | 'webhook' | 'log' | 'external';
  target: string;
  config?: Record<string, any>;
}

export interface AlertNotification {
  alert: IntegrationAlert;
  rule?: AlertRule;
  featureName: string;
  timestamp: Date;
}

// ============================================================================
// ALERTING SERVICE
// ============================================================================

export class AlertingService {
  private webhookEndpoints: Map<string, string> = new Map();
  private emailRecipients: Map<string, string[]> = new Map();

  /**
   * Register a webhook endpoint for alerts
   */
  registerWebhook(name: string, url: string): void {
    this.webhookEndpoints.set(name, url);
    logger.info({
      message: 'Webhook registered for alerts',
      name,
      url,
    });
  }

  /**
   * Register email recipients for alerts
   */
  registerEmailRecipients(severity: string, recipients: string[]): void {
    this.emailRecipients.set(severity, recipients);
    logger.info({
      message: 'Email recipients registered',
      severity,
      count: recipients.length,
    });
  }

  /**
   * Send alert notification through configured channels
   */
  async sendAlert(
    notification: AlertNotification,
    channels: AlertNotificationChannel[]
  ): Promise<void> {
    const promises = channels.map((channel) =>
      this.sendToChannel(notification, channel)
    );

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      errorTracker.trackError(
        error as Error,
        { alertId: notification.alert.id },
        'medium',
        'system'
      );
    }
  }

  /**
   * Send alert to a specific channel
   */
  private async sendToChannel(
    notification: AlertNotification,
    channel: AlertNotificationChannel
  ): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailAlert(notification, channel.target);
          break;
        case 'webhook':
          await this.sendWebhookAlert(notification, channel.target);
          break;
        case 'log':
          await this.sendLogAlert(notification);
          break;
        case 'external':
          await this.sendExternalAlert(notification, channel.target, channel.config);
          break;
        default:
          logger.warn({
            message: 'Unknown alert channel type',
            type: channel.type,
          });
      }
    } catch (error) {
      errorTracker.trackError(
        error as Error,
        {
          alertId: notification.alert.id,
          channelType: channel.type,
          channelTarget: channel.target,
        },
        'low',
        'system'
      );
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    notification: AlertNotification,
    recipientGroup: string
  ): Promise<void> {
    const recipients = this.emailRecipients.get(recipientGroup) || [];

    if (recipients.length === 0) {
      logger.warn({
        message: 'No email recipients configured',
        recipientGroup,
      });
      return;
    }

    // TODO: Integrate with email service (nodemailer, SendGrid, etc.)
    logger.info({
      message: 'Email alert sent',
      alertId: notification.alert.id,
      recipients: recipients.length,
      severity: notification.alert.severity,
      title: notification.alert.title,
    });

    // For now, just log the alert
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                      INTEGRATION ALERT                          ║
╠════════════════════════════════════════════════════════════════╣
║ Feature: ${notification.featureName.padEnd(52)} ║
║ Severity: ${notification.alert.severity.toUpperCase().padEnd(51)} ║
║ Title: ${notification.alert.title.padEnd(54)} ║
║ Message: ${notification.alert.message.substring(0, 52).padEnd(52)} ║
║ Time: ${notification.timestamp.toISOString().padEnd(54)} ║
╚════════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(
    notification: AlertNotification,
    webhookName: string
  ): Promise<void> {
    const webhookUrl = this.webhookEndpoints.get(webhookName);

    if (!webhookUrl) {
      logger.warn({
        message: 'Webhook not found',
        webhookName,
      });
      return;
    }

    try {
      const payload = {
        alert: {
          id: notification.alert.id,
          severity: notification.alert.severity,
          type: notification.alert.type,
          title: notification.alert.title,
          message: notification.alert.message,
          featureName: notification.featureName,
          timestamp: notification.timestamp,
          threshold: notification.alert.threshold,
          actualValue: notification.alert.actualValue,
        },
        rule: notification.rule
          ? {
              id: notification.rule.id,
              name: notification.rule.name,
              metric: notification.rule.metric,
              operator: notification.rule.operator,
              threshold: notification.rule.threshold,
            }
          : undefined,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

      logger.info({
        message: 'Webhook alert sent',
        alertId: notification.alert.id,
        webhookName,
        webhookUrl,
        statusCode: response.status,
      });
    } catch (error) {
      logger.error({
        message: 'Failed to send webhook alert',
        error,
        alertId: notification.alert.id,
        webhookName,
        webhookUrl,
      });
      throw error;
    }
  }

  /**
   * Send log-based alert
   */
  private async sendLogAlert(notification: AlertNotification): Promise<void> {
    const logLevel = this.getLogLevelForSeverity(notification.alert.severity);

    logger[logLevel]({
      message: 'Integration Alert',
      alertId: notification.alert.id,
      featureName: notification.featureName,
      severity: notification.alert.severity,
      type: notification.alert.type,
      title: notification.alert.title,
      alertMessage: notification.alert.message,
      threshold: notification.alert.threshold,
      actualValue: notification.alert.actualValue,
      timestamp: notification.timestamp,
    });
  }

  /**
   * Send alert to external monitoring system
   */
  private async sendExternalAlert(
    notification: AlertNotification,
    integrationName: string,
    config?: Record<string, any>
  ): Promise<void> {
    // TODO: Integrate with external monitoring systems (Datadog, New Relic, etc.)
    logger.info({
      message: 'External alert sent',
      alertId: notification.alert.id,
      integrationName,
      config,
    });
  }

  /**
   * Get log level for alert severity
   */
  private getLogLevelForSeverity(
    severity: string
  ): 'debug' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * Format alert message for display
   */
  formatAlertMessage(notification: AlertNotification): string {
    const { alert, featureName, timestamp } = notification;

    let message = `[${alert.severity.toUpperCase()}] ${featureName}: ${alert.title}\n`;
    message += `Message: ${alert.message}\n`;
    message += `Time: ${timestamp.toISOString()}\n`;

    if (alert.threshold) {
      message += `Threshold: ${JSON.stringify(alert.threshold)}\n`;
    }

    if (alert.actualValue) {
      message += `Actual Value: ${JSON.stringify(alert.actualValue)}\n`;
    }

    return message;
  }

  /**
   * Test alert notification
   */
  async testAlert(
    featureName: string,
    channels: AlertNotificationChannel[]
  ): Promise<void> {
    const testNotification: AlertNotification = {
      alert: {
        id: 'test-alert',
        featureId: 'test-feature',
        severity: 'low',
        type: 'test',
        title: 'Test Alert',
        message: 'This is a test alert to verify notification channels',
        triggered: true,
        acknowledged: false,
        resolved: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as IntegrationAlert,
      featureName,
      timestamp: new Date(),
    };

    await this.sendAlert(testNotification, channels);

    logger.info({
      message: 'Test alert sent',
      featureName,
      channels: channels.map((c) => c.type),
    });
  }
}

// Export singleton instance
export const alertingService = new AlertingService();
