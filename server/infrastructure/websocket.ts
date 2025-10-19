import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import * as jwt from 'jsonwebtoken';
import { database as db } from '@shared/database/connection';
import { User, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../shared/core/src/observability/logging';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  lastPing?: number;
  subscriptions?: Set<number>;
  messageBuffer?: any[];
  flushTimer?: NodeJS.Timeout;
  connectionId?: string;
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
  timestamp?: number;
}

interface VerifyClientInfo {
  origin: string;
  secure: boolean;
  req: IncomingMessage;
}

interface ConnectionPoolEntry {
  connections: AuthenticatedWebSocket[];
  lastActivity: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Connection management
  HEARTBEAT_INTERVAL: 30000,
  HEALTH_CHECK_INTERVAL: 60000,
  STALE_CONNECTION_THRESHOLD: 60000,
  MAX_CONNECTIONS_PER_USER: 5,
  CONNECTION_POOL_SIZE: 10000,
  
  // Message handling
  MAX_QUEUE_SIZE: 1000,
  MESSAGE_BATCH_SIZE: 10,
  MESSAGE_BATCH_DELAY: 50,
  MAX_PAYLOAD: 100 * 1024, // 100KB
  
  // Performance optimization
  COMPRESSION_THRESHOLD: 1024,
  MAX_LATENCY_SAMPLES: 200,
  DEDUPE_CACHE_SIZE: 5000,
  DEDUPE_WINDOW: 5000,
  DEDUPE_CACHE_CLEANUP_AGE: 1800000, // 30 minutes
  
  // Reconnection
  MAX_RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 1000,
  
  // Memory management
  MEMORY_CLEANUP_INTERVAL: 180000, // 3 minutes
  HIGH_MEMORY_THRESHOLD: 85,
  CRITICAL_MEMORY_THRESHOLD: 95,
  PERFORMANCE_HISTORY_MAX_SIZE: 100,
  
  // Shutdown
  SHUTDOWN_GRACE_PERIOD: 5000,
} as const;

// ============================================================================
// UTILITY CLASSES
// ============================================================================

/**
 * Priority queue implementation using binary search for efficient insertion.
 * Maintains items sorted by priority for optimal dequeue performance.
 */
class PriorityQueue<T> {
  private items: Array<{ priority: number; item: T; timestamp: number }> = [];
  private readonly maxSize: number;

  constructor(maxSize: number = CONFIG.MAX_QUEUE_SIZE) {
    this.maxSize = maxSize;
  }

  /**
   * Enqueue an item with the given priority.
   * Returns false if queue is at capacity.
   */
  enqueue(item: T, priority: number, timestamp: number): boolean {
    if (this.items.length >= this.maxSize) {
      return false;
    }

    const entry = { priority, item, timestamp };

    // Binary search for insertion point to maintain sorted order
    let low = 0;
    let high = this.items.length;

    while (low < high) {
      const mid = (low + high) >>> 1; // Unsigned right shift for efficient division by 2
      if (this.items[mid].priority > priority) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    this.items.splice(low, 0, entry);
    return true;
  }

  dequeue() {
    return this.items.shift();
  }

  peek() {
    return this.items[0];
  }

  get length() {
    return this.items.length;
  }

  clear() {
    this.items.length = 0;
  }

  /**
   * Remove items older than maxAge in a single pass.
   * Returns the number of items removed.
   */
  removeStaleItems(maxAge: number): number {
    const now = Date.now();
    const beforeLength = this.items.length;
    this.items = this.items.filter(item => now - item.timestamp < maxAge);
    return beforeLength - this.items.length;
  }
}

/**
 * LRU Cache with efficient access tracking using a Map and array.
 * Automatically evicts least recently used items when capacity is reached.
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;
  private accessOrder: K[] = [];

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.moveToEnd(key);
      return;
    }

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
    this.accessOrder.push(key);
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.moveToEnd(key);
    }
    return value;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.length = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  /**
   * Optimized method to move an accessed key to the end of the access order.
   * Uses splice and push for efficient reordering.
   */
  private moveToEnd(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      // Only move if not already at the end
      if (index !== this.accessOrder.length - 1) {
        this.accessOrder.splice(index, 1);
        this.accessOrder.push(key);
      }
    } else {
      // Key not found in order, add it
      this.accessOrder.push(key);
    }
  }

  /**
   * Batch cleanup method that removes entries older than maxAge.
   * Uses a timestamp getter function to determine entry age.
   */
  removeOldEntries(maxAge: number, timestampGetter: (value: V) => number): number {
    const now = Date.now();
    const keysToRemove: K[] = [];

    for (const [key, value] of this.cache.entries()) {
      if (now - timestampGetter(value) > maxAge) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }

    return keysToRemove.length;
  }
}

/**
 * Circular buffer for efficient storage of fixed-size numeric data.
 * Ideal for tracking metrics like latency measurements without unbounded growth.
 */
