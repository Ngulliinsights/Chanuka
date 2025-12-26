/**
 * WebSocket API Server Module
 * 
 * Server-side WebSocket API handlers and endpoints.
 * This module handles WebSocket connections, authentication, and message routing
 * for the server-side API.
 */

import { Server } from 'http';
import { IncomingMessage } from 'http';

import { v4 as uuidv4 } from 'uuid';
import { WebSocket, WebSocketServer } from 'ws';

// Use server-side logger
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  error: (message: string, meta?: any, error?: Error) => console.error(`[ERROR] ${message}`, meta || '', error || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || '')
};

import type { WebSocketMessage } from '../types';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Extended WebSocket interface with authentication and subscription data
 */
interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  subscriptions: Set<string>;
  connectionTime: number;
  lastActivity: number;
}

/**
 * Connection information passed during client verification
 */
interface VerifyClientInfo {
  origin: string;
  secure: boolean;
  req: IncomingMessage;
}

/**
 * Complete connection object stored in the connection map
 */
export interface WebSocketConnection {
  id: string;
  ws: AuthenticatedWebSocket;
  userId?: string;
  sessionId: string;
  subscriptions: Set<string>;
  connectionTime: number;
  lastActivity: number;
}

/**
 * Statistics tracking for the WebSocket server
 */
interface WebSocketStats {
  totalConnections: number;
  authenticatedConnections: number;
  totalSubscriptions: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
}

/**
 * Configuration options for the WebSocket server
 */
interface WebSocketServerConfig {
  heartbeatInterval?: number;
  staleConnectionTimeout?: number;
  maxConnectionAge?: number;
  cleanupInterval?: number;
}

// ============================================================================
// WebSocket API Server
// ============================================================================

export class WebSocketAPIServer {
  private wss: WebSocketServer | null = null;
  private connections = new Map<string, WebSocketConnection>();
  private messageHandlers = new Map<string, MessageHandler>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private config: Required<WebSocketServerConfig>;
  private stats: WebSocketStats = {
    totalConnections: 0,
    authenticatedConnections: 0,
    totalSubscriptions: 0,
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0
  };

