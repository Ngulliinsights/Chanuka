/**
 * Socket.IO Adapter for WebSocket Service
 *
 * Provides Socket.IO transport with Redis-backed horizontal scaling while
 * remaining compatible with the unified WebSocketAdapter interface.
 */

import { createAdapter } from '@socket.io/redis-adapter';
import { logger }        from '@server/infrastructure/observability';

import { Server }                      from 'http';
import Redis                           from 'ioredis';
import * as jwt                        from 'jsonwebtoken';
import { Server as SocketIOServer, Socket, type ServerOptions } from 'socket.io';

import type { AdapterConfig }  from '../types';
import { WebSocketAdapter }    from './websocket-adapter';

// ─── Constants ────────────────────────────────────────────────────────────────

const REDIS_DEFAULTS = {
  maxRetriesPerRequest: 3,
  enableOfflineQueue:   false,
  lazyConnect:          true,
  keepAlive:            30_000,
  family:               4 as const,
  db:                   0,
  retryStrategy:        (times: number) => Math.min(times * 50, 2_000),
};

const SOCKETIO_DEFAULTS = {
  pingTimeout:        60_000,
  pingInterval:       25_000,
  maxHttpBufferSize:  100 * 1_024,   // 100 KB
  allowEIO3:          true,
  transports:         ['websocket', 'polling'],
  perMessageDeflate:  { threshold: 1_024 },
} satisfies Partial<ServerOptions>;

// ─── Socket types ─────────────────────────────────────────────────────────────

interface AuthenticatedSocket extends Socket {
  userId?:        string;
  connectionId?:  string;
  subscriptions?: Set<number>;
}

// ─── Message protocol ─────────────────────────────────────────────────────────

type SubscriptionMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'batch_subscribe'
  | 'batch_unsubscribe';

type ControlMessageType = 'ping' | 'pong' | 'auth';

type SocketMessageType = SubscriptionMessageType | ControlMessageType;

interface SocketMessage {
  type:       SocketMessageType;
  messageId?: string;
  timestamp?: number;
  data?: {
    bill_id?:          number;
    bill_ids?:         number[];
    token?:            string;
    subscriptionTypes?: Array<'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled'>;
  };
}

// ─── JWT payload ─────────────────────────────────────────────────────────────

interface JwtPayload {
  user_id: string;
}

function isJwtPayload(v: unknown): v is JwtPayload {
  return typeof v === 'object' && v !== null && typeof (v as JwtPayload).user_id === 'string';
}

// ─── Adapter stats ────────────────────────────────────────────────────────────

interface AdapterStats {
  totalConnections:  number;
  activeConnections: number;
  totalMessages:     number;
  totalBroadcasts:   number;
  droppedMessages:   number;
  peakConnections:   number;
  lastActivity:      number;
  /** Running sum of per-message round-trip latencies in ms. */
  totalLatencyMs:    number;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Socket.IO adapter with Redis-backed pub/sub for horizontal scaling.
 *
 * Connection identity
 *   Each socket receives a stable `connectionId` formatted as
 *   `<userId>-<monotonic-counter>` which is safe across server restarts
 *   within a single process lifetime.
 *
 * Subscription model
 *   - `billSubscriptions`       bill_id → Set<userId>
 *   - `userSubscriptionIndex`   userId  → Set<bill_id>
 *   Both are kept in sync; all mutations go through the private
 *   `addSubscription` / `removeSubscription` helpers.
 */
export class SocketIOAdapter extends WebSocketAdapter {
  private io:             SocketIOServer | null = null;
  private redisClient:    Redis | null          = null;
  private redisSubClient: Redis | null          = null;

  private readonly clients:               Map<string, Set<AuthenticatedSocket>> = new Map();
  private readonly billSubscriptions:     Map<number, Set<string>>              = new Map();
  private readonly userSubscriptionIndex: Map<string, Set<number>>              = new Map();

  private readonly config: AdapterConfig;