class CircularBuffer {
  private buffer: number[];
  private index = 0;
  private size = 0;
  private readonly capacity: number;
  private sum = 0; // Track sum for O(1) average calculation

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(value: number): void {
    // Subtract old value from sum if buffer is full
    if (this.size === this.capacity) {
      this.sum -= this.buffer[this.index];
    }
    
    this.buffer[this.index] = value;
    this.sum += value;
    this.index = (this.index + 1) % this.capacity;
    
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  getAverage(): number {
    return this.size === 0 ? 0 : this.sum / this.size;
  }

  getSize(): number {
    return this.size;
  }

  clear(): void {
    this.index = 0;
    this.size = 0;
    this.sum = 0;
  }
}

// ============================================================================
// WEBSOCKET SERVICE
// ============================================================================

/**
 * WebSocket service for real-time communication with authenticated clients.
 * Provides subscription management, message batching, and health monitoring.
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private billSubscriptions: Map<number, Set<string>> = new Map();
  private userSubscriptionIndex: Map<string, Set<number>> = new Map();
  private connectionPool: Map<string, ConnectionPoolEntry> = new Map();

  // Deduplication cache with timestamp tracking
  private messageDedupeCache: LRUCache<string, number>;
  private readonly DEDUPE_WINDOW = CONFIG.DEDUPE_WINDOW;

  // Statistics tracking
  private connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    totalBroadcasts: 0,
    droppedMessages: 0,
    duplicateMessages: 0,
    queueOverflows: 0,
    reconnections: 0,
    startTime: Date.now(),
    lastActivity: Date.now(),
    peakConnections: 0,
  };

  // Performance monitoring
  private latencyBuffer: CircularBuffer;
  private operationQueue: PriorityQueue<() => Promise<void>>;
  private processingQueue = false;

  // Intervals for maintenance tasks
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private memoryCleanupInterval: NodeJS.Timeout | null = null;

  // State flags
  private isInitialized = false;
  private initializationLock = false;
  private isShuttingDown = false;

  // Connection tracking
  private nextConnectionId = 0;

  constructor() {
    this.messageDedupeCache = new LRUCache(CONFIG.DEDUPE_CACHE_SIZE);
    this.latencyBuffer = new CircularBuffer(CONFIG.MAX_LATENCY_SAMPLES);
    this.operationQueue = new PriorityQueue(CONFIG.MAX_QUEUE_SIZE);
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the WebSocket server with the given HTTP server.
   * Sets up compression, connection limits, and event handlers.
   */
  initialize(server: Server): void {
    if (this.isInitialized || this.initializationLock) {
      logger.info('WebSocket service already initialized or initialization in progress', { 
        component: 'WebSocketService' 
      });
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
            level: 3 // Balanced compression level
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
        maxPayload: CONFIG.MAX_PAYLOAD,
        clientTracking: true,
        // CRITICAL FIX: verifyClient must be synchronous or use callback pattern
        verifyClient: (info, callback) => {
          this.verifyClientAsync(info)
            .then(result => callback(result))
            .catch(() => callback(false));
        }
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      this.wss.on('error', (error) => {
        logger.error('WebSocket server error:', { component: 'WebSocketService' }, error);
      });

      this.setupIntervals();

      this.isInitialized = true;
      logger.info('WebSocket server initialized on /ws', { 
        component: 'WebSocketService',
        config: {
          maxPayload: CONFIG.MAX_PAYLOAD,
          maxConnectionsPerUser: CONFIG.MAX_CONNECTIONS_PER_USER,
          heartbeatInterval: CONFIG.HEARTBEAT_INTERVAL
        }
      });
    } catch (error) {
      logger.error('Failed to initialize WebSocket service:', { 
        component: 'WebSocketService' 
      }, error instanceof Error ? error : new Error(String(error)));
      this.isInitialized = false;
      throw error;
    } finally {
      this.initializationLock = false;
    }
  }