  constructor(
    private server: Server,
    config: WebSocketServerConfig = {}
  ) {
    // Set default configuration values
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 10000,
      staleConnectionTimeout: config.staleConnectionTimeout ?? 30000,
      maxConnectionAge: config.maxConnectionAge ?? 24 * 60 * 60 * 1000,
      cleanupInterval: config.cleanupInterval ?? 60000
    };
  }

  // ==========================================================================
  // Server Initialization
  // ==========================================================================

  /**
   * Initialize the WebSocket server and set up event handlers
   */
  async initialize(): Promise<void> {
    try {
      // Create WebSocket server with proper options
      this.wss = new WebSocketServer({ 
        server: this.server,
        path: '/api/ws',
        verifyClient: this.verifyClient.bind(this)
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Start background tasks
      this.startHeartbeat();
      this.startCleanup();

      logger.info('WebSocket API server initialized', {
        component: 'WebSocketAPIServer',
        path: '/api/ws',
        config: this.config
      });
    } catch (error) {
      logger.error('Failed to initialize WebSocket API server', {
        component: 'WebSocketAPIServer'
      }, error);
      throw error;
    }
  }

  /**
   * Gracefully shut down the WebSocket server
   */
  async shutdown(): Promise<void> {
    try {
      // Close all active connections with proper closure code
      this.connections.forEach(connection => {
        connection.ws.close(1001, 'Server shutting down');
      });

      // Stop background tasks
      this.stopHeartbeat();
      this.stopCleanup();

      // Close WebSocket server
      if (this.wss) {
        await new Promise<void>((resolve, reject) => {
          this.wss!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        this.wss = null;
      }

      // Clear connections
      this.connections.clear();

      logger.info('WebSocket API server shut down gracefully', {
        component: 'WebSocketAPIServer',
        finalStats: this.stats
      });
    } catch (error) {
      logger.error('Error during WebSocket API server shutdown', {
        component: 'WebSocketAPIServer'
      }, error);
      throw error;
    }
  }

  // ==========================================================================
  // Client Verification
  // ==========================================================================

  /**
   * Verify incoming WebSocket connections before accepting them
   */
  private async verifyClient(info: VerifyClientInfo): Promise<boolean> {
    try {
      const token = this.extractToken(info.req);
      
      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided', {
          component: 'WebSocketAPIServer',
          origin: info.origin
        });
        return false;
      }

      // Validate token and check rate limits in parallel for better performance
      const [isValid, withinLimits] = await Promise.all([
        this.authenticateWebSocket(token),
        this.checkRateLimit(token)
      ]);

      if (!isValid || !withinLimits) {
        logger.warn('WebSocket connection rejected: Authentication or rate limit failed', {
          component: 'WebSocketAPIServer',
          origin: info.origin,
          isValid,
          withinLimits
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error verifying WebSocket client', {
        component: 'WebSocketAPIServer'
      }, error);
      return false;
    }
  }

  /**
   * Extract authentication token from request headers or query parameters
   */
  private extractToken(req: IncomingMessage): string | null {
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Fall back to query parameter
    if (req.url) {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        return url.searchParams.get('token');
      } catch (error) {
        logger.error('Error parsing URL for token extraction', {
          component: 'WebSocketAPIServer'
        }, error);
      }
    }
    
    return null;
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Set up WebSocket server event handlers
   */
  private setupEventHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws as AuthenticatedWebSocket, req);
    });

    this.wss.on('error', (error: Error) => {
      logger.error('WebSocket server error', {
        component: 'WebSocketAPIServer'
      }, error);
      this.stats.errors++;
    });

    this.wss.on('close', () => {
      logger.info('WebSocket server closed', {
        component: 'WebSocketAPIServer',
        stats: this.stats
      });
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage): void {
    const connectionId = uuidv4();
    const token = this.extractToken(req);
    
    // Initialize connection properties
    ws.subscriptions = new Set();
    ws.connectionTime = Date.now();
    ws.lastActivity = Date.now();

    // Authenticate connection asynchronously
    this.authenticateConnection(ws, token).then(userId => {
      ws.userId = userId;
      ws.sessionId = uuidv4();

      // Store connection in the connections map
      const connection: WebSocketConnection = {
        id: connectionId,
        ws,
        userId,
        sessionId: ws.sessionId,
        subscriptions: ws.subscriptions,
        connectionTime: ws.connectionTime,
        lastActivity: ws.lastActivity
      };

      this.connections.set(connectionId, connection);
      this.stats.totalConnections++;
      if (userId) this.stats.authenticatedConnections++;

      logger.info('WebSocket connection established', {
        component: 'WebSocketAPIServer',
        connectionId,
        userId,
        sessionId: ws.sessionId
      });

      // Set up connection-specific event handlers
      ws.on('message', (data: Buffer) => {
        this.handleMessage(connectionId, data);
      });

      ws.on('close', (code: number, reason: Buffer) => {
        this.handleDisconnection(connectionId, code, reason);
      });

      ws.on('error', (error: Error) => {
        this.handleConnectionError(connectionId, error);
      });

      ws.on('pong', () => {
        // Update last activity on pong receipt
        const conn = this.connections.get(connectionId);
        if (conn) {
          conn.lastActivity = Date.now();
          conn.ws.lastActivity = Date.now();
        }
      });

      // Send welcome message to establish connection
      this.sendMessage(ws, {
        type: 'connected',
        data: {
          connectionId,
          sessionId: ws.sessionId,
          serverTime: new Date().toISOString()
        }
      });

    }).catch(error => {
      logger.error('Failed to authenticate WebSocket connection', {
        component: 'WebSocketAPIServer',
        connectionId
      }, error);
      ws.close(1008, 'Authentication failed');
    });
  }

  /**
   * Authenticate a WebSocket connection using the provided token
   */
  private async authenticateConnection(
    _ws: AuthenticatedWebSocket, 
    token: string | null
  ): Promise<string | undefined> {
    if (!token) return undefined;
    
    try {
      const user = await this.authenticateWebSocket(token);
      return user;
    } catch (error) {
      logger.error('Authentication error', {
        component: 'WebSocketAPIServer'
      }, error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(connectionId: string, data: Buffer): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn('Received message for non-existent connection', {
        component: 'WebSocketAPIServer',
        connectionId
      });
      return;
    }

    try {
      // Update last activity timestamp
      const now = Date.now();
      connection.lastActivity = now;
      connection.ws.lastActivity = now;

      // Parse and validate the message
      const messageText = data.toString('utf8');
      const message = JSON.parse(messageText) as WebSocketMessage;
      
      if (!this.validateMessage(message)) {
        this.sendError(connection.ws, 'Invalid message format');
        this.stats.errors++;
        return;
      }

      this.stats.messagesReceived++;

      logger.debug('Received WebSocket message', {
        component: 'WebSocketAPIServer',
        connectionId,
        messageType: message.type
      });

      // Route message to the appropriate handler
      this.routeMessage(connection, message);

    } catch (error) {
      this.stats.errors++;
      logger.error('Error handling WebSocket message', {
        component: 'WebSocketAPIServer',
        connectionId
      }, error);
      this.sendError(connection.ws, 'Failed to process message');
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(connectionId: string, code: number, reason: Buffer): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Calculate connection duration for logging
    const duration = Date.now() - connection.connectionTime;

    // Clean up connection
    this.connections.delete(connectionId);
    this.stats.totalConnections--;
    if (connection.userId) this.stats.authenticatedConnections--;

    // Update subscription count
    this.stats.totalSubscriptions -= connection.subscriptions.size;

    logger.info('WebSocket connection closed', {
      component: 'WebSocketAPIServer',
      connectionId,
      userId: connection.userId,
      code,
      reason: reason.toString('utf8'),
      duration,
      subscriptionCount: connection.subscriptions.size
    });
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(connectionId: string, error: Error): void {
    this.stats.errors++;
    logger.error('WebSocket connection error', {
      component: 'WebSocketAPIServer',
      connectionId
    }, error);
    
    // Optionally close the connection on error
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.ws.close(1011, 'Internal error');
    }
  }

  // ==========================================================================
  // Message Routing
  // ==========================================================================

  /**
   * Route message to the appropriate handler based on message type
   */
  private routeMessage(connection: WebSocketConnection, message: WebSocketMessage): void {
    const handler = this.messageHandlers.get(message.type);
    
    if (handler) {
      try {
        handler(connection, message);
      } catch (error) {
        this.stats.errors++;
        logger.error('Error in message handler', {
          component: 'WebSocketAPIServer',
          messageType: message.type,
          connectionId: connection.id
        }, error);
        this.sendError(connection.ws, 'Failed to process message');
      }
    } else {
      logger.warn('Unknown message type received', {
        component: 'WebSocketAPIServer',
        messageType: message.type,
        connectionId: connection.id
      });
      this.sendError(connection.ws, `Unknown message type: ${message.type}`);
    }
  }

  // ==========================================================================
  // Message Handler Registration
  // ==========================================================================

  /**
   * Register a handler for a specific message type
   */
  registerMessageHandler(type: string, handler: MessageHandler): void {
    if (this.messageHandlers.has(type)) {
      logger.warn('Overwriting existing message handler', {
        component: 'WebSocketAPIServer',
        messageType: type
      });
    }
    this.messageHandlers.set(type, handler);
    
    logger.debug('Registered message handler', {
      component: 'WebSocketAPIServer',
      messageType: type
    });
  }

  /**
   * Unregister a message handler
   */
  unregisterMessageHandler(type: string): void {
    const existed = this.messageHandlers.delete(type);
    
    if (existed) {
      logger.debug('Unregistered message handler', {
        component: 'WebSocketAPIServer',
        messageType: type
      });
    }
  }

  // ==========================================================================
  // Subscription Management
  // ==========================================================================

  /**
   * Subscribe a connection to a topic
   */
  subscribeToTopic(connectionId: string, topic: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn('Cannot subscribe non-existent connection', {
        component: 'WebSocketAPIServer',
        connectionId,
        topic
      });
      return false;
    }

    const wasNew = !connection.subscriptions.has(topic);
    connection.subscriptions.add(topic);
    connection.ws.subscriptions.add(topic);
    
    if (wasNew) {
      this.stats.totalSubscriptions++;
      logger.info('Subscribed to topic', {
        component: 'WebSocketAPIServer',
        connectionId,
        topic
      });
    }

    return wasNew;
  }

  /**
   * Unsubscribe a connection from a topic
   */
  unsubscribeFromTopic(connectionId: string, topic: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn('Cannot unsubscribe non-existent connection', {
        component: 'WebSocketAPIServer',
        connectionId,
        topic
      });
      return false;
    }

    const existed = connection.subscriptions.has(topic);
    if (existed) {
      connection.subscriptions.delete(topic);
      connection.ws.subscriptions.delete(topic);
      this.stats.totalSubscriptions--;

      logger.info('Unsubscribed from topic', {
        component: 'WebSocketAPIServer',
        connectionId,
        topic
      });
    }

    return existed;
  }

  /**
   * Get all connections subscribed to a topic
   */
  getTopicSubscribers(topic: string): WebSocketConnection[] {
    const subscribers: WebSocketConnection[] = [];
    this.connections.forEach(connection => {
      if (connection.subscriptions.has(topic)) {
        subscribers.push(connection);
      }
    });
    return subscribers;
  }

  // ==========================================================================
  // Message Broadcasting
  // ==========================================================================

  /**
   * Broadcast a message to all connections subscribed to a topic
   */
  broadcastToTopic(
    topic: string, 
    message: WebSocketMessage, 
    excludeUserId?: string
  ): number {
    let sentCount = 0;
    
    this.connections.forEach(connection => {
      if (connection.subscriptions.has(topic)) {
        // Optionally exclude specific user
        if (excludeUserId && connection.userId === excludeUserId) {
          return;
        }

        if (this.sendMessage(connection.ws, message)) {
          sentCount++;
        }
      }
    });

    logger.debug('Broadcasted message to topic', {
      component: 'WebSocketAPIServer',
      topic,
      sentCount,
      excludedUser: excludeUserId
    });

    return sentCount;
  }

  /**
   * Broadcast a message to all connections for a specific user
   */
  broadcastToUser(userId: string, message: WebSocketMessage): number {
    let sentCount = 0;
    
    this.connections.forEach(connection => {
      if (connection.userId === userId) {
        if (this.sendMessage(connection.ws, message)) {
          sentCount++;
        }
      }
    });

    logger.debug('Broadcasted message to user', {
      component: 'WebSocketAPIServer',
      userId,
      sentCount
    });

    return sentCount;
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcastToAll(message: WebSocketMessage, excludeUserId?: string): number {
    let sentCount = 0;
    
    this.connections.forEach(connection => {
      if (excludeUserId && connection.userId === excludeUserId) {
        return;
      }

      if (this.sendMessage(connection.ws, message)) {
        sentCount++;
      }
    });

    logger.debug('Broadcasted message to all connections', {
      component: 'WebSocketAPIServer',
      sentCount,
      excludedUser: excludeUserId
    });

    return sentCount;
  }

  // ==========================================================================
  // Message Sending
  // ==========================================================================

  /**
   * Send a message to a specific WebSocket connection
   * Returns true if successful, false otherwise
   */
  private sendMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): boolean {
    try {
      // Only send if connection is open
      if (ws.readyState !== WebSocket.OPEN) {
        return false;
      }

      const data = JSON.stringify(message);
      ws.send(data);
      this.stats.messagesSent++;
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Error sending WebSocket message', {
        component: 'WebSocketAPIServer'
      }, error);
      return false;
    }
  }

  /**
   * Send an error message to a client
   */
  private sendError(ws: AuthenticatedWebSocket, error: string): boolean {
    return this.sendMessage(ws, {
      type: 'error',
      data: { error },
      timestamp: Date.now()
    });
  }

  // ==========================================================================
  // Background Tasks
  // ==========================================================================

  /**
   * Start the heartbeat mechanism to detect stale connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      this.connections.forEach(connection => {
        // Check for stale connections that haven't responded
        const timeSinceActivity = now - connection.lastActivity;
        
        if (timeSinceActivity > this.config.staleConnectionTimeout) {
          logger.warn('Closing stale connection', {
            component: 'WebSocketAPIServer',
            connectionId: connection.id,
            timeSinceActivity
          });
          connection.ws.close(1001, 'Connection timeout');
          return;
        }

        // Send ping to keep connection alive
        if (connection.ws.readyState === WebSocket.OPEN) {
          try {
            connection.ws.ping();
          } catch (error) {
            logger.error('Error sending ping', {
              component: 'WebSocketAPIServer',
              connectionId: connection.id
            }, error);
          }
        }
      });
    }, this.config.heartbeatInterval);

    logger.debug('Heartbeat mechanism started', {
      component: 'WebSocketAPIServer',
      interval: this.config.heartbeatInterval
    });
  }

  /**
   * Stop the heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.debug('Heartbeat mechanism stopped', {
        component: 'WebSocketAPIServer'
      });
    }
  }

  /**
   * Start the cleanup task to close old connections
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      this.connections.forEach(connection => {
        const connectionAge = now - connection.connectionTime;
        
        if (connectionAge > this.config.maxConnectionAge) {
          logger.info('Closing old connection', {
            component: 'WebSocketAPIServer',
            connectionId: connection.id,
            age: connectionAge
          });
          connection.ws.close(1001, 'Connection exceeded maximum age');
        }
      });
    }, this.config.cleanupInterval);

    logger.debug('Cleanup task started', {
      component: 'WebSocketAPIServer',
      interval: this.config.cleanupInterval
    });
  }

  /**
   * Stop the cleanup task
   */
  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.debug('Cleanup task stopped', {
        component: 'WebSocketAPIServer'
      });
    }
  }

  // ==========================================================================
  // Statistics and Monitoring
  // ==========================================================================

  /**
   * Get current server statistics
   */
  getStats(): WebSocketStats {
    return { ...this.stats };
  }

  /**
   * Get the current number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get detailed information about a specific connection
   */
  getConnectionDetails(connectionId: string): WebSocketConnection | undefined {
    const connection = this.connections.get(connectionId);
    if (!connection) return undefined;

    // Return a copy to prevent external modification
    return {
      id: connection.id,
      ws: connection.ws,
      userId: connection.userId,
      sessionId: connection.sessionId,
      subscriptions: new Set(connection.subscriptions),
      connectionTime: connection.connectionTime,
      lastActivity: connection.lastActivity
    };
  }

  /**
   * Get all active connections for a user
   */
  getUserConnections(userId: string): WebSocketConnection[] {
    const userConnections: WebSocketConnection[] = [];
    this.connections.forEach(connection => {
      if (connection.userId === userId) {
        userConnections.push(connection);
      }
    });
    return userConnections;
  }

  /**
   * Reset statistics counters
   */
  resetStats(): void {
    this.stats = {
      totalConnections: 0,
      authenticatedConnections: 0,
      totalSubscriptions: 0,
      messagesReceived: 0,
      messagesSent: 0,
      errors: 0
    };
    logger.info('Statistics reset', {
      component: 'WebSocketAPIServer'
    });
  }

  /**
   * Simple authentication for WebSocket connections
   */
  private async authenticateWebSocket(token: string): Promise<string | undefined> {
    // TODO: Implement proper authentication
    return token ? 'user_' + token.substring(0, 8) : undefined;
  }

  /**
   * Simple rate limiting check
   */
  private async checkRateLimit(_token: string): Promise<boolean> {
    // TODO: Implement proper rate limiting
    return true;
  }

  /**
   * Simple message validation
   */
  private validateMessage(message: WebSocketMessage): boolean {
    return !!(message && typeof message.type === 'string' && message.type.length > 0);
  }
}

