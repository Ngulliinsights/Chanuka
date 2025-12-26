/**
 * WebSocket Service Type Definitions
 */

import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';

/**
 * Extended WebSocket interface with authentication and subscription tracking.
 * Includes buffering and connection metadata for efficient message delivery.
 */
export interface AuthenticatedWebSocket extends WebSocket {
  user_id?: string;
  isAlive?: boolean;
  lastPing?: number;
  subscriptions?: Set<number>;
  messageBuffer?: Array<Record<string, unknown>>;
  flushTimer?: NodeJS.Timeout;
  connectionId?: string;
}

/**
 * Message types supported by the WebSocket service.
 * Defines the contract between client and server communication.
 */
export interface WebSocketMessage {
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

/**
 * Client verification information passed during connection establishment.
 */
export interface VerifyClientInfo {
  origin: string;
  secure: boolean;
  req: IncomingMessage;
}

/**
 * Connection pool entry tracking all connections for a specific user.
 */
export interface ConnectionPoolEntry {
  connections: AuthenticatedWebSocket[];
  lastActivity: number;
}

/**
 * Memory leak detector event data structure.
 */
export interface MemoryLeakData {
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  analysis: {
    growthRate: number;
    retainedIncrease: number;
  };
}

/**
 * Memory pressure event data structure.
 */
export interface MemoryPressureData {
  pressure: number;
  threshold: number;
}

/**
 * Connection statistics tracking.
 */
export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  totalBroadcasts: number;
  droppedMessages: number;
  duplicateMessages: number;
  queueOverflows: number;
  reconnections: number;
  startTime: number;
  lastActivity: number;
  peakConnections: number;
  uniqueUsers: number;
  averageLatency: number;
  memoryUsage: number;
}

/**
 * Bill update notification structure.
 */
export interface BillUpdateNotification {
  bill_id: number;
  type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
  data: Record<string, unknown>;
  timestamp: number;
}

/**
 * Message data structure for various message types.
 */
export interface MessageData {
  bill_id?: number;
  bill_ids?: number[];
  channel?: string;
  token?: string;
  subscriptionTypes?: Array<'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled'>;
  preferences?: {
    updateFrequency?: 'immediate' | 'hourly' | 'daily';
    notificationTypes?: Array<'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled'>;
  };
}

/**
 * Service interfaces for dependency injection
 */

export interface IConnectionManager {
  addConnection(ws: AuthenticatedWebSocket): void;
  removeConnection(ws: AuthenticatedWebSocket): void;
  getConnectionsForUser(userId: string): AuthenticatedWebSocket[];
  authenticateConnection(ws: AuthenticatedWebSocket, token: string): Promise<boolean>;
  cleanup(): void;
  getConnectionCount(): number;
}

export interface IMessageHandler {
  handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void>;
  broadcastToSubscribers(billId: number, message: Record<string, unknown>): void;
  validateMessage(message: WebSocketMessage): boolean;
  cleanup(ws: AuthenticatedWebSocket): void;
}

export interface ISubscriptionManager {
  subscribe(ws: AuthenticatedWebSocket, billId: number): void;
  unsubscribe(ws: AuthenticatedWebSocket, billId: number): void;
  batchSubscribe(ws: AuthenticatedWebSocket, billIds: number[]): void;
  batchUnsubscribe(ws: AuthenticatedWebSocket, billIds: number[]): void;
  getSubscribers(billId: number): AuthenticatedWebSocket[];
  getSubscriptionsForConnection(ws: AuthenticatedWebSocket): number[];
  cleanup(ws: AuthenticatedWebSocket): void;
}

export interface IOperationQueueManager {
  enqueue(operation: QueueOperation): boolean;
  processQueue(): Promise<void>;
  getQueueSize(): number;
  clear(): void;
}

export interface IMemoryManager {
  startMonitoring(): void;
  stopMonitoring(): void;
  performCleanup(): void;
  handleMemoryPressure(data: MemoryPressureData): void;
  handleMemoryLeak(data: MemoryLeakData): void;
  cleanup(): void;
}

export interface IStatisticsCollector {
  updateConnectionCount(count: number): void;
  recordMessageProcessed(latency: number): void;
  recordBroadcast(): void;
  recordDroppedMessage(): void;
  recordDuplicateMessage(): void;
  recordQueueOverflow(): void;
  recordReconnection(): void;
  getMetrics(): ConnectionStats;
  reset(): void;
  getConnectionRate(timeWindow?: number): number;
  getErrorRate(): number;
  getPerformanceMetrics(): {
    averageLatency: number;
    throughput: number;
    errorRate: number;
    p50Latency?: number;
    p95Latency?: number;
  };
  getHistoricalData(timeWindow: number): Array<{
    timestamp: number;
    connections: number;
    latency: number;
    throughput: number;
  }>;
  getAverageLatency(): number;
  getPercentileLatency(percentile: number): number;
  getMessageThroughput(): number;
}

