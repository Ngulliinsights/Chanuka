/**
 * Push Notification Service — Push Delivery Layer
 *
 * Single responsibility: HOW to physically send push notifications.
 *
 * Supports:
 *   • Firebase Cloud Messaging (production)
 *   • OneSignal (stub - requires package installation)
 *   • Mock (development)
 *
 * Does NOT:
 *   • Decide whether a push should be sent
 *   • Evaluate user preferences
 *   • Schedule or batch notifications
 */

import type {
  AndroidConfig,
  ApnsConfig,
  WebpushConfig,
} from 'firebase-admin/messaging';
import * as admin from 'firebase-admin';
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

export interface PushProviderConfig {
  provider: 'firebase' | 'onesignal' | 'mock';
  serverKey?: string;
  appId?: string;
}

export interface PushMessage {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  config?: {
    sound?: boolean;
    vibration?: boolean;
    icon?: string;
    badge?: number;
  };
  android?: AndroidConfig;
  apns?: ApnsConfig;
  webpush?: WebpushConfig;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  successCount?: number;
  failureCount?: number;
  error?: string;
  deliveredAt?: Date;
}

interface FirebaseConfig {
  projectId: string;
  privateKey?: string;
  clientEmail?: string;
  databaseURL?: string;
}

// ---------------------------------------------------------------------------
// Push Service
// ---------------------------------------------------------------------------

export class PushService {
  private firebaseApp: admin.app.App | null = null;
  private readonly config: PushProviderConfig;
  private readonly firebaseConfig: FirebaseConfig;
  private readonly fallbackToMock: boolean;
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    this.config = {
      provider: (process.env.PUSH_PROVIDER as PushProviderConfig['provider']) || 'mock',
      serverKey: process.env.FIREBASE_SERVER_KEY ?? process.env.ONESIGNAL_API_KEY ?? '',
      appId: process.env.FIREBASE_APP_ID ?? process.env.ONESIGNAL_APP_ID ?? '',
    };

    this.firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID ?? '',
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    };

    this.fallbackToMock =
      process.env.NODE_ENV === 'development' ||
      process.env.NOTIFICATION_MOCK === 'true';

    // Non-blocking initialization
    this.initFirebase().catch((err: unknown) =>
      log('error', 'Firebase initialization failed', { err: String(err) }),
    );

    log('info', '✅ PushService created', {
      provider: this.config.provider,
      fallback: this.fallbackToMock,
    });
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  private async initFirebase(): Promise<void> {
    const { projectId, privateKey, clientEmail, databaseURL } = this.firebaseConfig;

    if (!projectId || !privateKey || !clientEmail) {
      if (!this.fallbackToMock) {
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
      log('info', '✅ Firebase Admin SDK initialized');
    } catch (err: unknown) {
      log('error', '❌ Firebase initialization failed', { err: String(err) });
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  async sendPush(message: PushMessage): Promise<PushResult> {
    return this.sendWithRetry(message, 0);
  }

  async testConnectivity(): Promise<{ connected: boolean; error?: string }> {
    if (this.firebaseApp) {
      try {
        const messaging = admin.messaging(this.firebaseApp);
        return { connected: !!messaging };
      } catch (err: unknown) {
        return {
          connected: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
    return {
      connected: false,
      error: 'Firebase app not initialized',
    };
  }

  getStatus(): {
    provider: string;
    configured: boolean;
    firebaseInitialized: boolean;
    fallbackMode: boolean;
  } {
    return {
      provider: this.config.provider,
      configured: this.firebaseApp !== null || this.config.provider === 'mock',
      firebaseInitialized: this.firebaseApp !== null,
      fallbackMode: this.fallbackToMock,
    };
  }

  cleanup(): void {
    this.firebaseApp = null;
    log('info', '✅ PushService cleanup complete');
  }

  // -------------------------------------------------------------------------
  // Private methods
  // -------------------------------------------------------------------------

  private async sendWithRetry(message: PushMessage, attempt: number): Promise<PushResult> {
    try {
      let messageId: string;
      let successCount = 0;
      let failureCount = 0;

      if (this.firebaseApp) {
        const result = await this.sendViaFirebase(message);
        messageId = result.messageId;
        successCount = result.successCount;
        failureCount = result.failureCount;
      } else if (this.config.provider === 'onesignal') {
        messageId = await this.sendViaOneSignal(message.tokens);
        successCount = message.tokens.length;
      } else {
        messageId = this.sendViaMock(message);
        successCount = message.tokens.length;
      }

      return {
        success: true,
        messageId,
        successCount,
        failureCount,
        deliveredAt: new Date(),
      };
    } catch (err: unknown) {
      log('error', `Push delivery failed (attempt ${attempt + 1})`, {
        tokens: message.tokens.length,
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

  private async sendViaFirebase(message: PushMessage): Promise<{
    messageId: string;
    successCount: number;
    failureCount: number;
  }> {
    if (!this.firebaseApp) {
      log('info', '📱 Firebase unavailable — falling back to mock push');
      return {
        messageId: this.sendViaMock(message),
        successCount: message.tokens.length,
        failureCount: 0,
      };
    }

    try {
      const messaging = admin.messaging(this.firebaseApp);
      const validTokens = message.tokens.filter((t) => !t.startsWith('mock-token-'));

      if (validTokens.length === 0) {
        if (this.fallbackToMock) {
          return {
            messageId: this.sendViaMock(message),
            successCount: message.tokens.length,
            failureCount: 0,
          };
        }
        throw new Error('No valid FCM tokens provided');
      }

      const response = await messaging.sendEachForMulticast({
        notification: { title: message.title, body: message.body },
        data: message.data ?? {},
        android: message.android,
        apns: message.apns,
        webpush: message.webpush,
        tokens: validTokens,
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

      return {
        messageId: response.responses.find((r) => r.success)?.messageId ?? `fcm-${Date.now()}`,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (err: unknown) {
      if (this.isFirebaseRetryable(err)) throw err;
      if (this.fallbackToMock) {
        log('warn', '⚠️  Firebase error — falling back to mock');
        return {
          messageId: this.sendViaMock(message),
          successCount: message.tokens.length,
          failureCount: 0,
        };
      }
      throw new Error(`Firebase failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async sendViaOneSignal(_tokens: string[]): Promise<string> {
    // TODO: install `onesignal-node` package and implement:
    // const client = new OneSignal.Client(this.config.appId, this.config.serverKey);
    // const result = await client.createNotification({
    //   include_player_ids: _tokens,
    //   ...
    // });
    // return result.id;
    log('info', `[ONESIGNAL STUB] Tokens: ${_tokens.length}`);
    return `onesignal-stub-${Date.now()}`;
  }

  private sendViaMock(message: PushMessage): string {
    log('info', `[MOCK PUSH] Tokens: ${message.tokens.length} | ${message.title}`);
    return `mock-push-${Date.now()}`;
  }

  // -------------------------------------------------------------------------
  // Utility helpers
  // -------------------------------------------------------------------------

  private isRetryableError(err: unknown): boolean {
    const patterns = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'timeout', 'network'];
    return patterns.some((p) => String(err).toLowerCase().includes(p));
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

export const pushService = new PushService();
