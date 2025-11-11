/**
 * WebSocket Service for Real-time Error Streaming
 *
 * Provides WebSocket connectivity for streaming error data and real-time updates
 * to the Error Analytics Dashboard. Implements connection management, reconnection
 * logic, and message handling for error events.
 */

import { coreErrorHandler } from '../core/error/handler';
import { ErrorDomain, ErrorSeverity } from '../core/error/types';
import { useRealTimeStore } from '../store/slices/realTimeSlice';
import { logger } from '../utils/logger';
import { performanceMonitor } from '../utils/performance-monitor';

interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

interface ErrorStreamMessage {
  type: 'error_event' | 'system_health' | 'alert' | 'heartbeat';
  data: any;
  timestamp: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private messageCount = 0;
  private lastHeartbeat: number | null = null;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected to:', this.config.url);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.updateConnectionState({
            isConnected: true,
            isConnecting: false,
            error: null,
            connection_quality: 'excellent',
          });
          
          // Initialize real-time performance optimization
          if (this.ws) {
            performanceMonitor.initializeRealtimeOptimization(this.ws);
            logger.info('WebSocket connected with performance optimization', { component: 'WebSocketService' });
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.updateConnectionState({
            isConnected: false,
            connection_quality: 'disconnected',
          });

          if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.updateConnectionState({
            error: 'Connection failed',
            connection_quality: 'poor',
          });
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.updateConnectionState({
      isConnected: false,
      isConnecting: false,
      connection_quality: 'disconnected',
    });
  }

  /**
   * Send message to WebSocket server
   */
  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Subscribe to error events
   */
  subscribeToErrors(): void {
    this.send({
      type: 'subscribe',
      channel: 'errors',
      filters: {
        severity: ['CRITICAL', 'HIGH', 'MEDIUM'],
        domains: ['NETWORK', 'AUTHENTICATION', 'VALIDATION', 'SYSTEM'],
      },
    });
  }

  /**
   * Subscribe to system health updates
   */
  subscribeToSystemHealth(): void {
    this.send({
      type: 'subscribe',
      channel: 'system_health',
    });
  }

  /**
   * Subscribe to alerts
   */
  subscribeToAlerts(): void {
    this.send({
      type: 'subscribe',
      channel: 'alerts',
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: ErrorStreamMessage = JSON.parse(event.data);
      this.messageCount++;

      this.updateConnectionState({
        message_count: this.messageCount,
        last_message: message.timestamp,
      });

      switch (message.type) {
        case 'error_event':
          this.handleErrorEvent(message.data);
          break;
        case 'system_health':
          this.handleSystemHealth(message.data);
          break;
        case 'alert':
          this.handleAlert(message.data);
          break;
        case 'heartbeat':
          this.handleHeartbeat(message.data);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle error event messages
   */
  private handleErrorEvent(errorData: any): void {
    // Transform WebSocket error data to core error format
    const error = {
      id: errorData.id || `ws_error_${Date.now()}`,
      type: errorData.domain || ErrorDomain.UNKNOWN,
      severity: errorData.severity || ErrorSeverity.MEDIUM,
      message: errorData.message || 'Unknown error from WebSocket',
      timestamp: errorData.timestamp || Date.now(),
      recoverable: errorData.recoverable || false,
      retryable: errorData.retryable || false,
      context: {
        component: errorData.component,
        userId: errorData.userId,
        sessionId: errorData.sessionId,
        url: errorData.url,
        userAgent: errorData.userAgent,
        ...errorData.context,
      },
      details: errorData.details,
      recovered: errorData.recovered || false,
      recoveryStrategy: errorData.recoveryStrategy,
    };

    // Add to core error handler
    coreErrorHandler.handleError(error);

    // Update real-time store
    useRealTimeStore.getState().addNotification({
      id: error.id,
      type: 'error',
      title: `Error: ${error.message}`,
      message: `Severity: ${error.severity} | Component: ${error.context?.component}`,
      created_at: new Date(error.timestamp).toISOString(),
      read: false,
      priority: error.severity === ErrorSeverity.CRITICAL ? 'high' : 'medium',
    });
  }

  /**
   * Handle system health messages
   */
  private handleSystemHealth(healthData: any): void {
    // Update system health in real-time store
    // This would be handled by the dashboard component
    console.log('System health update:', healthData);
  }

  /**
   * Handle alert messages
   */
  private handleAlert(alertData: any): void {
    // Add alert to real-time store
    useRealTimeStore.getState().addNotification({
      id: alertData.id || `alert_${Date.now()}`,
      type: 'alert',
      title: alertData.title || 'System Alert',
      message: alertData.description || alertData.message,
      created_at: new Date(alertData.timestamp || Date.now()).toISOString(),
      read: false,
      priority: alertData.severity === 'critical' ? 'high' : 'medium',
    });
  }

  /**
   * Handle heartbeat messages
   */
  private handleHeartbeat(data: any): void {
    this.lastHeartbeat = Date.now();
    this.updateConnectionState({
      last_heartbeat: this.lastHeartbeat,
      connection_quality: 'excellent',
    });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.lastHeartbeat && Date.now() - this.lastHeartbeat > this.config.heartbeatInterval * 2) {
        // Heartbeat missed
        this.updateConnectionState({
          connection_quality: 'poor',
        });
      }

      // Send heartbeat
      this.send({ type: 'heartbeat', timestamp: Date.now() });
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.updateConnectionState({
      reconnectAttempts: this.reconnectAttempts,
    });

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      });
    }, delay);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Update connection state in real-time store
   */
  private updateConnectionState(updates: Partial<any>): void {
    useRealTimeStore.getState().updateConnectionState({
      isConnected: this.ws?.readyState === WebSocket.OPEN || false,
      isConnecting: this.isConnecting,
      error: updates.error || null,
      reconnectAttempts: this.reconnectAttempts,
      connection_quality: updates.connection_quality || 'unknown',
      last_heartbeat: this.lastHeartbeat,
      message_count: this.messageCount,
      ...updates,
    });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    isConnecting: boolean;
    reconnectAttempts: number;
    messageCount: number;
    lastHeartbeat: number | null;
  } {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN || false,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      messageCount: this.messageCount,
      lastHeartbeat: this.lastHeartbeat,
    };
  }
}

// Create singleton instance
let webSocketService: WebSocketService | null = null;

export function getWebSocketService(config?: WebSocketConfig): WebSocketService {
  if (!webSocketService) {
    // Default WebSocket URL - should be configurable
    const defaultConfig: WebSocketConfig = {
      url: process.env.REACT_APP_WS_URL || 'ws://localhost:8080/errors',
      ...config,
    };
    webSocketService = new WebSocketService(defaultConfig);
  }
  return webSocketService;
}

export { WebSocketService };
export type { WebSocketConfig, ErrorStreamMessage };