export interface IHealthChecker {
  startHealthChecks(): void;
  stopHealthChecks(): void;
  getHealthStatus(): HealthStatus;
  performHealthCheck(): Promise<HealthStatus>;
}

export interface IMetricsReporter {
  generateReport(): MetricsReport;
  exportMetrics(): Record<string, unknown>;
}

export interface ILeakDetectorHandler {
  handleMemoryLeak(data: MemoryLeakData): void;
  getRecommendations(severity: MemoryLeakData['severity']): string[];
}

export interface IProgressiveDegradation {
  adjustConfiguration(memoryPressure: number): void;
  resetConfiguration(): void;
  getCurrentLevel(): DegradationLevel;
  handleMemoryPressure(data: MemoryPressureData): void;
}

/**
 * Utility interfaces
 */

export interface IPriorityQueue<T> {
  enqueue(item: T, priority: number): boolean;
  dequeue(): T | undefined;
  peek(): T | undefined;
  size(): number;
  clear(): void;
  isFull(): boolean;
}

export interface ILRUCache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  delete(key: K): boolean;
  clear(): void;
  size(): number;
  has(key: K): boolean;
}

export interface ICircularBuffer<T> {
  push(item: T): void;
  get(index: number): T | undefined;
  getAll(): T[];
  size(): number;
  capacity(): number;
  clear(): void;
  isFull(): boolean;
}

/**
 * Queue operation structure
 */
export interface QueueOperation {
  type: 'broadcast' | 'subscribe' | 'unsubscribe' | 'cleanup';
  priority: number;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount?: number;
}

/**
 * Health status structure
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: {
    connections: boolean;
    memory: boolean;
    queues: boolean;
    performance: boolean;
  };
  metrics: {
    connectionCount: number;
    memoryUsage: number;
    queueSize: number;
    averageLatency: number;
  };
  memoryUsage: number;
  connectionHealth: boolean;
  queueHealth: boolean;
  warnings: string[];
  errors: string[];
  lastCheck: number;
}

/**
 * Metrics report structure
 */
export interface MetricsReport {
  timestamp: number;
  uptime: number;
  connections: ConnectionStats;
  memory: {
    usage: number;
    pressure: number;
    leaks: number;
  };
  performance: {
    averageLatency: number;
    throughput: number;
    errorRate: number;
  };
  queues: {
    size: number;
    overflows: number;
    processed: number;
  };
}

/**
 * Progressive degradation levels
 */
export type DegradationLevel = 'normal' | 'light' | 'moderate' | 'severe' | 'critical';

/**
 * Configuration types
 */
export interface BaseConfigType {
  readonly HEARTBEAT_INTERVAL: number;
  readonly HEALTH_CHECK_INTERVAL: number;
  readonly STALE_CONNECTION_THRESHOLD: number;
  readonly CONNECTION_POOL_SIZE: number;
  readonly MAX_QUEUE_SIZE: number;
  readonly MAX_PAYLOAD: number;
  readonly MAX_LATENCY_SAMPLES: number;
  readonly DEDUPE_CACHE_CLEANUP_AGE: number;
  readonly MAX_RECONNECT_ATTEMPTS: number;
  readonly RECONNECT_DELAY: number;
  readonly HIGH_MEMORY_THRESHOLD: number;
  readonly CRITICAL_MEMORY_THRESHOLD: number;
  readonly PERFORMANCE_HISTORY_MAX_SIZE: number;
  readonly SHUTDOWN_GRACE_PERIOD: number;
}

export interface RuntimeConfigType {
  MESSAGE_BATCH_SIZE: number;
  MESSAGE_BATCH_DELAY: number;
  COMPRESSION_THRESHOLD: number;
  DEDUPE_CACHE_SIZE: number;
  DEDUPE_WINDOW: number;
  MAX_CONNECTIONS_PER_USER: number;
  MEMORY_CLEANUP_INTERVAL: number;
}

/**
 * Service statistics interface
 */
export interface ServiceStats {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  totalBroadcasts: number;
  droppedMessages: number;
  duplicateMessages: number;
  queueOverflows: number;
  reconnections: number;
  startTime: number;
  lastActivity: number;
  peakConnections: number;
  uptime: number;
  memoryUsage: number;
  uniqueUsers: number;
  averageLatency: number;
}

/**
 * Adapter configuration interface
 */
export interface AdapterConfig {
  redisUrl?: string;
  maxRetries?: number;
  retryDelayOnFailover?: number;
  enableOfflineQueue?: boolean;
  lazyConnect?: boolean;
  keepAlive?: number;
  family?: 4 | 6;
  db?: number;
  enableCompression?: boolean;
  compressionThreshold?: number;
}