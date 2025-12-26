/**
 * WebSocket Infrastructure - Main Entry Point
 * 
 * Provides a clean, modular WebSocket service with:
 * - Connection management
 * - Memory optimization
 * - Real-time messaging
 * - Health monitoring
 */

import { Server } from 'http';

import { NativeWebSocketAdapter, RedisAdapter,SocketIOAdapter, WebSocketAdapter } from './adapters';
// Import consolidated components
import { BatchingService } from './batching/batching-service';
import { BASE_CONFIG } from './config/base-config';
import { RuntimeConfig } from './config/runtime-config';
import { ConnectionManager } from './core/connection-manager';
import { MessageHandler } from './core/message-handler';
import { OperationQueueManager } from './core/operation-queue-manager';
import { SubscriptionManager } from './core/subscription-manager';
// Import all components
import { WebSocketService } from './core/websocket-service';
import { LeakDetectorHandler } from './memory/leak-detector-handler';
import { MemoryManager } from './memory/memory-manager';
import { ProgressiveDegradation } from './memory/progressive-degradation';
import { HealthChecker } from './monitoring/health-checker';
import { MetricsReporter } from './monitoring/metrics-reporter';
import { StatisticsCollector } from './monitoring/statistics-collector';
// Import types
import type {
  AuthenticatedWebSocket,
  IConnectionManager,
  IHealthChecker,
  IMemoryManager,
  IMessageHandler,
  IStatisticsCollector,
  ISubscriptionManager,
  QueueOperation,
} from './types';
import { CircularBuffer } from './utils/circular-buffer';
import { LRUCache } from './utils/lru-cache';
import { PriorityQueue } from './utils/priority-queue';

// Main service
export { WebSocketService } from './core/websocket-service';

// Core components
export {
  ConnectionManager,
  MessageHandler,
  SubscriptionManager,
  OperationQueueManager
} from './core';

// Memory management
export {
  MemoryManager,
  LeakDetectorHandler,
  ProgressiveDegradation
} from './memory';

// Monitoring
export {
  StatisticsCollector,
  HealthChecker,
  MetricsReporter
} from './monitoring';

// Configuration
export { BASE_CONFIG, RuntimeConfig } from './config';

// Utilities
export { PriorityQueue, LRUCache, CircularBuffer } from './utils';

// Consolidated components (moved from other modules)
export { BatchingService } from './batching';
export { WebSocketAdapter, NativeWebSocketAdapter, SocketIOAdapter, RedisAdapter } from './adapters';

// Types
export type {
  AuthenticatedWebSocket,
  WebSocketMessage,
  MessageData,
  VerifyClientInfo,
  ConnectionPoolEntry,
  MemoryLeakData,
  MemoryPressureData,
  ConnectionStats,
  BillUpdateNotification,
  QueueOperation,
  HealthStatus,
  MetricsReport,
  DegradationLevel,
  BaseConfigType,
  RuntimeConfigType,
  // Service interfaces
  IConnectionManager,
  IMessageHandler,
  ISubscriptionManager,
  IOperationQueueManager,
  IMemoryManager,
  IStatisticsCollector,
  IHealthChecker,
  IMetricsReporter,
  ILeakDetectorHandler,
  IProgressiveDegradation,
  // Utility interfaces
  IPriorityQueue,
  ILRUCache,
  ICircularBuffer
} from './types';

/**
 * Backward compatible wrapper for the WebSocket service
 * Maintains the same API as the original monolithic service
 */
class BackwardCompatibleWebSocketService {
  private service: WebSocketService;
  private connectionManager: IConnectionManager;
  private messageHandler: IMessageHandler;
  private subscriptionManager: ISubscriptionManager;
  private memoryManager: IMemoryManager;
  private statisticsCollector: IStatisticsCollector;
  private healthChecker: IHealthChecker;

