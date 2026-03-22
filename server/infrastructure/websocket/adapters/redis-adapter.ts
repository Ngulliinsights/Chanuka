/**
 * Redis Adapter for WebSocket Service
 *
 * Provides Redis-based pub/sub and state persistence for horizontal scaling
 * of WebSocket connections across multiple server instances.
 */

import Redis, { RedisOptions } from 'ioredis';
import { logger } from '@server/infrastructure/observability';
import { promisify } from 'util';
import { gunzip, gzip } from 'zlib';
import type { AdapterConfig, ServiceStats } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS = {
  BILL_UPDATES:       'websocket:bill_updates',
  USER_NOTIFICATIONS: 'websocket:user_notifications',
  BROADCASTS:         'websocket:broadcasts',
} as const;

/** Seconds before an idle connection-state key expires. */
const CONNECTION_STATE_TTL_S = 3_600;

/** Seconds before a subscription set expires when idle. */
const SUBSCRIPTION_TTL_S = 86_400;

/** Maximum keys returned per SCAN page. */
const SCAN_COUNT = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = (typeof CHANNELS)[keyof typeof CHANNELS];

/** Extended stats that include Redis-specific counters. */
interface RedisStats extends ServiceStats {
  messagesProcessed: number;
  errors: number;
}

export interface RedisAdapterConfig extends AdapterConfig {
  redisUrl?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  enableOfflineQueue?: boolean;
  lazyConnect?: boolean;
  keepAlive?: number;
  family?: 4 | 6;
  db?: number;
  enableCompression?: boolean;
  /** Minimum byte length before a payload is gzip-compressed (default 1 024). */
  compressionThreshold?: number;
}

export interface RedisMessage {
  type: 'bill_update' | 'user_notification' | 'broadcast';
  data: unknown;
  timestamp: number;
  source?: string;
}

// ─── Promisified compression ──────────────────────────────────────────────────

const compressAsync   = promisify(gzip);
const decompressAsync = promisify(gunzip);

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Redis-based adapter for horizontal scaling of WebSocket connections.
 *
 * Responsibilities:
 *  - Publish/subscribe across server instances via Redis channels.
 *  - Store per-connection state with a rolling TTL.
 *  - Track per-user bill subscriptions in Redis Sets.
 */
export class RedisAdapter {
  private readonly client:     Redis;
  private readonly subscriber: Redis;
  private readonly config:     Required<RedisAdapterConfig>;

  private connected = false;
  private readonly messageHandlers = new Map<
    Channel,
    (message: RedisMessage) => void
  >();

  private readonly stats: RedisStats = {
    totalConnections:  0,
    activeConnections: 0,
    totalMessages:     0,
    totalBroadcasts:   0,
    droppedMessages:   0,
    duplicateMessages: 0,
    queueOverflows:    0,
    reconnections:     0,
    startTime:         Date.now(),
    lastActivity:      Date.now(),
    peakConnections:   0,
    uptime:            0,           // computed on read
    memoryUsage:       0,
    uniqueUsers:       0,
    averageLatency:    0,
    messagesProcessed: 0,
    errors:            0,
  };

  /** Epoch ms at construction; used to derive `uptime`. */
  private readonly startTime = Date.now();

  // ─── Constructor ────────────────────────────────────────────────────────────

  constructor(config: RedisAdapterConfig = {}) {
    this.config = {
      maxRetries:           3,
      retryDelayMs:         100,
      enableOfflineQueue:   false,
      lazyConnect:          true,
      keepAlive:            30_000,
      family:               4,
      db:                   0,
      enableCompression:    true,
      compressionThreshold: 1_024,
      redisUrl:             '',
      ...config,
    } as Required<RedisAdapterConfig>;

    const redisUrl = this.config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    const options  = this.buildRedisOptions();

    this.client     = new Redis(redisUrl, options);
    this.subscriber = new Redis(redisUrl, options);

    this.setupEventHandlers();
  }

  // ─── Connection ─────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    try {
      await Promise.all([this.client.connect(), this.subscriber.connect()]);

      await this.subscriber.subscribe(
        CHANNELS.BILL_UPDATES,
        CHANNELS.USER_NOTIFICATIONS,
        CHANNELS.BROADCASTS,
      );

      // `connected` is also flipped in the 'connect' event handler, but we set
      // it here so callers that await connect() get a consistent view immediately.
      this.connected = true;

