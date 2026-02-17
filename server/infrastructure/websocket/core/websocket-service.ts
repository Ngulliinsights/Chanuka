/**
 * WebSocket Service - Main Orchestrator
 * 
 * The main service class that coordinates all WebSocket functionality including
 * connection management, message processing, memory management, and monitoring.
 * Provides a clean interface for service lifecycle management and component integration.
 */

import { IncomingMessage,Server } from 'http';
import { logger } from '@shared/core';

import { WebSocketServer } from 'ws';

import { BatchingService } from '../batching/batching-service';
import { BASE_CONFIG } from '../config/base-config';
import { RuntimeConfig } from '../config/runtime-config';
import type {
  AuthenticatedWebSocket,
  ConnectionStats,
  HealthStatus,
  IConnectionManager,
  IHealthChecker,
  IMemoryManager,
  IMessageHandler,
  IStatisticsCollector,
  VerifyClientInfo,
  WebSocketMessage,
} from '../types';

/**
 * WebSocket service initialization options
 */
export interface WebSocketServiceOptions {
  port?: number;
  path?: string;
  maxPayload?: number;
  verifyClient?: (info: VerifyClientInfo) => boolean;
  jwtSecret?: string;
}

/**
 * Service lifecycle states
 */
export type ServiceState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

/**
 * Service event types
 */
export interface ServiceEvents {
  stateChange: (state: ServiceState) => void;
  error: (error: Error) => void;
  connection: (ws: AuthenticatedWebSocket) => void;
  disconnection: (ws: AuthenticatedWebSocket) => void;
  message: (ws: AuthenticatedWebSocket, message: WebSocketMessage) => void;
}