  constructor(
    service: WebSocketService,
    connectionManager: IConnectionManager,
    messageHandler: IMessageHandler,
    subscriptionManager: ISubscriptionManager,
    memoryManager: IMemoryManager,
    statisticsCollector: IStatisticsCollector,
    healthChecker: IHealthChecker
  ) {
    this.service = service;
    this.connectionManager = connectionManager;
    this.messageHandler = messageHandler;
    this.subscriptionManager = subscriptionManager;
    this.memoryManager = memoryManager;
    this.statisticsCollector = statisticsCollector;
    this.healthChecker = healthChecker;
  }

  /**
   * Initialize the WebSocket service
   * @param server HTTP server instance
   */
  initialize(server: Server): void {
    this.service.initialize(server).catch((error: Error) => {
      throw error;
    });
  }

  /**
   * Gracefully shutdown the WebSocket service
   */
  async shutdown(): Promise<void> {
    return this.service.shutdown();
  }

  /**
   * Get comprehensive service statistics
   */
  getStats(): Record<string, unknown> {
    const stats = this.statisticsCollector.getMetrics();
    const serviceStatus = this.service.getServiceStatus();
    
    return {
      totalConnections: stats.totalConnections,
      activeConnections: stats.activeConnections,
      totalMessages: stats.totalMessages,
      totalBroadcasts: stats.totalBroadcasts,
      droppedMessages: stats.droppedMessages,
      duplicateMessages: stats.duplicateMessages,
      queueOverflows: stats.queueOverflows,
      reconnections: stats.reconnections,
      startTime: stats.startTime,
      lastActivity: stats.lastActivity,
      peakConnections: stats.peakConnections,
      uniqueUsers: stats.uniqueUsers || 0,
      averageLatency: stats.averageLatency || 0,
      memoryUsage: stats.memoryUsage || 0,
      uptime: serviceStatus.uptime,
    };
  }

  /**
   * Get detailed health status
   */
  getHealthStatus(): Record<string, unknown> {
    const health = this.healthChecker.getHealthStatus();
    const serviceStatus = this.service.getServiceStatus();
    
    return {
      isHealthy: health.status === 'healthy',
      status: health.status,
      uptime: serviceStatus.uptime,
      memoryUsage: health.memoryUsage || health.metrics.memoryUsage,
      connectionHealth: health.connectionHealth || health.checks.connections,
      queueHealth: health.queueHealth || health.checks.queues,
      warnings: health.warnings || [],
      errors: health.errors || [],
      lastCheck: health.lastCheck || health.timestamp,
    };
  }

  /**
   * Get user's current subscriptions
   */
  getUserSubscriptions(user_id: string): number[] {
    // Get all connections for the user
    const connections = this.connectionManager.getConnectionsForUser(user_id);
    const subscriptions = new Set<number>();
    
    // Collect all subscriptions from all user connections
    for (const ws of connections) {
      const connectionSubs = this.subscriptionManager.getSubscriptionsForConnection(ws);
      for (const billId of connectionSubs) {
        subscriptions.add(billId);
      }
    }
    
    return Array.from(subscriptions);
  }

  /**
   * Check if user is currently connected
   */
  isUserConnected(user_id: string): boolean {
    const connections = this.connectionManager.getConnectionsForUser(user_id);
    return connections.length > 0 && connections.some((ws: any) => ws.readyState === ws.OPEN);
  }

  /**
   * Get number of active connections for a user
   */
  getConnectionCount(user_id: string): number {
    const connections = this.connectionManager.getConnectionsForUser(user_id);
    return connections.filter((ws: any) => ws.readyState === ws.OPEN).length;
  }

  /**
   * Get all currently connected user IDs
   */
  getAllConnectedUsers(): string[] {
    // This method needs to be implemented by iterating through all connections
    // Since we don't have direct access to the connection pool, we'll need to
    // add this method to the ConnectionManager interface
    // For now, return empty array - this would need to be implemented in ConnectionManager
    return [];
  }

  /**
   * Get subscriptions for a specific connection (internal method for compatibility)
   */
  private getSubscriptionsForConnection(ws: AuthenticatedWebSocket): number[] {
    return this.subscriptionManager.getSubscriptionsForConnection(ws);
  }

