/**
 * Socket.IO Adapter for WebSocket Service
 * 
 * Provides Socket.IO transport support while maintaining compatibility
 * with the unified WebSocket service interface.
 */

import { createAdapter } from '@socket.io/redis-adapter';
import { logger } from '@server/infrastructure/observability';

import { Server } from 'http';
import Redis from 'ioredis';
import * as jwt from 'jsonwebtoken';
import { Server as SocketIOServer, Socket } from 'socket.io';

// Temporary fallback logger until shared/core import is resolved
const logger = {
  info: (message: string, context?: unknown) => {
    logger.info(`[INFO] ${message}`, context || '');
  },
  warn: (message: string, context?: unknown) => {
    logger.warn(`[WARN] ${message}`, context || '');
  },
  error: (message: string, context?: unknown, error?: Error) => {
    logger.error(`[ERROR] ${message}`, context || '', error || '');
  },
  debug: (message: string, context?: unknown) => {
    logger.info(`[DEBUG] ${message}`, context || '');
  }
};

import type { AdapterConfig } from '../types';
import { WebSocketAdapter } from './websocket-adapter';

interface AuthenticatedSocket extends Socket {
  user_id?: string;
  subscriptions?: Set<number>;
  connectionId?: string;
}

interface SocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong' | 'auth' |
    'get_preferences' | 'update_preferences' | 'batch_subscribe' | 'batch_unsubscribe';
  data?: {
    bill_id?: number;
    bill_ids?: number[];
    channel?: string;
    token?: string;
    subscriptionTypes?: Array<'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled'>;
    preferences?: {
      updateFrequency?: 'immediate' | 'hourly' | 'daily';
      notificationTypes?: Array<'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled'>;
    };
  };
  messageId?: string;
  timestamp?: number;
}

export class SocketIOAdapter extends WebSocketAdapter {
  private io: SocketIOServer | null = null;
  private redisClient: Redis | null = null;
  private redisSubClient: Redis | null = null;
  private clients: Map<string, Set<AuthenticatedSocket>> = new Map();
  private billSubscriptions: Map<number, Set<string>> = new Map();
  private userSubscriptionIndex: Map<string, Set<number>> = new Map();
  private config: AdapterConfig;
  
