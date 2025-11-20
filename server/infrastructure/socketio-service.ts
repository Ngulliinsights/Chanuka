/**
 * Socket.IO Service with Redis Adapter
 * 
 * Maintains API compatibility with existing WebSocket service while using Socket.IO
 * and Redis adapter for horizontal scaling support.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'http';
import * as jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { database as db } from '@shared/database/connection.js';
import { User, users } from '@shared/schema/foundation';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/core/observability/logging';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Connection management
  HEARTBEAT_INTERVAL: 30000,
  HEALTH_CHECK_INTERVAL: 60000,
  CONNECTION_TIMEOUT: 60000,
  
  // Message handling
  MAX_PAYLOAD: 100 * 1024, // 100KB
  
  // Memory management thresholds
  HIGH_MEMORY_THRESHOLD: 85,
  CRITICAL_MEMORY_THRESHOLD: 95,
  
  // Shutdown
  SHUTDOWN_GRACE_PERIOD: 5000,
} as const;

// ============================================================================
// SOCKET.IO SERVICE
// ============================================================================

/**
 * Socket.IO service for real-time communication with Redis adapter support.
 * Maintains API compatibility with the existing WebSocket service.
 */
export class SocketIOService {
  private io: SocketIOServer | null = null;
  private redisClient: Redis | null = null;
  private redisSubClient: Redis | null = null;
  private clients: Map<string, Set<AuthenticatedSocket>> = new Map();
  private billSubscriptions: Map<number, Set<string>> = new Map();
  private userSubscriptionIndex: Map<string, Set<number>> = new Map();

