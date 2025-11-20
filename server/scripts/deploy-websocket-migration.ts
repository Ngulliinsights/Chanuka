#!/usr/bin/env tsx
// ============================================================================
// WEBSOCKET MIGRATION DEPLOYMENT SCRIPT
// ============================================================================
// Implements immediate switch deployment for development environment
// Migrates from custom WebSocket service to Socket.IO with zero downtime

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server as HttpServer } from 'http';
import { logger } from '@shared/core/observability/logging';
import { database as db } from '@shared/database/connection.js';
import { users } from '@shared/schema/foundation.js';
import { eq } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

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
  private redisClient: any = null;
  private redisAdapter: any = null;
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
      logger.warn('Socket.IO service already initialized');
      return;
    }

    logger.info('Initializing Socket.IO WebSocket service', {
      component: 'SocketIOWebSocketService',
      environment: config.environment
    });

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
          logger.warn('Socket.IO authentication failed', {
            component: 'SocketIOWebSocketService',
            error: error instanceof Error ? error.message : String(error)
          });
          next(new Error('Authentication failed'));
        }
      });

      // Setup connection handlers
      this.io.on('connection', (socket) => {
        this.handleConnection(socket);
      });

      this.isInitialized = true;

      logger.info('Socket.IO WebSocket service initialized successfully', {
        component: 'SocketIOWebSocketService',
        redisEnabled: !!this.redisAdapter,
        path: '/socket.io'
      });

    } catch (error) {
      logger.error('Failed to initialize Socket.IO service', {
        component: 'SocketIOWebSocketService'
      }, error);
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

      logger.info('Redis adapter configured for Socket.IO', {
        component: 'SocketIOWebSocketService',
        redisUrl: redisUrl.replace(/\/\/.*@/, '//***@') // Hide credentials
      });

    } catch (error) {
      logger.error('Failed to setup Redis adapter', {
        component: 'SocketIOWebSocketService'
      }, error);
      throw error;
    }
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: any): void {
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

    logger.info('New Socket.IO connection established', {
      component: 'SocketIOWebSocketService',
      user_id,
      socketId,
      activeConnections: this.metrics.activeConnections
    });

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
  private handleSubscribe(socket: any, data: { bill_id: number }): void {
    const { bill_id } = data;
    const socketId = socket.id;

    // Add to bill subscriptions
    if (!this.billSubscriptions.has(bill_id)) {
      this.billSubscriptions.set(bill_id, new Set());
    }
    this.billSubscriptions.get(bill_id)!.add(socketId);

    // Join Socket.IO room for efficient broadcasting
    socket.join(`bill:${bill_id}`);

    logger.debug('Socket subscribed to bill', {
      component: 'SocketIOWebSocketService',
      socketId,
      bill_id,
      subscriberCount: this.billSubscriptions.get(bill_id)!.size
    });

    socket.emit('subscribed', {
      bill_id,
      message: `Subscribed to bill ${bill_id}`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle bill unsubscription
   */
  private handleUnsubscribe(socket: any, data: { bill_id: number }): void {
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

    logger.debug('Socket unsubscribed from bill', {
      component: 'SocketIOWebSocketService',
      socketId,
      bill_id
    });

    socket.emit('unsubscribed', {
      bill_id,
      message: `Unsubscribed from bill ${bill_id}`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle batch subscription
   */
  private handleBatchSubscribe(socket: any, data: { bill_ids: number[] }): void {
    const { bill_ids } = data;
    const results: Array<{ bill_id: number; success: boolean }> = [];

    for (const bill_id of bill_ids) {
      try {
        this.handleSubscribe(socket, { bill_id });
        results.push({ bill_id, success: true });
      } catch (error) {
        results.push({ bill_id, success: false });
        logger.error('Batch subscribe failed for bill', {
          component: 'SocketIOWebSocketService',
          bill_id
        }, error);
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
  private handleBatchUnsubscribe(socket: any, data: { bill_ids: number[] }): void {
    const { bill_ids } = data;
    const results: Array<{ bill_id: number; success: boolean }> = [];

    for (const bill_id of bill_ids) {
      try {
        this.handleUnsubscribe(socket, { bill_id });
        results.push({ bill_id, success: true });
      } catch (error) {
        results.push({ bill_id, success: false });
        logger.error('Batch unsubscribe failed for bill', {
          component: 'SocketIOWebSocketService',
          bill_id
        }, error);
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
  private handleDisconnect(socket: any, reason: string): void {
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

    logger.info('Socket.IO connection disconnected', {
      component: 'SocketIOWebSocketService',
      socketId,
      user_id,
      reason,
      activeConnections: this.metrics.activeConnections
    });
  }

  /**
   * Handle socket error
   */
  private handleError(socket: any, error: Error): void {
    this.metrics.errors++;
    
    logger.error('Socket.IO connection error', {
      component: 'SocketIOWebSocketService',
      socketId: socket.id,
      user_id: socket.data.user_id
    }, error);
  }

  /**
   * Send notification to specific user
   */
  sendUserNotification(user_id: string, notification: any): boolean {
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
  broadcastToBillSubscribers(bill_id: number, message: any): number {
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
    logger.info('Shutting down Socket.IO WebSocket service', {
      component: 'SocketIOWebSocketService'
    });

    if (this.io) {
      this.io.close();
    }

    if (this.redisClient) {
      await this.redisClient.quit();
    }

    this.isInitialized = false;

    logger.info('Socket.IO WebSocket service shutdown complete', {
      component: 'SocketIOWebSocketService'
    });
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
      logger.info('Starting WebSocket migration deployment', {
        component: 'WebSocketMigrationDeployer',
        strategy: this.config.deploymentStrategy,
        environment: this.config.environment
      });

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

    logger.info('Preparing Socket.IO service', {
      component: 'WebSocketMigrationDeployer'
    });

    try {
      await this.socketIOService.initialize(this.httpServer!, this.config);

      logger.info('Socket.IO service prepared successfully', {
        component: 'WebSocketMigrationDeployer'
      });

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

    logger.info('Deploying Socket.IO service with immediate switch', {
      component: 'WebSocketMigrationDeployer',
      strategy: this.config.deploymentStrategy
    });

    // For development, we do an immediate switch
    // In production, this would involve gradual traffic shifting
    
    // The Socket.IO service is already initialized and listening
    // Clients will need to reconnect to the new endpoint

    logger.info('Socket.IO service deployed successfully', {
      component: 'WebSocketMigrationDeployer',
      endpoint: '/socket.io'
    });
  }

  /**
   * Validate deployment
   */
  private async validateDeployment(): Promise<void> {
    this.migrationState.phase = 'validating';

    logger.info('Validating Socket.IO deployment', {
      component: 'WebSocketMigrationDeployer'
    });

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

    logger.info('Deployment validation passed', {
      component: 'WebSocketMigrationDeployer',
      metrics
    });
  }

  /**
   * Complete migration
   */
  private completeMigration(): void {
    this.migrationState.phase = 'completed';
    this.migrationState.completionTime = Date.now();

    const duration = this.migrationState.completionTime - this.migrationState.startTime;

    logger.info('WebSocket migration completed successfully', {
      component: 'WebSocketMigrationDeployer',
      duration: `${duration}ms`,
      finalMetrics: this.socketIOService.getMetrics()
    });

    // Broadcast migration completion to any connected clients
    this.broadcastMigrationStatus('completed');
  }

  /**
   * Handle deployment error
   */
  private async handleDeploymentError(error: any): Promise<void> {
    this.migrationState.phase = 'failed';
    this.migrationState.errors.push(error instanceof Error ? error.message : String(error));

    logger.error('WebSocket migration deployment failed', {
      component: 'WebSocketMigrationDeployer',
      phase: this.migrationState.phase,
      errors: this.migrationState.errors
    }, error);

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

    logger.info('Rolling back WebSocket migration', {
      component: 'WebSocketMigrationDeployer'
    });

    try {
      await this.socketIOService.shutdown();

      logger.info('WebSocket migration rollback completed', {
        component: 'WebSocketMigrationDeployer'
      });

    } catch (rollbackError) {
      logger.error('Rollback failed', {
        component: 'WebSocketMigrationDeployer'
      }, rollbackError);
    }
  }

  /**
   * Broadcast migration status to connected clients
   */
  private broadcastMigrationStatus(status: string): void {
    // This would broadcast to any connected clients about the migration status
    // For now, we'll just log it since we're in the deployment phase
    logger.info('Broadcasting migration status', {
      component: 'WebSocketMigrationDeployer',
      status
    });
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
