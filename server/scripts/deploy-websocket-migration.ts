#!/usr/bin/env tsx
// ============================================================================
// WEBSOCKET MIGRATION DEPLOYMENT SCRIPT
// ============================================================================
// Implements immediate switch deployment for development environment
// Migrates from custom WebSocket service to Socket.IO with zero downtime

import { logger } from '@server/infrastructure/observability';
import { database as db } from '@server/infrastructure/database';
import { users } from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';
import { Server as HttpServer } from 'http';
import * as jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { Server } from 'socket.io';

import { createAdapter } from '../../redis-adapter';

interface MigrationConfig {
  environment: 'development' | 'production';
  deploymentStrategy: 'immediate' | 'gradual';
  redisUrl?: string;
  enableMonitoring: boolean;
  rollbackOnError: boolean;
}

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  startTime: number;
}

interface MigrationState {
  phase: 'preparing' | 'deploying' | 'validating' | 'completed' | 'failed' | 'rolled_back';
  startTime: number;
  completionTime?: number;
  metrics: ConnectionMetrics;
  errors: string[];
}

/**
 * Socket.IO WebSocket Service - New Implementation
 */
export class SocketIOWebSocketService {
  private io: Server | null = null;
  private redisClient: unknown = null;
  private redisAdapter: unknown = null;
  private metrics: ConnectionMetrics;
  private userSockets: Map<string, Set<string>> = new Map();
  private socketUsers: Map<string, string> = new Map();
  private billSubscriptions: Map<number, Set<string>> = new Map();
  private isInitialized = false;

  constructor() {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  /**
   * Initialize Socket.IO server with Redis adapter for scaling
   */
  async initialize(httpServer: HttpServer, config: MigrationConfig): Promise<void> {
    if (this.isInitialized) {
      logger.warn({ component: 'SocketIOWebSocketService' }, 'Socket.IO service already initialized');
      return;
    }

    logger.info({
      component: 'SocketIOWebSocketService',
      environment: config.environment
    }, 'Initializing Socket.IO WebSocket service');

    try {
      // Create Socket.IO server
      this.io = new Server(httpServer, {
        path: '/socket.io',
        cors: {
          origin: process.env.FRONTEND_URL || 'http://localhost:3000',
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 100 * 1024, // 100KB
        allowEIO3: true
      });

      // Setup Redis adapter for horizontal scaling (if Redis URL provided)
      if (config.redisUrl) {
        await this.setupRedisAdapter(config.redisUrl);
      }

      // Setup authentication middleware
      this.io.use(async (socket, next) => {
        try {
          const token = socket.handshake.auth.token || socket.handshake.query.token;
          
          if (!token) {
            return next(new Error('Authentication token required'));
          }

          // Verify JWT token
          const decoded = jwt.verify(
            token as string,
            process.env.JWT_SECRET || 'fallback-secret'
          ) as { user_id: string };

          // Verify user exists
          const [user] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, decoded.user_id))
            .limit(1);

          if (!user) {
            return next(new Error('User not found'));
          }

          // Attach user_id to socket
          socket.data.user_id = decoded.user_id;
          next();

        } catch (error) {
          logger.warn({
            component: 'SocketIOWebSocketService',
            error: error instanceof Error ? error.message : String(error)
          }, 'Socket.IO authentication failed');
          next(new Error('Authentication failed'));
        }
      });

      // Setup connection handlers
      this.io.on('connection', (socket) => {
        this.handleConnection(socket);
      });

      this.isInitialized = true;

      logger.info({
        component: 'SocketIOWebSocketService',
        redisEnabled: !!this.redisAdapter,
        path: '/socket.io'
      }, 'Socket.IO WebSocket service initialized successfully');

    } catch (error) {
      logger.error({
        component: 'SocketIOWebSocketService',
        error
      }, 'Failed to initialize Socket.IO service');
      throw error;
    }
  }

