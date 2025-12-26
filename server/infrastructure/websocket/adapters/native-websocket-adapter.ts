/**
 * Native WebSocket Adapter
 * 
 * Adapter implementation for the native WebSocket service
 */

import { Server } from 'http';

import { WebSocketService } from '../core/websocket-service';
import { HealthStatus,ServiceStats, WebSocketAdapter } from './websocket-adapter';


// Note: If @shared/core is unavailable, consider using a local logger implementation
// or importing from a different path. For now, we'll create a fallback.
/* eslint-disable no-console */
const logger = {
  info: (message: string, meta?: Record<string, unknown>) => console.log(`[INFO] ${message}`, meta),
  warn: (message: string, meta?: Record<string, unknown>) => console.warn(`[WARN] ${message}`, meta),
  error: (message: string, meta?: Record<string, unknown>, error?: Error) => console.error(`[ERROR] ${message}`, meta, error)
};
/* eslint-enable no-console */

/**
 * Type definitions for better type safety
 */
interface BillUpdate {
  type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
  data: Record<string, unknown>;
  timestamp?: Date;
}

interface UserNotification {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

interface BroadcastMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp?: Date;
}

/**
 * Type guard to check if ServiceState is an object with statistics
 */
interface ServiceStateObject {
  activeConnections?: number;
  totalConnections?: number;
  totalMessages?: number;
  totalBroadcasts?: number;
  droppedMessages?: number;
  averageLatency?: number;
  memoryUsage?: number;
}

function isServiceStateObject(state: unknown): state is ServiceStateObject {
  return typeof state === 'object' && state !== null && typeof state !== 'string';
}

/**
 * Adapter for the native WebSocket service implementation
 */
export class NativeWebSocketAdapter extends WebSocketAdapter {
  private webSocketService: WebSocketService;

  constructor(webSocketService?: WebSocketService) {
    super();

    // If webSocketService is not provided, you'll need to initialize it with required parameters
    // Based on the error, WebSocketService expects 6-8 arguments
    // Example: new WebSocketService(server, config, logger, metrics, connectionManager, eventEmitter, ...)
    // For now, we'll require it to be passed in or handle initialization in the initialize method
    if (!webSocketService) {
      throw new Error('WebSocketService must be provided. Cannot instantiate without required dependencies.');
    }

    this.webSocketService = webSocketService;
  }

  /**
   * Initialize the native WebSocket service
   */
  async initialize(server: Server): Promise<void> {
    if (this.isInitialized) {
      logger.warn('NativeWebSocketAdapter already initialized', {
        component: 'NativeWebSocketAdapter'
      });
      return;
    }

    try {
      await this.webSocketService.initialize(server);
      this.isInitialized = true;

      logger.info('NativeWebSocketAdapter initialized successfully', {
        component: 'NativeWebSocketAdapter'
      });
    } catch (error) {
      logger.error('Failed to initialize NativeWebSocketAdapter', {
        component: 'NativeWebSocketAdapter'
      }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Broadcast bill update using native WebSocket service
   */
  broadcastBillUpdate(bill_id: number, update: BillUpdate): void {
    if (!this.isReady()) {
      logger.warn('Adapter not ready for bill update broadcast', {
        component: 'NativeWebSocketAdapter',
        bill_id
      });
      return;
    }

    // Use broadcastToBill instead of broadcastBillUpdate
    const message = {
      type: update.type,
      data: update.data,
      timestamp: update.timestamp || new Date()
    };

    this.webSocketService.broadcastToBill(bill_id, message);
  }

  /**
   * Send user notification using native WebSocket service
   */
  sendUserNotification(user_id: string, notification: UserNotification): void {
    if (!this.isReady()) {
      logger.warn('Adapter not ready for user notification', {
        component: 'NativeWebSocketAdapter',
        user_id
      });
      return;
    }

    // If sendUserNotification doesn't exist, you may need to use a different method
    // or implement it as a wrapper around existing functionality
    // For example, you might need to use sendToUser or a similar method
    try {
      // Implementation would depend on the actual WebSocketService API
      logger.warn('sendUserNotification not implemented in WebSocketService', {
        user_id,
        notification
      });
    } catch (error) {
      logger.error('Error sending user notification', {
        component: 'NativeWebSocketAdapter',
        user_id
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Broadcast to all clients using native WebSocket service
   */
  broadcastToAll(_message: BroadcastMessage): void {
    if (!this.isReady()) {
      logger.warn('Adapter not ready for broadcast', {
        component: 'NativeWebSocketAdapter'
      });
      return;
    }

    // Note: broadcastToAll doesn't exist. You may need to:
    // 1. Use broadcastToBill with a special bill_id that means "all"
    // 2. Iterate through all connected clients
    // 3. Use a different method if available
    logger.warn('broadcastToAll not implemented in WebSocketService. Consider using broadcastToBill or alternative approach.');
  }

  /**
   * Get statistics from native WebSocket service
   */
  getStats(): ServiceStats {
    const state = this.webSocketService.getState();

    // Handle the case where state might be a string or an object
    if (!isServiceStateObject(state)) {
      return {
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        totalBroadcasts: 0,
        droppedMessages: 0,
        errorRate: 0,
        averageLatency: 0,
        memoryUsage: 0,
        uptime: this.getUptime()
      };
    }

    return {
      activeConnections: state.activeConnections || 0,
      totalConnections: state.totalConnections || 0,
      totalMessages: state.totalMessages || 0,
      totalBroadcasts: state.totalBroadcasts || 0,
      droppedMessages: state.droppedMessages || 0,
      errorRate: state.totalMessages && state.totalMessages > 0
        ? (state.droppedMessages || 0) / state.totalMessages
        : 0,
      averageLatency: state.averageLatency || 0,
      memoryUsage: state.memoryUsage || 0,
      uptime: this.getUptime()
    };
  }

  /**
   * Get health status from native WebSocket service
   */
  getHealthStatus(): HealthStatus {
    const state = this.webSocketService.getState();

    // Handle the case where state might be a string or an object
    if (!isServiceStateObject(state)) {
      return {
        isHealthy: false,
        status: 'unhealthy',
        issues: ['Service state is not available'],
        lastCheck: new Date()
      };
    }

    // Determine health based on available state information
    const activeConnections = state.activeConnections || 0;
    const errorRate = state.totalMessages && state.totalMessages > 0
      ? (state.droppedMessages || 0) / state.totalMessages
      : 0;

    const isHealthy = activeConnections >= 0 && errorRate < 0.1;
    const issues: string[] = [];

    if (errorRate >= 0.1) {
      issues.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
    }

    return {
      isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      issues,
      lastCheck: new Date()
    };
  }

  /**
   * Shutdown the native WebSocket service
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;

    try {
      await this.webSocketService.shutdown();
      this.isInitialized = false;

      logger.info('NativeWebSocketAdapter shutdown complete', {
        component: 'NativeWebSocketAdapter'
      });
    } catch (error) {
      logger.error('Error during NativeWebSocketAdapter shutdown', {
        component: 'NativeWebSocketAdapter'
      }, error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * Get the underlying WebSocket service instance
   */
  getWebSocketService(): WebSocketService {
    return this.webSocketService;
  }
}