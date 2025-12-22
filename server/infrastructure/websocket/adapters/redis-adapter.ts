/**
 * Redis Adapter for WebSocket Service
 * 
 * Provides Redis-based scaling and persistence for WebSocket connections
 * across multiple server instances.
 */

import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';

import Redis, { RedisOptions } from 'ioredis';

// Temporary fallback logger until shared/core import is resolved
const logger = {
  info: (message: string, context?: unknown) => {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, context || '');
  },
  warn: (message: string, context?: unknown) => {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}`, context || '');
  },
  error: (message: string, context?: unknown, error?: Error) => {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, context || '', error || '');
  },
  debug: (message: string, context?: unknown) => {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] ${message}`, context || '');
  }
};
import type { ServiceStats, AdapterConfig } from '../types';

// Promisified compression functions
const compressAsync = promisify(gzip);
const decompressAsync = promisify(gunzip);

export interface RedisAdapterConfig extends AdapterConfig {
  redisUrl?: string;
  maxRetries?: number;
  retryDelayOnFailover?: number;
  enableOfflineQueue?: boolean;
  lazyConnect?: boolean;
  keepAlive?: number;
  family?: 4 | 6;
  db?: number;
  enableCompression?: boolean;
  compressionThreshold?: number;
}

export interface RedisMessage {
  type: 'bill_update' | 'user_notification' | 'broadcast';
  data: unknown;
  timestamp: number;
  serverId: string;
}

export class RedisAdapter {
  private client!: Redis;
  private subClient!: Redis;
  private connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private serverId: string;
  private messageHandlers: Map<string, (message: RedisMessage) => void> = new Map();

  private stats = {
    messagesPublished: 0,
    messagesReceived: 0,
    connectionErrors: 0,
    lastActivity: Date.now(),
    startTime: Date.now(),
  };