// ============================================================================
// Message Handler Type
// ============================================================================

/**
 * Function signature for message handlers
 */
export type MessageHandler = (
  connection: WebSocketConnection, 
  message: WebSocketMessage
) => void | Promise<void>;

// ============================================================================
// Default Message Handlers
// ============================================================================

/**
 * Built-in message handlers for common operations
 */
export const defaultMessageHandlers = {
  /**
   * Handle subscription requests
   */
  subscribe: (connection: WebSocketConnection, message: WebSocketMessage) => {
    const topics = Array.isArray(message.data) ? message.data : [message.data];
    
    const subscribedTopics: string[] = [];
    topics.forEach(topic => {
      if (typeof topic === 'string' && topic.trim()) {
        connection.ws.subscriptions.add(topic);
        connection.subscriptions.add(topic);
        subscribedTopics.push(topic);
      }
    });

    logger.info('Processed subscribe message', {
      component: 'WebSocketAPI',
      connectionId: connection.id,
      topics: subscribedTopics
    });

    // Send confirmation
    connection.ws.send(JSON.stringify({
      type: 'subscribed',
      data: { topics: subscribedTopics },
      timestamp: Date.now()
    }));
  },

  /**
   * Handle unsubscription requests
   */
  unsubscribe: (connection: WebSocketConnection, message: WebSocketMessage) => {
    const topics = Array.isArray(message.data) ? message.data : [message.data];
    
    const unsubscribedTopics: string[] = [];
    topics.forEach(topic => {
      if (typeof topic === 'string') {
        if (connection.ws.subscriptions.has(topic)) {
          connection.ws.subscriptions.delete(topic);
          connection.subscriptions.delete(topic);
          unsubscribedTopics.push(topic);
        }
      }
    });

    logger.info('Processed unsubscribe message', {
      component: 'WebSocketAPI',
      connectionId: connection.id,
      topics: unsubscribedTopics
    });

    // Send confirmation
    connection.ws.send(JSON.stringify({
      type: 'unsubscribed',
      data: { topics: unsubscribedTopics },
      timestamp: Date.now()
    }));
  },

  /**
   * Handle ping requests from clients
   */
  ping: (connection: WebSocketConnection) => {
    // Send pong response
    connection.ws.send(JSON.stringify({
      type: 'pong',
      timestamp: Date.now()
    }));
  },

  /**
   * Handle client ready notifications
   */
  ready: (connection: WebSocketConnection) => {
    logger.info('Client marked as ready', {
      component: 'WebSocketAPI',
      connectionId: connection.id,
      userId: connection.userId
    });

    // Send acknowledgment
    connection.ws.send(JSON.stringify({
      type: 'ready_ack',
      data: { status: 'ready' },
      timestamp: Date.now()
    }));
  }
};

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and initialize a WebSocket API server
 */
export async function createWebSocketAPIServer(
  server: Server,
  config?: WebSocketServerConfig
): Promise<WebSocketAPIServer> {
  const wsServer = new WebSocketAPIServer(server, config);
  await wsServer.initialize();
  
  // Register default handlers
  Object.entries(defaultMessageHandlers).forEach(([type, handler]) => {
    wsServer.registerMessageHandler(type, handler);
  });
  
  return wsServer;
}

// ============================================================================
// Exports
// ============================================================================

export type { 
  WebSocketConnection, 
  WebSocketStats, 
  AuthenticatedWebSocket,
  VerifyClientInfo,
  WebSocketServerConfig
};