      logger.info({ component: 'RedisAdapter' }, 'Redis adapter connected');
    } catch (error) {
      logger.error(
        { component: 'RedisAdapter', error: errorMessage(error) },
        'Failed to connect Redis adapter',
      );
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    try {
      await Promise.all([this.client.disconnect(), this.subscriber.disconnect()]);
      logger.info({ component: 'RedisAdapter' }, 'Redis adapter disconnected');
    } catch (error) {
      logger.error(
        { component: 'RedisAdapter', error: errorMessage(error) },
        'Error disconnecting Redis adapter',
      );
    }
  }

  // ─── Publishing ─────────────────────────────────────────────────────────────

  async publishBillUpdate(billId: number, update: unknown): Promise<void> {
    await this.publish(CHANNELS.BILL_UPDATES, {
      type:      'bill_update',
      data:      { billId, update },
      timestamp: Date.now(),
    });
  }

  async publishUserNotification(userId: string, notification: unknown): Promise<void> {
    await this.publish(CHANNELS.USER_NOTIFICATIONS, {
      type:      'user_notification',
      data:      { userId, notification },
      timestamp: Date.now(),
    });
  }

  async publishBroadcast(message: unknown): Promise<void> {
    await this.publish(CHANNELS.BROADCASTS, {
      type:      'broadcast',
      data:      message,
      timestamp: Date.now(),
    });
  }

  // ─── Connection State ───────────────────────────────────────────────────────

  async storeConnectionState(
    userId:       string,
    connectionId: string,
    state:        unknown,
  ): Promise<void> {
    if (!this.connected) return;
    try {
      const key = connectionStateKey(userId, connectionId);
      await this.client.setex(key, CONNECTION_STATE_TTL_S, JSON.stringify(state));
    } catch (error) {
      this.recordError('storeConnectionState', { connectionId }, error);
    }
  }

  async removeConnectionState(userId: string, connectionId: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.del(connectionStateKey(userId, connectionId));
    } catch (error) {
      this.recordError('removeConnectionState', { connectionId }, error);
    }
  }

  /**
   * Returns all connection states for a user.
   *
   * Uses SCAN instead of KEYS to avoid blocking the Redis event loop on large
   * key spaces.
   */
  async getConnectionStates(userId: string): Promise<unknown[]> {
    if (!this.connected) return [];
    try {
      const pattern = `websocket:connection:${userId}:*`;
      const keys    = await this.scanKeys(pattern);
      if (keys.length === 0) return [];

      const values = await this.client.mget(...keys);
      return values
        .filter((v): v is string => v !== null)
        .map(v => JSON.parse(v) as unknown);
    } catch (error) {
      this.recordError('getConnectionStates', { userId }, error);
      return [];
    }
  }

  // ─── Subscriptions ──────────────────────────────────────────────────────────

  async storeSubscription(userId: string, billId: number): Promise<void> {
    if (!this.connected) return;
    try {
      const userKey = userSubscriptionKey(userId);
      const billKey = billSubscriberKey(billId);

      await Promise.all([
        this.client.sadd(userKey, billId.toString()),
        this.client.sadd(billKey, userId),
        // Refresh TTLs on every write so idle keys eventually self-clean.
        this.client.expire(userKey, SUBSCRIPTION_TTL_S),
        this.client.expire(billKey, SUBSCRIPTION_TTL_S),
      ]);
    } catch (error) {
      this.recordError('storeSubscription', { userId, billId }, error);
    }
  }

  async removeSubscription(userId: string, billId: number): Promise<void> {
    if (!this.connected) return;
    try {
      await Promise.all([
        this.client.srem(userSubscriptionKey(userId), billId.toString()),
        this.client.srem(billSubscriberKey(billId), userId),
      ]);
    } catch (error) {
      this.recordError('removeSubscription', { userId, billId }, error);
    }
  }

  async getBillSubscribers(billId: number): Promise<string[]> {
    if (!this.connected) return [];
    try {
      return await this.client.smembers(billSubscriberKey(billId));
    } catch (error) {
      this.recordError('getBillSubscribers', { billId }, error);
      return [];
    }
  }

  async getUserSubscriptions(userId: string): Promise<number[]> {
    if (!this.connected) return [];
    try {
      const ids = await this.client.smembers(userSubscriptionKey(userId));
      return ids.map(id => parseInt(id, 10));
    } catch (error) {
      this.recordError('getUserSubscriptions', { userId }, error);
      return [];
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  onMessage(channel: Channel, handler: (message: RedisMessage) => void): void {
    this.messageHandlers.set(channel, handler);
  }

  isReady(): boolean {
    return this.connected;
  }

  getStats(): RedisStats {
    return { ...this.stats, uptime: Date.now() - this.startTime };
  }

  async healthCheck(): Promise<{
    status:   'healthy' | 'unhealthy';
    latency:  number;
    error?:   string;
  }> {
    const start = Date.now();
    if (!this.connected) {
      return { status: 'unhealthy', latency: 0, error: 'Not connected to Redis' };
    }
    try {
      await this.client.ping();
      return { status: 'healthy', latency: Date.now() - start };
    } catch (error) {
      return { status: 'unhealthy', latency: Date.now() - start, error: errorMessage(error) };
    }
  }

  async shutdown(): Promise<void> {
    logger.info({ component: 'RedisAdapter', stats: this.getStats() }, 'Shutting down Redis adapter');
    await this.disconnect();
    this.messageHandlers.clear();
    logger.info({ component: 'RedisAdapter' }, 'Redis adapter shutdown complete');
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildRedisOptions(): RedisOptions {
    return {
      maxRetriesPerRequest: this.config.maxRetries,
      enableOfflineQueue:   this.config.enableOfflineQueue,
      lazyConnect:          this.config.lazyConnect,
      keepAlive:            this.config.keepAlive,
      family:               this.config.family,
      db:                   this.config.db,
      retryStrategy: (times: number) => {
        if (times > this.config.maxRetries) return null;
        return this.config.retryDelayMs * Math.min(times, 3);
      },
    };
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info({ component: 'RedisAdapter' }, 'Redis client connected');
      this.connected = true;
    });

    this.client.on('reconnecting', () => {
      logger.warn({ component: 'RedisAdapter' }, 'Redis client reconnecting');
      this.stats.reconnections++;
    });

    this.client.on('error', (err: Error) => {
      logger.error({ component: 'RedisAdapter', error: err.message }, 'Redis client error');
      this.stats.errors++;
    });

    this.subscriber.on('message', (channel: string, raw: string) => {
      void this.handleMessage(channel as Channel, raw);
    });

    this.subscriber.on('error', (err: Error) => {
      logger.error({ component: 'RedisAdapter', error: err.message }, 'Redis subscriber error');
      this.stats.errors++;
    });
  }

  private async publish(channel: Channel, message: RedisMessage): Promise<void> {
    if (!this.connected) return;
    try {
      const payload = await this.serialize(message);
      await this.client.publish(channel, payload);
      this.stats.messagesProcessed++;
    } catch (error) {
      this.recordError('publish', { channel }, error);
    }
  }

  private async handleMessage(channel: Channel, raw: string): Promise<void> {
    try {
      const message = await this.deserialize(raw);
      this.messageHandlers.get(channel)?.(message);
      this.stats.messagesProcessed++;
    } catch (error) {
      this.stats.errors++;
      logger.error(
        { component: 'RedisAdapter', channel, error: errorMessage(error) },
        'Error handling Redis message',
      );
    }
  }

  private async serialize(message: RedisMessage): Promise<string> {
    const json = JSON.stringify(message);
    if (this.config.enableCompression && json.length > this.config.compressionThreshold) {
      const buf = await compressAsync(Buffer.from(json));
      return `compressed:${buf.toString('base64')}`;
    }
    return json;
  }

  private async deserialize(data: string): Promise<RedisMessage> {
    if (data.startsWith('compressed:')) {
      const buf         = Buffer.from(data.slice(11), 'base64');
      const decompressed = await decompressAsync(buf);
      return JSON.parse(decompressed.toString()) as RedisMessage;
    }
    return JSON.parse(data) as RedisMessage;
  }

  /**
   * Non-blocking key scan using Redis SCAN.
   * Safe for production; never calls KEYS.
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.client.scan(
        cursor, 'MATCH', pattern, 'COUNT', SCAN_COUNT,
      );
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }

  private recordError(op: string, ctx: Record<string, unknown>, error: unknown): void {
    this.stats.errors++;
    logger.error(
      { component: 'RedisAdapter', op, ...ctx, error: errorMessage(error) },
      `Error in ${op}`,
    );
  }
}

// ─── Key helpers ──────────────────────────────────────────────────────────────

function connectionStateKey(userId: string, connectionId: string): string {
  return `websocket:connection:${userId}:${connectionId}`;
}

function userSubscriptionKey(userId: string): string {
  return `websocket:subscriptions:user:${userId}`;
}

function billSubscriberKey(billId: number): string {
  return `websocket:subscriptions:bill:${billId}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}