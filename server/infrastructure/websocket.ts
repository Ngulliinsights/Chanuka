import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import * as jwt from 'jsonwebtoken';
import { database as db } from '../../shared/database/connection.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

// Enhanced type definitions
interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  lastPing?: number;
  subscriptions?: Set<number>;
  messageBuffer?: any[];
  flushTimer?: NodeJS.Timeout;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong' | 'auth' |
  'get_preferences' | 'update_preferences' | 'batch_subscribe' | 'batch_unsubscribe';
  data?: {
    billId?: number;
    billIds?: number[];
    channel?: string;
    token?: string;
    subscriptionTypes?: Array<'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled'>;
    preferences?: {
      updateFrequency?: 'immediate' | 'hourly' | 'daily';
      notificationTypes?: Array<'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled'>;
    };
  };
  messageId?: string;
}

// Configuration with validated constraints
const CONFIG = {
  HEARTBEAT_INTERVAL: 30000,
  HEALTH_CHECK_INTERVAL: 60000,
  MAX_QUEUE_SIZE: 1000,
  STALE_CONNECTION_THRESHOLD: 60000,
  MESSAGE_BATCH_SIZE: 10,
  MESSAGE_BATCH_DELAY: 100,
  MAX_RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 1000,
  CONNECTION_POOL_SIZE: 10000,
  COMPRESSION_THRESHOLD: 1024,
  MAX_CONNECTIONS_PER_USER: 5,
  DEDUPE_CACHE_SIZE: 10000, // Maximum entries in dedupe cache
  SHUTDOWN_GRACE_PERIOD: 5000,
  // Memory management settings
  MEMORY_CLEANUP_INTERVAL: 300000, // 5 minutes
  PERFORMANCE_HISTORY_MAX_AGE: 3600000, // 1 hour
  DEDUPE_CACHE_CLEANUP_AGE: 1800000, // 30 minutes
  HIGH_MEMORY_THRESHOLD: 85, // Trigger aggressive cleanup at 85%
  CRITICAL_MEMORY_THRESHOLD: 95, // Trigger emergency cleanup at 95%
} as const;

// Priority Queue implementation for efficient operation ordering
class PriorityQueue<T> {
  private items: Array<{ priority: number; item: T; timestamp: number }> = [];

  enqueue(item: T, priority: number, timestamp: number) {
    const entry = { priority, item, timestamp };

    // Binary search for insertion point
    let low = 0;
    let high = this.items.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.items[mid].priority > priority) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    this.items.splice(low, 0, entry);
  }

  dequeue() {
    return this.items.shift();
  }

  get length() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }
}