  private readonly stats: AdapterStats = {
    totalConnections:  0,
    activeConnections: 0,
    totalMessages:     0,
    totalBroadcasts:   0,
    droppedMessages:   0,
    peakConnections:   0,
    lastActivity:      Date.now(),
    totalLatencyMs:    0,
  };

  /** Monotonically increasing per-process connection counter. */
  private connectionCounter = 0;

  // ─── Constructor ────────────────────────────────────────────────────────────

  constructor(config: AdapterConfig = {}) {
    super();
    this.config = config;
    this.initializeRedis();
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  override async initialize(server: Server): Promise<void> {
    if (this.isInitialized) {
      logger.warn({ component: 'SocketIOAdapter' }, 'Already initialized — skipping duplicate call');
      return;
    }

    try {
      this.io = new SocketIOServer(server, {
        path: '/socket.io/',
        cors: {
          origin:      process.env.FRONTEND_URL ?? 'http://localhost:3000',
          methods:     ['GET', 'POST'],
          credentials: true,
        },
        ...SOCKETIO_DEFAULTS,
      });

      await this.attachRedisAdapter();

      this.io.use(this.authMiddleware.bind(this));
      this.io.on('connection', this.handleConnection.bind(this));

      this.isInitialized = true;
      logger.info({ component: 'SocketIOAdapter' }, 'Initialized successfully');
    } catch (error) {
      logger.error({ component: 'SocketIOAdapter', error: errorMessage(error) }, 'Failed to initialize');
      throw error;
    }
  }

  override async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn({ component: 'SocketIOAdapter' }, 'Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info({ component: 'SocketIOAdapter', stats: this.getStats() }, 'Shutting down');

    this.io?.close();
    this.io = null;

    await Promise.allSettled([
      this.redisClient?.quit(),
      this.redisSubClient?.quit(),
    ]);
    this.redisClient    = null;
    this.redisSubClient = null;

    this.clients.clear();
    this.billSubscriptions.clear();
    this.userSubscriptionIndex.clear();

    logger.info({ component: 'SocketIOAdapter' }, 'Shutdown complete');
  }

  // ─── Messaging ───────────────────────────────────────────────────────────────

  override broadcastBillUpdate(
    billId: number,
    update: {
      type:       'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
      data:       unknown;
      timestamp?: Date;
    },
  ): void {
    if (!this.io) return;

    this.stats.totalBroadcasts++;
    this.stats.lastActivity = Date.now();

    this.io.to(billRoom(billId)).emit('bill_update', {
      type:      'bill_update',
      bill_id:   billId,
      update:    { ...update, timestamp: update.timestamp ?? new Date() },
      timestamp: new Date().toISOString(),
    });

    logger.info(
      {
        component:       'SocketIOAdapter',
        billId,
        updateType:      update.type,
        subscriberCount: this.billSubscriptions.get(billId)?.size ?? 0,
      },
      'Bill update broadcast',
    );
  }

  override broadcastToAll(message: { type: string; data: unknown; timestamp?: Date }): void {
    if (!this.io) return;

    this.stats.totalBroadcasts++;
    this.stats.lastActivity = Date.now();

    this.io.emit(message.type, {
      ...message,
      timestamp: message.timestamp ?? new Date(),
    });

    logger.info(
      { component: 'SocketIOAdapter', type: message.type, activeConnections: this.stats.activeConnections },
      'Broadcast to all clients',
    );
  }

  override sendUserNotification(
    userId:       string,
    notification: { type: string; title: string; message: string; data?: unknown },
  ): void {
    const sockets = this.clients.get(userId);
    if (!sockets?.size) return;

    const payload = {
      type:         'notification',
      notification,
      timestamp:    new Date().toISOString(),
    };

    let delivered = 0;
    for (const socket of sockets) {
      if (socket.connected) {
        socket.emit('notification', payload);
        delivered++;
      }
    }

    logger.debug(
      { component: 'SocketIOAdapter', userId, delivered, total: sockets.size },
      'User notification sent',
    );
  }

  // ─── Observability ───────────────────────────────────────────────────────────

  override isReady(): boolean {
    return this.isInitialized && !this.isShuttingDown && this.io !== null;
  }

  override getUptime(): number {
    return Date.now() - this.startTime;
  }

  override getHealthStatus() {
    const redisHealthy =
      this.redisClient?.status    === 'ready' &&
      this.redisSubClient?.status === 'ready';

    const isHealthy = this.isReady() && redisHealthy;
    return {
      isHealthy,
      status:    isHealthy ? 'healthy' as const : 'unhealthy' as const,
      issues: [
        ...(!this.isReady()    ? ['Adapter not ready']         : []),
        ...(!redisHealthy      ? ['Redis connection not ready'] : []),
      ],
      lastCheck: new Date(),
    };
  }

  override getStats() {
    const { totalMessages, totalLatencyMs, ...rest } = this.stats;
    return {
      activeConnections: rest.activeConnections,
      totalConnections:  rest.totalConnections,
      totalMessages,
      totalBroadcasts:   rest.totalBroadcasts,
      droppedMessages:   rest.droppedMessages,
      errorRate:         totalMessages > 0 ? rest.droppedMessages / totalMessages : 0,
      averageLatency:    totalMessages > 0 ? totalLatencyMs / totalMessages       : 0,
      memoryUsage:       process.memoryUsage().heapUsed,
      uptime:            this.getUptime(),
    };
  }

  // ─── Redis setup ──────────────────────────────────────────────────────────────

  private initializeRedis(): void {
    const redisUrl = this.config.redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379';

    try {
      this.redisClient    = new Redis(redisUrl, REDIS_DEFAULTS);
      this.redisSubClient = new Redis(redisUrl, REDIS_DEFAULTS);

      this.redisClient.on('connect', ()  => logger.info({ component: 'SocketIOAdapter' }, 'Redis client connected'));
      this.redisClient.on('error',   (e: Error) => logger.error({ component: 'SocketIOAdapter', error: e.message }, 'Redis client error'));
      this.redisSubClient.on('connect', () => logger.info({ component: 'SocketIOAdapter' }, 'Redis sub-client connected'));
      this.redisSubClient.on('error',   (e: Error) => logger.error({ component: 'SocketIOAdapter', error: e.message }, 'Redis sub-client error'));

      logger.info({ component: 'SocketIOAdapter' }, 'Redis clients initialized');
    } catch (error) {
      logger.error({ component: 'SocketIOAdapter', error: errorMessage(error) }, 'Failed to initialize Redis — running without Redis adapter');
      this.redisClient    = null;
      this.redisSubClient = null;
    }
  }

  private async attachRedisAdapter(): Promise<void> {
    if (!this.redisClient || !this.redisSubClient || !this.io) return;

    try {
      if (this.redisClient.status    !== 'ready') await this.redisClient.connect();
      if (this.redisSubClient.status !== 'ready') await this.redisSubClient.connect();

      this.io.adapter(createAdapter(this.redisClient, this.redisSubClient));
      logger.info({ component: 'SocketIOAdapter' }, 'Redis Socket.IO adapter attached');
    } catch (error) {
      logger.error(
        { component: 'SocketIOAdapter', error: errorMessage(error) },
        'Failed to attach Redis adapter — continuing without it',
      );
    }
  }

  // ─── Connection handling ──────────────────────────────────────────────────────

  private async authMiddleware(
    socket: AuthenticatedSocket,
    next:   (err?: Error) => void,
  ): Promise<void> {
    try {
      const token =
        socket.handshake.auth?.token ??
        socket.handshake.headers.authorization?.replace('Bearer ', '') ??
        socket.handshake.query?.token;

      if (!token) return next(new Error('Authentication token required'));

      const secret  = process.env.JWT_SECRET;
      if (!secret) return next(new Error('Server misconfiguration: JWT_SECRET not set'));

      const payload = jwt.verify(token as string, secret);
      if (!isJwtPayload(payload)) return next(new Error('Invalid token payload'));

      socket.userId = payload.user_id;
      next();
    } catch (error) {
      logger.warn({ component: 'SocketIOAdapter', error: errorMessage(error) }, 'Authentication failed');
      next(new Error('Authentication failed'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const { userId } = socket;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    const connectionId = `${userId}-${this.connectionCounter++}`;
    socket.connectionId  = connectionId;
    socket.subscriptions = new Set();

    // Stats
    this.stats.totalConnections++;
    this.stats.activeConnections++;
    this.stats.peakConnections = Math.max(this.stats.peakConnections, this.stats.activeConnections);
    this.stats.lastActivity    = Date.now();

    // Index
    if (!this.clients.has(userId)) this.clients.set(userId, new Set());
    this.clients.get(userId)!.add(socket);

    logger.info(
      { component: 'SocketIOAdapter', connectionId, activeConnections: this.stats.activeConnections },
      'New connection',
    );

    socket.emit('connected', {
      type:    'connected',
      message: 'WebSocket connection established',
      data:    { userId, connectionId, timestamp: new Date().toISOString() },
    });

    socket.on('message',    (data: SocketMessage) => void this.onMessage(socket, data));
    socket.on('disconnect', (reason: string)       => this.onDisconnect(socket, reason));
    socket.on('error',      (err: Error)            => logger.error({ component: 'SocketIOAdapter', connectionId, error: err.message }, 'Socket error'));
    socket.on('ping',       ()                      => socket.emit('pong'));
  }

  private async onMessage(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    if (this.isShuttingDown) return;

    const start = Date.now();
    this.stats.totalMessages++;
    this.stats.lastActivity = Date.now();

    try {
      await this.routeMessage(socket, message);
    } catch (error) {
      this.stats.droppedMessages++;
      logger.error(
        { component: 'SocketIOAdapter', connectionId: socket.connectionId, error: errorMessage(error) },
        'Error handling message',
      );
      socket.emit('error', {
        type:      'error',
        message:   error instanceof Error ? error.message : 'Invalid message format',
        messageId: message?.messageId,
      });
    } finally {
      this.stats.totalLatencyMs += Date.now() - start;
    }
  }

  private onDisconnect(socket: AuthenticatedSocket, reason: string): void {
    this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);

    logger.info(
      { component: 'SocketIOAdapter', connectionId: socket.connectionId, reason, activeConnections: this.stats.activeConnections },
      'Client disconnected',
    );

    this.cleanupSocket(socket);
  }

  private cleanupSocket(socket: AuthenticatedSocket): void {
    const { userId } = socket;
    if (!userId) return;

    // Remove from client index.
    const userSockets = this.clients.get(userId);
    if (userSockets) {
      userSockets.delete(socket);
      if (userSockets.size === 0) this.clients.delete(userId);
    }

    // Remove from subscription indexes.
    if (socket.subscriptions) {
      for (const billId of socket.subscriptions) {
        this.removeSubscription(userId, billId);
      }
    }
  }

  // ─── Message routing ──────────────────────────────────────────────────────────

  private async routeMessage(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    switch (message.type) {
      case 'subscribe':         await this.onSubscribe(socket, message);        break;
      case 'unsubscribe':       await this.onUnsubscribe(socket, message);      break;
      case 'batch_subscribe':   await this.onBatchSubscribe(socket, message);   break;
      case 'batch_unsubscribe': await this.onBatchUnsubscribe(socket, message); break;
      case 'ping':
        socket.emit('pong', { timestamp: Date.now() });
        break;
      default:
        socket.emit('error', {
          type:      'error',
          message:   `Unknown message type: ${(message as SocketMessage).type}`,
          messageId: message.messageId,
        });
    }
  }

  // ─── Subscription handlers ────────────────────────────────────────────────────

  private async onSubscribe(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    const billId = message.data?.bill_id;
    const userId = socket.userId;

    if (!billId || !userId) {
      return this.emitError(socket, 'Missing bill_id', message.messageId);
    }

    if (socket.subscriptions!.has(billId)) {
      // Already subscribed — idempotent, confirm without duplicate indexing.
      return this.emitSubscriptionConfirmed(socket, billId, message.messageId);
    }

    this.addSubscription(socket, userId, billId);

    this.emitSubscriptionConfirmed(socket, billId, message.messageId);
  }

  private async onUnsubscribe(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    const billId = message.data?.bill_id;
    const userId = socket.userId;

    if (!billId || !userId) {
      return this.emitError(socket, 'Missing bill_id', message.messageId);
    }

    this.removeSubscription(userId, billId);
    socket.subscriptions!.delete(billId);
    socket.leave(billRoom(billId));

    socket.emit('unsubscription_confirmed', {
      type:      'unsubscription_confirmed',
      bill_id:   billId,
      messageId: message.messageId,
      timestamp: new Date().toISOString(),
    });
  }

  private async onBatchSubscribe(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    const billIds = message.data?.bill_ids;
    const userId  = socket.userId;

    if (!Array.isArray(billIds) || billIds.length === 0 || !userId) {
      return this.emitError(socket, 'Invalid or empty bill_ids', message.messageId);
    }

    const subscribed: number[] = [];
    for (const billId of billIds) {
      if (!socket.subscriptions!.has(billId)) {
        this.addSubscription(socket, userId, billId);
      }
      subscribed.push(billId);
    }

    socket.emit('batch_subscription_confirmed', {
      type:      'batch_subscription_confirmed',
      bill_ids:  subscribed,
      messageId: message.messageId,
      timestamp: new Date().toISOString(),
    });
  }

  private async onBatchUnsubscribe(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    const billIds = message.data?.bill_ids;
    const userId  = socket.userId;

    if (!Array.isArray(billIds) || billIds.length === 0 || !userId) {
      return this.emitError(socket, 'Invalid or empty bill_ids', message.messageId);
    }

    const unsubscribed: number[] = [];
    for (const billId of billIds) {
      this.removeSubscription(userId, billId);
      socket.subscriptions!.delete(billId);
      socket.leave(billRoom(billId));
      unsubscribed.push(billId);
    }

    socket.emit('batch_unsubscription_confirmed', {
      type:      'batch_unsubscription_confirmed',
      bill_ids:  unsubscribed,
      messageId: message.messageId,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Subscription index helpers ───────────────────────────────────────────────

  /** Atomically adds a bill subscription to all indexes and joins the Socket.IO room. */
  private addSubscription(socket: AuthenticatedSocket, userId: string, billId: number): void {
    if (!this.billSubscriptions.has(billId)) this.billSubscriptions.set(billId, new Set());
    this.billSubscriptions.get(billId)!.add(userId);

    if (!this.userSubscriptionIndex.has(userId)) this.userSubscriptionIndex.set(userId, new Set());
    this.userSubscriptionIndex.get(userId)!.add(billId);

    socket.subscriptions!.add(billId);
    socket.join(billRoom(billId));
  }

  /**
   * Removes a user from the bill subscriber set and from the user subscription
   * index.  Does NOT touch `socket.subscriptions` — callers manage that
   * themselves so the same helper can be used during cleanup and explicit
   * unsubscribes.
   */
  private removeSubscription(userId: string, billId: number): void {
    const subscribers = this.billSubscriptions.get(billId);
    if (subscribers) {
      subscribers.delete(userId);
      if (subscribers.size === 0) this.billSubscriptions.delete(billId);
    }

    const userSubs = this.userSubscriptionIndex.get(userId);
    if (userSubs) {
      userSubs.delete(billId);
      if (userSubs.size === 0) this.userSubscriptionIndex.delete(userId);
    }
  }

  // ─── Emit helpers ─────────────────────────────────────────────────────────────

  private emitError(socket: AuthenticatedSocket, message: string, messageId?: string): void {
    socket.emit('error', { type: 'error', message, messageId });
  }

  private emitSubscriptionConfirmed(
    socket:    AuthenticatedSocket,
    billId:    number,
    messageId?: string,
  ): void {
    socket.emit('subscription_confirmed', {
      type:      'subscription_confirmed',
      bill_id:   billId,
      messageId,
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function billRoom(billId: number): string {
  return `bill:${billId}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}