  /**
   * Verify client connection with JWT authentication and connection limits.
   * Async version that works with the callback-based verifyClient.
   */
  private async verifyClientAsync(info: VerifyClientInfo): Promise<boolean> {
    try {
      const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token') ||
        info.req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided', { 
          component: 'WebSocketService' 
        });
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'fallback-secret'
      ) as { userId: string };

      // Verify user exists in database
       const userRecord = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (userRecord.length === 0) {
        logger.warn('WebSocket connection rejected: User not found', { 
          component: 'WebSocketService',
          userId: decoded.userId 
        });
        return false;
      }

      // Enforce per-user connection limit
      const userConnections = this.connectionPool.get(decoded.userId);
      if (userConnections && userConnections.connections.length >= CONFIG.MAX_CONNECTIONS_PER_USER) {
        logger.warn(`Connection limit exceeded for user ${decoded.userId}`, { 
          component: 'WebSocketService',
          currentConnections: userConnections.connections.length,
          limit: CONFIG.MAX_CONNECTIONS_PER_USER
        });
        return false;
      }

      // Attach userId to request for use in connection handler
      (info.req as any).userId = decoded.userId;
      return true;

    } catch (error) {
      logger.warn('Token verification failed', {
        component: 'WebSocketService',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  // ==========================================================================
  // CONNECTION HANDLING
  // ==========================================================================

  /**
   * Handle new WebSocket connection.
   * Sets up connection tracking, event handlers, and sends confirmation.
   */
  private handleConnection(ws: AuthenticatedWebSocket, request: any): void {
    const userId = request.userId;
    if (!userId) {
      logger.error('Connection without userId - should not happen', { 
        component: 'WebSocketService' 
      });
      ws.close(1008, 'Authentication required');
      return;
    }

    const connectionId = `${userId}-${this.nextConnectionId++}`;
    
    // Initialize WebSocket properties
    ws.userId = userId;
    ws.connectionId = connectionId;
    ws.isAlive = true;
    ws.lastPing = Date.now();
    ws.subscriptions = new Set();
    ws.messageBuffer = [];

    // Update connection statistics
    this.connectionStats.totalConnections++;
    this.connectionStats.activeConnections++;
    this.connectionStats.peakConnections = Math.max(
      this.connectionStats.peakConnections,
      this.connectionStats.activeConnections
    );
    this.connectionStats.lastActivity = Date.now();

    // Initialize or update connection pool
    if (!this.connectionPool.has(userId)) {
      this.connectionPool.set(userId, {
        connections: [],
        lastActivity: Date.now()
      });
    }
    const pool = this.connectionPool.get(userId)!;
    pool.connections.push(ws);
    pool.lastActivity = Date.now();

    // Initialize clients set
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(ws);

    logger.info(`New WebSocket connection ${connectionId} for user: ${userId}`, {
      component: 'WebSocketService',
      activeConnections: this.connectionStats.activeConnections,
      userConnections: pool.connections.length
    });

    // Send connection confirmation with configuration
    this.sendOptimized(ws, {
      type: 'connected',
      message: 'WebSocket connection established',
      data: {
        userId,
        connectionId,
        timestamp: new Date().toISOString(),
        config: {
          heartbeatInterval: CONFIG.HEARTBEAT_INTERVAL,
          maxMessageSize: CONFIG.MAX_PAYLOAD,
          supportsBatching: true,
          compressionEnabled: true
        }
      }
    });

    // Setup event handlers
    ws.on('message', (data: Buffer) => this.handleIncomingMessage(ws, data));
    ws.on('close', (code, reason) => this.handleClose(ws, code, reason));
    ws.on('error', (error) => this.handleError(ws, error));
    ws.on('pong', () => this.handlePong(ws));
  }

  /**
   * Handle incoming message from client.
   * Parses, validates, and routes messages to appropriate handlers.
   */
  private handleIncomingMessage(ws: AuthenticatedWebSocket, data: Buffer): void {
    if (this.isShuttingDown) return;

    const receiveTime = Date.now();
    
    this.queueOperation(async () => {
      this.connectionStats.totalMessages++;
      this.connectionStats.lastActivity = Date.now();

      let message: WebSocketMessage | null = null;
      
      try {
        const messageStr = data.toString();
        
        // Guard against oversized messages
        if (messageStr.length > CONFIG.MAX_PAYLOAD) {
          throw new Error('Message exceeds maximum size');
        }

        message = JSON.parse(messageStr);

        // Track latency if client provided timestamp
        if (message?.timestamp) {
          const latency = receiveTime - message.timestamp;
          if (latency >= 0 && latency < 60000) { // Sanity check: 0-60 seconds
            this.latencyBuffer.push(latency);
          }
        }

        // Validate message structure
        if (!message || typeof message !== 'object' || !('type' in message)) {
          throw new Error('Invalid message structure');
        }

        await this.handleMessage(ws, message);

      } catch (error) {
        logger.error('Error handling WebSocket message:', { 
          component: 'WebSocketService',
          connectionId: ws.connectionId,
          error: error instanceof Error ? error.message : String(error)
        });
        
        this.sendOptimized(ws, {
          type: 'error',
          message: error instanceof Error ? error.message : 'Invalid message format',
          messageId: message?.messageId
        });
      }
    }, 2);
  }

  /**
   * Handle WebSocket close event.
   * Cleans up connection and updates statistics.
   */
  private handleClose(ws: AuthenticatedWebSocket, code: number, reason: Buffer): void {
    this.queueOperation(async () => {
      this.connectionStats.activeConnections--;
      
      logger.info(`WebSocket closed ${ws.connectionId}`, {
        component: 'WebSocketService',
        code,
        reason: reason.toString(),
        activeConnections: this.connectionStats.activeConnections
      });
      
      this.handleDisconnection(ws);
    }, 1);
  }

  /**
   * Handle WebSocket error event.
   * Logs error and initiates cleanup.
   */
  private handleError(ws: AuthenticatedWebSocket, error: Error): void {
    logger.error(`WebSocket error for ${ws.connectionId}:`, { 
      component: 'WebSocketService' 
    }, error);
    
    this.queueOperation(async () => {
      this.handleDisconnection(ws);
    }, 1);
  }

  /**
   * Handle pong response from client.
   * Updates connection liveness indicators.
   */
  private handlePong(ws: AuthenticatedWebSocket): void {
    ws.isAlive = true;
    ws.lastPing = Date.now();
  }

  // ==========================================================================
  // MESSAGE HANDLING
  // ==========================================================================

  /**
   * Route message to appropriate handler based on type.
   * Sends acknowledgment if message includes messageId.
   */
  private async handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    // Send acknowledgment if messageId provided
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
          message: `Unknown message type: ${message.type}`
        });
    }
  }

  /**
   * Send message to client with batching optimization.
   * Immediate messages bypass batching for low latency.
   */
  private sendOptimized(ws: AuthenticatedWebSocket, message: any): boolean {
    if (ws.readyState !== WebSocket.OPEN) return false;

    try {
      // Send immediately for high-priority messages
      if (message.priority === 'immediate') {
        ws.send(JSON.stringify(message));
        return true;
      }

      // Initialize buffer if needed
      ws.messageBuffer = ws.messageBuffer || [];
      ws.messageBuffer.push(message);

      // Setup flush timer if not exists
      if (!ws.flushTimer) {
        ws.flushTimer = setTimeout(() => {
          this.flushMessageBuffer(ws);
        }, CONFIG.MESSAGE_BATCH_DELAY);
      }

      // Flush if buffer reaches batch size
      if (ws.messageBuffer.length >= CONFIG.MESSAGE_BATCH_SIZE) {
        this.flushMessageBuffer(ws);
      }

      return true;

    } catch (error) {
      logger.error('Error sending WebSocket message:', { 
        component: 'WebSocketService',
        connectionId: ws.connectionId
      }, error instanceof Error ? error : new Error(String(error)));
      
      this.connectionStats.droppedMessages++;
      return false;
    }
  }

  /**
   * Flush buffered messages to client.
   * Combines multiple messages into a single batch when beneficial.
   */
  private flushMessageBuffer(ws: AuthenticatedWebSocket): void {
    if (!ws.messageBuffer || ws.messageBuffer.length === 0) return;
    
    if (ws.readyState !== WebSocket.OPEN) {
      ws.messageBuffer.length = 0;
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
      ws.messageBuffer.length = 0;

    } catch (error) {
      logger.error('Error flushing message buffer:', { 
        component: 'WebSocketService',
        connectionId: ws.connectionId,
        bufferSize: ws.messageBuffer.length
      }, error instanceof Error ? error : new Error(String(error)));
      
      this.connectionStats.droppedMessages += ws.messageBuffer.length;
      ws.messageBuffer.length = 0;
      
    } finally {
      if (ws.flushTimer) {
        clearTimeout(ws.flushTimer);
        ws.flushTimer = undefined;
      }
    }
  }

  // ==========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================================

  /**
   * Handle subscription request for a single bill.
   * Updates subscription indexes for efficient lookups.
   */
  private async handleSubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
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

    logger.debug(`User ${ws.userId} subscribed to bill ${billId}`, {
      component: 'WebSocketService'
    });

    this.sendOptimized(ws, {
      type: 'subscribed',
      data: { billId, message: `Subscribed to bill ${billId} updates` }
    });
  }

  /**
   * Handle batch subscription request for multiple bills.
   * Processes subscriptions efficiently and reports successes/failures.
   */
  private async handleBatchSubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
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
        if (typeof billId !== 'number' || billId <= 0) {
          failed.push(billId);
          continue;
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

        subscribed.push(billId);
      } catch (error) {
        logger.error(`Failed to subscribe to bill ${billId}:`, { 
          component: 'WebSocketService' 
        }, error instanceof Error ? error : new Error(String(error)));
        failed.push(billId);
      }
    }

    logger.info(`Batch subscription completed for user ${ws.userId}`, {
      component: 'WebSocketService',
      subscribed: subscribed.length,
      failed: failed.length
    });

    this.sendOptimized(ws, {
      type: 'batch_subscribed',
      data: {
        subscribed,
        failed,
        message: `Subscribed to ${subscribed.length} bills${failed.length > 0 ? `, ${failed.length} failed` : ''}`
      }
    });
  }

  /**
   * Handle unsubscription request for a single bill.
   * Cleans up subscription indexes and removes empty sets.
   */
  private async handleUnsubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
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

    logger.debug(`User ${ws.userId} unsubscribed from bill ${billId}`, {
      component: 'WebSocketService'
    });

    this.sendOptimized(ws, {
      type: 'unsubscribed',
      data: { billId, message: `Unsubscribed from bill ${billId} updates` }
    });
  }

  /**
   * Handle batch unsubscription request for multiple bills.
   * Efficiently processes multiple unsubscriptions at once.
   */
  // cSpell:ignore unsubscriptions
  private async handleBatchUnsubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
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

    logger.info(`Batch unsubscription completed for user ${ws.userId}`, {
      component: 'WebSocketService',
      unsubscribed: unsubscribed.length
    });

    this.sendOptimized(ws, {
      type: 'batch_unsubscribed',
      data: {
        unsubscribed,
        message: `Unsubscribed from ${unsubscribed.length} bills`
      }
    });
  }

  /**
   * Handle get preferences request.
   * Returns user notification preferences (placeholder for integration).
   */
  private async handleGetPreferences(ws: AuthenticatedWebSocket): Promise<void> {
    if (!ws.userId) {
      this.sendOptimized(ws, {
        type: 'error',
        message: 'Authentication required'
      });
      return;
    }

    try {
      // TODO: Integrate with actual user preferences service
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
      logger.error('Error getting user preferences:', { 
        component: 'WebSocketService',
        userId: ws.userId
      }, error instanceof Error ? error : new Error(String(error)));
      
      this.sendOptimized(ws, {
        type: 'error',
        message: 'Failed to get preferences'
      });
    }
  }

  /**
   * Handle update preferences request.
   * Updates user notification preferences (placeholder for integration).
   */
  private async handleUpdatePreferences(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
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
      // TODO: Integrate with actual user preferences service
      const updatedPreferences = { 
        ...preferences, 
        lastUpdated: new Date().toISOString() 
      };

      this.sendOptimized(ws, {
        type: 'preferences_updated',
        data: updatedPreferences,
        message: 'Preferences updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error updating user preferences:', { 
        component: 'WebSocketService',
        userId: ws.userId
      }, error instanceof Error ? error : new Error(String(error)));
      
      this.sendOptimized(ws, {
        type: 'error',
        message: 'Failed to update preferences'
      });
    }
  }

  // ==========================================================================
  // DISCONNECTION HANDLING
  // ==========================================================================

  /**
   * Handle client disconnection with comprehensive cleanup.
   * Removes all traces of the connection from internal data structures.
   */
  private handleDisconnection(ws: AuthenticatedWebSocket): void {
    if (!ws.userId) return;

    const userId = ws.userId;

    // Clean up timers and buffers
    try {
      if (ws.flushTimer) {
        clearTimeout(ws.flushTimer);
        ws.flushTimer = undefined;
      }
      
      if (ws.messageBuffer && ws.messageBuffer.length > 0) {
        logger.debug(`Clearing ${ws.messageBuffer.length} pending messages for ${ws.connectionId}`, { 
          component: 'WebSocketService' 
        });
      }
      ws.messageBuffer = undefined;
    } catch (error) {
      logger.error('Error clearing message buffer:', { 
        component: 'WebSocketService' 
      }, error instanceof Error ? error : new Error(String(error)));
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
        ws.subscriptions = undefined;
      }
    } catch (error) {
      logger.error('Error cleaning up subscriptions:', { 
        component: 'WebSocketService' 
      }, error instanceof Error ? error : new Error(String(error)));
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
      logger.error('Error cleaning up connection pool:', { 
        component: 'WebSocketService' 
      }, error instanceof Error ? error : new Error(String(error)));
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
      logger.error('Error cleaning up user subscription index:', { 
        component: 'WebSocketService' 
      }, error instanceof Error ? error : new Error(String(error)));
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
      logger.error('Error cleaning up clients map:', { 
        component: 'WebSocketService' 
      }, error instanceof Error ? error : new Error(String(error)));
    }

    // Clear WebSocket properties to help garbage collection
    ws.userId = undefined;
    ws.connectionId = undefined;
    ws.isAlive = undefined;
    ws.lastPing = undefined;
  }

  // ==========================================================================
  // OPERATION QUEUE
  // ==========================================================================

  /**
   * Queue an operation for asynchronous processing with priority.
   * Returns immediately; operation executes when queue is processed.
   */
  private async queueOperation(
    operation: () => Promise<void>,
    priority: number = 2
  ): Promise<void> {
    const enqueued = this.operationQueue.enqueue(operation, priority, Date.now());
    
    if (!enqueued) {
      this.connectionStats.queueOverflows++;
      logger.warn('Operation queue overflow, operation dropped', { 
        component: 'WebSocketService',
        queueLength: this.operationQueue.length
      });
      return;
    }

    if (!this.processingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process queued operations in priority order.
   * Continues until queue is empty or shutdown is initiated.
   */
  private async processQueue(): Promise<void> {
    this.processingQueue = true;

    while (this.operationQueue.length > 0 && !this.isShuttingDown) {
      const item = this.operationQueue.dequeue();
      if (!item) break;

      // Drop operations that are too old (30 seconds)
      if (Date.now() - item.timestamp > 30000) {
        logger.warn('Dropping stale operation', { 
          component: 'WebSocketService',
          age: Date.now() - item.timestamp
        });
        continue;
      }

      try {
        await item.item();
      } catch (error) {
        logger.error('Error processing queued operation:', { 
          component: 'WebSocketService' 
        }, error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processingQueue = false;
  }

  // ==========================================================================
  // BROADCASTING
  // ==========================================================================

  /**
   * Broadcast bill update to all subscribed users.
   * Uses deduplication to prevent sending duplicate updates.
   */
  broadcastBillUpdate(billId: number, update: {
    type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
    data: any;
    timestamp: Date;
  }): void {
    const dedupeKey = `${billId}-${update.type}-${update.timestamp.getTime()}`;

    // Check for duplicate within dedupe window
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
      this.connectionStats.lastActivity = Date.now();

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
          // Find first active connection for this user
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

      logger.info(`Broadcast bill ${billId} update: ${successfulDeliveries}/${subscriberSnapshot.length} delivered`, { 
        component: 'WebSocketService',
        updateType: update.type
      });
    }, 2);
  }

  /**
   * Send notification to specific user across all their connections.
   * High priority messages bypass batching for immediate delivery.
   */
  sendUserNotification(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }): void {
    this.queueOperation(async () => {
      const pool = this.connectionPool.get(userId);
      if (!pool || pool.connections.length === 0) {
        logger.debug(`No active connections for user ${userId}`, {
          component: 'WebSocketService'
        });
        return;
      }

      const message = {
        type: 'notification',
        notification,
        timestamp: new Date().toISOString(),
        priority: 'immediate' as const
      };

      let delivered = 0;
      // Send to all active connections
      for (const ws of pool.connections) {
        if (ws.readyState === WebSocket.OPEN) {
          if (this.sendOptimized(ws, message)) {
            delivered++;
          }
        }
      }

      logger.debug(`User notification sent to ${delivered}/${pool.connections.length} connections`, {
        component: 'WebSocketService',
        userId
      });
    }, 1); // High priority
  }

  /**
   * Broadcast message to all connected users.
   * Useful for system-wide announcements.
   */
  broadcastToAll(message: { type: string; data: any; timestamp?: Date }): void {
    const dedupeKey = `broadcast-${message.type}-${Date.now()}`;
    
    if (this.messageDedupeCache.has(dedupeKey)) {
      this.connectionStats.duplicateMessages++;
      return;
    }
    
    this.messageDedupeCache.set(dedupeKey, Date.now());

    this.queueOperation(async () => {
      this.connectionStats.totalBroadcasts++;
      this.connectionStats.lastActivity = Date.now();

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
            logger.error(`Failed to broadcast to user ${userId}`, { 
              component: 'WebSocketService' 
            }, error instanceof Error ? error : new Error(String(error)));
            this.connectionStats.droppedMessages++;
          }
        }
      }

      const deliveryRate = totalAttempts > 0
        ? (successfulDeliveries / totalAttempts * 100).toFixed(2)
        : 0;

      logger.info(`Broadcast completed: ${successfulDeliveries}/${totalAttempts} delivered (${deliveryRate}% success rate)`, { 
        component: 'WebSocketService' 
      });
    }, 1); // High priority
  }

  // ==========================================================================
  // MAINTENANCE & MONITORING
  // ==========================================================================

  /**
   * Setup periodic maintenance intervals for health checks and cleanup.
   */
  private setupIntervals(): void {
    this.cleanupIntervals();

    // Heartbeat interval - detect dead connections
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
          logger.info(`Cleaned up ${deadConnections} dead connections`, { 
            component: 'WebSocketService' 
          });
        }
      }, 3);
    }, CONFIG.HEARTBEAT_INTERVAL);

    // Health check interval
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, CONFIG.HEALTH_CHECK_INTERVAL);

    // Memory cleanup interval
    this.memoryCleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, CONFIG.MEMORY_CLEANUP_INTERVAL);
  }

  /**
   * Clear all maintenance intervals.
   */
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
   * Perform health check and log warnings if issues detected.
   */
  private performHealthCheck(): void {
    const now = Date.now();
    const uptime = now - this.connectionStats.startTime;
    const timeSinceLastActivity = now - this.connectionStats.lastActivity;

    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const isHealthy = timeSinceLastActivity < 300000 &&
      this.operationQueue.length < CONFIG.MAX_QUEUE_SIZE * 0.8 &&
      heapUsedPercent < 90;

    // Log warnings if unhealthy or concerning metrics
    if (!isHealthy || 
        this.operationQueue.length > CONFIG.MAX_QUEUE_SIZE * 0.5 || 
        heapUsedPercent > 85) {
      logger.warn('WebSocket Health Warning', { component: 'WebSocketService' }, {
        activeConnections: this.connectionStats.activeConnections,
        queueDepth: this.operationQueue.length,
        droppedMessages: this.connectionStats.droppedMessages,
        heapUsedPercent: heapUsedPercent.toFixed(2) + '%',
        isHealthy
      });
    }
  }

  /**
   * Perform memory cleanup to prevent unbounded growth.
   * Implements aggressive cleanup under high memory pressure.
   */
  private performMemoryCleanup(): void {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const now = Date.now();

    let cleanedItems = 0;

    // Clean up stale operations in queue
    const staleOpsRemoved = this.operationQueue.removeStaleItems(30000);
    cleanedItems += staleOpsRemoved;

    // Clean up stale connection pools (1 hour inactivity)
    let stalePools = 0;
    for (const [userId, pool] of this.connectionPool.entries()) {
      if (pool.connections.length === 0 && now - pool.lastActivity > 3600000) {
        this.connectionPool.delete(userId);
        stalePools++;
        cleanedItems++;
      }
    }

    // Critical memory pressure - aggressive cleanup
    if (heapUsedPercent > CONFIG.CRITICAL_MEMORY_THRESHOLD) {
      logger.warn('🚨 CRITICAL MEMORY PRESSURE - Performing aggressive cleanup', { 
        component: 'WebSocketService',
        heapUsedPercent: heapUsedPercent.toFixed(2) + '%'
      });

      // Clear latency buffer
      this.latencyBuffer.clear();
      cleanedItems++;

      // Reduce dedupe cache size significantly
      if (this.messageDedupeCache.size > CONFIG.DEDUPE_CACHE_SIZE * 0.2) {
        const oldSize = this.messageDedupeCache.size;
        this.messageDedupeCache = new LRUCache(Math.floor(CONFIG.DEDUPE_CACHE_SIZE * 0.2));
        cleanedItems += oldSize;
      }

      // Clear operation queue to prevent overflow
      if (this.operationQueue.length > CONFIG.MAX_QUEUE_SIZE * 0.5) {
        const clearedOps = this.operationQueue.length - Math.floor(CONFIG.MAX_QUEUE_SIZE * 0.2);
        while (this.operationQueue.length > CONFIG.MAX_QUEUE_SIZE * 0.2) {
          this.operationQueue.dequeue();
        }
        cleanedItems += clearedOps;
      }

      // Force garbage collection if available
      if (global.gc) {
        const memBeforeGC = process.memoryUsage();
        global.gc();
        const memAfterGC = process.memoryUsage();
        const freedByGC = memBeforeGC.heapUsed - memAfterGC.heapUsed;
        logger.info('🗑️ Forced garbage collection', { component: 'WebSocketService' }, {
          freed: `${(freedByGC / 1024 / 1024).toFixed(2)} MB`,
          heapBefore: `${(memBeforeGC.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapAfter: `${(memAfterGC.heapUsed / 1024 / 1024).toFixed(2)} MB`
        });
      }
    } 
    // High memory pressure - moderate cleanup
    else if (heapUsedPercent > CONFIG.HIGH_MEMORY_THRESHOLD) {
      logger.warn('⚠️ HIGH MEMORY PRESSURE - Performing moderate cleanup', { 
        component: 'WebSocketService',
        heapUsedPercent: heapUsedPercent.toFixed(2) + '%'
      });
      
      // Clean up old dedupe cache entries
      const dedupeRemoved = this.messageDedupeCache.removeOldEntries(
        CONFIG.DEDUPE_CACHE_CLEANUP_AGE,
        (timestamp) => timestamp
      );
      cleanedItems += dedupeRemoved;
    }

    // Clean up oversized message buffers
    let bufferCleanups = 0;
    for (const [, pool] of this.connectionPool.entries()) {
      for (const ws of pool.connections) {
        if (ws.messageBuffer && ws.messageBuffer.length > CONFIG.MESSAGE_BATCH_SIZE * 2) {
          ws.messageBuffer = ws.messageBuffer.slice(-CONFIG.MESSAGE_BATCH_SIZE);
          bufferCleanups++;
          cleanedItems++;
        }
      }
    }

    // Proactive cleanup if queue is growing too large
    if (this.operationQueue.length > CONFIG.MAX_QUEUE_SIZE * 0.8) {
      const targetSize = Math.floor(CONFIG.MAX_QUEUE_SIZE * 0.6);
      const operationsToRemove = this.operationQueue.length - targetSize;
      let removedOps = 0;

      while (this.operationQueue.length > targetSize && removedOps < operationsToRemove) {
        const removed = this.operationQueue.dequeue();
        if (removed) {
          removedOps++;
        }
      }

      if (removedOps > 0) {
        cleanedItems += removedOps;
        logger.warn(`Removed ${removedOps} operations from queue`, { 
          component: 'WebSocketService' 
        });
      }
    }

    // Log cleanup results if significant work was done
    if (cleanedItems > 0 || bufferCleanups > 0 || stalePools > 0) {
      const memAfter = process.memoryUsage();
      const heapAfterPercent = (memAfter.heapUsed / memAfter.heapTotal) * 100;
      const memoryFreed = memUsage.heapUsed - memAfter.heapUsed;

      logger.info('🧹 Memory cleanup completed', { component: 'WebSocketService' }, {
        cleanedItems,
        staleOpsRemoved,
        bufferCleanups,
        stalePools,
        memoryFreed: `${(memoryFreed / 1024 / 1024).toFixed(2)} MB`,
        heapBefore: heapUsedPercent.toFixed(2) + '%',
        heapAfter: heapAfterPercent.toFixed(2) + '%'
      });
    }
  }

  // ==========================================================================
  // STATISTICS & MONITORING
  // ==========================================================================

  /**
   * Get comprehensive service statistics.
   */
  getStats() {
    const now = Date.now();
    const uptime = now - this.connectionStats.startTime;

    return {
      ...this.connectionStats,
      uptime: Math.floor(uptime / 1000),
      averageLatency: this.latencyBuffer.getAverage(),
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

  /**
   * Get detailed health status with warnings.
   */
  getHealthStatus() {
    const now = Date.now();
    const uptime = now - this.connectionStats.startTime;
    const timeSinceLastActivity = now - this.connectionStats.lastActivity;

    const stats = this.getStats();
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return {
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 1000),
      timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000),
      isHealthy: this.connectionStats.activeConnections >= 0 &&
        timeSinceLastActivity < 300000 &&
        this.operationQueue.length < CONFIG.MAX_QUEUE_SIZE * 0.8 &&
        heapUsedPercent < 90,
      stats,
      memoryUsage: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      },
      heapUsedPercent,
      warnings: this.generateHealthWarnings(stats, heapUsedPercent)
    };
  }

  /**
   * Generate health warnings based on current metrics.
   */
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
      warnings.push(`High average latency: ${stats.averageLatency.toFixed(0)}ms`);
    }

    if (stats.messageSuccessRate < 0.95) {
      warnings.push(`Low message success rate: ${(stats.messageSuccessRate * 100).toFixed(2)}%`);
    }

    return warnings;
  }

  /**
   * Get metrics grouped by category.
   */
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
        averageLatency: this.latencyBuffer.getAverage(),
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
   * Force detailed memory analysis for debugging.
   * Provides breakdown of memory usage by component.
   */
  forceMemoryAnalysis(): any {
    const memUsage = process.memoryUsage();

    // Estimate memory usage for each component
    let connectionPoolMemory = 0;
    for (const [userId, pool] of this.connectionPool.entries()) {
      connectionPoolMemory += userId.length * 2;
      connectionPoolMemory += pool.connections.length * 100;
    }

    let subscriptionMemory = 0;
    for (const [, subscribers] of this.billSubscriptions.entries()) {
      subscriptionMemory += 8;
      subscriptionMemory += subscribers.size * 50;
    }

    const dedupeCacheMemory = this.messageDedupeCache.size * 100;
    const queueMemory = this.operationQueue.length * 200;

    let bufferMemory = 0;
    for (const [, pool] of this.connectionPool.entries()) {
      for (const ws of pool.connections) {
        if (ws.messageBuffer) {
          bufferMemory += ws.messageBuffer.length * 150;
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      connections: {
        active: this.connectionStats.activeConnections,
        total: this.connectionStats.totalConnections,
        peak: this.connectionStats.peakConnections,
        poolSize: this.connectionPool.size,
        memoryUsage: `${(connectionPoolMemory / 1024).toFixed(2)} KB`
      },
      subscriptions: {
        billSubscriptions: this.billSubscriptions.size,
        userSubscriptions: this.userSubscriptionIndex.size,
        totalSubscriptions: Array.from(this.billSubscriptions.values())
          .reduce((sum, subscribers) => sum + subscribers.size, 0),
        memoryUsage: `${(subscriptionMemory / 1024).toFixed(2)} KB`
      },
      messages: {
        totalProcessed: this.connectionStats.totalMessages,
        broadcasts: this.connectionStats.totalBroadcasts,
        dropped: this.connectionStats.droppedMessages,
        duplicates: this.connectionStats.duplicateMessages,
        dedupeCacheSize: this.messageDedupeCache.size,
        dedupeCacheMemory: `${(dedupeCacheMemory / 1024).toFixed(2)} KB`
      },
      performance: {
        averageLatency: this.latencyBuffer.getAverage(),
        queueDepth: this.operationQueue.length,
        queueOverflows: this.connectionStats.queueOverflows,
        queueMemory: `${(queueMemory / 1024).toFixed(2)} KB`,
        bufferMemory: `${(bufferMemory / 1024).toFixed(2)} KB`
      },
      memory: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsedPercent: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + '%'
      },
      warnings: this.generateMemoryWarnings(
        memUsage, 
        connectionPoolMemory, 
        subscriptionMemory, 
        dedupeCacheMemory, 
        queueMemory, 
        bufferMemory
      )
    };
  }

  /**
   * Generate memory warnings based on estimated usage.
   */
  private generateMemoryWarnings(
    memUsage: NodeJS.MemoryUsage, 
    ...memoryComponents: number[]
  ): string[] {
    const warnings: string[] = [];
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (heapUsedPercent > 85) {
      warnings.push(`High heap usage: ${heapUsedPercent.toFixed(2)}%`);
    }

    if (this.connectionStats.activeConnections > CONFIG.CONNECTION_POOL_SIZE * 0.8) {
      warnings.push(`High connection count: ${this.connectionStats.activeConnections}/${CONFIG.CONNECTION_POOL_SIZE}`);
    }

    if (this.operationQueue.length > CONFIG.MAX_QUEUE_SIZE * 0.7) {
      warnings.push(`High queue depth: ${this.operationQueue.length}/${CONFIG.MAX_QUEUE_SIZE}`);
    }

    const totalEstimatedMemory = memoryComponents.reduce((sum, mem) => sum + mem, 0);
    if (totalEstimatedMemory > 50 * 1024 * 1024) { // 50MB
      warnings.push(`High estimated WebSocket memory usage: ${(totalEstimatedMemory / 1024 / 1024).toFixed(2)} MB`);
    }

    return warnings;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get user's current subscriptions.
   */
  getUserSubscriptions(userId: string): number[] {
    const userSubs = this.userSubscriptionIndex.get(userId);
    return userSubs ? Array.from(userSubs) : [];
  }

  /**
   * Check if user is currently connected.
   */
  isUserConnected(userId: string): boolean {
    const pool = this.connectionPool.get(userId);
    if (!pool || pool.connections.length === 0) return false;
    return pool.connections.some(ws => ws.readyState === WebSocket.OPEN);
  }

  /**
   * Get number of active connections for a user.
   */
  getConnectionCount(userId: string): number {
    const pool = this.connectionPool.get(userId);
    if (!pool) return 0;
    return pool.connections.filter(ws => ws.readyState === WebSocket.OPEN).length;
  }

  /**
   * Get all currently connected user IDs.
   */
  getAllConnectedUsers(): string[] {
    const connectedUsers: string[] = [];
    for (const [userId, pool] of this.connectionPool.entries()) {
      if (pool.connections.some(ws => ws.readyState === WebSocket.OPEN)) {
        connectedUsers.push(userId);
      }
    }
    return connectedUsers;
  }

  /**
   * Get all user IDs subscribed to a specific bill.
   */
  getBillSubscribers(billId: number): string[] {
    const subscribers = this.billSubscriptions.get(billId);
    return subscribers ? Array.from(subscribers) : [];
  }

  // ==========================================================================
  // CLEANUP & SHUTDOWN
  // ==========================================================================

  /**
   * Clean up all internal data structures without closing connections.
   * Used during graceful shutdown after connections are closed.
   */
  cleanup(): void {
    if (this.isShuttingDown) return;

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
          ws.messageBuffer = undefined;
        } catch (error) {
          logger.error(`Error cleaning up connection for user ${userId}`, { 
            component: 'WebSocketService' 
          }, error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    // Clear all maps and caches
    this.clients.clear();
    this.billSubscriptions.clear();
    this.userSubscriptionIndex.clear();
    this.connectionPool.clear();
    this.messageDedupeCache.clear();
    this.operationQueue.clear();
    this.latencyBuffer.clear();

    logger.info('WebSocket service cleanup completed', { component: 'WebSocketService' });
  }

  /**
   * Gracefully shutdown the WebSocket service.
   * Notifies clients, flushes pending messages, and closes all connections.
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.info('Shutdown already in progress', { component: 'WebSocketService' });
      return;
    }

    logger.info('🔄 Shutting down WebSocket service...', { component: 'WebSocketService' });
    this.isShuttingDown = true;

    try {
      this.cleanupIntervals();

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
            logger.error('Error sending shutdown message', { 
              component: 'WebSocketService' 
            }, error instanceof Error ? error : new Error(String(error)));
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
            logger.error('Error closing WebSocket connection', { 
              component: 'WebSocketService' 
            }, error instanceof Error ? error : new Error(String(error)));
          }
        }

        // Close the WebSocket server
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            logger.warn('WebSocket server close timeout, forcing shutdown', { 
              component: 'WebSocketService' 
            });
            resolve();
          }, 5000);

          this.wss!.close((err) => {
            clearTimeout(timeout);
            if (err) {
              logger.error('Error closing WebSocket server', { 
                component: 'WebSocketService' 
              }, err);
              reject(err);
            } else {
              logger.info('WebSocket server closed successfully', { 
                component: 'WebSocketService' 
              });
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
          logger.warn(`Shutdown timeout - ${this.operationQueue.length} operations still in queue`, { 
            component: 'WebSocketService' 
          });
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.cleanup();
      this.isInitialized = false;

      logger.info('WebSocket Service Shutdown Statistics', { 
        component: 'WebSocketService' 
      }, {
        totalConnections: this.connectionStats.totalConnections,
        totalMessages: this.connectionStats.totalMessages,
        totalBroadcasts: this.connectionStats.totalBroadcasts,
        droppedMessages: this.connectionStats.droppedMessages,
        peakConnections: this.connectionStats.peakConnections
      });

      logger.info('✅ WebSocket service shutdown completed', { 
        component: 'WebSocketService' 
      });

    } catch (error) {
      logger.error('❌ Error during WebSocket shutdown', { 
        component: 'WebSocketService' 
      }, error instanceof Error ? error : new Error(String(error)));
      
      this.cleanup();
      this.isInitialized = false;
      throw error;
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();





