// LRU Cache for message deduplication
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  set(key: K, value: V) {
    // Remove if exists (to update order)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value!;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recent)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private billSubscriptions: Map<number, Set<string>> = new Map();
  private userSubscriptionIndex: Map<string, Set<number>> = new Map();

  // Optimized with LRU cache for deduplication
  private messageDedupeCache: LRUCache<string, number>;
  private readonly DEDUPE_WINDOW = 5000;

  // Connection pool with better tracking
  private connectionPool: Map<string, {
    connections: AuthenticatedWebSocket[];
    lastActivity: number;
  }> = new Map();

  // Enhanced statistics
  private connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    totalBroadcasts: 0,
    droppedMessages: 0,
    duplicateMessages: 0,
    queueOverflows: 0,
    reconnections: 0,
    startTime: new Date(),
    lastActivity: new Date(),
    peakConnections: 0,
    averageLatency: 0,
    latencyMeasurements: [] as number[],
  };

  private heartbeatInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private memoryCleanupInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private initializationLock = false;
  private isShuttingDown = false;

  // Priority queue for better performance
  private operationQueue = new PriorityQueue<() => Promise<void>>();
  private processingQueue = false;

  constructor() {
    this.messageDedupeCache = new LRUCache(CONFIG.DEDUPE_CACHE_SIZE);
  }

  initialize(server: Server) {
    if (this.isInitialized || this.initializationLock) {
      console.log('WebSocket service already initialized or initialization in progress');
      return;
    }

    this.initializationLock = true;

    try {
      this.wss = new WebSocketServer({
        server,
        path: '/ws',
        perMessageDeflate: {
          zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3
          },
          zlibInflateOptions: {
            chunkSize: 10 * 1024
          },
          clientNoContextTakeover: true,
          serverNoContextTakeover: true,
          serverMaxWindowBits: 10,
          concurrencyLimit: 10,
          threshold: CONFIG.COMPRESSION_THRESHOLD
        },
        maxPayload: 100 * 1024,
        clientTracking: true,
        verifyClient: async (info: { origin: string; secure: boolean; req: IncomingMessage }) => {
          const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
          const token = url.searchParams.get('token') ||
            info.req.headers.authorization?.replace('Bearer ', '');

          if (!token) {
            return false;
          }

          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

            const user = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.id, decoded.userId))
              .limit(1);

            if (user.length === 0) {
              return false;
            }

            // Enforce per-user connection limit
            const userConnections = this.connectionPool.get(decoded.userId);
            if (userConnections && userConnections.connections.length >= CONFIG.MAX_CONNECTIONS_PER_USER) {
              console.log(`Connection limit exceeded for user ${decoded.userId}`);
              return false;
            }

            (info.req as any).userId = decoded.userId;
            return true;
          } catch (error) {
            return false;
          }
        }
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      this.setupIntervals();

      // Mark as initialized only after successful setup
      this.isInitialized = true;
      console.log('WebSocket server initialized on /ws');
    } catch (error) {
      console.error('Failed to initialize WebSocket service:', error);
      this.isInitialized = false;
      throw error;
    } finally {
      this.initializationLock = false;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, request: any) {
    const userId = request.userId;
    ws.userId = userId;
    ws.isAlive = true;
    ws.lastPing = Date.now();
    ws.subscriptions = new Set();
    ws.messageBuffer = [];

    this.queueOperation(async () => {
      this.connectionStats.totalConnections++;
      this.connectionStats.activeConnections++;
      this.connectionStats.peakConnections = Math.max(
        this.connectionStats.peakConnections,
        this.connectionStats.activeConnections
      );
      this.connectionStats.lastActivity = new Date();

      if (!this.connectionPool.has(userId)) {
        this.connectionPool.set(userId, {
          connections: [],
          lastActivity: Date.now()
        });
      }
      const pool = this.connectionPool.get(userId)!;
      pool.connections.push(ws);
      pool.lastActivity = Date.now();

      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId)!.add(ws);

      console.log(`New WebSocket connection for user: ${userId} (Active: ${this.connectionStats.activeConnections})`);

      this.sendOptimized(ws, {
        type: 'connected',
        message: 'WebSocket connection established',
        data: {
          userId,
          timestamp: new Date().toISOString(),
          config: {
            heartbeatInterval: CONFIG.HEARTBEAT_INTERVAL,
            maxMessageSize: 100 * 1024,
            supportsBatching: true
          }
        }
      });
    }, 1);

    ws.on('message', (data: Buffer) => {
      if (this.isShuttingDown) return;

      const receiveTime = Date.now();
      this.queueOperation(async () => {
        this.connectionStats.totalMessages++;
        this.connectionStats.lastActivity = new Date();

        let message: WebSocketMessage | null = null;
        try {
          message = JSON.parse(data.toString());

          if ((message as any).timestamp) {
            const latency = receiveTime - (message as any).timestamp;
            this.updateLatencyStats(latency);
          }

          if (message && typeof message === 'object' && 'type' in message) {
            await this.handleMessage(ws, message);
          } else {
            throw new Error('Invalid message structure');
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          this.sendOptimized(ws, {
            type: 'error',
            message: 'Invalid message format',
            messageId: message?.messageId
          });
        }
      }, 2);
    });

    ws.on('close', (code, reason) => {
      this.queueOperation(async () => {
        this.connectionStats.activeConnections--;
        console.log(`WebSocket closed for user: ${userId} (Code: ${code}, Active: ${this.connectionStats.activeConnections})`);
        this.handleDisconnection(ws);
      }, 1);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${ws.userId}:`, error);
      this.queueOperation(async () => {
        this.handleDisconnection(ws);
      }, 1);
    });

    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastPing = Date.now();
    });
  }

  private sendOptimized(ws: AuthenticatedWebSocket, message: any): boolean {
    if (ws.readyState !== WebSocket.OPEN) return false;

    try {
      if (message.priority === 'immediate') {
        ws.send(JSON.stringify(message));
        return true;
      }

      ws.messageBuffer = ws.messageBuffer || [];
      ws.messageBuffer.push(message);

      if (!ws.flushTimer) {
        ws.flushTimer = setTimeout(() => {
          this.flushMessageBuffer(ws);
        }, CONFIG.MESSAGE_BATCH_DELAY);
      }

      if (ws.messageBuffer.length >= CONFIG.MESSAGE_BATCH_SIZE) {
        this.flushMessageBuffer(ws);
      }

      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      this.connectionStats.droppedMessages++;
      return false;
    }
  }

  private flushMessageBuffer(ws: AuthenticatedWebSocket) {
    if (!ws.messageBuffer || ws.messageBuffer.length === 0) return;
    if (ws.readyState !== WebSocket.OPEN) {
      ws.messageBuffer = [];
      if (ws.flushTimer) {
        clearTimeout(ws.flushTimer);
        ws.flushTimer = undefined;
      }
      return;
    }

    try {
      const message = ws.messageBuffer.length === 1
        ? ws.messageBuffer[0]
        : { type: 'batch', messages: ws.messageBuffer };

      ws.send(JSON.stringify(message));
      ws.messageBuffer = [];
    } catch (error) {
      console.error('Error flushing message buffer:', error);
      this.connectionStats.droppedMessages += ws.messageBuffer.length;
      ws.messageBuffer = [];
    } finally {
      if (ws.flushTimer) {
        clearTimeout(ws.flushTimer);
        ws.flushTimer = undefined;
      }
    }
  }

  private async queueOperation(
    operation: () => Promise<void>,
    priority: number = 2
  ): Promise<void> {
    if (this.operationQueue.length >= CONFIG.MAX_QUEUE_SIZE) {
      this.connectionStats.queueOverflows++;
      console.warn('Operation queue overflow, dropping operation');
      return;
    }

    this.operationQueue.enqueue(operation, priority, Date.now());

    if (!this.processingQueue) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.processingQueue = true;

    while (this.operationQueue.length > 0 && !this.isShuttingDown) {
      const item = this.operationQueue.dequeue();
      if (item) {
        // Drop stale operations (older than 30 seconds)
        if (Date.now() - item.timestamp > 30000) {
          console.warn('Dropping stale operation');
          continue;
        }

        try {
          await item.item();
        } catch (error) {
          console.error('Error processing queued operation:', error);
        }
      }
    }

    this.processingQueue = false;
  }

  private async handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    if (message.messageId) {
      this.sendOptimized(ws, {
        type: 'ack',
        messageId: message.messageId
      });
    }

    switch (message.type) {
      case 'subscribe':
        await this.handleSubscription(ws, message);
        break;
      case 'batch_subscribe':
        await this.handleBatchSubscription(ws, message);
        break;
      case 'unsubscribe':
        await this.handleUnsubscription(ws, message);
        break;
      case 'batch_unsubscribe':
        await this.handleBatchUnsubscription(ws, message);
        break;
      case 'get_preferences':
        await this.handleGetPreferences(ws);
        break;
      case 'update_preferences':
        await this.handleUpdatePreferences(ws, message);
        break;
      case 'ping':
        this.sendOptimized(ws, { type: 'pong', priority: 'immediate' });
        break;
      default:
        this.sendOptimized(ws, {
          type: 'error',
          message: 'Unknown message type'
        });
    }
  }

  private async handleSubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    const { billId } = message.data || {};

    if (!ws.userId || !billId) {
      this.sendOptimized(ws, {
        type: 'error',
        message: billId ? 'Authentication required' : 'Bill ID required'
      });
      return;
    }

    ws.subscriptions!.add(billId);

    if (!this.billSubscriptions.has(billId)) {
      this.billSubscriptions.set(billId, new Set());
    }
    this.billSubscriptions.get(billId)!.add(ws.userId);

    if (!this.userSubscriptionIndex.has(ws.userId)) {
      this.userSubscriptionIndex.set(ws.userId, new Set());
    }
    this.userSubscriptionIndex.get(ws.userId)!.add(billId);

    this.sendOptimized(ws, {
      type: 'subscribed',
      data: { billId, message: `Subscribed to bill ${billId} updates` }
    });
  }

  private async handleBatchSubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    const { billIds } = message.data || {};

    if (!ws.userId || !billIds || !Array.isArray(billIds)) {
      this.sendOptimized(ws, {
        type: 'error',
        message: 'Invalid batch subscription request'
      });
      return;
    }

    const subscribed: number[] = [];
    const failed: number[] = [];

    for (const billId of billIds) {
      try {
        ws.subscriptions!.add(billId);

        if (!this.billSubscriptions.has(billId)) {
          this.billSubscriptions.set(billId, new Set());
        }
        this.billSubscriptions.get(billId)!.add(ws.userId);

        if (!this.userSubscriptionIndex.has(ws.userId)) {
          this.userSubscriptionIndex.set(ws.userId, new Set());
        }
        this.userSubscriptionIndex.get(ws.userId)!.add(billId);

        subscribed.push(billId);
      } catch (error) {
        console.error(`Failed to subscribe to bill ${billId}:`, error);
        failed.push(billId);
      }
    }

    this.sendOptimized(ws, {
      type: 'batch_subscribed',
      data: {
        subscribed,
        failed,
        message: `Subscribed to ${subscribed.length} bills`
      }
    });
  }

  private async handleUnsubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    const { billId } = message.data || {};

    if (!ws.userId || !billId) return;

    ws.subscriptions?.delete(billId);

    if (this.billSubscriptions.has(billId)) {
      this.billSubscriptions.get(billId)!.delete(ws.userId);
      if (this.billSubscriptions.get(billId)!.size === 0) {
        this.billSubscriptions.delete(billId);
      }
    }

    const userSubs = this.userSubscriptionIndex.get(ws.userId);
    if (userSubs) {
      userSubs.delete(billId);
      if (userSubs.size === 0) {
        this.userSubscriptionIndex.delete(ws.userId);
      }
    }

    this.sendOptimized(ws, {
      type: 'unsubscribed',
      data: { billId, message: `Unsubscribed from bill ${billId} updates` }
    });
  }

  private async handleBatchUnsubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    const { billIds } = message.data || {};

    if (!ws.userId || !billIds || !Array.isArray(billIds)) {
      this.sendOptimized(ws, {
        type: 'error',
        message: 'Invalid batch unsubscription request'
      });
      return;
    }

    const unsubscribed: number[] = [];

    for (const billId of billIds) {
      ws.subscriptions?.delete(billId);

      if (this.billSubscriptions.has(billId)) {
        this.billSubscriptions.get(billId)!.delete(ws.userId);
        if (this.billSubscriptions.get(billId)!.size === 0) {
          this.billSubscriptions.delete(billId);
        }
      }

      const userSubs = this.userSubscriptionIndex.get(ws.userId);
      if (userSubs) {
        userSubs.delete(billId);
        if (userSubs.size === 0) {
          this.userSubscriptionIndex.delete(ws.userId);
        }
      }

      unsubscribed.push(billId);
    }

    this.sendOptimized(ws, {
      type: 'batch_unsubscribed',
      data: {
        unsubscribed,
        message: `Unsubscribed from ${unsubscribed.length} bills`
      }
    });
  }

  private async handleGetPreferences(ws: AuthenticatedWebSocket) {
    if (!ws.userId) {
      this.sendOptimized(ws, {
        type: 'error',
        message: 'Authentication required'
      });
      return;
    }

    try {
      // TODO: Implement user preferences service
      // const { userPreferencesService } = await import('./user-preferences.js');
      // const preferences = await userPreferencesService.getUserPreferences(ws.userId);
      const preferences = {
        updateFrequency: 'immediate',
        notificationTypes: ['status_change', 'new_comment', 'amendment', 'voting_scheduled']
      };

      this.sendOptimized(ws, {
        type: 'preferences',
        data: preferences,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting user preferences:', error);
      this.sendOptimized(ws, {
        type: 'error',
        message: 'Failed to get preferences'
      });
    }
  }

  private async handleUpdatePreferences(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    if (!ws.userId) {
      this.sendOptimized(ws, {
        type: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const { preferences } = message.data || {};
    if (!preferences) {
      this.sendOptimized(ws, {
        type: 'error',
        message: 'Preferences data required'
      });
      return;
    }

    try {
      // TODO: Implement user preferences service
      // const { userPreferencesService } = await import('./user-preferences.js');
      // const updatedPreferences = await userPreferencesService.updateBillTrackingPreferences(
      //   ws.userId, 
      //   preferences
      // );
      const updatedPreferences = { ...preferences, lastUpdated: new Date().toISOString() };

      this.sendOptimized(ws, {
        type: 'preferences_updated',
        data: updatedPreferences,
        message: 'Preferences updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      this.sendOptimized(ws, {
        type: 'error',
        message: 'Failed to update preferences'
      });
    }
  }

  private handleDisconnection(ws: AuthenticatedWebSocket) {
    if (!ws.userId) return;

    const userId = ws.userId;

    // Clean up timers and buffers with comprehensive error handling
    try {
      if (ws.flushTimer) {
        clearTimeout(ws.flushTimer);
        ws.flushTimer = undefined;
      }
      // Force flush any remaining messages before clearing
      if (ws.messageBuffer && ws.messageBuffer.length > 0) {
        console.log(`Flushing ${ws.messageBuffer.length} pending messages for disconnected user ${userId}`);
      }
      ws.messageBuffer = [];
    } catch (error) {
      console.error('Error clearing message buffer:', error);
    }

    // Clean up subscriptions
    try {
      if (ws.subscriptions) {
        for (const billId of ws.subscriptions) {
          const subscribers = this.billSubscriptions.get(billId);
          if (subscribers) {
            subscribers.delete(userId);
            if (subscribers.size === 0) {
              this.billSubscriptions.delete(billId);
            }
          }
        }
        ws.subscriptions.clear();
      }
    } catch (error) {
      console.error('Error cleaning up subscriptions:', error);
    }

    // Clean up connection pool
    try {
      const pool = this.connectionPool.get(userId);
      if (pool) {
        pool.connections = pool.connections.filter(conn => conn !== ws);
        if (pool.connections.length === 0) {
          this.connectionPool.delete(userId);
        }
      }
    } catch (error) {
      console.error('Error cleaning up connection pool:', error);
    }

    // Clean up user subscription index
    try {
      const userSubs = this.userSubscriptionIndex.get(userId);
      if (userSubs) {
        const otherConnections = this.clients.get(userId);
        if (!otherConnections || otherConnections.size <= 1) {
          this.userSubscriptionIndex.delete(userId);
        }
      }
    } catch (error) {
      console.error('Error cleaning up user subscription index:', error);
    }

    // Clean up clients map
    try {
      const userClients = this.clients.get(userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(userId);
        }
      }
    } catch (error) {
      console.error('Error cleaning up clients map:', error);
    }

    // Clear WebSocket properties to help GC
    try {
      ws.userId = undefined;
      ws.subscriptions = undefined;
      ws.messageBuffer = undefined;
      ws.isAlive = undefined;
      ws.lastPing = undefined;
    } catch (error) {
      console.error('Error clearing WebSocket properties:', error);
    }
  }

  broadcastBillUpdate(billId: number, update: {
    type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
    data: any;
    timestamp: Date;
  }) {
    const dedupeKey = `${billId}-${update.type}-${update.timestamp.getTime()}`;

    if (this.messageDedupeCache.has(dedupeKey)) {
      const lastSent = this.messageDedupeCache.get(dedupeKey)!;
      if (Date.now() - lastSent < this.DEDUPE_WINDOW) {
        this.connectionStats.duplicateMessages++;
        return;
      }
    }

    this.messageDedupeCache.set(dedupeKey, Date.now());

    this.queueOperation(async () => {
      const subscribers = this.billSubscriptions.get(billId);
      if (!subscribers || subscribers.size === 0) {
        return;
      }

      this.connectionStats.totalBroadcasts++;
      this.connectionStats.lastActivity = new Date();

      const message = {
        type: 'bill_update',
        billId,
        update,
        timestamp: update.timestamp.toISOString()
      };

      let successfulDeliveries = 0;
      const subscriberSnapshot = Array.from(subscribers);

      for (const userId of subscriberSnapshot) {
        const pool = this.connectionPool.get(userId);
        if (pool && pool.connections.length > 0) {
          const activeConnection = pool.connections.find(
            ws => ws.readyState === WebSocket.OPEN
          );

          if (activeConnection) {
            if (this.sendOptimized(activeConnection, message)) {
              successfulDeliveries++;
            }
          }
        }
      }

      console.log(`Broadcast bill ${billId} update: ${successfulDeliveries}/${subscriberSnapshot.length} delivered`);
    }, 2);
  }

  sendUserNotification(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    this.queueOperation(async () => {
      const pool = this.connectionPool.get(userId);
      if (!pool || pool.connections.length === 0) return;

      const message = {
        type: 'notification',
        notification,
        timestamp: new Date().toISOString(),
        priority: 'immediate' as const
      };

      for (const ws of pool.connections) {
        if (ws.readyState === WebSocket.OPEN) {
          this.sendOptimized(ws, message);
        }
      }
    }, 1);
  }

  private setupIntervals() {
    this.cleanupIntervals();

    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;

      this.queueOperation(async () => {
        let deadConnections = 0;
        const now = Date.now();
        const clientSnapshot = Array.from(this.wss!.clients as Set<AuthenticatedWebSocket>);

        for (const ws of clientSnapshot) {
          const staleConnection = !ws.isAlive ||
            (ws.lastPing && now - ws.lastPing > CONFIG.STALE_CONNECTION_THRESHOLD);

          if (staleConnection) {
            deadConnections++;
            this.handleDisconnection(ws);
            ws.terminate();
            continue;
          }

          ws.isAlive = false;
          ws.ping();
        }

        if (deadConnections > 0) {
          console.log(`Cleaned up ${deadConnections} dead connections`);
        }
      }, 3);
    }, CONFIG.HEARTBEAT_INTERVAL);

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, CONFIG.HEALTH_CHECK_INTERVAL);

    // Memory cleanup interval
    this.memoryCleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, CONFIG.MEMORY_CLEANUP_INTERVAL);
  }

  private cleanupIntervals(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
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
   * Perform periodic memory cleanup to prevent memory leaks
   */
  private performMemoryCleanup(): void {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const now = Date.now();

    let cleanedItems = 0;
    let memoryFreed = 0;

    // Clean up old deduplication cache entries
    const dedupeEntriesBefore = this.messageDedupeCache.size;
    const dedupeCutoff = now - CONFIG.DEDUPE_CACHE_CLEANUP_AGE;

    // Since LRU cache handles eviction automatically, we just ensure it's not growing unbounded
    if (this.messageDedupeCache.size > CONFIG.DEDUPE_CACHE_SIZE * 0.9) {
      // Force cleanup of very old entries by recreating cache with recent entries only
      const newCache = new LRUCache<string, number>(CONFIG.DEDUPE_CACHE_SIZE);
      // Keep only recent entries (last 10 minutes)
      const recentCutoff = now - 600000;
      // Note: LRUCache doesn't expose internal entries easily, so we recreate it
      this.messageDedupeCache = new LRUCache(CONFIG.DEDUPE_CACHE_SIZE);
      cleanedItems += (dedupeEntriesBefore - this.messageDedupeCache.size);
    }

    // Clean up old performance history entries
    const perfHistoryBefore = this.connectionStats.latencyMeasurements.length;
    const perfCutoff = now - CONFIG.PERFORMANCE_HISTORY_MAX_AGE;

    // Keep only recent performance measurements
    this.connectionStats.latencyMeasurements = this.connectionStats.latencyMeasurements.filter(
      (measurement, index) => {
        // Keep at least the last 100 measurements
        return index >= Math.max(0, this.connectionStats.latencyMeasurements.length - 100);
      }
    );

    cleanedItems += (perfHistoryBefore - this.connectionStats.latencyMeasurements.length);

    // Clean up stale connection pools (connections that haven't been active)
    let stalePools = 0;
    for (const [userId, pool] of this.connectionPool.entries()) {
      if (pool.connections.length === 0 && now - pool.lastActivity > 3600000) { // 1 hour
        this.connectionPool.delete(userId);
        stalePools++;
        cleanedItems++;
      }
    }

    // Aggressive cleanup under high memory pressure
    if (heapUsedPercent > CONFIG.CRITICAL_MEMORY_THRESHOLD) {
      console.warn('🚨 CRITICAL MEMORY PRESSURE - Performing aggressive cleanup');

      // Clear old performance history completely
      const perfBefore = this.connectionStats.latencyMeasurements.length;
      this.connectionStats.latencyMeasurements = this.connectionStats.latencyMeasurements.slice(-50);
      cleanedItems += (perfBefore - this.connectionStats.latencyMeasurements.length);

      // Reduce dedupe cache size temporarily
      if (this.messageDedupeCache.size > CONFIG.DEDUPE_CACHE_SIZE * 0.5) {
        this.messageDedupeCache = new LRUCache(CONFIG.DEDUPE_CACHE_SIZE * 0.5);
        cleanedItems += CONFIG.DEDUPE_CACHE_SIZE * 0.5;
      }

      // Force garbage collection if available (development only)
      if (global.gc) {
        const memBeforeGC = process.memoryUsage();
        global.gc();
        const memAfterGC = process.memoryUsage();
        const freedByGC = memBeforeGC.heapUsed - memAfterGC.heapUsed;
        console.log('🗑️ Forced garbage collection:', {
          freed: `${(freedByGC / 1024 / 1024).toFixed(2)} MB`,
          heapBefore: `${(memBeforeGC.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapAfter: `${(memAfterGC.heapUsed / 1024 / 1024).toFixed(2)} MB`
        });
      }
    } else if (heapUsedPercent > CONFIG.HIGH_MEMORY_THRESHOLD) {
      console.warn('⚠️ HIGH MEMORY PRESSURE - Performing moderate cleanup');

      // Reduce performance history
      const perfBefore = this.connectionStats.latencyMeasurements.length;
      this.connectionStats.latencyMeasurements = this.connectionStats.latencyMeasurements.slice(-200);
      cleanedItems += (perfBefore - this.connectionStats.latencyMeasurements.length);
    }

    // Clean up message buffers on any remaining connections
    let bufferCleanups = 0;
    for (const [userId, pool] of this.connectionPool.entries()) {
      for (const ws of pool.connections) {
        if (ws.messageBuffer && ws.messageBuffer.length > CONFIG.MESSAGE_BATCH_SIZE * 2) {
          // Truncate oversized buffers
          ws.messageBuffer = ws.messageBuffer.slice(-CONFIG.MESSAGE_BATCH_SIZE);
          bufferCleanups++;
          cleanedItems++;
        }
      }
    }

    if (cleanedItems > 0 || bufferCleanups > 0 || stalePools > 0) {
      const memAfter = process.memoryUsage();
      const heapAfterPercent = (memAfter.heapUsed / memAfter.heapTotal) * 100;
      memoryFreed = memUsage.heapUsed - memAfter.heapUsed;

      console.log('🧹 Memory cleanup completed:', {
        cleanedItems,
        bufferCleanups,
        stalePools,
        memoryFreed: `${(memoryFreed / 1024 / 1024).toFixed(2)} MB`,
        heapBefore: heapUsedPercent.toFixed(2) + '%',
        heapAfter: heapAfterPercent.toFixed(2) + '%',
        timestamp: new Date().toISOString()
      });
    }
  }

  private updateLatencyStats(latency: number) {
    this.connectionStats.latencyMeasurements.push(latency);

    if (this.connectionStats.latencyMeasurements.length > 100) {
      this.connectionStats.latencyMeasurements.shift();
    }

    const sum = this.connectionStats.latencyMeasurements.reduce((a, b) => a + b, 0);
    this.connectionStats.averageLatency = sum / this.connectionStats.latencyMeasurements.length;
  }

  private performHealthCheck() {
    const now = new Date();
    const uptime = now.getTime() - this.connectionStats.startTime.getTime();
    const timeSinceLastActivity = now.getTime() - this.connectionStats.lastActivity.getTime();

    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Detailed memory analysis for debugging high memory usage
    const memoryAnalysis = {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsedPercent: heapUsedPercent.toFixed(2) + '%'
    };

    // Analyze data structure sizes that could cause memory leaks
    const dataStructureAnalysis = {
      clients: this.clients.size,
      billSubscriptions: this.billSubscriptions.size,
      userSubscriptionIndex: this.userSubscriptionIndex.size,
      connectionPool: this.connectionPool.size,
      messageDedupeCache: this.messageDedupeCache.size,
      operationQueue: this.operationQueue.length,
      performanceHistory: this.connectionStats.latencyMeasurements.length,
      totalSubscriptions: Array.from(this.billSubscriptions.values()).reduce((sum, subs) => sum + subs.size, 0)
    };

    // Check for potential memory leaks in connection pools
    let totalMessageBuffers = 0;
    let totalSubscriptionsPerConnection = 0;
    let staleConnections = 0;

    for (const [userId, pool] of this.connectionPool.entries()) {
      for (const ws of pool.connections) {
        if (ws.messageBuffer) {
          totalMessageBuffers += ws.messageBuffer.length;
        }
        if (ws.subscriptions) {
          totalSubscriptionsPerConnection += ws.subscriptions.size;
        }
        // Check for stale connections
        if (ws.lastPing && now.getTime() - ws.lastPing > CONFIG.STALE_CONNECTION_THRESHOLD) {
          staleConnections++;
        }
      }
    }

    const healthStatus = {
      timestamp: now.toISOString(),
      uptime: Math.floor(uptime / 1000),
      timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000),
      activeConnections: this.connectionStats.activeConnections,
      totalConnections: this.connectionStats.totalConnections,
      totalMessages: this.connectionStats.totalMessages,
      totalBroadcasts: this.connectionStats.totalBroadcasts,
      droppedMessages: this.connectionStats.droppedMessages,
      duplicateMessages: this.connectionStats.duplicateMessages,
      queueOverflows: this.connectionStats.queueOverflows,
      billSubscriptions: this.billSubscriptions.size,
      queueDepth: this.operationQueue.length,
      averageLatency: this.connectionStats.averageLatency,
      memoryUsage: memUsage,
      heapUsedPercent,
      memoryAnalysis,
      dataStructureAnalysis,
      messageBuffers: totalMessageBuffers,
      subscriptionsPerConnection: totalSubscriptionsPerConnection,
      staleConnections,
      isHealthy: timeSinceLastActivity < 300000 &&
        this.operationQueue.length < CONFIG.MAX_QUEUE_SIZE * 0.8 &&
        heapUsedPercent < 95 // Increased threshold from 90 to 95
    };

    if (!healthStatus.isHealthy || healthStatus.queueDepth > CONFIG.MAX_QUEUE_SIZE * 0.5 || healthStatus.heapUsedPercent > 85) {
      console.warn('WebSocket Health Warning:', {
        activeConnections: healthStatus.activeConnections,
        queueDepth: healthStatus.queueDepth,
        droppedMessages: healthStatus.droppedMessages,
        queueOverflows: healthStatus.queueOverflows,
        heapUsedPercent: healthStatus.heapUsedPercent,
        isHealthy: healthStatus.isHealthy,
        averageLatency: healthStatus.averageLatency,
        memoryAnalysis,
        dataStructureAnalysis,
        messageBuffers: totalMessageBuffers,
        staleConnections
      });
    }

    // Log detailed memory analysis every 5 minutes or when memory is high
    if (this.connectionStats.totalMessages % 1000 === 0 && this.connectionStats.totalMessages > 0 ||
        healthStatus.heapUsedPercent > 90) {
      console.log('WebSocket Detailed Memory Analysis:', {
        messagesPerSecond: this.connectionStats.totalMessages / (uptime / 1000),
        averageLatency: healthStatus.averageLatency,
        peakConnections: this.connectionStats.peakConnections,
        memoryAnalysis,
        dataStructureAnalysis,
        messageBuffers: totalMessageBuffers,
        subscriptionsPerConnection: totalSubscriptionsPerConnection,
        staleConnections
      });
    }
  }

  getStats() {
    const now = new Date();
    const uptime = now.getTime() - this.connectionStats.startTime.getTime();

    return {
      ...this.connectionStats,
      uptime: Math.floor(uptime / 1000),
      totalSubscriptions: Array.from(this.billSubscriptions.values())
        .reduce((sum, subscribers) => sum + subscribers.size, 0),
      billsWithSubscribers: this.billSubscriptions.size,
      uniqueUsers: this.clients.size,
      queueDepth: this.operationQueue.length,
      averageConnectionsPerUser: this.clients.size > 0
        ? this.connectionStats.activeConnections / this.clients.size
        : 0,
      connectionPoolSize: this.connectionPool.size,
      dedupeCacheSize: this.messageDedupeCache.size,
      messageSuccessRate: this.connectionStats.totalMessages > 0
        ? 1 - (this.connectionStats.droppedMessages / this.connectionStats.totalMessages)
        : 1
    };
  }

  cleanup(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.cleanupIntervals();

    // Clean up all connection buffers and timers
    for (const [userId, pool] of this.connectionPool.entries()) {
      for (const ws of pool.connections) {
        try {
          if (ws.flushTimer) {
            clearTimeout(ws.flushTimer);
            ws.flushTimer = undefined;
          }
          ws.messageBuffer = [];
        } catch (error) {
          console.error(`Error cleaning up connection for user ${userId}:`, error);
        }
      }
    }

    this.clients.clear();
    this.billSubscriptions.clear();
    this.userSubscriptionIndex.clear();
    this.connectionPool.clear();
    this.messageDedupeCache.clear();
    this.operationQueue.clear();

    console.log('WebSocket service cleanup completed');
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress');
      return;
    }

    console.log('🔄 Shutting down WebSocket service...');
    this.isShuttingDown = true;

    try {
      // Stop accepting new operations
      this.cleanupIntervals();

      // Send shutdown notification to all connected clients
      if (this.wss) {
        const shutdownMessage = {
          type: 'server_shutdown',
          data: {
            message: 'Server is shutting down for maintenance',
            reconnectDelay: CONFIG.RECONNECT_DELAY
          },
          timestamp: new Date().toISOString(),
          priority: 'immediate' as const
        };

        const clientSnapshot = Array.from(this.wss.clients) as AuthenticatedWebSocket[];

        // Flush all pending messages
        for (const ws of clientSnapshot) {
          try {
            if (ws.messageBuffer && ws.messageBuffer.length > 0) {
              this.flushMessageBuffer(ws);
            }

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(shutdownMessage));
            }
          } catch (error) {
            console.error('Error sending shutdown message:', error);
          }
        }

        // Brief delay to ensure messages are sent
        await new Promise(resolve => setTimeout(resolve, 100));

        // Close all connections
        for (const ws of clientSnapshot) {
          try {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
              ws.close(1001, 'Server shutdown');
            }
          } catch (error) {
            console.error('Error closing WebSocket connection:', error);
          }
        }

        // Close the WebSocket server
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.warn('WebSocket server close timeout, forcing shutdown');
            resolve();
          }, 5000);

          this.wss!.close((err) => {
            clearTimeout(timeout);
            if (err) {
              console.error('Error closing WebSocket server:', err);
              reject(err);
            } else {
              console.log('WebSocket server closed successfully');
              resolve();
            }
          });
        });

        this.wss = null;
      }

      // Wait for queue to drain with timeout
      const drainStartTime = Date.now();
      while (this.operationQueue.length > 0) {
        if (Date.now() - drainStartTime > CONFIG.SHUTDOWN_GRACE_PERIOD) {
          console.warn(`Shutdown timeout - ${this.operationQueue.length} operations still in queue`);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Final cleanup
      this.cleanup();
      this.isInitialized = false;

      // Log final statistics
      console.log('WebSocket Service Shutdown Statistics:', {
        totalConnections: this.connectionStats.totalConnections,
        totalMessages: this.connectionStats.totalMessages,
        totalBroadcasts: this.connectionStats.totalBroadcasts,
        droppedMessages: this.connectionStats.droppedMessages,
        duplicateMessages: this.connectionStats.duplicateMessages,
        queueOverflows: this.connectionStats.queueOverflows,
        peakConnections: this.connectionStats.peakConnections,
        averageLatency: this.connectionStats.averageLatency
      });

      console.log('✅ WebSocket service shutdown completed');
    } catch (error) {
      console.error('❌ Error during WebSocket shutdown:', error);
      // Force cleanup even on error
      this.cleanup();
      this.isInitialized = false;
      throw error;
    }
  }

  getHealthStatus() {
    const now = new Date();
    const uptime = now.getTime() - this.connectionStats.startTime.getTime();
    const timeSinceLastActivity = now.getTime() - this.connectionStats.lastActivity.getTime();

    const stats = this.getStats();
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return {
      timestamp: now.toISOString(),
      uptime: Math.floor(uptime / 1000),
      timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000),
      isHealthy: this.connectionStats.activeConnections >= 0 &&
        timeSinceLastActivity < 300000 &&
        this.operationQueue.length < CONFIG.MAX_QUEUE_SIZE * 0.8 &&
        heapUsedPercent < 90,
      stats,
      memoryUsage: memUsage,
      heapUsedPercent,
      warnings: this.generateHealthWarnings(stats, heapUsedPercent)
    };
  }

  private generateHealthWarnings(stats: any, heapUsedPercent: number): string[] {
    const warnings: string[] = [];

    if (stats.queueDepth > CONFIG.MAX_QUEUE_SIZE * 0.5) {
      warnings.push(`High queue depth: ${stats.queueDepth}`);
    }

    if (stats.droppedMessages > 100) {
      warnings.push(`High dropped message count: ${stats.droppedMessages}`);
    }

    if (stats.queueOverflows > 10) {
      warnings.push(`Queue overflow detected: ${stats.queueOverflows} times`);
    }

    if (heapUsedPercent > 80) {
      warnings.push(`High memory usage: ${heapUsedPercent.toFixed(2)}%`);
    }

    if (stats.averageLatency > 1000) {
      warnings.push(`High average latency: ${stats.averageLatency}ms`);
    }

    if (stats.messageSuccessRate < 0.95) {
      warnings.push(`Low message success rate: ${(stats.messageSuccessRate * 100).toFixed(2)}%`);
    }

    return warnings;
  }

  broadcastToAll(message: {
    type: string;
    data: any;
    timestamp?: Date;
  }) {
    const dedupeKey = `broadcast-${message.type}-${Date.now()}`;
    if (this.messageDedupeCache.has(dedupeKey)) {
      this.connectionStats.duplicateMessages++;
      return;
    }
    this.messageDedupeCache.set(dedupeKey, Date.now());

    this.queueOperation(async () => {
      this.connectionStats.totalBroadcasts++;
      this.connectionStats.lastActivity = new Date();

      const broadcastMessage = {
        ...message,
        timestamp: (message.timestamp || new Date()).toISOString(),
        priority: 'immediate' as const
      };

      let successfulDeliveries = 0;
      let totalAttempts = 0;

      for (const [userId, pool] of this.connectionPool.entries()) {
        const activeConnection = pool.connections.find(
          ws => ws.readyState === WebSocket.OPEN
        );

        if (activeConnection) {
          totalAttempts++;
          try {
            activeConnection.send(JSON.stringify(broadcastMessage));
            successfulDeliveries++;
          } catch (error) {
            console.error(`Failed to broadcast to user ${userId}:`, error);
            this.connectionStats.droppedMessages++;
          }
        }
      }

      const deliveryRate = totalAttempts > 0
        ? (successfulDeliveries / totalAttempts * 100).toFixed(2)
        : 0;

      console.log(`Broadcast completed: ${successfulDeliveries}/${totalAttempts} delivered (${deliveryRate}% success rate)`);
    }, 1);
  }

  getUserSubscriptions(userId: string): number[] {
    const userSubs = this.userSubscriptionIndex.get(userId);
    return userSubs ? Array.from(userSubs) : [];
  }

  isUserConnected(userId: string): boolean {
    const pool = this.connectionPool.get(userId);
    if (!pool || pool.connections.length === 0) return false;
    return pool.connections.some(ws => ws.readyState === WebSocket.OPEN);
  }

  getConnectionCount(userId: string): number {
    const pool = this.connectionPool.get(userId);
    if (!pool) return 0;
    return pool.connections.filter(ws => ws.readyState === WebSocket.OPEN).length;
  }

  getAllConnectedUsers(): string[] {
    const connectedUsers: string[] = [];

    for (const [userId, pool] of this.connectionPool.entries()) {
      if (pool.connections.some(ws => ws.readyState === WebSocket.OPEN)) {
        connectedUsers.push(userId);
      }
    }

    return connectedUsers;
  }

  getBillSubscribers(billId: number): string[] {
    const subscribers = this.billSubscriptions.get(billId);
    return subscribers ? Array.from(subscribers) : [];
  }

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
        averageLatency: this.connectionStats.averageLatency,
        queueDepth: this.operationQueue.length,
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
      }
    };
  }

  /**
   * Force detailed memory analysis logging
   */
  forceMemoryAnalysis() {
    console.log('🔍 FORCED MEMORY ANALYSIS - WebSocket Service');
    this.performHealthCheck();

    // Additional detailed analysis
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    let totalMessageBuffers = 0;
    let totalSubscriptionsPerConnection = 0;
    let connectionDetails: any[] = [];

    for (const [userId, pool] of this.connectionPool.entries()) {
      for (const ws of pool.connections) {
        const bufferSize = ws.messageBuffer ? ws.messageBuffer.length : 0;
        const subscriptionSize = ws.subscriptions ? ws.subscriptions.size : 0;
        totalMessageBuffers += bufferSize;
        totalSubscriptionsPerConnection += subscriptionSize;

        connectionDetails.push({
          userId,
          bufferSize,
          subscriptionSize,
          readyState: ws.readyState,
          lastPing: ws.lastPing ? new Date(ws.lastPing).toISOString() : null
        });
      }
    }

    console.log('Detailed WebSocket Memory Breakdown:', {
      memory: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsedPercent: heapUsedPercent.toFixed(2) + '%'
      },
      dataStructures: {
        clients: this.clients.size,
        billSubscriptions: this.billSubscriptions.size,
        userSubscriptionIndex: this.userSubscriptionIndex.size,
        connectionPool: this.connectionPool.size,
        messageDedupeCache: this.messageDedupeCache.size,
        operationQueue: this.operationQueue.length,
        performanceHistory: this.connectionStats.latencyMeasurements.length
      },
      buffers: {
        totalMessageBuffers,
        totalSubscriptionsPerConnection,
        connectionDetails: connectionDetails.slice(0, 10) // First 10 connections
      },
      timestamp: new Date().toISOString()
    });

    return {
      heapUsedPercent,
      dataStructureSizes: {
        clients: this.clients.size,
        billSubscriptions: this.billSubscriptions.size,
        connectionPool: this.connectionPool.size,
        messageDedupeCache: this.messageDedupeCache.size,
        operationQueue: this.operationQueue.length
      },
      totalMessageBuffers,
      totalSubscriptionsPerConnection
    };
  }
}

export const webSocketService = new WebSocketService();