  /**
   * Get all user IDs subscribed to a specific bill
   */
  getBillSubscribers(bill_id: number): string[] {
    const subscribers = this.subscriptionManager.getSubscribers(bill_id);
    const userIds = new Set<string>();
    
    for (const ws of subscribers) {
      if (ws.user_id && ws.readyState === ws.OPEN) {
        userIds.add(ws.user_id);
      }
    }
    
    return Array.from(userIds);
  }

  /**
   * Broadcast bill update to all subscribers
   */
  broadcastBillUpdate(billId: number, message: Record<string, unknown>): void {
    this.service.broadcastToBill(billId, message);
  }

  /**
   * Send notification to a specific user
   */
  sendUserNotification(user_id: string, message: Record<string, unknown>): void {
    // Get all connections for the user
    const connections = this.connectionManager.getConnectionsForUser(user_id);
    
    // Send message to all active connections
    for (const ws of connections) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: 'notification',
            data: message,
            timestamp: new Date().toISOString(),
          }));
        } catch (error) {
          // Log error but continue with other connections
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error(`Failed to send notification to user ${user_id}:`, error);
          }
        }
      }
    }
  }

  /**
   * Force memory analysis and return detailed breakdown
   */
  forceMemoryAnalysis(): Record<string, unknown> {
    const memUsage = process.memoryUsage();
    const stats = this.statisticsCollector.getMetrics();
    
    return {
      process: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      },
      service: {
        connections: stats.totalConnections,
        memoryUsage: stats.memoryUsage || 0,
        averageLatency: stats.averageLatency || 0,
      },
      analysis: {
        heapUsedPercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(message: { type: string; data: Record<string, unknown>; timestamp?: Date }): void {
    // This would need to be implemented by getting all connections and sending to each
    // For now, we'll use a placeholder implementation
    const formattedMessage = {
      ...message,
      timestamp: message.timestamp || new Date(),
    };
    
    // This is a simplified implementation - in practice, we'd need access to all connections
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('Broadcasting to all clients:', formattedMessage);
    }
  }

  /**
   * Get service metrics grouped by category
   */
  getMetrics(): Record<string, Record<string, number>> {
    const stats = this.statisticsCollector.getMetrics();
    
    return {
      connections: {
        total: stats.totalConnections,
        active: stats.activeConnections,
        peak: stats.peakConnections,
        unique_users: stats.uniqueUsers || 0,
      },
      messages: {
        total: stats.totalMessages,
        broadcasts: stats.totalBroadcasts,
        dropped: stats.droppedMessages,
        duplicates: stats.duplicateMessages,
        queue_overflows: stats.queueOverflows,
      },
      performance: {
        average_latency: stats.averageLatency || 0,
        memory_usage: stats.memoryUsage || 0,
        reconnections: stats.reconnections,
      },
    };
  }

  /**
   * Cleanup resources (used during graceful shutdown)
   */
  cleanup(): void {
    this.connectionManager.cleanup();
    this.memoryManager.cleanup();
  }
}

