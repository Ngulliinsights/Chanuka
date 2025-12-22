/**
 * WebSocket Transport Adapter Interface
 * 
 * Defines the contract for different WebSocket transport implementations
 */

import { Server } from 'http';

export interface WebSocketMessage {
  type: string;
  data?: unknown;
  timestamp?: number;
  messageId?: string;
  user_id?: string;
}

export interface ServiceStats {
  activeConnections: number;
  totalConnections: number;
  totalMessages: number;
  totalBroadcasts: number;
  droppedMessages: number;
  errorRate: number;
  averageLatency: number;
  memoryUsage: number;
  uptime: number;
}

export interface HealthStatus {
  isHealthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  lastCheck: Date;
}

/**
 * Abstract base class for WebSocket transport adapters
 */
export abstract class WebSocketAdapter {
  protected isInitialized = false;
  protected isShuttingDown = false;
  protected startTime = Date.now();

  /**
   * Initialize the adapter with an HTTP server
   */
  abstract initialize(server: Server): Promise<void>;

  /**
   * Broadcast a bill update to all subscribers
   */
  abstract broadcastBillUpdate(bill_id: number, update: {
    type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
    data: unknown;
    timestamp?: Date;
  }): void;

  /**
   * Send a notification to a specific user
   */
  abstract sendUserNotification(user_id: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: unknown;
  }): void;

  /**
   * Broadcast a message to all connected clients
   */
  abstract broadcastToAll(message: {
    type: string;
    data: unknown;
    timestamp?: Date;
  }): void;

  /**
   * Get current service statistics
   */
  abstract getStats(): ServiceStats;

  /**
   * Get health status
   */
  abstract getHealthStatus(): HealthStatus;

  /**
   * Gracefully shutdown the adapter
   */
  abstract shutdown(): Promise<void>;

  /**
   * Check if the adapter is initialized
   */
  isReady(): boolean {
    return this.isInitialized && !this.isShuttingDown;
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }
}