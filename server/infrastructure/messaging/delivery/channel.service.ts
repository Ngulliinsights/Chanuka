/**
 * Notification Channel Service — Delivery Layer
 *
 * Single responsibility: HOW to physically send a notification through a channel.
 *
 * Owns:
 *   • In-app  — database insert + optional WebSocket push
 *   • Email   — via EmailService (SMTP / mock)
 *   • SMS     — via SMSService (AWS SNS / Twilio / mock)
 *   • Push    — via PushService (Firebase / OneSignal / mock)
 *
 * Does NOT:
 *   • Decide whether a notification should be sent
 *   • Evaluate user preferences
 *   • Schedule, batch, or template notifications
 *
 * Consumed by: notification-service.ts
 * Depends on:  email-service.ts, sms-service.ts, push-service.ts
 */

import crypto from 'crypto';
import { eq } from 'drizzle-orm';

import { logger } from '@server/infrastructure/observability';
import { db } from '@server/infrastructure/database';
import { notifications, user_profiles, users } from '@server/infrastructure/schema';
import { getEmailService } from '@server/infrastructure/messaging/email/email-service';
import { smsService } from '@server/infrastructure/messaging/sms/sms-service';
import { pushService } from '@server/infrastructure/messaging/push/push-service';

// ---------------------------------------------------------------------------
// Logger helper
// ---------------------------------------------------------------------------
function log(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context?: Record<string, unknown>,
): void {
  const suffix = context ? ` | ${JSON.stringify(context)}` : '';
  logger[level](`${message}${suffix}`);
}