// Factory function for backward compatibility
export function createWebSocketService(): BackwardCompatibleWebSocketService {
  // Create all required components with default configurations
  const runtimeConfig = new RuntimeConfig();
  
  // Create utility components
  const priorityQueue = new PriorityQueue<QueueOperation>(BASE_CONFIG.MAX_QUEUE_SIZE);
  const lruCache = new LRUCache<string, boolean>(runtimeConfig.get('DEDUPE_CACHE_SIZE'));
  const circularBuffer = new CircularBuffer<number>(BASE_CONFIG.MAX_LATENCY_SAMPLES);
  
  // Create core components
  const connectionManager = new ConnectionManager(runtimeConfig);
  const subscriptionManager = new SubscriptionManager();
  const operationQueueManager = new OperationQueueManager(
    BASE_CONFIG.MAX_QUEUE_SIZE,
    runtimeConfig.get('MESSAGE_BATCH_SIZE'),
    runtimeConfig.get('MESSAGE_BATCH_DELAY')
  );
  const messageHandler = new MessageHandler(
    subscriptionManager,
    operationQueueManager,
    {
      dedupeCacheSize: runtimeConfig.get('DEDUPE_CACHE_SIZE'),
      dedupeWindow: runtimeConfig.get('DEDUPE_WINDOW'),
      batchSize: runtimeConfig.get('MESSAGE_BATCH_SIZE'),
      batchDelay: runtimeConfig.get('MESSAGE_BATCH_DELAY')
    }
  );
  
  // Create memory management components
  const progressiveDegradation = new ProgressiveDegradation(runtimeConfig);
  const leakDetectorHandler = new LeakDetectorHandler(connectionManager, progressiveDegradation);
  const memoryManager = new MemoryManager(
    progressiveDegradation,
    leakDetectorHandler,
    runtimeConfig,
    connectionManager
  );
  
  // Create monitoring components
  const statisticsCollector = new StatisticsCollector(BASE_CONFIG.MAX_LATENCY_SAMPLES);
  const healthChecker = new HealthChecker(
    statisticsCollector,
    connectionManager,
    operationQueueManager
  );
  const metricsReporter = new MetricsReporter(
    statisticsCollector,
    healthChecker,
    connectionManager,
    operationQueueManager
  );
  
  // Create the main service
  const webSocketService = new WebSocketService(
    connectionManager,
    messageHandler,
    memoryManager,
    statisticsCollector,
    healthChecker,
    runtimeConfig
  );
  
  // Return backward compatible wrapper
  return new BackwardCompatibleWebSocketService(
    webSocketService,
    connectionManager,
    messageHandler,
    subscriptionManager,
    memoryManager,
    statisticsCollector,
    healthChecker
  );
}

// Export the backward compatible service class (remove duplicate)
// export { BackwardCompatibleWebSocketService };

/**
 * Unified WebSocket Service Factory
 * Creates WebSocket services with different transport adapters
 */
export interface UnifiedServiceConfig {
  adapter?: 'native' | 'socketio';
  redis?: {
    enabled: boolean;
    url?: string;
    config?: any;
  };
  config?: any;
}

/**
 * Create a unified WebSocket service with the specified adapter
 */
export function createUnifiedWebSocketService(config: UnifiedServiceConfig = {}): BackwardCompatibleWebSocketService {
  const adapterType = config.adapter || 'native';
  
  logger.info('Creating unified WebSocket service', {
    component: 'WebSocketServiceFactory',
    adapter: adapterType,
    redisEnabled: config.redis?.enabled || false
  });

  // Create the standard WebSocket service components
  const service = createWebSocketService();

  // If Redis is enabled, set up Redis adapter for scaling
  if (config.redis?.enabled) {
    const redisAdapter = new RedisAdapter({
      redisUrl: config.redis.url,
      ...config.redis.config
    });

    // Initialize Redis adapter
    redisAdapter.connect().catch(error => {
      logger.error('Failed to connect Redis adapter', {
        component: 'WebSocketServiceFactory'
      }, error);
    });

    // Set up Redis message handlers for cross-server communication
    redisAdapter.onMessage('bill_update', (message) => {
      const { billId, update } = message.data;
      service.broadcastBillUpdate(billId, update);
    });

    redisAdapter.onMessage('user_notification', (message) => {
      const { userId, notification } = message.data;
      service.sendUserNotification(userId, notification);
    });

    redisAdapter.onMessage('broadcast', (message) => {
      const { message: broadcastMessage } = message.data;
      service.broadcastToAll(broadcastMessage);
    });

    // Extend service with Redis capabilities
    const originalBroadcastBillUpdate = service.broadcastBillUpdate.bind(service);
    service.broadcastBillUpdate = (billId: number, update: any) => {
      // Broadcast locally
      originalBroadcastBillUpdate(billId, update);
      // Broadcast to other servers via Redis
      redisAdapter.publishBillUpdate(billId, update).catch(error => {
        logger.error('Failed to publish bill update to Redis', {
          component: 'WebSocketServiceFactory',
          billId
        }, error);
      });
    };

    const originalSendUserNotification = service.sendUserNotification.bind(service);
    service.sendUserNotification = (userId: string, notification: any) => {
      // Send locally
      originalSendUserNotification(userId, notification);
      // Send to other servers via Redis
      redisAdapter.publishUserNotification(userId, notification).catch(error => {
        logger.error('Failed to publish user notification to Redis', {
          component: 'WebSocketServiceFactory',
          userId
        }, error);
      });
    };

    const originalBroadcastToAll = service.broadcastToAll.bind(service);
    service.broadcastToAll = (message: any) => {
      // Broadcast locally
      originalBroadcastToAll(message);
      // Broadcast to other servers via Redis
      redisAdapter.publishBroadcast(message).catch(error => {
        logger.error('Failed to publish broadcast to Redis', {
          component: 'WebSocketServiceFactory'
        }, error);
      });
    };

    // Add Redis adapter to service for cleanup
    const originalShutdown = service.shutdown.bind(service);
    service.shutdown = async () => {
      await redisAdapter.shutdown();
      return originalShutdown();
    };
  }

  return service;
}