  // Statistics tracking (maintaining compatibility)
  private connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    totalBroadcasts: 0,
    droppedMessages: 0,
    duplicateMessages: 0,
    queueOverflows: 0,
    reconnections: 0,
    startTime: Date.now(),
    lastActivity: Date.now(),
    peakConnections: 0,
  };

  // Intervals for maintenance tasks
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private memoryCleanupInterval: NodeJS.Timeout | null = null;

  // State flags
  private isInitialized = false;
  private isShuttingDown = false;
  private nextConnectionId = 0;

  constructor() {
    // Initialize Redis clients for adapter
    this.initializeRedis();
  }

  // ==========================================================================
  // REDIS INITIALIZATION
  // ==========================================================================

  /**
   * Initialize Redis clients for Socket.IO adapter
   */
  private initializeRedis(): void {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      // Create Redis clients for pub/sub with enhanced error handling
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
        enableOfflineQueue: false,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        db: 0,
        // Enhanced connection options for robustness
        connectTimeout: 10000,
        commandTimeout: 5000,
        enableReadyCheck: true,
        autoResubscribe: true,
        autoResendUnfulfilledCommands: false,
      });

      this.redisSubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
        enableOfflineQueue: false,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        db: 0,
        // Enhanced connection options for robustness
        connectTimeout: 10000,
        commandTimeout: 5000,
        enableReadyCheck: true,
        autoResubscribe: true,
        autoResendUnfulfilledCommands: false,
      });

      // Setup Redis event handlers
      this.setupRedisEventHandlers();

      logger.info('Redis clients initialized for Socket.IO adapter', {
        component: 'SocketIOService'
      });
    } catch (error) {
      logger.error('Failed to initialize Redis clients', {
        component: 'SocketIOService'
      }, error instanceof Error ? error : new Error(String(error)));
      // Don't throw - allow service to continue without Redis adapter
      this.redisClient = null;
      this.redisSubClient = null;
    }
  }

  /**
   * Setup Redis event handlers for monitoring
   */
  private setupRedisEventHandlers(): void {
    if (!this.redisClient || !this.redisSubClient) return;

    // Main Redis client events
    this.redisClient.on('connect', () => {
      logger.info('Redis client connected', { component: 'SocketIOService' });
    });

    this.redisClient.on('error', (error) => {
      logger.error('Redis client error', { component: 'SocketIOService' }, error);
    });

    this.redisClient.on('close', () => {
      logger.warn('Redis client connection closed', { component: 'SocketIOService' });
    });

    // Sub Redis client events
    this.redisSubClient.on('connect', () => {
      logger.info('Redis sub client connected', { component: 'SocketIOService' });
    });

    this.redisSubClient.on('error', (error) => {
      logger.error('Redis sub client error', { component: 'SocketIOService' }, error);
    });

    this.redisSubClient.on('close', () => {
      logger.warn('Redis sub client connection closed', { component: 'SocketIOService' });
    });
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the Socket.IO server with Redis adapter
   */
  async initialize(server: Server): Promise<void> {
    if (this.isInitialized) {
      logger.info('Socket.IO service already initialized', {
        component: 'SocketIOService'
      });
      return;
    }

    try {
      // Create Socket.IO server
      this.io = new SocketIOServer(server, {
        path: '/socket.io/',
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: CONFIG.CONNECTION_TIMEOUT,
        pingInterval: 25000,
        maxHttpBufferSize: CONFIG.MAX_PAYLOAD,
        allowEIO3: true,
        perMessageDeflate: {
          threshold: 1024,
        }
      });

      // Setup Redis adapter if Redis clients are available
      if (this.redisClient && this.redisSubClient) {
        try {
          // Ensure Redis clients are connected before creating adapter
          if (this.redisClient.status !== 'ready') {
            await this.redisClient.connect();
          }
          if (this.redisSubClient.status !== 'ready') {
            await this.redisSubClient.connect();
          }

          this.io.adapter(createAdapter(this.redisClient, this.redisSubClient));
          logger.info('Socket.IO Redis adapter configured', {
            component: 'SocketIOService'
          });
        } catch (error) {
          logger.error('Failed to setup Redis adapter, continuing without it', {
            component: 'SocketIOService'
          }, error instanceof Error ? error : new Error(String(error)));
          // Reset Redis clients on failure to prevent inconsistent state
          this.redisClient = null;
          this.redisSubClient = null;
        }
      }

      // Setup middleware for authentication
      this.io.use(this.authenticationMiddleware.bind(this));

      // Setup connection handler
      this.io.on('connection', this.handleConnection.bind(this));

      // Setup intervals
      this.setupIntervals();

      this.isInitialized = true;
      logger.info('Socket.IO server initialized', {
        component: 'SocketIOService',
        config: {
          maxPayload: CONFIG.MAX_PAYLOAD,
          pingTimeout: CONFIG.CONNECTION_TIMEOUT,
          redisAdapter: !!(this.redisClient && this.redisSubClient)
        }
      });
    } catch (error) {
      logger.error('Failed to initialize Socket.IO service', {
        component: 'SocketIOService'
      }, error instanceof Error ? error : new Error(String(error)));
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Authentication middleware for Socket.IO
   */
  private async authenticationMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || 
        socket.handshake.headers.authorization?.replace('Bearer ', '') ||
        socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token as string,
        process.env.JWT_SECRET || 'fallback-secret'
      ) as { user_id: string };

      // Verify user exists in database
      const userRecord = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, decoded.user_id))
        .limit(1);

      if (userRecord.length === 0) {
        return next(new Error('User not found'));
      }

      // Attach user_id to socket
      socket.user_id = decoded.user_id;
      next();
    } catch (error) {
      logger.warn('Socket.IO authentication failed', {
        component: 'SocketIOService',
        error: error instanceof Error ? error.message : String(error)
      });
      next(new Error('Authentication failed'));
    }
  }

  // ==========================================================================
  // CONNECTION HANDLING
  // ==========================================================================

  /**
   * Handle new Socket.IO connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const user_id = socket.user_id;
    if (!user_id) {
      logger.error('Connection without user_id - should not happen', {
        component: 'SocketIOService'
      });
      socket.disconnect(true);
      return;
    }

    const connectionId = `${user_id}-${this.nextConnectionId++}`;
    
    // Initialize socket properties
    socket.connectionId = connectionId;
    socket.subscriptions = new Set();

    // Update connection statistics
    this.connectionStats.totalConnections++;
    this.connectionStats.activeConnections++;
    this.connectionStats.peakConnections = Math.max(
      this.connectionStats.peakConnections,
      this.connectionStats.activeConnections
    );
    this.connectionStats.lastActivity = Date.now();

    // Initialize clients set
    if (!this.clients.has(user_id)) {
      this.clients.set(user_id, new Set());
    }
    this.clients.get(user_id)!.add(socket);

    logger.info(`New Socket.IO connection ${connectionId} for user: ${user_id}`, {
      component: 'SocketIOService',
      activeConnections: this.connectionStats.activeConnections
    });

    // Send connection confirmation
    socket.emit('connected', {
      type: 'connected',
      message: 'WebSocket connection established',
      data: {
        user_id,
        connectionId,
        timestamp: new Date().toISOString(),
        config: {
          heartbeatInterval: CONFIG.HEARTBEAT_INTERVAL,
          maxMessageSize: CONFIG.MAX_PAYLOAD,
          supportsBatching: true,
          compressionEnabled: true
        }
      }
    });

    // Setup event handlers
    this.setupSocketEventHandlers(socket);
  }

  /**
   * Setup event handlers for a socket
   */
  private setupSocketEventHandlers(socket: AuthenticatedSocket): void {
    // Handle incoming messages
    socket.on('message', (data: SocketMessage) => {
      this.handleIncomingMessage(socket, data);
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      logger.error(`Socket.IO error for ${socket.connectionId}`, {
        component: 'SocketIOService'
      }, error);
    });

    // Handle ping/pong for compatibility
    socket.on('ping', () => {
      socket.emit('pong');
    });
  }

  /**
   * Handle incoming message from client
   */
  private async handleIncomingMessage(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    if (this.isShuttingDown) return;

    this.connectionStats.totalMessages++;
    this.connectionStats.lastActivity = Date.now();

    try {
      await this.handleMessage(socket, message);
    } catch (error) {
      logger.error('Error handling Socket.IO message', {
        component: 'SocketIOService',
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
    this.connectionStats.activeConnections--;
    
    logger.info(`Socket.IO disconnected ${socket.connectionId}`, {
      component: 'SocketIOService',
      reason,
      activeConnections: this.connectionStats.activeConnections
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

      // Clean up user subscription index
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

  // ==========================================================================
  // MESSAGE HANDLING (Compatibility with existing WebSocket service)
  // ==========================================================================

  /**
   * Handle message routing (maintains compatibility with existing WebSocket service)
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
      case 'get_preferences':
        await this.handleGetPreferences(socket, message);
        break;
      case 'update_preferences':
        await this.handleUpdatePreferences(socket, message);
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

    // Add to bill subscriptions
    if (!this.billSubscriptions.has(bill_id)) {
      this.billSubscriptions.set(bill_id, new Set());
    }
    this.billSubscriptions.get(bill_id)!.add(user_id);

    // Add to user subscription index
    if (!this.userSubscriptionIndex.has(user_id)) {
      this.userSubscriptionIndex.set(user_id, new Set());
    }
    this.userSubscriptionIndex.get(user_id)!.add(bill_id);

    // Add to socket subscriptions
    socket.subscriptions!.add(bill_id);

    // Join Socket.IO room for efficient broadcasting
    socket.join(`bill:${bill_id}`);

    socket.emit('subscription_confirmed', {
      type: 'subscription_confirmed',
      bill_id,
      messageId: message.messageId,
      timestamp: new Date().toISOString()
    });

    logger.debug(`User ${user_id} subscribed to bill ${bill_id}`, {
      component: 'SocketIOService'
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

    // Remove from bill subscriptions
    const subscribers = this.billSubscriptions.get(bill_id);
    if (subscribers) {
      subscribers.delete(user_id);
      if (subscribers.size === 0) {
        this.billSubscriptions.delete(bill_id);
      }
    }

    // Remove from user subscription index
    const userSubs = this.userSubscriptionIndex.get(user_id);
    if (userSubs) {
      userSubs.delete(bill_id);
      if (userSubs.size === 0) {
        this.userSubscriptionIndex.delete(user_id);
      }
    }

    // Remove from socket subscriptions
    socket.subscriptions!.delete(bill_id);

    // Leave Socket.IO room
    socket.leave(`bill:${bill_id}`);

    socket.emit('unsubscription_confirmed', {
      type: 'unsubscription_confirmed',
      bill_id,
      messageId: message.messageId,
      timestamp: new Date().toISOString()
    });

    logger.debug(`User ${user_id} unsubscribed from bill ${bill_id}`, {
      component: 'SocketIOService'
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
      // Add to bill subscriptions
      if (!this.billSubscriptions.has(bill_id)) {
        this.billSubscriptions.set(bill_id, new Set());
      }
      this.billSubscriptions.get(bill_id)!.add(user_id);

      // Add to user subscription index
      if (!this.userSubscriptionIndex.has(user_id)) {
        this.userSubscriptionIndex.set(user_id, new Set());
      }
      this.userSubscriptionIndex.get(user_id)!.add(bill_id);

      // Add to socket subscriptions
      socket.subscriptions!.add(bill_id);

      // Join Socket.IO room
      socket.join(`bill:${bill_id}`);

      subscribed.push(bill_id);
    }

    socket.emit('batch_subscription_confirmed', {
      type: 'batch_subscription_confirmed',
      bill_ids: subscribed,
      messageId: message.messageId,
      timestamp: new Date().toISOString()
    });

    logger.debug(`User ${user_id} batch subscribed to ${subscribed.length} bills`, {
      component: 'SocketIOService'
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
      // Remove from bill subscriptions
      const subscribers = this.billSubscriptions.get(bill_id);
      if (subscribers) {
        subscribers.delete(user_id);
        if (subscribers.size === 0) {
          this.billSubscriptions.delete(bill_id);
        }
      }

      // Remove from user subscription index
      const userSubs = this.userSubscriptionIndex.get(user_id);
      if (userSubs) {
        userSubs.delete(bill_id);
      }

      // Remove from socket subscriptions
      socket.subscriptions!.delete(bill_id);

      // Leave Socket.IO room
      socket.leave(`bill:${bill_id}`);

      unsubscribed.push(bill_id);
    }

    // Clean up empty user subscription index
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

    logger.debug(`User ${user_id} batch unsubscribed from ${unsubscribed.length} bills`, {
      component: 'SocketIOService'
    });
  }

  /**
   * Handle get preferences (placeholder for compatibility)
   */
  private async handleGetPreferences(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    socket.emit('preferences', {
      type: 'preferences',
      data: {
        updateFrequency: 'immediate',
        notificationTypes: ['status_change', 'new_comment', 'amendment', 'voting_scheduled']
      },
      messageId: message.messageId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle update preferences (placeholder for compatibility)
   */
  private async handleUpdatePreferences(socket: AuthenticatedSocket, message: SocketMessage): Promise<void> {
    socket.emit('preferences_updated', {
      type: 'preferences_updated',
      data: message.data?.preferences || {},
      messageId: message.messageId,
      timestamp: new Date().toISOString()
    });
  }
 
 // ==========================================================================
  // BROADCASTING (API Compatibility)
  // ==========================================================================

  /**
   * Broadcast bill update to all subscribed users (maintains API compatibility)
   */
  broadcastBillUpdate(bill_id: number, update: {
    type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
    data: any;
    timestamp?: Date;
  }): void {
    if (!this.io) return;

    this.connectionStats.totalBroadcasts++;
    this.connectionStats.lastActivity = Date.now();

    const message = {
      type: 'bill_update',
      bill_id,
      update: {
        ...update,
        timestamp: update.timestamp || new Date()
      },
      timestamp: new Date().toISOString()
    };

    // Use Socket.IO rooms for efficient broadcasting
    const roomName = `bill:${bill_id}`;
    this.io.to(roomName).emit('bill_update', message);

    const subscriberCount = this.billSubscriptions.get(bill_id)?.size || 0;
    logger.info(`Broadcast bill ${bill_id} update to ${subscriberCount} subscribers`, {
      component: 'SocketIOService',
      updateType: update.type,
      roomName
    });
  }

  /**
   * Send notification to specific user across all their connections
   */
  sendUserNotification(user_id: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }): void {
    if (!this.io) return;

    const userSockets = this.clients.get(user_id);
    if (!userSockets || userSockets.size === 0) {
      logger.debug(`No active connections for user ${user_id}`, {
        component: 'SocketIOService'
      });
      return;
    }

    const message = {
      type: 'notification',
      notification,
      timestamp: new Date().toISOString(),
      priority: 'immediate' as const
    };

    let delivered = 0;
    for (const socket of Array.from(userSockets)) {
      if (socket.connected) {
        socket.emit('notification', message);
        delivered++;
      }
    }

    logger.debug(`User notification sent to ${delivered}/${userSockets.size} connections`, {
      component: 'SocketIOService',
      user_id
    });
  }

  /**
   * Broadcast message to all connected users
   */
  broadcastToAll(message: { type: string; data: any; timestamp?: Date }): void {
    if (!this.io) return;

    this.connectionStats.totalBroadcasts++;
    this.connectionStats.lastActivity = Date.now();

    const broadcastMessage = {
      ...message,
      timestamp: (message.timestamp || new Date()).toISOString(),
      priority: 'immediate' as const
    };

    this.io.emit('broadcast', broadcastMessage);

    logger.info(`Broadcast completed to all connected users`, {
      component: 'SocketIOService',
      activeConnections: this.connectionStats.activeConnections
    });
  }

  // ==========================================================================
  // MAINTENANCE & MONITORING
  // ==========================================================================

  /**
   * Setup periodic maintenance intervals
   */
  private setupIntervals(): void {
    this.cleanupIntervals();

    // Health check interval
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, CONFIG.HEALTH_CHECK_INTERVAL);

    // Memory cleanup interval
    this.memoryCleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, 180000); // 3 minutes
  }

  /**
   * Clear all maintenance intervals
   */
  private cleanupIntervals(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }
  }

  /**
   * Perform health check and log warnings if issues detected
   */
  private performHealthCheck(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.connectionStats.lastActivity;
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const isHealthy = timeSinceLastActivity < 300000 && heapUsedPercent < 90;

    if (!isHealthy || heapUsedPercent > 85) {
      logger.warn('Socket.IO Health Warning', {
        component: 'SocketIOService',
        activeConnections: this.connectionStats.activeConnections,
        droppedMessages: this.connectionStats.droppedMessages,
        heapUsedPercent: heapUsedPercent.toFixed(2) + '%',
        isHealthy
      });
    }
  }

  /**
   * Perform memory cleanup to prevent unbounded growth
   */
  private performMemoryCleanup(): void {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    let cleanedItems = 0;

    // Clean up disconnected sockets from clients map
    for (const [user_id, sockets] of Array.from(this.clients.entries())) {
      const connectedSockets = new Set<AuthenticatedSocket>();
      for (const socket of Array.from(sockets)) {
        if (socket.connected) {
          connectedSockets.add(socket);
        } else {
          cleanedItems++;
        }
      }

      if (connectedSockets.size === 0) {
        this.clients.delete(user_id);
      } else if (connectedSockets.size !== sockets.size) {
        this.clients.set(user_id, connectedSockets);
      }
    }

    // Critical memory pressure - aggressive cleanup
    if (heapUsedPercent > CONFIG.CRITICAL_MEMORY_THRESHOLD) {
      logger.warn('🚨 CRITICAL MEMORY PRESSURE - Performing aggressive cleanup', {
        component: 'SocketIOService',
        heapUsedPercent: heapUsedPercent.toFixed(2) + '%'
      });

      // Force garbage collection if available
      if (global.gc) {
        const memBeforeGC = process.memoryUsage();
        global.gc();
        const memAfterGC = process.memoryUsage();
        const freedByGC = memBeforeGC.heapUsed - memAfterGC.heapUsed;
        logger.info('🗑️ Forced garbage collection', {
          component: 'SocketIOService',
          freed: `${(freedByGC / 1024 / 1024).toFixed(2)} MB`,
          heapBefore: `${(memBeforeGC.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapAfter: `${(memAfterGC.heapUsed / 1024 / 1024).toFixed(2)} MB`
        });
      }
    }

    // Log cleanup results if significant work was done
    if (cleanedItems > 0) {
      const memAfter = process.memoryUsage();
      const heapAfterPercent = (memAfter.heapUsed / memAfter.heapTotal) * 100;
      const memoryFreed = memUsage.heapUsed - memAfter.heapUsed;

      logger.info('🧹 Memory cleanup completed', {
        component: 'SocketIOService',
        cleanedItems,
        memoryFreed: `${(memoryFreed / 1024 / 1024).toFixed(2)} MB`,
        heapBefore: heapUsedPercent.toFixed(2) + '%',
        heapAfter: heapAfterPercent.toFixed(2) + '%'
      });
    }
  }

  // ==========================================================================
  // STATISTICS & MONITORING (API Compatibility)
  // ==========================================================================

  /**
   * Get comprehensive service statistics (maintains API compatibility)
   */
  getStats() {
    const now = Date.now();
    const uptime = now - this.connectionStats.startTime;

    return {
      ...this.connectionStats,
      uptime: Math.floor(uptime / 1000),
      averageLatency: 0, // Socket.IO handles this internally
      totalSubscriptions: Array.from(this.billSubscriptions.values())
        .reduce((sum, subscribers) => sum + subscribers.size, 0),
      billsWithSubscribers: this.billSubscriptions.size,
      uniqueUsers: this.clients.size,
      queueDepth: 0, // Socket.IO handles queuing internally
      averageConnectionsPerUser: this.clients.size > 0
        ? this.connectionStats.activeConnections / this.clients.size
        : 0,
      connectionPoolSize: this.clients.size,
      dedupeCacheSize: 0, // Not applicable with Socket.IO
      messageSuccessRate: this.connectionStats.totalMessages > 0
        ? 1 - (this.connectionStats.droppedMessages / this.connectionStats.totalMessages)
        : 1
    };
  }

  /**
   * Get detailed health status with warnings (maintains API compatibility)
   */
  getHealthStatus() {
    const now = Date.now();
    const uptime = now - this.connectionStats.startTime;
    const timeSinceLastActivity = now - this.connectionStats.lastActivity;

    const stats = this.getStats();
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return {
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 1000),
      timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000),
      isHealthy: this.connectionStats.activeConnections >= 0 &&
        timeSinceLastActivity < 300000 &&
        heapUsedPercent < 90,
      stats,
      memoryUsage: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      },
      heapUsedPercent,
      warnings: this.generateHealthWarnings(stats, heapUsedPercent),
      redisStatus: this.getRedisStatus()
    };
  }

  /**
   * Get Redis connection status
   */
  private getRedisStatus(): { client: string; subClient: string } {
    return {
      client: this.redisClient?.status || 'disconnected',
      subClient: this.redisSubClient?.status || 'disconnected'
    };
  }

  /**
   * Generate health warnings based on current metrics
   */
  private generateHealthWarnings(stats: any, heapUsedPercent: number): string[] {
    const warnings: string[] = [];

    if (stats.droppedMessages > 100) {
      warnings.push(`High dropped message count: ${stats.droppedMessages}`);
    }

    if (heapUsedPercent > 80) {
      warnings.push(`High memory usage: ${heapUsedPercent.toFixed(2)}%`);
    }

    if (stats.messageSuccessRate < 0.95) {
      warnings.push(`Low message success rate: ${(stats.messageSuccessRate * 100).toFixed(2)}%`);
    }

    // Redis-specific warnings
    if (this.redisClient?.status !== 'ready') {
      warnings.push(`Redis client not ready: ${this.redisClient?.status || 'unknown'}`);
    }

    if (this.redisSubClient?.status !== 'ready') {
      warnings.push(`Redis sub client not ready: ${this.redisSubClient?.status || 'unknown'}`);
    }

    return warnings;
  }

  /**
   * Get metrics grouped by category (maintains API compatibility)
   */
  getMetrics() {
    return {
      connections: {
        active: this.connectionStats.activeConnections,
        peak: this.connectionStats.peakConnections,
        total: this.connectionStats.totalConnections,
        reconnections: this.connectionStats.reconnections
      },
      messages: {
        total: this.connectionStats.totalMessages,
        dropped: this.connectionStats.droppedMessages,
        duplicates: this.connectionStats.duplicateMessages,
        broadcasts: this.connectionStats.totalBroadcasts
      },
      performance: {
        averageLatency: 0, // Socket.IO handles this internally
        queueDepth: 0, // Socket.IO handles queuing internally
        queueOverflows: this.connectionStats.queueOverflows,
        messageSuccessRate: this.connectionStats.totalMessages > 0
          ? 1 - (this.connectionStats.droppedMessages / this.connectionStats.totalMessages)
          : 1
      },
      subscriptions: {
        totalBills: this.billSubscriptions.size,
        totalSubscriptions: Array.from(this.billSubscriptions.values())
          .reduce((sum, subscribers) => sum + subscribers.size, 0),
        usersWithSubscriptions: this.userSubscriptionIndex.size
      },
      redis: this.getRedisStatus()
    };
  }

  // ==========================================================================
  // UTILITY METHODS (API Compatibility)
  // ==========================================================================

  /**
   * Get user's current subscriptions
   */
  getUserSubscriptions(user_id: string): number[] {
    const userSubs = this.userSubscriptionIndex.get(user_id);
    return userSubs ? Array.from(userSubs) : [];
  }

  /**
   * Check if user is currently connected
   */
  isUserConnected(user_id: string): boolean {
    const userSockets = this.clients.get(user_id);
    if (!userSockets || userSockets.size === 0) return false;
    return Array.from(userSockets).some(socket => socket.connected);
  }

  /**
   * Get number of active connections for a user
   */
  getConnectionCount(user_id: string): number {
    const userSockets = this.clients.get(user_id);
    if (!userSockets) return 0;
    return Array.from(userSockets).filter(socket => socket.connected).length;
  }

  /**
   * Get all currently connected user IDs
   */
  getAllConnectedUsers(): string[] {
    const connectedUsers: string[] = [];
    for (const [user_id, sockets] of Array.from(this.clients.entries())) {
      if (Array.from(sockets).some((socket: AuthenticatedSocket) => socket.connected)) {
        connectedUsers.push(user_id);
      }
    }
    return connectedUsers;
  }

  /**
   * Get all user IDs subscribed to a specific bill
   */
  getBillSubscribers(bill_id: number): string[] {
    const subscribers = this.billSubscriptions.get(bill_id);
    return subscribers ? Array.from(subscribers) : [];
  }

  // ==========================================================================
  // CLEANUP & SHUTDOWN
  // ==========================================================================

  /**
   * Clean up all internal data structures
   */
  cleanup(): void {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.cleanupIntervals();

    // Clear all maps
    this.clients.clear();
    this.billSubscriptions.clear();
    this.userSubscriptionIndex.clear();

    logger.info('Socket.IO service cleanup completed', {
      component: 'SocketIOService'
    });
  }

  /**
   * Gracefully shutdown the Socket.IO service
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.info('Shutdown already in progress', {
        component: 'SocketIOService'
      });
      return;
    }

    logger.info('🔄 Shutting down Socket.IO service...', {
      component: 'SocketIOService'
    });
    this.isShuttingDown = true;

    try {
      this.cleanupIntervals();

      if (this.io) {
        const shutdownMessage = {
          type: 'server_shutdown',
          data: {
            message: 'Server is shutting down for maintenance',
            reconnectDelay: 1000
          },
          timestamp: new Date().toISOString(),
          priority: 'immediate' as const
        };

        // Notify all clients
        this.io.emit('server_shutdown', shutdownMessage);

        // Brief delay to ensure messages are sent
        await new Promise(resolve => setTimeout(resolve, 100));

        // Close all connections
        this.io.disconnectSockets(true);

        // Close the Socket.IO server
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            logger.warn('Socket.IO server close timeout, forcing shutdown', {
              component: 'SocketIOService'
            });
            resolve();
          }, CONFIG.SHUTDOWN_GRACE_PERIOD);

          this.io!.close(() => {
            clearTimeout(timeout);
            logger.info('Socket.IO server closed successfully', {
              component: 'SocketIOService'
            });
            resolve();
          });
        });

        this.io = null;
      }

      // Close Redis connections
      if (this.redisClient) {
        await this.redisClient.quit();
        this.redisClient = null;
      }

      if (this.redisSubClient) {
        await this.redisSubClient.quit();
        this.redisSubClient = null;
      }

      this.cleanup();
      this.isInitialized = false;

      logger.info('Socket.IO Service Shutdown Statistics', {
        component: 'SocketIOService',
        totalConnections: this.connectionStats.totalConnections,
        totalMessages: this.connectionStats.totalMessages,
        totalBroadcasts: this.connectionStats.totalBroadcasts,
        droppedMessages: this.connectionStats.droppedMessages,
        peakConnections: this.connectionStats.peakConnections
      });

      logger.info('✅ Socket.IO service shutdown completed', {
        component: 'SocketIOService'
      });

    } catch (error) {
      logger.error('❌ Error during Socket.IO shutdown', {
        component: 'SocketIOService'
      }, error instanceof Error ? error : new Error(String(error)));
      
      this.cleanup();
      this.isInitialized = false;
      throw error;
    }
  }
}

// Export singleton instance
export const socketIOService = new SocketIOService();