  /**
   * Setup Redis adapter for horizontal scaling
   */
  private async setupRedisAdapter(redisUrl: string): Promise<void> {
    try {
      this.redisClient = createClient({ url: redisUrl });
      const subClient = this.redisClient.duplicate();

      await Promise.all([
        this.redisClient.connect(),
        subClient.connect()
      ]);

      this.redisAdapter = createAdapter(this.redisClient, subClient);
      this.io!.adapter(this.redisAdapter);

      logger.info({
        component: 'SocketIOWebSocketService',
        redisUrl: redisUrl.replace(/\/\/.*@/, '//***@') // Hide credentials
      }, 'Redis adapter configured for Socket.IO');

    } catch (error) {
      logger.error({
        component: 'SocketIOWebSocketService',
        error
      }, 'Failed to setup Redis adapter');
      throw error;
    }
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: unknown): void {
    const user_id = socket.data.user_id;
    const socketId = socket.id;

    // Update metrics
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    // Track user-socket mapping
    if (!this.userSockets.has(user_id)) {
      this.userSockets.set(user_id, new Set());
    }
    this.userSockets.get(user_id)!.add(socketId);
    this.socketUsers.set(socketId, user_id);

    logger.info({
      component: 'SocketIOWebSocketService',
      user_id,
      socketId,
      activeConnections: this.metrics.activeConnections
    }, 'New Socket.IO connection established');

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Socket.IO connection established',
      user_id,
      socketId,
      timestamp: new Date().toISOString(),
      config: {
        heartbeatInterval: 25000,
        maxMessageSize: 100 * 1024,
        supportsBatching: true,
        compressionEnabled: true
      }
    });

    // Setup event handlers
    socket.on('subscribe', (data: { bill_id: number }) => {
      this.handleSubscribe(socket, data);
    });

    socket.on('unsubscribe', (data: { bill_id: number }) => {
      this.handleUnsubscribe(socket, data);
    });

    socket.on('batch_subscribe', (data: { bill_ids: number[] }) => {
      this.handleBatchSubscribe(socket, data);
    });

    socket.on('batch_unsubscribe', (data: { bill_ids: number[] }) => {
      this.handleBatchUnsubscribe(socket, data);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
    });

    socket.on('error', (error) => {
      this.handleError(socket, error);
    });
  }

  /**
   * Handle bill subscription
   */
  private handleSubscribe(socket: unknown, data: { bill_id: number }): void {
    const { bill_id } = data;
    const socketId = socket.id;

    // Add to bill subscriptions
    if (!this.billSubscriptions.has(bill_id)) {
      this.billSubscriptions.set(bill_id, new Set());
    }
    this.billSubscriptions.get(bill_id)!.add(socketId);

    // Join Socket.IO room for efficient broadcasting
    socket.join(`bill:${bill_id}`);

    logger.debug({
      component: 'SocketIOWebSocketService',
      socketId,
      bill_id,
      subscriberCount: this.billSubscriptions.get(bill_id)!.size
    }, 'Socket subscribed to bill');

    socket.emit('subscribed', {
      bill_id,
      message: `Subscribed to bill ${bill_id}`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle bill unsubscription
   */
  private handleUnsubscribe(socket: unknown, data: { bill_id: number }): void {
    const { bill_id } = data;
    const socketId = socket.id;

    // Remove from bill subscriptions
    if (this.billSubscriptions.has(bill_id)) {
      this.billSubscriptions.get(bill_id)!.delete(socketId);
      
      // Clean up empty subscription sets
      if (this.billSubscriptions.get(bill_id)!.size === 0) {
        this.billSubscriptions.delete(bill_id);
      }
    }

    // Leave Socket.IO room
    socket.leave(`bill:${bill_id}`);

    logger.debug({
      component: 'SocketIOWebSocketService',
      socketId,
      bill_id
    }, 'Socket unsubscribed from bill');

    socket.emit('unsubscribed', {
      bill_id,
      message: `Unsubscribed from bill ${bill_id}`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle batch subscription
   */
  private handleBatchSubscribe(socket: unknown, data: { bill_ids: number[] }): void {
    const { bill_ids } = data;
    const results: Array<{ bill_id: number; success: boolean }> = [];

    for (const bill_id of bill_ids) {
      try {
        this.handleSubscribe(socket, { bill_id });
        results.push({ bill_id, success: true });
      } catch (error) {
        results.push({ bill_id, success: false });
        logger.error({
          component: 'SocketIOWebSocketService',
          bill_id,
          error: error instanceof Error ? error.message : String(error)
        }, 'Batch subscribe failed for bill');
      }
    }

    socket.emit('batch_subscribed', {
      results,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle batch unsubscription
   */
  private handleBatchUnsubscribe(socket: unknown, data: { bill_ids: number[] }): void {
    const { bill_ids } = data;
    const results: Array<{ bill_id: number; success: boolean }> = [];

    for (const bill_id of bill_ids) {
      try {
        this.handleUnsubscribe(socket, { bill_id });
        results.push({ bill_id, success: true });
      } catch (error) {
        results.push({ bill_id, success: false });
        logger.error({
          component: 'SocketIOWebSocketService',
          bill_id,
          error: error instanceof Error ? error.message : String(error)
        }, 'Batch unsubscribe failed for bill');
      }
    }

    socket.emit('batch_unsubscribed', {
      results,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(socket: unknown, reason: string): void {
    const socketId = socket.id;
    const user_id = this.socketUsers.get(socketId);

    // Update metrics
    this.metrics.activeConnections--;

    // Clean up user-socket mapping
    if (user_id) {
      const userSocketSet = this.userSockets.get(user_id);
      if (userSocketSet) {
        userSocketSet.delete(socketId);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(user_id);
        }
      }
      this.socketUsers.delete(socketId);
    }

    // Clean up bill subscriptions
    for (const [bill_id, subscribers] of this.billSubscriptions.entries()) {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.billSubscriptions.delete(bill_id);
      }
    }

    logger.info({
      component: 'SocketIOWebSocketService',
      socketId,
      user_id,
      reason,
      activeConnections: this.metrics.activeConnections
    }, 'Socket.IO connection disconnected');
  }

  /**
   * Handle socket error
   */
  private handleError(socket: unknown, error: Error): void {
    this.metrics.errors++;
    
    logger.error({
      component: 'SocketIOWebSocketService',
      socketId: socket.id,
      user_id: socket.data.user_id,
      error: error instanceof Error ? error.message : String(error)
    }, 'Socket.IO connection error');
  }

  /**
   * Send notification to specific user
   */
  sendUserNotification(user_id: string, notification: unknown): boolean {
    const userSockets = this.userSockets.get(user_id);
    if (!userSockets || userSockets.size === 0) {
      return false;
    }

    for (const socketId of userSockets) {
      this.io!.to(socketId).emit('notification', notification);
    }

    this.metrics.messagesSent++;
    return true;
  }

  /**
   * Broadcast to all subscribers of a bill
   */
  broadcastToBillSubscribers(bill_id: number, message: unknown): number {
    const room = `bill:${bill_id}`;
    this.io!.to(room).emit('bill_update', {
      bill_id,
      ...message,
      timestamp: new Date().toISOString()
    });

    const subscriberCount = this.billSubscriptions.get(bill_id)?.size || 0;
    this.metrics.messagesSent += subscriberCount;
    
    return subscriberCount;
  }

  /**
   * Get current metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all connected users
   */
  getAllConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Get user subscriptions
   */
  getUserSubscriptions(user_id: string): number[] {
    const userSockets = this.userSockets.get(user_id);
    if (!userSockets) return [];

    const subscriptions = new Set<number>();
    for (const [bill_id, subscribers] of this.billSubscriptions.entries()) {
      for (const socketId of userSockets) {
        if (subscribers.has(socketId)) {
          subscriptions.add(bill_id);
          break;
        }
      }
    }

    return Array.from(subscriptions);
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    logger.info({
      component: 'SocketIOWebSocketService'
    }, 'Shutting down Socket.IO WebSocket service');

    if (this.io) {
      this.io.close();
    }

    if (this.redisClient) {
      await this.redisClient.quit();
    }

    this.isInitialized = false;

    logger.info({
      component: 'SocketIOWebSocketService'
    }, 'Socket.IO WebSocket service shutdown complete');
  }
}

/**
 * WebSocket Migration Deployer
 */
export class WebSocketMigrationDeployer {
  private migrationState: MigrationState;
  private config: MigrationConfig;
  private socketIOService: SocketIOWebSocketService;
  private httpServer: HttpServer | null = null;

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = {
      environment: 'development',
      deploymentStrategy: 'immediate',
      enableMonitoring: true,
      rollbackOnError: true,
      ...config
    };

    this.migrationState = {
      phase: 'preparing',
      startTime: Date.now(),
      metrics: {
        totalConnections: 0,
        activeConnections: 0,
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
        startTime: Date.now()
      },
      errors: []
    };

    this.socketIOService = new SocketIOWebSocketService();
  }

  /**
   * Deploy WebSocket migration with immediate switch
   */
  async deploy(httpServer: HttpServer): Promise<void> {
    this.httpServer = httpServer;

    try {
      logger.info({
        component: 'WebSocketMigrationDeployer',
        strategy: this.config.deploymentStrategy,
        environment: this.config.environment
      }, 'Starting WebSocket migration deployment');

      // Phase 1: Prepare new Socket.IO service
      await this.prepareSocketIOService();

      // Phase 2: Deploy new service (immediate switch for dev)
      await this.deployNewService();

      // Phase 3: Validate deployment
      await this.validateDeployment();

      // Phase 4: Complete migration
      this.completeMigration();

    } catch (error) {
      await this.handleDeploymentError(error);
    }
  }

  /**
   * Prepare Socket.IO service
   */
  private async prepareSocketIOService(): Promise<void> {
    this.migrationState.phase = 'preparing';

    logger.info({
      component: 'WebSocketMigrationDeployer'
    }, 'Preparing Socket.IO service');

    try {
      await this.socketIOService.initialize(this.httpServer!, this.config);

      logger.info({
        component: 'WebSocketMigrationDeployer'
      }, 'Socket.IO service prepared successfully');

    } catch (error) {
      this.migrationState.errors.push(`Preparation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Deploy new service (immediate switch for development)
   */
  private async deployNewService(): Promise<void> {
    this.migrationState.phase = 'deploying';

    logger.info({
      component: 'WebSocketMigrationDeployer',
      strategy: this.config.deploymentStrategy
    }, 'Deploying Socket.IO service with immediate switch');

    // For development, we do an immediate switch
    // In production, this would involve gradual traffic shifting
    
    // The Socket.IO service is already initialized and listening
    // Clients will need to reconnect to the new endpoint

    logger.info({
      component: 'WebSocketMigrationDeployer',
      endpoint: '/socket.io'
    }, 'Socket.IO service deployed successfully');
  }

  /**
   * Validate deployment
   */
  private async validateDeployment(): Promise<void> {
    this.migrationState.phase = 'validating';

    logger.info({
      component: 'WebSocketMigrationDeployer'
    }, 'Validating Socket.IO deployment');

    // Wait a moment for any immediate issues to surface
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check service health
    const metrics = this.socketIOService.getMetrics();
    
    // Validation criteria for development
    const validationPassed = 
      metrics.errors === 0 && // No errors during startup
      this.migrationState.errors.length === 0; // No migration errors

    if (!validationPassed) {
      throw new Error(`Deployment validation failed. Errors: ${this.migrationState.errors.join(', ')}`);
    }

    logger.info({
      component: 'WebSocketMigrationDeployer',
      metrics
    }, 'Deployment validation passed');
  }

  /**
   * Complete migration
   */
  private completeMigration(): void {
    this.migrationState.phase = 'completed';
    this.migrationState.completionTime = Date.now();

    const duration = this.migrationState.completionTime - this.migrationState.startTime;

    logger.info({
      component: 'WebSocketMigrationDeployer',
      duration: `${duration}ms`,
      finalMetrics: this.socketIOService.getMetrics()
    }, 'WebSocket migration completed successfully');

    // Broadcast migration completion to any connected clients
    this.broadcastMigrationStatus('completed');
  }

  /**
   * Handle deployment error
   */
  private async handleDeploymentError(error: unknown): Promise<void> {
    this.migrationState.phase = 'failed';
    this.migrationState.errors.push(error instanceof Error ? error.message : String(error));

    logger.error({
      component: 'WebSocketMigrationDeployer',
      phase: this.migrationState.phase,
      errors: this.migrationState.errors,
      error: error instanceof Error ? error.message : String(error)
    }, 'WebSocket migration deployment failed');

    if (this.config.rollbackOnError) {
      await this.rollback();
    }

    throw error;
  }

  /**
   * Rollback migration
   */
  private async rollback(): Promise<void> {
    this.migrationState.phase = 'rolled_back';

    logger.info({
      component: 'WebSocketMigrationDeployer'
    }, 'Rolling back WebSocket migration');

    try {
      await this.socketIOService.shutdown();

      logger.info({
        component: 'WebSocketMigrationDeployer'
      }, 'WebSocket migration rollback completed');

    } catch (rollbackError) {
      logger.error({
        component: 'WebSocketMigrationDeployer',
        rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
      }, 'Rollback failed');
    }
  }

  /**
   * Broadcast migration status to connected clients
   */
  private broadcastMigrationStatus(status: string): void {
    // This would broadcast to any connected clients about the migration status
    // For now, we'll just log it since we're in the deployment phase
    logger.info({
      component: 'WebSocketMigrationDeployer',
      status
    }, 'Broadcasting migration status');
  }

  /**
   * Get migration state
   */
  getMigrationState(): MigrationState {
    return { ...this.migrationState };
  }

  /**
   * Get Socket.IO service instance
   */
  getSocketIOService(): SocketIOWebSocketService {
    return this.socketIOService;
  }
}

// Exports are already declared above with the class definitions
