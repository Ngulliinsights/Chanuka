/**
 * Notification Channel Service — Delivery Layer
 *
 * Single responsibility: HOW to physically send a notification through a channel.
 *
 * Owns:
 *   • In-app  — database insert + optional WebSocket push
 *   • Email   — via EmailService (SMTP / mock)
 *   • SMS     — AWS SNS (production) or mock (development)
 *   • Push    — Firebase Admin SDK (production) or mock (development)
 *
 * Does NOT:
 *   • Decide whether a notification should be sent
 *   • Evaluate user preferences
 *   • Schedule, batch, or template notifications
 *
 * Consumed by: notification-service.ts
 * Depends on:  email-service.ts, @server/infrastructure/database
 */

import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type {
  AndroidConfig,
  ApnsConfig,
  WebpushConfig,
} from 'firebase-admin/messaging';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';

import { logger } from '@server/infrastructure/observability';
import { db } from '@server/infrastructure/database';
import { notifications, user_profiles, users } from '@server/infrastructure/schema';
import { getEmailService } from '@server/infrastructure/messaging/email/email-service';

// ---------------------------------------------------------------------------
// Logger helper — this project's logger accepts a single string argument.
// Embed context as a JSON suffix to avoid pino overload errors.
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
// Optional WebSocket helper — non-fatal if @shared/websocket is unavailable.
// ---------------------------------------------------------------------------
async function tryWebSocketNotify(
  userId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    // Dynamic import so the channel service still compiles / works when the
    // websocket package is not yet available in the project.
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

// Kept for consumers that import these (e.g. notification-service.ts)
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
// Internal push payload — typed against firebase-admin's MulticastMessage
// ---------------------------------------------------------------------------
interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  android?: AndroidConfig;
  apns?: ApnsConfig;
  webpush?: WebpushConfig;
}

// ---------------------------------------------------------------------------
// Internal provider config
// ---------------------------------------------------------------------------
interface ProviderConfig {
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  firebase: {
    projectId: string;
    privateKey?: string;
    clientEmail?: string;
    databaseURL?: string;
  };
  /** Silently fall back to mock delivery when cloud credentials are absent. */
  fallbackToMock: boolean;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class NotificationChannelService {
  private snsClient: SNSClient | null = null;
  private firebaseApp: admin.app.App | null = null;
  private emailServicePromise: Promise<any>;

  private readonly smsConfig: SMSProviderConfig;
  private readonly pushConfig: PushProviderConfig;
  private readonly deliveryAttempts = new Map<string, number>();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly providerCfg: ProviderConfig;

  constructor() {
    this.emailServicePromise = getEmailService();
    
    this.smsConfig = {
      provider:   (process.env.SMS_PROVIDER  as SMSProviderConfig['provider']) || 'mock',
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
      authToken:  process.env.TWILIO_AUTH_TOKEN  ?? '',
      fromNumber: process.env.TWILIO_FROM_NUMBER ?? '',
    };

    this.pushConfig = {
      provider:  (process.env.PUSH_PROVIDER as PushProviderConfig['provider']) || 'mock',
      serverKey: process.env.FIREBASE_SERVER_KEY ?? process.env.ONESIGNAL_API_KEY ?? '',
      appId:     process.env.FIREBASE_APP_ID     ?? process.env.ONESIGNAL_APP_ID  ?? '',
    };

    this.providerCfg = {
      aws: {
        region:          process.env.AWS_REGION            ?? 'us-east-1',
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      firebase: {
        projectId:   process.env.FIREBASE_PROJECT_ID ?? '',
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      },
      fallbackToMock:
        process.env.NODE_ENV === 'development' ||
        process.env.NOTIFICATION_MOCK === 'true',
    };

    // Non-blocking — failures are logged, not thrown
    this.initProviders().catch((err: unknown) =>
      log('error', 'Provider initialisation failed', { err: String(err) }),
    );

    log('info', '✅ NotificationChannelService created', {
      smsProvider:  this.smsConfig.provider,
      pushProvider: this.pushConfig.provider,
      fallback:     this.providerCfg.fallbackToMock,
    });
  }

  // -------------------------------------------------------------------------
  // Provider initialisation
  // -------------------------------------------------------------------------

  private async initProviders(): Promise<void> {
    await Promise.all([this.initAWSSNS(), this.initFirebase()]);
  }

  private async initAWSSNS(): Promise<void> {
    const { region, accessKeyId, secretAccessKey } = this.providerCfg.aws;

    if (!accessKeyId || !secretAccessKey) {
      if (!this.providerCfg.fallbackToMock) {
        log('warn', '⚠️  AWS credentials missing — SMS will use mock');
      }
      return;
    }

    try {
      this.snsClient = new SNSClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      log('info', '✅ AWS SNS client initialised');
    } catch (err: unknown) {
      log('error', '❌ AWS SNS initialisation failed', { err: String(err) });
    }
  }

  private async initFirebase(): Promise<void> {
    const { projectId, privateKey, clientEmail, databaseURL } = this.providerCfg.firebase;

    if (!projectId || !privateKey || !clientEmail) {
      if (!this.providerCfg.fallbackToMock) {
        log('warn', '⚠️  Firebase credentials missing — push will use mock');
      }
      return;
    }

    try {
      try {
        this.firebaseApp = admin.app();
      } catch {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
          databaseURL,
        });
      }
      log('info', '✅ Firebase Admin SDK initialised');
    } catch (err: unknown) {
      log('error', '❌ Firebase initialisation failed', { err: String(err) });
    }
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
    const aws:      { connected: boolean; error?: string } = { connected: false };
    const firebase: { connected: boolean; error?: string } = { connected: false };

    if (this.snsClient) {
      aws.connected = true; // Valid SNSClient instance implies credentials parsed OK
    } else {
      aws.error = 'SNS client not initialised';
    }

    if (this.firebaseApp) {
      try {
        firebase.connected = !!admin.messaging(this.firebaseApp);
      } catch (err: unknown) {
        firebase.error = err instanceof Error ? err.message : String(err);
      }
    } else {
      firebase.error = 'Firebase app not initialised';
    }

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
    return {
      smsProvider:         this.smsConfig.provider,
      smsConfigured:       this.snsClient !== null || this.smsConfig.provider === 'mock',
      pushProvider:        this.pushConfig.provider,
      pushConfigured:      this.firebaseApp !== null || this.pushConfig.provider === 'mock',
      awsInitialised:      this.snsClient !== null,
      firebaseInitialised: this.firebaseApp !== null,
      fallbackMode:        this.providerCfg.fallbackToMock,
      pendingRetries:      this.deliveryAttempts.size,
    };
  }