/**
 * Main WebSocket service orchestrator that coordinates all components
 * and provides a unified interface for WebSocket functionality.
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private server: Server | null = null;
  private state: ServiceState = 'stopped';
  private readonly options: Required<WebSocketServiceOptions>;

  // Component dependencies
  private readonly connectionManager: IConnectionManager;
  private readonly messageHandler: IMessageHandler;
  private readonly memoryManager: IMemoryManager;
  private readonly statisticsCollector: IStatisticsCollector;
  private readonly healthChecker: IHealthChecker;
  private readonly runtimeConfig: RuntimeConfig;
  private readonly batchingService: BatchingService;

  // Service intervals and timers
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private shutdownTimeout: NodeJS.Timeout | null = null;

  // Event listeners
  private readonly eventListeners: Partial<ServiceEvents> = {};

  constructor(
    connectionManager: IConnectionManager,
    messageHandler: IMessageHandler,
    memoryManager: IMemoryManager,
    statisticsCollector: IStatisticsCollector,
    healthChecker: IHealthChecker,
    runtimeConfig: RuntimeConfig,
    batchingService?: BatchingService,
    options: WebSocketServiceOptions = {}
  ) {
    // Store component dependencies
    this.connectionManager = connectionManager;
    this.messageHandler = messageHandler;
    this.memoryManager = memoryManager;
    this.statisticsCollector = statisticsCollector;
    this.healthChecker = healthChecker;
    this.runtimeConfig = runtimeConfig;
    this.batchingService = batchingService || new BatchingService();

    // Set up service options with defaults
    this.options = {
      port: options.port || 8080,
      path: options.path || '/ws',
      maxPayload: options.maxPayload || BASE_CONFIG.MAX_PAYLOAD,
      verifyClient: options.verifyClient || this.defaultVerifyClient.bind(this),
      jwtSecret: options.jwtSecret || process.env.JWT_SECRET || '',
    };

    // Validate required options
    if (!this.options.jwtSecret) {
      throw new Error('JWT secret is required for WebSocket service');
    }

    // Set up runtime config listeners
    this.runtimeConfig.addChangeListener(this.handleConfigChange.bind(this));
  }

  /**
   * Initialize and start the WebSocket service
   */
  async initialize(server?: Server): Promise<void> {
    if (this.state !== 'stopped') {
      throw new Error(`Cannot initialize service in state: ${this.state}`);
    }

    try {
      this.setState('starting');
      this.server = server || null;

      // Create WebSocket server
      await this.createWebSocketServer();

      // Start component services
      await this.startComponentServices();

      // Set up service intervals
      this.setupServiceIntervals();

      // Set up graceful shutdown handlers
      this.setupShutdownHandlers();

      this.setState('running');
      this.logInfo('WebSocket service initialized successfully');

    } catch (error) {
      this.setState('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logError('Failed to initialize WebSocket service:', error);
      throw new Error(`WebSocket service initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Gracefully shutdown the WebSocket service
   */
  async shutdown(): Promise<void> {
    if (this.state === 'stopped' || this.state === 'stopping') {
      return;
    }

    try {
      this.setState('stopping');
      this.logInfo('Starting graceful shutdown...');

      // Set shutdown timeout
      const shutdownPromise = new Promise<void>((resolve) => {
        this.shutdownTimeout = setTimeout(() => {
          this.logWarn('Shutdown timeout reached, forcing shutdown');
          resolve();
        }, BASE_CONFIG.SHUTDOWN_GRACE_PERIOD);
      });

      // Stop accepting new connections
      if (this.wss) {
        this.wss.close();
      }

      // Stop service intervals
      this.clearServiceIntervals();

      // Stop component services
      await this.stopComponentServices();

      // Close all existing connections
      await this.closeAllConnections();

      // Clear shutdown timeout
      if (this.shutdownTimeout) {
        clearTimeout(this.shutdownTimeout);
        this.shutdownTimeout = null;
      }

      // Wait for shutdown timeout or completion
      await Promise.race([shutdownPromise, Promise.resolve()]);

      this.setState('stopped');
      this.logInfo('WebSocket service shutdown completed');

    } catch (error) {
      this.setState('error');
      this.logError('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get current service state
   */
  getState(): ServiceState {
    return this.state;
  }

  /**
   * Get service health status
   */
  getHealthStatus(): HealthStatus {
    return this.healthChecker.getHealthStatus();
  }

  /**
   * Get service statistics
   */
  getStatistics(): ConnectionStats {
    return this.statisticsCollector.getMetrics();
  }

  /**
   * Get service configuration
   */
  getConfiguration(): {
    options: Required<WebSocketServiceOptions>;
    runtimeConfig: Record<string, unknown>;
    baseConfig: Record<string, unknown>;
  } {
    return {
      options: { ...this.options },
      runtimeConfig: this.runtimeConfig.toObject() as unknown as Record<string, unknown>,
      baseConfig: { ...BASE_CONFIG },
    };
  }

  /**
   * Broadcast message to all subscribers of a bill
   */
  broadcastToBill(billId: number, message: Record<string, unknown>): void {
    if (this.state !== 'running') {
      this.logWarn('Cannot broadcast message: service not running');
      return;
    }

    try {
      this.messageHandler.broadcastToSubscribers(billId, message);
      this.statisticsCollector.recordBroadcast();
    } catch (error) {
      this.logError('Error broadcasting message:', error);
    }
  }

  /**
   * Add event listener
   */
  on<K extends keyof ServiceEvents>(event: K, listener: ServiceEvents[K]): void {
    this.eventListeners[event] = listener;
  }

  /**
   * Remove event listener
   */
  off<K extends keyof ServiceEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  /**
   * Force a health check
   */
  async forceHealthCheck(): Promise<HealthStatus> {
    return await this.healthChecker.performHealthCheck();
  }

  /**
   * Get detailed service status
   */
  getServiceStatus(): {
    state: ServiceState;
    uptime: number;
    connections: number;
    health: HealthStatus;
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
  } {
    const memoryUsage = process.memoryUsage();
    const stats = this.statisticsCollector.getMetrics();

    return {
      state: this.state,
      uptime: Date.now() - stats.startTime,
      connections: this.connectionManager.getConnectionCount(),
      health: this.healthChecker.getHealthStatus(),
      memory: memoryUsage,
    };
  }

  /**
   * Create and configure WebSocket server
   */
  private async createWebSocketServer(): Promise<void> {
    const wsOptions = {
      ...(this.server ? { server: this.server } : { port: this.options.port }),
      path: this.options.path,
      maxPayload: this.options.maxPayload,
      verifyClient: this.options.verifyClient,
    };

    this.wss = new WebSocketServer(wsOptions);

    // Set up WebSocket server event handlers
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));
    this.wss.on('close', this.handleServerClose.bind(this));

    this.logInfo(`WebSocket server created on ${this.server ? 'attached server' : `port ${this.options.port}`}`);
  }

  /**
   * Start all component services
   */
  private async startComponentServices(): Promise<void> {
    // Start memory management
    this.memoryManager.startMonitoring();

    // Start health checking
    this.healthChecker.startHealthChecks();

    this.logInfo('Component services started');
  }

  /**
   * Stop all component services
   */
  private async stopComponentServices(): Promise<void> {
    // Stop health checking
    this.healthChecker.stopHealthChecks();

    // Stop memory management
    this.memoryManager.stopMonitoring();

    this.logInfo('Component services stopped');
  }

  /**
   * Set up service intervals for heartbeat and cleanup
   */
  private setupServiceIntervals(): void {
    // Set up heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, BASE_CONFIG.HEARTBEAT_INTERVAL);

    // Set up cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.runtimeConfig.get('MEMORY_CLEANUP_INTERVAL'));
  }

  /**
   * Clear all service intervals
   */
  private clearServiceIntervals(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: AuthenticatedWebSocket, _request: IncomingMessage): void {
    try {
      // Add connection to manager
      this.connectionManager.addConnection(ws);

      // Update statistics
      this.statisticsCollector.updateConnectionCount(
        this.connectionManager.getConnectionCount()
      );

      // Set up connection event handlers
      this.setupConnectionHandlers(ws);

      // Emit connection event
      this.emit('connection', ws);

      this.logDebug(`New connection established: ${ws.connectionId}`);

    } catch (error) {
      this.logError('Error handling new connection:', error);
      ws.terminate();
    }
  }

  /**
   * Set up event handlers for a WebSocket connection
   */
  private setupConnectionHandlers(ws: AuthenticatedWebSocket): void {
    // Handle incoming messages
    ws.on('message', async (data: Buffer) => {
      const startTime = Date.now();

      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;

        // Handle message through message handler
        await this.messageHandler.handleMessage(ws, message);

        // Record message processing latency
        const latency = Date.now() - startTime;
        this.statisticsCollector.recordMessageProcessed(latency);

        // Emit message event
        this.emit('message', ws, message);

      } catch (error) {
        this.logError('Error processing message:', error);
        this.statisticsCollector.recordDroppedMessage();
      }
    });

    // Handle connection close
    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    // Handle connection errors
    ws.on('error', (error) => {
      this.logError(`Connection error for ${ws.connectionId}:`, error);
      this.handleDisconnection(ws);
    });

    // Handle pong responses
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastPing = Date.now();
    });
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnection(ws: AuthenticatedWebSocket): void {
    try {
      // Remove connection from manager
      this.connectionManager.removeConnection(ws);

      // Clean up message handler resources
      this.messageHandler.cleanup(ws);

      // Update statistics
      this.statisticsCollector.updateConnectionCount(
        this.connectionManager.getConnectionCount()
      );

      // Emit disconnection event
      this.emit('disconnection', ws);

      this.logDebug(`Connection closed: ${ws.connectionId}`);

    } catch (error) {
      this.logError('Error handling disconnection:', error);
    }
  }

  /**
   * Handle WebSocket server errors
   */
  private handleServerError(error: Error): void {
    this.logError('WebSocket server error:', error);
    this.emit('error', error);
  }

  /**
   * Handle WebSocket server close
   */
  private handleServerClose(): void {
    this.logInfo('WebSocket server closed');
  }

  /**
   * Perform heartbeat check on all connections
   */
  private performHeartbeat(): void {
    if (this.state !== 'running') {
      return;
    }

    try {
      // This would be implemented by iterating through connections
      // For now, we delegate to connection manager cleanup
      this.connectionManager.cleanup();
    } catch (error) {
      this.logError('Error during heartbeat:', error);
    }
  }

  /**
   * Perform periodic cleanup operations
   */
  private performCleanup(): void {
    if (this.state !== 'running') {
      return;
    }

    try {
      // Trigger memory cleanup
      this.memoryManager.performCleanup();

      // Trigger connection cleanup
      this.connectionManager.cleanup();

    } catch (error) {
      this.logError('Error during cleanup:', error);
    }
  }

  /**
   * Close all active connections gracefully
   */
  private async closeAllConnections(): Promise<void> {
    if (!this.wss) {
      return;
    }

    const closePromises: Promise<void>[] = [];

    this.wss.clients.forEach((ws) => {
      const closePromise = new Promise<void>((resolve) => {
        if (ws.readyState === ws.OPEN) {
          ws.close(1001, 'Server shutting down');
        }

        const timeout = setTimeout(() => {
          ws.terminate();
          resolve();
        }, 5000); // 5 second timeout

        ws.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      closePromises.push(closePromise);
    });

    await Promise.all(closePromises);
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdownHandler = () => {
      this.shutdown().catch((error) => {
        this.logError('Error during shutdown:', error);
        process.exit(1);
      });
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
  }

  /**
   * Handle runtime configuration changes
   */
  private handleConfigChange(): void {
    // Restart cleanup interval with new configuration
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = setInterval(() => {
        this.performCleanup();
      }, this.runtimeConfig.get('MEMORY_CLEANUP_INTERVAL'));
    }
  }

  /**
   * Default client verification function
   */
  private defaultVerifyClient(_info: VerifyClientInfo): boolean {
    // Basic verification - can be overridden via options
    return true;
  }

  /**
   * Set service state and emit state change event
   */
  private setState(newState: ServiceState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.emit('stateChange', newState);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit<K extends keyof ServiceEvents>(event: K, ...args: Parameters<ServiceEvents[K]>): void {
    const listener = this.eventListeners[event];
    if (listener) {
      try {
        // TODO: Replace 'any' with proper type definition
(listener as (...args: unknown[]) => void)(...args);
      } catch (error) {
        this.logError(`Error in ${event} event listener:`, error);
      }
    }
  }

  /**
   * Log info message
   */
  private logInfo(message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[WebSocketService] ${message}`);
    }
  }

  /**
   * Log debug message
   */
  private logDebug(message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[WebSocketService] ${message}`);
    }
  }

  /**
   * Log warning message
   */
  private logWarn(message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(`[WebSocketService] ${message}`);
    }
  }

  /**
   * Log error message
   */
  private logError(message: string, error?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      logger.error(`[WebSocketService] ${message}`, error);
    }
  }
}