/**
 * Create a Socket.IO based WebSocket service
 * This provides an alternative transport while maintaining the same API
 */
export function createSocketIOWebSocketService(config: UnifiedServiceConfig = {}): SocketIOAdapter {
  logger.info('Creating Socket.IO WebSocket service', {
    component: 'WebSocketServiceFactory',
    redisEnabled: config.redis?.enabled || false
  });

  const socketIOAdapter = new SocketIOAdapter({
    redisUrl: config.redis?.url,
    ...config.config
  });

  // If Redis is enabled for scaling
  if (config.redis?.enabled) {
    const redisAdapter = new RedisAdapter({
      redisUrl: config.redis.url,
      ...config.redis.config
    });

    redisAdapter.connect().catch(error => {
      logger.error('Failed to connect Redis adapter for Socket.IO service', {
        component: 'WebSocketServiceFactory'
      }, error);
    });

    // Set up cross-server message handling
    redisAdapter.onMessage('bill_update', (message) => {
      const { billId, update } = message.data;
      socketIOAdapter.broadcastBillUpdate(billId, update);
    });

    redisAdapter.onMessage('user_notification', (message) => {
      const { userId, notification } = message.data;
      socketIOAdapter.sendUserNotification(userId, notification);
    });

    // Extend Socket.IO adapter with Redis capabilities
    const originalBroadcastBillUpdate = socketIOAdapter.broadcastBillUpdate.bind(socketIOAdapter);
    socketIOAdapter.broadcastBillUpdate = (billId: number, update: any) => {
      originalBroadcastBillUpdate(billId, update);
      redisAdapter.publishBillUpdate(billId, update).catch(error => {
        logger.error('Failed to publish bill update to Redis from Socket.IO', {
          component: 'WebSocketServiceFactory',
          billId
        }, error);
      });
    };

    const originalSendUserNotification = socketIOAdapter.sendUserNotification.bind(socketIOAdapter);
    socketIOAdapter.sendUserNotification = (userId: string, notification: any) => {
      originalSendUserNotification(userId, notification);
      redisAdapter.publishUserNotification(userId, notification).catch(error => {
        logger.error('Failed to publish user notification to Redis from Socket.IO', {
          component: 'WebSocketServiceFactory',
          userId
        }, error);
      });
    };

    // Add Redis cleanup to Socket.IO shutdown
    const originalShutdown = socketIOAdapter.shutdown.bind(socketIOAdapter);
    socketIOAdapter.shutdown = async () => {
      await redisAdapter.shutdown();
      return originalShutdown();
    };
  }

  return socketIOAdapter;
}

// Export the unified service class (remove duplicate)
// export { BackwardCompatibleWebSocketService };

// Convenience exports for different service types
export const UnifiedWebSocketService = BackwardCompatibleWebSocketService;
export const createWebSocketServiceWithAdapter = createUnifiedWebSocketService;
export const createScalableWebSocketService = (config: UnifiedServiceConfig) => 
  createUnifiedWebSocketService({ ...config, redis: { enabled: true, ...config.redis } });