  private stats = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    totalBroadcasts: 0,
    droppedMessages: 0,
    duplicateMessages: 0,
    queueOverflows: 0,
    reconnections: 0,
    lastActivity: Date.now(),
    peakConnections: 0,
    errorRate: 0,
  };

  private nextConnectionId = 0;

  constructor(config: AdapterConfig = {}) {
    super();
    this.config = config;
    this.initializeRedis();
  }

  /**
   * Initialize Redis clients for Socket.IO adapter
   */
  private initializeRedis(): void {
    const redisUrl = this.config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
        enableOfflineQueue: false,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        db: 0,
      });

      this.redisSubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
        enableOfflineQueue: false,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        db: 0,
      });

      this.setupRedisEventHandlers();

      logger.info('Redis clients initialized for Socket.IO adapter', {
        component: 'SocketIOAdapter'
      });
    } catch (error) {
      logger.error('Failed to initialize Redis clients', {
        component: 'SocketIOAdapter'
      }, error instanceof Error ? error : new Error(String(error)));
      this.redisClient = null;
      this.redisSubClient = null;
    }
  }

  /**
   * Setup Redis event handlers
   */
  private setupRedisEventHandlers(): void {
    if (!this.redisClient || !this.redisSubClient) return;

    this.redisClient.on('connect', () => {
      logger.info('Redis client connected', { component: 'SocketIOAdapter' });
    });

    this.redisClient.on('error', (error) => {
      logger.error('Redis client error', { component: 'SocketIOAdapter' }, error);
    });

    this.redisSubClient.on('connect', () => {
      logger.info('Redis sub client connected', { component: 'SocketIOAdapter' });
    });

    this.redisSubClient.on('error', (error) => {
      logger.error('Redis sub client error', { component: 'SocketIOAdapter' }, error);
    });
  }

  /**
   * Initialize the Socket.IO server
   */
  override async initialize(server: Server): Promise<void> {
    if (this.isInitialized) {
      logger.info('Socket.IO adapter already initialized', {
        component: 'SocketIOAdapter'
      });
      return;
    }

    try {
      this.io = new SocketIOServer(server, {
        path: '/socket.io/',
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 100 * 1024, // 100KB
        allowEIO3: true,
        perMessageDeflate: {
          threshold: 1024,
        }
      });

      // Setup Redis adapter if available
      if (this.redisClient && this.redisSubClient) {
        try {
          if (this.redisClient.status !== 'ready') {
            await this.redisClient.connect();
          }
          if (this.redisSubClient.status !== 'ready') {
            await this.redisSubClient.connect();
          }

          this.io.adapter(createAdapter(this.redisClient, this.redisSubClient));
          logger.info('Socket.IO Redis adapter configured', {
            component: 'SocketIOAdapter'
          });
        } catch (error) {
          logger.error('Failed to setup Redis adapter', {
            component: 'SocketIOAdapter'
          }, error instanceof Error ? error : new Error(String(error)));
        }
      }

      // Setup middleware and handlers
      this.io.use(this.authenticationMiddleware.bind(this));
      this.io.on('connection', this.handleConnection.bind(this));

      this.isInitialized = true;
      logger.info('Socket.IO adapter initialized', {
        component: 'SocketIOAdapter'
      });
    } catch (error) {
      logger.error('Failed to initialize Socket.IO adapter', {
        component: 'SocketIOAdapter'
      }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Authentication middleware
   */
  private async authenticationMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || 
        socket.handshake.headers.authorization?.replace('Bearer ', '') ||
        socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(
        token as string,
        process.env.JWT_SECRET || 'fallback-secret'
      ) as { user_id: string };

      // For now, skip database validation - in production this would validate against actual DB
      // TODO: Implement proper user validation when database integration is ready
      if (!decoded.user_id) {
        return next(new Error('Invalid token: missing user_id'));
      }

      socket.user_id = decoded.user_id;
      next();
    } catch (error) {
      logger.warn('Socket.IO authentication failed', {
        component: 'SocketIOAdapter',
        error: error instanceof Error ? error.message : String(error)
      });
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Handle new connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const user_id = socket.user_id;
    if (!user_id) {
      socket.disconnect(true);
      return;
    }

    const connectionId = `${user_id}-${this.nextConnectionId++}`;
    socket.connectionId = connectionId;
    socket.subscriptions = new Set();

    // Update stats
    this.stats.totalConnections++;
    this.stats.activeConnections++;
    this.stats.peakConnections = Math.max(
      this.stats.peakConnections,
      this.stats.activeConnections
    );
    this.stats.lastActivity = Date.now();

    // Track connection
    if (!this.clients.has(user_id)) {
      this.clients.set(user_id, new Set());
    }
    this.clients.get(user_id)!.add(socket);

    logger.info(`New Socket.IO connection ${connectionId} for user: ${user_id}`, {
      component: 'SocketIOAdapter',
      activeConnections: this.stats.activeConnections
    });

    // Send connection confirmation
    socket.emit('connected', {
      type: 'connected',
      message: 'WebSocket connection established',
      data: {
        user_id,
        connectionId,
        timestamp: new Date().toISOString(),
      }
    });

    // Setup event handlers
    this.setupSocketEventHandlers(socket);
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketEventHandlers(socket: AuthenticatedSocket): void {
    socket.on('message', (data: SocketMessage) => {
      this.handleIncomingMessage(socket, data);
    });

    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(socket, reason);
    });

    socket.on('error', (error: Error) => {
      logger.error(`Socket.IO error for ${socket.connectionId}`, {
        component: 'SocketIOAdapter'
      }, error);
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });
  }

  /**
   * Handle incoming message
   */
  private async handleIncomingMessage(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    if (this.isShuttingDown) return;

    this.stats.totalMessages++;
    this.stats.lastActivity = Date.now();

    try {
      await this.handleMessage(socket, message);
    } catch (error) {
      logger.error('Error handling Socket.IO message', {
        component: 'SocketIOAdapter',
        connectionId: socket.connectionId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      socket.emit('error', {
        type: 'error',
        message: error instanceof Error ? error.message : 'Invalid message format',
        messageId: message?.messageId
      });
    }
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    this.stats.activeConnections--;
    
    logger.info(`Socket.IO disconnected ${socket.connectionId}`, {
      component: 'SocketIOAdapter',
      reason,
      activeConnections: this.stats.activeConnections
    });
    
    this.cleanupSocket(socket);
  }

  /**
   * Clean up socket resources
   */
  private cleanupSocket(socket: AuthenticatedSocket): void {
    const user_id = socket.user_id;
    if (!user_id) return;

    // Remove from clients map
    const userSockets = this.clients.get(user_id);
    if (userSockets) {
      userSockets.delete(socket);
      if (userSockets.size === 0) {
        this.clients.delete(user_id);
      }
    }

    // Clean up subscriptions
    if (socket.subscriptions) {
      for (const bill_id of Array.from(socket.subscriptions)) {
        const subscribers = this.billSubscriptions.get(bill_id);
        if (subscribers) {
          subscribers.delete(user_id);
          if (subscribers.size === 0) {
            this.billSubscriptions.delete(bill_id);
          }
        }
      }

      const userSubs = this.userSubscriptionIndex.get(user_id);
      if (userSubs && socket.subscriptions.size > 0) {
        for (const bill_id of Array.from(socket.subscriptions)) {
          userSubs.delete(bill_id);
        }
        if (userSubs.size === 0) {
          this.userSubscriptionIndex.delete(user_id);
        }
      }
    }
  }

  /**
   * Handle message routing
   */
  private async handleMessage(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    switch (message.type) {
      case 'subscribe':
        await this.handleSubscribe(socket, message);
        break;
      case 'unsubscribe':
        await this.handleUnsubscribe(socket, message);
        break;
      case 'batch_subscribe':
        await this.handleBatchSubscribe(socket, message);
        break;
      case 'batch_unsubscribe':
        await this.handleBatchUnsubscribe(socket, message);
        break;
      case 'ping':
        socket.emit('pong', { timestamp: Date.now() });
        break;
      default:
        socket.emit('error', {
          type: 'error',
          message: `Unknown message type: ${message.type}`,
          messageId: message.messageId
        });
    }
  }

  /**
   * Handle bill subscription
   */
  private async handleSubscribe(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    const { bill_id } = message.data || {};
    const user_id = socket.user_id;

    if (!bill_id || !user_id) {
      socket.emit('error', {
        type: 'error',
        message: 'Invalid subscription data',
        messageId: message.messageId
      });
      return;
    }

    // Add to subscriptions
    if (!this.billSubscriptions.has(bill_id)) {
      this.billSubscriptions.set(bill_id, new Set());
    }
    this.billSubscriptions.get(bill_id)!.add(user_id);

    if (!this.userSubscriptionIndex.has(user_id)) {
      this.userSubscriptionIndex.set(user_id, new Set());
    }
    this.userSubscriptionIndex.get(user_id)!.add(bill_id);

    socket.subscriptions!.add(bill_id);
    socket.join(`bill:${bill_id}`);

    socket.emit('subscription_confirmed', {
      type: 'subscription_confirmed',
      bill_id,
      messageId: message.messageId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle bill unsubscription
   */
  private async handleUnsubscribe(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    const { bill_id } = message.data || {};
    const user_id = socket.user_id;

    if (!bill_id || !user_id) {
      socket.emit('error', {
        type: 'error',
        message: 'Invalid unsubscription data',
        messageId: message.messageId
      });
      return;
    }

    // Remove from subscriptions
    const subscribers = this.billSubscriptions.get(bill_id);
    if (subscribers) {
      subscribers.delete(user_id);
      if (subscribers.size === 0) {
        this.billSubscriptions.delete(bill_id);
      }
    }

    const userSubs = this.userSubscriptionIndex.get(user_id);
    if (userSubs) {
      userSubs.delete(bill_id);
      if (userSubs.size === 0) {
        this.userSubscriptionIndex.delete(user_id);
      }
    }

    socket.subscriptions!.delete(bill_id);
    socket.leave(`bill:${bill_id}`);

    socket.emit('unsubscription_confirmed', {
      type: 'unsubscription_confirmed',
      bill_id,
      messageId: message.messageId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle batch subscription
   */
  private async handleBatchSubscribe(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    const { bill_ids } = message.data || {};
    const user_id = socket.user_id;

    if (!bill_ids || !Array.isArray(bill_ids) || !user_id) {
      socket.emit('error', {
        type: 'error',
        message: 'Invalid batch subscription data',
        messageId: message.messageId
      });
      return;
    }

    const subscribed: number[] = [];

    for (const bill_id of bill_ids) {
      if (!this.billSubscriptions.has(bill_id)) {
        this.billSubscriptions.set(bill_id, new Set());
      }
      this.billSubscriptions.get(bill_id)!.add(user_id);

      if (!this.userSubscriptionIndex.has(user_id)) {
        this.userSubscriptionIndex.set(user_id, new Set());
      }
      this.userSubscriptionIndex.get(user_id)!.add(bill_id);

      socket.subscriptions!.add(bill_id);
      socket.join(`bill:${bill_id}`);
      subscribed.push(bill_id);
    }

    socket.emit('batch_subscription_confirmed', {
      type: 'batch_subscription_confirmed',
      bill_ids: subscribed,
      messageId: message.messageId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle batch unsubscription
   */
  private async handleBatchUnsubscribe(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    const { bill_ids } = message.data || {};
    const user_id = socket.user_id;

    if (!bill_ids || !Array.isArray(bill_ids) || !user_id) {
      socket.emit('error', {
        type: 'error',
        message: 'Invalid batch unsubscription data',
        messageId: message.messageId
      });
      return;
    }

    const unsubscribed: number[] = [];

    for (const bill_id of bill_ids) {
      const subscribers = this.billSubscriptions.get(bill_id);
      if (subscribers) {
        subscribers.delete(user_id);
        if (subscribers.size === 0) {
          this.billSubscriptions.delete(bill_id);
        }
      }

      const userSubs = this.userSubscriptionIndex.get(user_id);
      if (userSubs) {
        userSubs.delete(bill_id);
      }

      socket.subscriptions!.delete(bill_id);
      socket.leave(`bill:${bill_id}`);
      unsubscribed.push(bill_id);
    }

    const userSubs = this.userSubscriptionIndex.get(user_id);
    if (userSubs && userSubs.size === 0) {
      this.userSubscriptionIndex.delete(user_id);
    }

    socket.emit('batch_unsubscription_confirmed', {
      type: 'batch_unsubscription_confirmed',
      bill_ids: unsubscribed,
      messageId: message.messageId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast bill update to all subscribers
   */
  override broadcastBillUpdate(billId: number, update: {
    type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
    data: unknown;
    timestamp?: Date;
  }): void {
    if (!this.io) return;

    this.stats.totalBroadcasts++;
    this.stats.lastActivity = Date.now();

    const message = {
      type: 'bill_update',
      bill_id: billId,
      update: {
        ...update,
        timestamp: update.timestamp || new Date()
      },
      timestamp: new Date().toISOString()
    };

    this.io.to(`bill:${billId}`).emit('bill_update', message);

    const subscriberCount = this.billSubscriptions.get(billId)?.size || 0;
    logger.info(`Broadcast bill ${billId} update to ${subscriberCount} subscribers`, {
      component: 'SocketIOAdapter',
      updateType: update.type
    });
  }

  /**
   * Broadcast to all connected clients (required by WebSocketAdapter)
   */
  override broadcastToAll(message: { type: string; data: unknown; timestamp?: Date }): void {
    if (!this.io) return;

    this.stats.totalBroadcasts++;
    this.stats.lastActivity = Date.now();

    this.io.emit(message.type, {
      ...message,
      timestamp: message.timestamp || new Date()
    });

    logger.info(`Broadcast to all clients: ${message.type}`, {
      component: 'SocketIOAdapter',
      activeConnections: this.stats.activeConnections
    });
  }

  /**
   * Send notification to specific user
   */
  override sendUserNotification(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: unknown;
  }): void {
    if (!this.io) return;

    const userSockets = this.clients.get(userId);
    if (!userSockets || userSockets.size === 0) {
      return;
    }

    const message = {
      type: 'notification',
      notification,
      timestamp: new Date().toISOString(),
    };

    let delivered = 0;
    for (const socket of Array.from(userSockets)) {
      if (socket.connected) {
        socket.emit('notification', message);
        delivered++;
      }
    }

    logger.debug(`User notification sent to ${delivered}/${userSockets.size} connections`, {
      component: 'SocketIOAdapter',
      user_id: userId
    });
  }

  /**
   * Check if adapter is ready (required by WebSocketAdapter)
   */
  override isReady(): boolean {
    return this.isInitialized && !this.isShuttingDown && this.io !== null;
  }

  /**
   * Get uptime in milliseconds (required by WebSocketAdapter)
   */
  override getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get health status (required by WebSocketAdapter)
   */
  override getHealthStatus() {
    const redisHealthy = this.redisClient?.status === 'ready' && 
                        this.redisSubClient?.status === 'ready';
    const isHealthy = this.isReady() && redisHealthy;

    return {
      isHealthy,
      status: isHealthy ? 'healthy' as const : 'unhealthy' as const,
      issues: isHealthy ? [] : [
        ...(!this.isReady() ? ['Adapter not ready'] : []),
        ...(!redisHealthy ? ['Redis connection issues'] : [])
      ],
      lastCheck: new Date(),
    };
  }

  /**
   * Get service statistics
   */
  override getStats() {
    return {
      activeConnections: this.stats.activeConnections,
      totalConnections: this.stats.totalConnections,
      totalMessages: this.stats.totalMessages,
      totalBroadcasts: this.stats.totalBroadcasts,
      droppedMessages: this.stats.droppedMessages,
      errorRate: this.stats.errorRate,
      averageLatency: 0, // Would need to implement latency tracking
      memoryUsage: process.memoryUsage().heapUsed,
      uptime: this.getUptime(),
    };
  }

  /**
   * Shutdown the adapter
   */
  override async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    logger.info('Shutting down Socket.IO adapter', {
      component: 'SocketIOAdapter'
    });

    if (this.io) {
      this.io.close();
      this.io = null;
    }

    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }

    if (this.redisSubClient) {
      await this.redisSubClient.quit();
      this.redisSubClient = null;
    }

    this.clients.clear();
    this.billSubscriptions.clear();
    this.userSubscriptionIndex.clear();

    logger.info('Socket.IO adapter shutdown complete', {
      component: 'SocketIOAdapter'
    });
  }
}