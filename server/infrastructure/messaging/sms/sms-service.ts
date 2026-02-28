/**
 * SMS Service — SMS Delivery Layer
 *
 * Single responsibility: HOW to physically send SMS messages.
 *
 * Supports:
 *   • AWS SNS (production)
 *   • Twilio (stub - requires package installation)
 *   • Mock (development)
 *
 * Does NOT:
 *   • Decide whether an SMS should be sent
 *   • Evaluate user preferences
 *   • Schedule or batch messages
 */

import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { logger } from '@server/infrastructure/observability';

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
// Public types
// ---------------------------------------------------------------------------

export interface SMSProviderConfig {
  provider: 'twilio' | 'aws-sns' | 'mock';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export interface SMSMessage {
  phoneNumber: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: {
    userId?: string;
    category?: string;
    [key: string]: unknown;
  };
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
}

interface AWSConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

// ---------------------------------------------------------------------------
// SMS Service
// ---------------------------------------------------------------------------

export class SMSService {
  private snsClient: SNSClient | null = null;
  private readonly config: SMSProviderConfig;
  private readonly awsConfig: AWSConfig;
  private readonly fallbackToMock: boolean;
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    this.config = {
      provider:   (process.env.SMS_PROVIDER as SMSProviderConfig['provider']) || 'mock',
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
      authToken:  process.env.TWILIO_AUTH_TOKEN ?? '',
      fromNumber: process.env.TWILIO_FROM_NUMBER ?? '',
    };

    this.awsConfig = {
      region:          process.env.AWS_REGION ?? 'us-east-1',
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };

    this.fallbackToMock =
      process.env.NODE_ENV === 'development' ||
      process.env.NOTIFICATION_MOCK === 'true';

    // Non-blocking initialization
    this.initAWSSNS().catch((err: unknown) =>
      log('error', 'AWS SNS initialization failed', { err: String(err) }),
    );

    log('info', '✅ SMSService created', {
      provider: this.config.provider,
      fallback: this.fallbackToMock,
    });
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  private async initAWSSNS(): Promise<void> {
    const { region, accessKeyId, secretAccessKey } = this.awsConfig;

    if (!accessKeyId || !secretAccessKey) {
      if (!this.fallbackToMock) {
        log('warn', '⚠️  AWS credentials missing — SMS will use mock');
      }
      return;
    }

    try {
      this.snsClient = new SNSClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      log('info', '✅ AWS SNS client initialized');
    } catch (err: unknown) {
      log('error', '❌ AWS SNS initialization failed', { err: String(err) });
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    return this.sendWithRetry(message, 0);
  }

  async testConnectivity(): Promise<{ connected: boolean; error?: string }> {
    if (this.snsClient) {
      return { connected: true };
    }
    return {
      connected: false,
      error: 'SNS client not initialized',
    };
  }

  getStatus(): {
    provider: string;
    configured: boolean;
    awsInitialized: boolean;
    fallbackMode: boolean;
  } {
    return {
      provider:        this.config.provider,
      configured:      this.snsClient !== null || this.config.provider === 'mock',
      awsInitialized:  this.snsClient !== null,
      fallbackMode:    this.fallbackToMock,
    };
  }

  cleanup(): void {
    this.snsClient = null;
    log('info', '✅ SMSService cleanup complete');
  }

  // -------------------------------------------------------------------------
  // Private methods
  // -------------------------------------------------------------------------

  private async sendWithRetry(message: SMSMessage, attempt: number): Promise<SMSResult> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(message.phoneNumber);
      let messageId: string;

      if (this.snsClient) {
        messageId = await this.sendViaAWSSNS(normalizedPhone, message.message);
      } else if (this.config.provider === 'twilio') {
        messageId = await this.sendViaTwilio(normalizedPhone, message.message);
      } else {
        messageId = this.sendViaMock(normalizedPhone, message.message);
      }

      return {
        success: true,
        messageId,
        deliveredAt: new Date(),
      };
    } catch (err: unknown) {
      log('error', `SMS delivery failed (attempt ${attempt + 1})`, {
        phone: this.maskPhone(message.phoneNumber),
        err: String(err),
      });

      if (attempt < this.MAX_RETRY_ATTEMPTS && this.isRetryableError(err)) {
        await this.delay(Math.pow(2, attempt + 1) * 1000);
        return this.sendWithRetry(message, attempt + 1);
      }

      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        deliveredAt: new Date(),
      };
    }
  }

  private async sendViaAWSSNS(phoneNumber: string, message: string): Promise<string> {
    if (!this.snsClient) {
      log('info', '📱 AWS SNS unavailable — falling back to mock SMS');
      return this.sendViaMock(phoneNumber, message);
    }

    try {
      const result = await this.snsClient.send(
        new PublishCommand({
          Message: message,
          PhoneNumber: phoneNumber,
          MessageAttributes: {
            'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: 'Chanuka' },
            'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
          },
        }),
      );

      const messageId = result.MessageId ?? `sns-${Date.now()}`;
      log('info', '✅ SMS sent via AWS SNS', {
        messageId,
        phone: this.maskPhone(phoneNumber),
      });
      return messageId;
    } catch (err: unknown) {
      if (this.isAWSRetryable(err)) throw err;
      if (this.fallbackToMock) {
        log('warn', '⚠️  AWS SNS error — falling back to mock');
        return this.sendViaMock(phoneNumber, message);
      }
      throw new Error(`AWS SNS failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async sendViaTwilio(phoneNumber: string, _message: string): Promise<string> {
    // TODO: install `twilio` package and implement:
    // const client = twilio(this.config.accountSid, this.config.authToken);
    // const result = await client.messages.create({
    //   body: _message,
    //   from: this.config.fromNumber,
    //   to: phoneNumber
    // });
    // return result.sid;
    log('info', `[TWILIO STUB] To: ${this.maskPhone(phoneNumber)}`);
    return `twilio-stub-${Date.now()}`;
  }

  private sendViaMock(phoneNumber: string, message: string): string {
    log('info', `[MOCK SMS] To: ${this.maskPhone(phoneNumber)} | ${message.slice(0, 60)}`);
    return `mock-sms-${Date.now()}`;
  }

  // -------------------------------------------------------------------------
  // Utility helpers
  // -------------------------------------------------------------------------

  private normalizePhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('254')) return `+${digits}`;
    if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`;
    if (digits.length === 9) return `+254${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const smsService = new SMSService();