  constructor(private config: RedisAdapterConfig = {}) {
    this.serverId = `server-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    this.initializeRedis();
  }

  /**
   * Initialize Redis connections
   */
  private initializeRedis(): void {
    const redisUrl = this.config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    const redisOptions: RedisOptions = {
      maxRetriesPerRequest: this.config.maxRetries ?? 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableOfflineQueue: this.config.enableOfflineQueue ?? false,
      lazyConnect: this.config.lazyConnect ?? true,
      keepAlive: this.config.keepAlive ?? 30000,
      family: this.config.family ?? 4,
      db: this.config.db ?? 0,
      enableReadyCheck: true,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
    };

    this.client = new Redis(redisUrl, redisOptions);
    this.subClient = new Redis(redisUrl, redisOptions);

    this.setupEventHandlers();
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    // Main client events
    this.client.on('connect', () => {
      this.connected = true;
      logger.info('Redis client connected', { component: 'RedisAdapter' });
    });

    this.client.on('ready', () => {
      this.connected = true;
    });

    this.client.on('error', (error) => {
      this.connected = false;
      this.stats.connectionErrors++;
      logger.error('Redis client error', { component: 'RedisAdapter' }, error);
    });

    this.client.on('close', () => {
      this.connected = false;
    });

    // Subscription client events
    this.subClient.on('connect', () => {
      logger.info('Redis subscription client connected', { component: 'RedisAdapter' });
    });

    this.subClient.on('error', (error) => {
      this.stats.connectionErrors++;
      logger.error('Redis subscription client error', { component: 'RedisAdapter' }, error);
    });

    // Handle incoming messages
    this.subClient.on('message', (channel: string, message: string) => {
      this.handleIncomingMessage(channel, message);
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.connected) {
      return Promise.resolve();
    }

    this.connectionPromise = Promise.all([
      this.client.connect(),
      this.subClient.connect()
    ])
      .then(() => {
        this.connected = true;
        this.connectionPromise = null;

        // Subscribe to channels
        this.subClient.subscribe(
          'websocket:bill_updates',
          'websocket:user_notifications',
          'websocket:broadcasts'
        );

        logger.info('Redis adapter connected and subscribed', {
          component: 'RedisAdapter',
          serverId: this.serverId
        });
      })
      .catch((error) => {
        this.connectionPromise = null;
        throw error;
      });

    return this.connectionPromise;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connected) {
        await Promise.all([
          this.client.quit(),
          this.subClient.quit()
        ]);
      }
      this.connected = false;

      logger.info('Redis adapter disconnected', {
        component: 'RedisAdapter',
        serverId: this.serverId
      });
    } catch (error) {
      logger.error('Error disconnecting Redis adapter', {
        component: 'RedisAdapter'
      }, error instanceof Error ? error : new Error(String(error)));

      // Force disconnect on error
      this.client.disconnect();
      this.subClient.disconnect();
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected &&
      this.client.status === 'ready' &&
      this.subClient.status === 'ready';
  }

  /**
   * Publish bill update to all servers
   */
  async publishBillUpdate(billId: number, update: unknown): Promise<void> {
    if (!this.connected) {
      logger.warn('Cannot publish bill update - Redis not connected', {
        component: 'RedisAdapter',
        billId
      });
      return;
    }

    try {
      const message: RedisMessage = {
        type: 'bill_update',
        data: { billId, update },
        timestamp: Date.now(),
        serverId: this.serverId
      };

      const serialized = await this.serializeMessage(message);
      await this.client.publish('websocket:bill_updates', serialized);

      this.stats.messagesPublished++;
      this.stats.lastActivity = Date.now();

      logger.debug('Published bill update to Redis', {
        component: 'RedisAdapter',
        billId,
        serverId: this.serverId
      });
    } catch (error) {
      logger.error('Error publishing bill update', {
        component: 'RedisAdapter',
        billId
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Publish user notification to all servers
   */
  async publishUserNotification(userId: string, notification: unknown): Promise<void> {
    if (!this.connected) {
      logger.warn('Cannot publish user notification - Redis not connected', {
        component: 'RedisAdapter',
        userId
      });
      return;
    }

    try {
      const message: RedisMessage = {
        type: 'user_notification',
        data: { userId, notification },
        timestamp: Date.now(),
        serverId: this.serverId
      };

      const serialized = await this.serializeMessage(message);
      await this.client.publish('websocket:user_notifications', serialized);

      this.stats.messagesPublished++;
      this.stats.lastActivity = Date.now();

      logger.debug('Published user notification to Redis', {
        component: 'RedisAdapter',
        userId,
        serverId: this.serverId
      });
    } catch (error) {
      logger.error('Error publishing user notification', {
        component: 'RedisAdapter',
        userId
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Publish broadcast message to all servers
   */
  async publishBroadcast(message: unknown): Promise<void> {
    if (!this.connected) {
      logger.warn('Cannot publish broadcast - Redis not connected', {
        component: 'RedisAdapter'
      });
      return;
    }

    try {
      const redisMessage: RedisMessage = {
        type: 'broadcast',
        data: { message },
        timestamp: Date.now(),
        serverId: this.serverId
      };

      const serialized = await this.serializeMessage(redisMessage);
      await this.client.publish('websocket:broadcasts', serialized);

      this.stats.messagesPublished++;
      this.stats.lastActivity = Date.now();

      logger.debug('Published broadcast to Redis', {
        component: 'RedisAdapter',
        serverId: this.serverId
      });
    } catch (error) {
      logger.error('Error publishing broadcast', {
        component: 'RedisAdapter'
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Register message handler
   */
  onMessage(type: string, handler: (message: RedisMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Handle incoming Redis message
   */
  private async handleIncomingMessage(channel: string, message: string): Promise<void> {
    try {
      const redisMessage = await this.deserializeMessage(message);

      // Ignore messages from this server instance
      if (redisMessage.serverId === this.serverId) {
        return;
      }

      this.stats.messagesReceived++;
      this.stats.lastActivity = Date.now();

      // Route message to appropriate handler
      const handler = this.messageHandlers.get(redisMessage.type);
      if (handler) {
        handler(redisMessage);
      } else {
        logger.warn('No handler for Redis message type', {
          component: 'RedisAdapter',
          type: redisMessage.type,
          channel
        });
      }
    } catch (error) {
      logger.error('Error handling Redis message', {
        component: 'RedisAdapter',
        channel
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Serialize message with optional compression
   */
  private async serializeMessage(message: RedisMessage): Promise<string> {
    const serialized = JSON.stringify(message);

    if (this.config.enableCompression &&
      serialized.length > (this.config.compressionThreshold || 1024)) {
      const compressed = await compressAsync(Buffer.from(serialized, 'utf8'));
      return `gzip:${compressed.toString('base64')}`;
    }

    return serialized;
  }

  /**
   * Deserialize message with decompression support
   */
  private async deserializeMessage(message: string): Promise<RedisMessage> {
    if (message.startsWith('gzip:')) {
      const compressed = Buffer.from(message.slice(5), 'base64');
      const decompressed = await decompressAsync(compressed);
      return JSON.parse(decompressed.toString('utf8'));
    }

    return JSON.parse(message);
  }

  /**
   * Store connection state in Redis
   */
  async storeConnectionState(userId: string, connectionId: string, data: unknown): Promise<void> {
    if (!this.connected) return;

    try {
      const key = `websocket:connection:${userId}:${connectionId}`;
      const serialized = JSON.stringify({
        ...(typeof data === 'object' && data !== null ? data : {}),
        serverId: this.serverId,
        timestamp: Date.now()
      });

      await this.client.setex(key, 3600, serialized); // 1 hour TTL
    } catch (error) {
      logger.error('Error storing connection state', {
        component: 'RedisAdapter',
        userId,
        connectionId
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Remove connection state from Redis
   */
  async removeConnectionState(userId: string, connectionId: string): Promise<void> {
    if (!this.connected) return;

    try {
      const key = `websocket:connection:${userId}:${connectionId}`;
      await this.client.del(key);
    } catch (error) {
      logger.error('Error removing connection state', {
        component: 'RedisAdapter',
        userId,
        connectionId
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get all connection states for a user
   */
  async getConnectionStates(userId: string): Promise<unknown[]> {
    if (!this.connected) return [];

    try {
      const pattern = `websocket:connection:${userId}:*`;
      const keys = await this.client.keys(pattern);

      if (keys.length === 0) return [];

      const values = await this.client.mget(...keys);
      return values
        .filter(value => value !== null)
        .map(value => {
          try {
            return JSON.parse(value!);
          } catch {
            return null;
          }
        })
        .filter(value => value !== null);
    } catch (error) {
      logger.error('Error getting connection states', {
        component: 'RedisAdapter',
        userId
      }, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Store subscription data in Redis
   */
  async storeSubscription(userId: string, billId: number): Promise<void> {
    if (!this.connected) return;

    try {
      const userKey = `websocket:subscriptions:user:${userId}`;
      const billKey = `websocket:subscriptions:bill:${billId}`;

      await Promise.all([
        this.client.sadd(userKey, billId.toString()),
        this.client.sadd(billKey, userId),
        this.client.expire(userKey, 86400), // 24 hours
        this.client.expire(billKey, 86400)  // 24 hours
      ]);
    } catch (error) {
      logger.error('Error storing subscription', {
        component: 'RedisAdapter',
        userId,
        billId
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Remove subscription from Redis
   */
  async removeSubscription(userId: string, billId: number): Promise<void> {
    if (!this.connected) return;

    try {
      const userKey = `websocket:subscriptions:user:${userId}`;
      const billKey = `websocket:subscriptions:bill:${billId}`;

      await Promise.all([
        this.client.srem(userKey, billId.toString()),
        this.client.srem(billKey, userId)
      ]);
    } catch (error) {
      logger.error('Error removing subscription', {
        component: 'RedisAdapter',
        userId,
        billId
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get subscribers for a bill
   */
  async getBillSubscribers(billId: number): Promise<string[]> {
    if (!this.connected) return [];

    try {
      const key = `websocket:subscriptions:bill:${billId}`;
      return await this.client.smembers(key);
    } catch (error) {
      logger.error('Error getting bill subscribers', {
        component: 'RedisAdapter',
        billId
      }, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<number[]> {
    if (!this.connected) return [];

    try {
      const key = `websocket:subscriptions:user:${userId}`;
      const billIds = await this.client.smembers(key);
      return billIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    } catch (error) {
      logger.error('Error getting user subscriptions', {
        component: 'RedisAdapter',
        userId
      }, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Get adapter statistics
   */
  getStats(): ServiceStats {
    return {
      totalConnections: 0, // Not applicable for Redis adapter
      activeConnections: 0, // Not applicable for Redis adapter
      totalMessages: this.stats.messagesReceived,
      totalBroadcasts: this.stats.messagesPublished,
      droppedMessages: 0,
      duplicateMessages: 0,
      queueOverflows: 0,
      reconnections: this.stats.connectionErrors,
      startTime: this.stats.startTime,
      lastActivity: this.stats.lastActivity,
      peakConnections: 0,
      uptime: Date.now() - this.stats.startTime,
      memoryUsage: process.memoryUsage().heapUsed,
      uniqueUsers: 0,
      averageLatency: 0,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number; error?: string }> {
    const start = Date.now();

    try {
      if (!this.connected) {
        return {
          status: 'unhealthy',
          latency: Date.now() - start,
          error: 'Not connected to Redis'
        };
      }

      // Test Redis ping
      const pingResult = await this.client.ping();
      if (pingResult !== 'PONG') {
        return {
          status: 'unhealthy',
          latency: Date.now() - start,
          error: 'Redis ping failed'
        };
      }

      return {
        status: 'healthy',
        latency: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Redis adapter', {
      component: 'RedisAdapter',
      serverId: this.serverId
    });

    await this.disconnect();
    this.messageHandlers.clear();

    logger.info('Redis adapter shutdown complete', {
      component: 'RedisAdapter',
      finalStats: this.getStats()
    });
  }
}