  cleanup(): void {
    this.deliveryAttempts.clear();
    this.snsClient   = null;
    this.firebaseApp = null;
    log('info', '✅ NotificationChannelService cleanup complete');
  }

  // -------------------------------------------------------------------------
  // Channel senders (private)
  // -------------------------------------------------------------------------

  /**
   * In-app: writes to the notifications table, then fires a WebSocket event.
   * WebSocket failure is non-fatal — the notification is still persisted.
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

      // Fire-and-forget — do not await; WebSocket errors are swallowed inside
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
   * SMS: routes to AWS SNS, Twilio (stub), or mock.
   * Phone numbers are not yet in the user schema — a dev placeholder is used.
   */
  private async sendSMS(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    try {
      const phone =
        process.env.NODE_ENV === 'development' ? '+254700000000' : null;

      if (!phone) {
        throw new Error(
          `Phone number not yet in user schema — cannot send SMS (user: ${request.user_id})`,
        );
      }

      const message = this.formatSMSMessage(request);
      let messageId: string;

      if (this.snsClient) {
        messageId = await this.sendViaAWSSNS(phone, message);
      } else if (this.smsConfig.provider === 'twilio') {
        messageId = await this.sendViaTwilio(phone, message);
      } else {
        messageId = this.sendViaMockSMS(phone, message);
      }

      return { success: true, channel: 'sms', messageId, deliveredAt: new Date() };

    } catch (err: unknown) {
      throw new Error(`SMS delivery failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Push: routes to Firebase, OneSignal (stub), or mock.
   * Push tokens will come from a user_devices table once that schema exists.
   */
  private async sendPush(request: ChannelDeliveryRequest): Promise<DeliveryResult> {
    try {
      const tokens =
        process.env.NODE_ENV === 'development'
          ? [`mock-token-${request.user_id}`]
          : [];

      if (tokens.length === 0) {
        throw new Error(`No push tokens registered for user: ${request.user_id}`);
      }

      const payload = this.formatPushPayload(request);
      let messageId: string;

      if (this.firebaseApp) {
        messageId = await this.sendViaFirebase(tokens, payload);
      } else if (this.pushConfig.provider === 'onesignal') {
        messageId = await this.sendViaOneSignal(tokens);
      } else {
        messageId = this.sendViaMockPush(tokens, payload);
      }

      return { success: true, channel: 'push', messageId, deliveredAt: new Date() };

    } catch (err: unknown) {
      throw new Error(`Push delivery failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // -------------------------------------------------------------------------
  // Provider implementations (no circular imports)
  // -------------------------------------------------------------------------

  private async sendViaAWSSNS(phoneNumber: string, message: string): Promise<string> {
    if (!this.snsClient) {
      log('info', '📱 AWS SNS unavailable — falling back to mock SMS');
      return this.sendViaMockSMS(phoneNumber, message);
    }

    try {
      const e164 = this.normalisePhoneNumber(phoneNumber);

      const result = await this.snsClient.send(
        new PublishCommand({
          Message:     message,
          PhoneNumber: e164,
          MessageAttributes: {
            'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: 'Chanuka' },
            'AWS.SNS.SMS.SMSType':  { DataType: 'String', StringValue: 'Transactional' },
          },
        }),
      );

      const messageId = result.MessageId ?? `sns-${Date.now()}`;
      log('info', '✅ SMS sent via AWS SNS', { messageId, phone: this.maskPhone(e164) });
      return messageId;

    } catch (err: unknown) {
      if (this.isAWSRetryable(err)) throw err;
      if (this.providerCfg.fallbackToMock) {
        log('warn', '⚠️  AWS SNS error — falling back to mock');
        return this.sendViaMockSMS(phoneNumber, message);
      }
      throw new Error(`AWS SNS failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async sendViaFirebase(tokens: string[], payload: PushPayload): Promise<string> {
    if (!this.firebaseApp) {
      log('info', '📱 Firebase unavailable — falling back to mock push');
      return this.sendViaMockPush(tokens, payload);
    }

    try {
      const messaging = admin.messaging(this.firebaseApp);
      const validTokens = tokens.filter((t) => !t.startsWith('mock-token-'));

      if (validTokens.length === 0) {
        if (this.providerCfg.fallbackToMock) return this.sendViaMockPush(tokens, payload);
        throw new Error('No valid FCM tokens provided');
      }

      const response = await messaging.sendEachForMulticast({
        notification: { title: payload.title, body: payload.body },
        data:         payload.data ?? {},
        android:      payload.android,
        apns:         payload.apns,
        webpush:      payload.webpush,
        tokens:       validTokens,
      });

      log('info', '✅ Push sent via Firebase', {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      if (response.failureCount > 0) {
        response.responses.forEach((r, i) => {
          if (!r.success) {
            log('warn', `FCM token[${i}] failed`, { err: r.error?.message ?? 'unknown' });
          }
        });
      }

      return response.responses.find((r) => r.success)?.messageId ?? `fcm-${Date.now()}`;

    } catch (err: unknown) {
      if (this.isFirebaseRetryable(err)) throw err;
      if (this.providerCfg.fallbackToMock) {
        log('warn', '⚠️  Firebase error — falling back to mock');
        return this.sendViaMockPush(tokens, payload);
      }
      throw new Error(`Firebase failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async sendViaTwilio(phoneNumber: string, _message: string): Promise<string> {
    // TODO: install `twilio` and replace stub:
    // const client = twilio(this.smsConfig.accountSid, this.smsConfig.authToken);
    // const result = await client.messages.create({ body: _message, from: this.smsConfig.fromNumber, to: phoneNumber });
    // return result.sid;
    log('info', `[TWILIO STUB] To: ${this.maskPhone(phoneNumber)}`);
    return `twilio-stub-${Date.now()}`;
  }

  private sendViaMockSMS(phoneNumber: string, message: string): string {
    log('info', `[MOCK SMS] To: ${this.maskPhone(phoneNumber)} | ${message.slice(0, 60)}`);
    return `mock-sms-${Date.now()}`;
  }

  private async sendViaOneSignal(_tokens: string[]): Promise<string> {
    // TODO: install `onesignal-node` and replace stub:
    // const client = new OneSignal.Client(this.pushConfig.appId, this.pushConfig.serverKey);
    // const result = await client.createNotification({ include_player_ids: _tokens, ... });
    // return result.id;
    log('info', `[ONESIGNAL STUB] Tokens: ${_tokens.length}`);
    return `onesignal-stub-${Date.now()}`;
  }

  private sendViaMockPush(tokens: string[], payload: PushPayload): string {
    log('info', `[MOCK PUSH] Tokens: ${tokens.length} | ${payload.title}`);
    return `mock-push-${Date.now()}`;
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

  private formatPushPayload(request: ChannelDeliveryRequest): PushPayload {
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

  private normalisePhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('254'))                    return `+${digits}`;
    if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`;
    if (digits.length === 9)                         return `+254${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
  }

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

  private isAWSRetryable(err: unknown): boolean {
    const retryable = ['Throttling', 'ServiceUnavailable', 'InternalError', 'RequestTimeout', 'NetworkingError'];
    const s = String(
      (err as { name?: string })?.name ??
      (err as { code?: string })?.code ??
      (err as { message?: string })?.message ??
      err,
    ).toLowerCase();
    return retryable.some((p) => s.includes(p.toLowerCase()));
  }

  private isFirebaseRetryable(err: unknown): boolean {
    const retryable = [
      'messaging/internal-error',
      'messaging/server-unavailable',
      'messaging/timeout',
      'messaging/quota-exceeded',
    ];
    const code = (err as { code?: string })?.code ?? '';
    return retryable.some((p) => code.includes(p));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const notificationChannelService = new NotificationChannelService();