// ---------------------------------------------------------------------------
// Optional WebSocket helper
// ---------------------------------------------------------------------------
async function tryWebSocketNotify(
  userId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    // @ts-expect-error - @shared/websocket is optional and may not exist
    const mod = await import('@shared/websocket').catch(() => null);
    if (mod?.webSocketService) {
      mod.webSocketService.sendUserNotification(userId, payload);
    }
  } catch {
    // WebSocket is a best-effort enhancement — swallow silently.
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ChannelDeliveryRequest {
  user_id: string;
  channel: 'email' | 'inApp' | 'sms' | 'push';
  content: {
    title: string;
    message: string;
    /** Rich HTML body used by the email channel. */
    htmlMessage?: string;
  };
  metadata?: {
    priority: 'low' | 'medium' | 'high' | 'urgent';
    relatedBillId?: number;
    category?: string;
    actionUrl?: string;
    [key: string]: unknown;
  };
  config?: ChannelConfig;
}

export interface ChannelConfig {
  email?: {
    template?: string;
    subject?: string;
    replyTo?: string;
  };
  sms?: {
    shortFormat?: boolean;
    maxLength?: number;
  };
  push?: {
    sound?: boolean;
    vibration?: boolean;
    icon?: string;
    badge?: number;
  };
}

export interface DeliveryResult {
  success: boolean;
  channel: string;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
}

// Kept for backward compatibility with consumers
export interface SMSProviderConfig {
  provider: 'twilio' | 'aws-sns' | 'mock';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export interface PushProviderConfig {
  provider: 'firebase' | 'onesignal' | 'mock';
  serverKey?: string;
  appId?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class NotificationChannelService {
  private emailServicePromise: Promise<any>;
  private readonly deliveryAttempts = new Map<string, number>();
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    this.emailServicePromise = getEmailService();
    
    log('info', '✅ NotificationChannelService created');
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Deliver through a single channel with automatic exponential-backoff retry. */
  async sendToChannel(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    const attemptKey = `${request.user_id}-${request.channel}-${Date.now()}`;

    try {
      let result: DeliveryResult;

      switch (request.channel) {
        case 'inApp': result = await this.sendInApp(request);  break;
        case 'email': result = await this.sendEmail(request);  break;
        case 'sms':   result = await this.sendSMS(request);    break;
        case 'push':  result = await this.sendPush(request);   break;
        default: {
          const exhaustive: never = request.channel;
          throw new Error(`Unsupported channel: ${String(exhaustive)}`);
        }
      }

      if (result.success) this.deliveryAttempts.delete(attemptKey);
      return result;

    } catch (err: unknown) {
      const attempts = (this.deliveryAttempts.get(attemptKey) ?? 0) + 1;
      this.deliveryAttempts.set(attemptKey, attempts);

      log('error', `Channel delivery failed (attempt ${attempts})`, {
        channel: request.channel,
        user_id: request.user_id,
        err:     String(err),
      });

      if (attempts < this.MAX_RETRY_ATTEMPTS && this.isRetryableError(err)) {
        await this.delay(Math.pow(2, attempts) * 1000);
        return this.sendToChannel(request);
      }

      return {
        success:     false,
        channel:     request.channel,
        error:       err instanceof Error ? err.message : String(err),
        deliveredAt: new Date(),
      };
    }
  }

  /** Deliver the same content to multiple channels in parallel. */
  async sendToMultipleChannels(
    user_id:   string,
    channels:  Array<'email' | 'inApp' | 'sms' | 'push'>,
    content:   ChannelDeliveryRequest['content'],
    metadata?: ChannelDeliveryRequest['metadata'],
  ): Promise<DeliveryResult[]> {
    const settled = await Promise.allSettled(
      channels.map((channel) => this.sendToChannel({ user_id, channel, content, metadata })),
    );

    return settled.map((result, index) =>
      result.status === 'fulfilled'
        ? result.value
        : {
            success:     false,
            channel:     channels[index] ?? 'unknown',
            error:       result.reason instanceof Error ? result.reason.message : String(result.reason),
            deliveredAt: new Date(),
          },
    );
  }

  /** Lightweight connectivity probe used by health-check endpoints. */
  async testConnectivity(): Promise<{
    aws:      { connected: boolean; error?: string };
    firebase: { connected: boolean; error?: string };
  }> {
    const [aws, firebase] = await Promise.all([
      smsService.testConnectivity(),
      pushService.testConnectivity(),
    ]);

    return { aws, firebase };
  }

  getStatus(): {
    smsProvider:         string;
    smsConfigured:       boolean;
    pushProvider:        string;
    pushConfigured:      boolean;
    awsInitialised:      boolean;
    firebaseInitialised: boolean;
    fallbackMode:        boolean;
    pendingRetries:      number;
  } {
    const smsStatus = smsService.getStatus();
    const pushStatus = pushService.getStatus();

    return {
      smsProvider:         smsStatus.provider,
      smsConfigured:       smsStatus.configured,
      pushProvider:        pushStatus.provider,
      pushConfigured:      pushStatus.configured,
      awsInitialised:      smsStatus.awsInitialized,
      firebaseInitialised: pushStatus.firebaseInitialized,
      fallbackMode:        smsStatus.fallbackMode || pushStatus.fallbackMode,
      pendingRetries:      this.deliveryAttempts.size,
    };
  }

  cleanup(): void {
    this.deliveryAttempts.clear();
    smsService.cleanup();
    pushService.cleanup();
    log('info', '✅ NotificationChannelService cleanup complete');
  }

  // -------------------------------------------------------------------------
  // Channel senders (private)
  // -------------------------------------------------------------------------

  /**
   * In-app: writes to the notifications table, then fires a WebSocket event.
   */
  private async sendInApp(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    try {
      const notificationId = crypto.randomUUID();

      await db.insert(notifications).values({
        id:                notificationId,
        user_id:           request.user_id,
        notification_type: (request.metadata?.category as string | undefined) ?? 'bill_update',
        title:             request.content.title,
        message:           request.content.message,
        related_bill_id:   request.metadata?.relatedBillId?.toString(),
        is_read:           false,
        is_dismissed:      false,
        delivery_method:   'in_app',
        delivery_status:   'pending',
        created_at:        new Date(),
      });

      // Fire-and-forget WebSocket notification
      void tryWebSocketNotify(request.user_id, {
        type:    request.metadata?.category ?? 'notification',
        title:   request.content.title,
        message: request.content.message,
        data:    { id: notificationId, ...request.metadata },
      });

      return { success: true, channel: 'inApp', messageId: notificationId, deliveredAt: new Date() };

    } catch (err: unknown) {
      throw new Error(`In-app delivery failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Email: resolves user address + display name, then delegates to EmailService.
   */
  private async sendEmail(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    try {
      const userRows = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, request.user_id))
        .limit(1) as any[];

      const user = userRows[0];
      if (!user)       throw new Error(`User not found: ${request.user_id}`);
      if (!user.email) throw new Error(`No email address for user: ${request.user_id}`);
      if (!this.isValidEmail(user.email)) throw new Error(`Invalid email: ${user.email}`);

      const profileRows = await db
        .select({
          display_name: user_profiles.display_name,
          first_name:   user_profiles.first_name,
          last_name:    user_profiles.last_name,
        })
        .from(user_profiles)
        .where(eq(user_profiles.user_id, request.user_id))
        .limit(1) as any[];

      const profile = profileRows[0];

      const name =
        profile?.display_name ??
        (profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.first_name) ??
        'User';

      const { text, html } = this.formatEmailContent(request, name);

      const emailService = await this.emailServicePromise;
      await emailService.sendEmail({
        to:      user.email,
        subject: request.content.title,
        text,
        html,
        metadata: {
          userId:        request.user_id,
          category:      (request.metadata?.category as string | undefined) ?? 'notification',
          relatedBillId: request.metadata?.relatedBillId,
        },
      });

      return { success: true, channel: 'email', deliveredAt: new Date() };

    } catch (err: unknown) {
      throw new Error(`Email delivery failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * SMS: delegates to SMSService.
   */
  private async sendSMS(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    try {
      // TODO: Get phone number from user schema once available
      const phone = process.env.NODE_ENV === 'development' ? '+254700000000' : null;

      if (!phone) {
        throw new Error(
          `Phone number not yet in user schema — cannot send SMS (user: ${request.user_id})`,
        );
      }

      const message = this.formatSMSMessage(request);
      
      const result = await smsService.sendSMS({
        phoneNumber: phone,
        message,
        priority: request.metadata?.priority,
        metadata: {
          userId: request.user_id,
          category: request.metadata?.category as string | undefined,
        },
      });

      if (!result.success) {
        throw new Error(result.error ?? 'SMS delivery failed');
      }

      return {
        success: true,
        channel: 'sms',
        messageId: result.messageId,
        deliveredAt: result.deliveredAt,
      };

    } catch (err: unknown) {
      throw new Error(`SMS delivery failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Push: delegates to PushService.
   */
  private async sendPush(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    try {
      // TODO: Get push tokens from user_devices table once available
      const tokens =
        process.env.NODE_ENV === 'development'
          ? [`mock-token-${request.user_id}`]
          : [];

      if (tokens.length === 0) {
        throw new Error(`No push tokens registered for user: ${request.user_id}`);
      }

      const payload = this.formatPushPayload(request);
      
      const result = await pushService.sendPush({
        tokens,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        priority: request.metadata?.priority,
        config: request.config?.push,
        android: payload.android,
        apns: payload.apns,
        webpush: payload.webpush,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Push delivery failed');
      }

      return {
        success: true,
        channel: 'push',
        messageId: result.messageId,
        deliveredAt: result.deliveredAt,
      };

    } catch (err: unknown) {
      throw new Error(`Push delivery failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // -------------------------------------------------------------------------
  // Formatting helpers
  // -------------------------------------------------------------------------

  private formatEmailContent(
    request:  ChannelDeliveryRequest,
    userName: string,
  ): { text: string; html: string } {
    const { title, message, htmlMessage } = request.content;
    const { priority, actionUrl, relatedBillId } = request.metadata ?? {};
    const priorityColor = this.getPriorityColor(priority as string | undefined);
    const frontendUrl   = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    const text =
      `Hello ${userName},\n\n${title}\n\n${message}\n\n` +
      (relatedBillId ? `Related Bill ID: ${relatedBillId}\n` : '') +
      (priority      ? `Priority: ${String(priority).toUpperCase()}\n` : '') +
      (actionUrl     ? `\nView details: ${String(actionUrl)}\n` : '') +
      '\nBest regards,\nChanuka Legislative Tracking';

    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8">
        <style>
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}
          .wrap{max-width:600px;margin:0 auto}
          .hdr{background:#14B8A6;color:#fff;padding:20px;text-align:center}
          .body{padding:30px 20px;background:#fff}
          .badge{display:inline-block;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:bold;color:#fff;background:${priorityColor}}
          .btn{display:inline-block;padding:12px 24px;background:#14B8A6;color:#fff;text-decoration:none;border-radius:6px;margin:20px 0}
          .foot{padding:20px;text-align:center;font-size:12px;color:#6c757d;background:#f8f9fa}
        </style>
      </head><body>
        <div class="wrap">
          <div class="hdr"><h1 style="margin:0">Chanuka</h1></div>
          <div class="body">
            <h2 style="color:#2c3e50;margin-top:0">${title}</h2>
            ${priority ? `<p><span class="badge">${String(priority).toUpperCase()}</span></p>` : ''}
            <div style="margin:20px 0">${htmlMessage ?? message.replace(/\n/g, '<br>')}</div>
            ${relatedBillId ? `<p><strong>Related Bill:</strong> #${relatedBillId}</p>` : ''}
            ${actionUrl     ? `<p><a href="${String(actionUrl)}" class="btn">View Details</a></p>` : ''}
          </div>
          <div class="foot">
            You received this notification based on your preferences.<br>
            <a href="${frontendUrl}/settings/notifications">Update preferences</a>
          </div>
        </div>
      </body></html>`;

    return { text, html };
  }

  private formatSMSMessage(request: ChannelDeliveryRequest): string {
    const maxLength   = request.config?.sms?.maxLength ?? 160;
    const shortFormat = request.config?.sms?.shortFormat ?? true;
    const prefix      = this.getPriorityPrefix(request.metadata?.priority as string | undefined);
    const { title, message } = request.content;
    const actionUrl   = request.metadata?.actionUrl as string | undefined;

    if (!shortFormat) {
      return `${prefix}${title}\n\n${message}${actionUrl ? `\n\n${actionUrl}` : ''}`;
    }

    let sms = `${prefix}${title}: ${message}`;
    if (sms.length > maxLength) sms = `${sms.slice(0, maxLength - 3)}...`;
    if (actionUrl && sms.length + actionUrl.length + 1 <= maxLength) sms += ` ${actionUrl}`;
    return sms;
  }

  private formatPushPayload(request: ChannelDeliveryRequest): {
    title: string;
    body: string;
    data?: Record<string, string>;
    android?: any;
    apns?: any;
    webpush?: any;
  } {
    const { title, message } = request.content;
    const { priority, actionUrl, relatedBillId, category } = request.metadata ?? {};
    const cfg = request.config?.push ?? {};

    return {
      title,
      body: message,
      data: {
        type:      (category as string | undefined)   ?? 'notification',
        priority:  (priority as string | undefined)   ?? 'medium',
        bill_id:   relatedBillId?.toString()          ?? '',
        actionUrl: (actionUrl  as string | undefined) ?? '',
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: priority === 'urgent' || priority === 'high' ? 'high' : 'normal',
        notification: {
          sound:    cfg.sound !== false ? 'default' : undefined,
          priority: priority === 'urgent' ? 'high' : 'default',
          icon:     cfg.icon ?? 'notification_icon',
        },
      },
      apns: {
        payload: {
          aps: {
            sound:             cfg.sound !== false ? 'default' : undefined,
            badge:             cfg.badge ?? 1,
            'mutable-content': 1,
          },
        },
      },
      webpush: {
        notification: {
          icon:    cfg.icon ?? '/symbol.svg',
          vibrate: cfg.vibration !== false ? [200, 100, 200] : undefined,
        },
      },
    };
  }

  // -------------------------------------------------------------------------
  // Utility helpers
  // -------------------------------------------------------------------------

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getPriorityPrefix(priority?: string): string {
    if (priority === 'urgent') return '[URGENT] ';
    if (priority === 'high')   return '[HIGH PRIORITY] ';
    return '';
  }

  private getPriorityColor(priority?: string): string {
    const map: Record<string, string> = {
      urgent: '#dc3545', high: '#fd7e14', medium: '#ffc107', low: '#28a745',
    };
    return map[priority ?? ''] ?? '#6c757d';
  }

  private isRetryableError(err: unknown): boolean {
    const patterns = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'timeout', 'network'];
    return patterns.some((p) => String(err).toLowerCase().includes(p));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const notificationChannelService = new NotificationChannelService();
