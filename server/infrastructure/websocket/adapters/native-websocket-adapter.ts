/**
 * Native WebSocket Adapter
 *
 * Thin adapter over the core WebSocketService that conforms to the unified
 * WebSocketAdapter interface.
 */

import { Server } from 'http';
import { WebSocketService } from '@server/infrastructure/websocket/core/websocket-service';
import {
  HealthStatus,
  ServiceStats,
  WebSocketAdapter,
} from './websocket-adapter';
import { logger } from '@server/infrastructure/observability';

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface BillUpdate {
  type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
  data: Record<string, unknown>;
  timestamp?: Date;
}

export interface UserNotification {
  type:    string;
  title:   string;
  message: string;
  data?:   Record<string, unknown>;
}

export interface BroadcastMessage {
  type:       string;
  data:       Record<string, unknown>;
  timestamp?: Date;
}

// ─── Internal type guard ──────────────────────────────────────────────────────

interface ServiceStateObject {
  activeConnections?: number;
  totalConnections?:  number;
  totalMessages?:     number;
  totalBroadcasts?:   number;
  droppedMessages?:   number;
  averageLatency?:    number;
  memoryUsage?:       number;
}

function isServiceStateObject(state: unknown): state is ServiceStateObject {
  return typeof state === 'object' && state !== null;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Adapter over the native WebSocket service.
 *
 * Methods that depend on WebSocketService capabilities not yet available
 * (`sendUserNotification`, `broadcastToAll`) return `false` so callers can
 * detect the gap and fall back (e.g. via Redis pub/sub) rather than silently
 * losing messages.
 */
export class NativeWebSocketAdapter extends WebSocketAdapter {
  private readonly webSocketService: WebSocketService;

  constructor(webSocketService: WebSocketService) {
    super();
    if (!webSocketService) {
      throw new Error(
        'NativeWebSocketAdapter: WebSocketService is required.',
      );
    }
    this.webSocketService = webSocketService;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  async initialize(server: Server): Promise<void> {
    if (this.isInitialized) {
      logger.warn(
        { component: 'NativeWebSocketAdapter' },
        'Already initialized — skipping duplicate call',
      );
      return;
    }

    try {
      await this.webSocketService.initialize(server);
      this.isInitialized = true;
      logger.info(
        { component: 'NativeWebSocketAdapter' },
        'Initialized successfully',
      );
    } catch (error) {
      logger.error(
        { component: 'NativeWebSocketAdapter', error: errorMessage(error) },
        'Failed to initialize',
      );
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn(
        { component: 'NativeWebSocketAdapter' },
        'Shutdown already in progress',
      );
      return;
    }

    this.isShuttingDown = true;
    try {
      await this.webSocketService.shutdown();
      this.isInitialized = false;
      logger.info({ component: 'NativeWebSocketAdapter' }, 'Shutdown complete');
    } catch (error) {
      logger.error(
        { component: 'NativeWebSocketAdapter', error: errorMessage(error) },
        'Error during shutdown',
      );
    } finally {
      this.isShuttingDown = false;
    }
  }

  // ─── Messaging ───────────────────────────────────────────────────────────────

  /**
   * Broadcasts a bill update to all subscribers of that bill via the
   * underlying WebSocketService.
   */
  broadcastBillUpdate(billId: number, update: BillUpdate): void {
    if (!this.isReady()) {
      logger.warn(
        { component: 'NativeWebSocketAdapter', billId },
        'broadcastBillUpdate called before adapter is ready — message dropped',
      );
      return;
    }

    this.webSocketService.broadcastToBill(billId, {
      type:      update.type,
      data:      update.data,
      timestamp: update.timestamp ?? new Date(),
    });
  }

  /**
   * Sends a notification to a specific user.
   *
   * @returns `true` when delivered, `false` when the capability is not yet
   *          wired on the underlying service (so callers can route elsewhere).
   *
   * TODO: replace the stub body with
   *       `this.webSocketService.sendToUser(userId, notification)`
   *       once the service exposes that method.
   */
  sendUserNotification(userId: string, notification: UserNotification): boolean {
    if (!this.isReady()) {
      logger.warn(
        { component: 'NativeWebSocketAdapter', userId },
        'sendUserNotification called before adapter is ready',
      );
      return false;
    }

    // NOT YET WIRED: log and signal the gap to the caller.
    logger.warn(
      {
        component:        'NativeWebSocketAdapter',
        userId,
        notificationType: notification.type,
      },
      'sendUserNotification: service method not yet available — notification not delivered',
    );
    return false;
  }

  /**
   * Broadcasts a message to all connected clients.
   *
   * @returns `true` when delivered, `false` when the capability is not yet
   *          wired on the underlying service.
   *
   * TODO: replace the stub body with
   *       `this.webSocketService.broadcastToAll(message)`
   *       once the service exposes that method.
   */
  broadcastToAll(_message: BroadcastMessage): boolean {
    if (!this.isReady()) {
      logger.warn(
        { component: 'NativeWebSocketAdapter' },
        'broadcastToAll called before adapter is ready',
      );
      return false;
    }

    // NOT YET WIRED: log and signal the gap to the caller.
    logger.warn(
      { component: 'NativeWebSocketAdapter' },
      'broadcastToAll: service method not yet available — message not delivered',
    );
    return false;
  }

  // ─── Observability ───────────────────────────────────────────────────────────

  getStats(): ServiceStats {
    const state = this.webSocketService.getState();
    if (!isServiceStateObject(state)) return this.emptyStats();

    const totalMessages   = state.totalMessages   ?? 0;
    const droppedMessages = state.droppedMessages ?? 0;

    return {
      activeConnections: state.activeConnections ?? 0,
      totalConnections:  state.totalConnections  ?? 0,
      totalMessages,
      totalBroadcasts:   state.totalBroadcasts   ?? 0,
      droppedMessages,
      errorRate:         totalMessages > 0 ? droppedMessages / totalMessages : 0,
      averageLatency:    state.averageLatency     ?? 0,
      memoryUsage:       state.memoryUsage        ?? 0,
      uptime:            this.getUptime(),
    };
  }

  getHealthStatus(): HealthStatus {
    const state = this.webSocketService.getState();

    if (!isServiceStateObject(state)) {
      return {
        isHealthy: false,
        status:    'unhealthy',
        issues:    ['Service state unavailable'],
        lastCheck: new Date(),
      };
    }

    const totalMessages   = state.totalMessages   ?? 0;
    const droppedMessages = state.droppedMessages ?? 0;
    const errorRate       = totalMessages > 0 ? droppedMessages / totalMessages : 0;

    const issues: string[] = [];
    if (errorRate >= 0.1) {
      issues.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
    }

    const isHealthy = issues.length === 0;
    return {
      isHealthy,
      status:    isHealthy ? 'healthy' : 'unhealthy',
      issues,
      lastCheck: new Date(),
    };
  }

  // ─── Internal access ─────────────────────────────────────────────────────────

  /** Expose the underlying service for advanced callers. */
  getWebSocketService(): WebSocketService {
    return this.webSocketService;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private emptyStats(): ServiceStats {
    return {
      activeConnections: 0,
      totalConnections:  0,
      totalMessages:     0,
      totalBroadcasts:   0,
      droppedMessages:   0,
      errorRate:         0,
      averageLatency:    0,
      memoryUsage:       0,
      uptime:            this.getUptime(),
    };
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}