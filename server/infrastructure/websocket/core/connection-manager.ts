/**
 * Connection Manager for WebSocket Service
 * 
 * Handles connection lifecycle, authentication, and connection pooling.
 * Manages user connection limits and connection metadata for efficient
 * message delivery and resource management.
 */

import { verify } from 'jsonwebtoken';
import { logger } from '@shared/core';


import { BASE_CONFIG } from '../config/base-config';
import { RuntimeConfig } from '../config/runtime-config';
import type {
  AuthenticatedWebSocket,
  ConnectionPoolEntry,
  IConnectionManager,
} from '../types';

/**
 * Error types for connection management
 */
export class ConnectionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly connectionId?: string
  ) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class AuthenticationError extends ConnectionError {
  constructor(message: string, connectionId?: string) {
    super(message, 'AUTH_FAILED', connectionId);
    this.name = 'AuthenticationError';
  }
}

export class ConnectionLimitError extends ConnectionError {
  constructor(message: string, connectionId?: string) {
    super(message, 'CONNECTION_LIMIT_EXCEEDED', connectionId);
    this.name = 'ConnectionLimitError';
  }
}

/**
 * Connection Manager implementation
 * 
 * Manages WebSocket connections with authentication, pooling, and limits.
 * Provides efficient connection lookup and cleanup operations.
 */
export class ConnectionManager implements IConnectionManager {
  private readonly connectionPool = new Map<string, ConnectionPoolEntry>();
  private readonly connectionById = new Map<string, AuthenticatedWebSocket>();
  private readonly runtimeConfig: RuntimeConfig;
  private connectionCounter = 0;
  private readonly jwtSecret: string;

  constructor(runtimeConfig: RuntimeConfig, jwtSecret?: string) {
    this.runtimeConfig = runtimeConfig;
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'default-secret';
    
    if (!this.jwtSecret || this.jwtSecret === 'default-secret') {
      throw new Error('JWT_SECRET must be provided for secure authentication');
    }
  }

  /**
   * Add a new connection to the pool with proper validation and limits
   */
  addConnection(ws: AuthenticatedWebSocket): void {
    try {
      // Generate unique connection ID
      const connectionId = this.generateConnectionId();
      ws.connectionId = connectionId;

      // Initialize connection metadata
      ws.isAlive = true;
      ws.lastPing = Date.now();
      ws.subscriptions = new Set<number>();
      ws.messageBuffer = [];

      // Store connection by ID for quick lookup
      this.connectionById.set(connectionId, ws);

      // If user is authenticated, add to user pool with limits check
      if (ws.user_id) {
        this.addToUserPool(ws);
      }

      // Set up connection event handlers
      this.setupConnectionHandlers(ws);

    } catch (error) {
      throw new ConnectionError(
        `Failed to add connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ADD_CONNECTION_FAILED',
        ws.connectionId
      );
    }
  }

  /**
   * Remove a connection from the pool and clean up resources
   */
  removeConnection(ws: AuthenticatedWebSocket): void {
    try {
      const connectionId = ws.connectionId;
      
      if (!connectionId) {
        return; // Connection was never properly added
      }

      // Remove from connection ID map
      this.connectionById.delete(connectionId);

      // Remove from user pool if authenticated
      if (ws.user_id) {
        this.removeFromUserPool(ws);
      }

      // Clean up connection resources
      this.cleanupConnection(ws);

    } catch (error) {
      // Log error but don't throw to avoid disrupting cleanup
      if (process.env.NODE_ENV !== 'production') {
        logger.error('Error removing connection:', error);
      }
    }
  }

  /**
   * Get all connections for a specific user
   */
  getConnectionsForUser(userId: string): AuthenticatedWebSocket[] {
    const poolEntry = this.connectionPool.get(userId);
    return poolEntry ? [...poolEntry.connections] : [];
  }

  /**
   * Authenticate a connection using JWT token
   */
  async authenticateConnection(ws: AuthenticatedWebSocket, token: string): Promise<boolean> {
    try {
      if (!token) {
        throw new AuthenticationError('No token provided', ws.connectionId);
      }

      // Verify JWT token
      const decoded = verify(token, this.jwtSecret) as { user_id: string; [key: string]: unknown };
      
      if (!decoded.user_id) {
        throw new AuthenticationError('Invalid token: missing user_id', ws.connectionId);
      }

      // Check connection limits before authentication
      const existingConnections = this.getConnectionsForUser(decoded.user_id);
      const maxConnections = this.runtimeConfig.get('MAX_CONNECTIONS_PER_USER');
      
      if (existingConnections.length >= maxConnections) {
        throw new ConnectionLimitError(
          `Connection limit exceeded: ${existingConnections.length}/${maxConnections}`,
          ws.connectionId
        );
      }

      // Set user ID and add to user pool
      ws.user_id = decoded.user_id;
      this.addToUserPool(ws);

      return true;

    } catch (error) {
      if (error instanceof ConnectionError) {
        throw error;
      }
      
      throw new AuthenticationError(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ws.connectionId
      );
    }
  }

  /**
   * Get total connection count
   */
  getConnectionCount(): number {
    return this.connectionById.size;
  }

  /**
   * Perform cleanup operations on stale connections
   */
  cleanup(): void {
    const now = Date.now();
    const staleThreshold = BASE_CONFIG.STALE_CONNECTION_THRESHOLD;
    const staleConnections: AuthenticatedWebSocket[] = [];

    // Find stale connections
    for (const ws of Array.from(this.connectionById.values())) {
      if (ws.lastPing && (now - ws.lastPing) > staleThreshold) {
        staleConnections.push(ws);
      }
    }

    // Remove stale connections
    for (const ws of staleConnections) {
      try {
        ws.terminate();
        this.removeConnection(ws);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          logger.error('Error cleaning up stale connection:', error);
        }
      }
    }

    // Clean up empty user pools
    for (const [userId, poolEntry] of Array.from(this.connectionPool.entries())) {
      if (poolEntry.connections.length === 0) {
        this.connectionPool.delete(userId);
      }
    }
  }

  /**
   * Get connection statistics for monitoring
   */
  getConnectionStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    userPoolSize: number;
    averageConnectionsPerUser: number;
  } {
    const totalConnections = this.connectionById.size;
    const userPoolSize = this.connectionPool.size;
    const authenticatedConnections = Array.from(this.connectionById.values())
      .filter(ws => ws.user_id).length;
    
    const averageConnectionsPerUser = userPoolSize > 0 
      ? authenticatedConnections / userPoolSize 
      : 0;

    return {
      totalConnections,
      authenticatedConnections,
      userPoolSize,
      averageConnectionsPerUser,
    };
  }

  /**
   * Generate a unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${++this.connectionCounter}`;
  }

  /**
   * Add connection to user pool with limit enforcement
   */
  private addToUserPool(ws: AuthenticatedWebSocket): void {
    if (!ws.user_id) {
      throw new ConnectionError('Cannot add to user pool: no user_id', 'NO_USER_ID', ws.connectionId);
    }

    const userId = ws.user_id;
    const maxConnections = this.runtimeConfig.get('MAX_CONNECTIONS_PER_USER');

    // Get or create pool entry
    let poolEntry = this.connectionPool.get(userId);
    if (!poolEntry) {
      poolEntry = {
        connections: [],
        lastActivity: Date.now(),
      };
      this.connectionPool.set(userId, poolEntry);
    }

    // Check connection limit
    if (poolEntry.connections.length >= maxConnections) {
      throw new ConnectionLimitError(
        `User ${userId} has reached connection limit: ${poolEntry.connections.length}/${maxConnections}`,
        ws.connectionId
      );
    }

    // Add connection to pool
    poolEntry.connections.push(ws);
    poolEntry.lastActivity = Date.now();
  }

  /**
   * Remove connection from user pool
   */
  private removeFromUserPool(ws: AuthenticatedWebSocket): void {
    if (!ws.user_id) {
      return;
    }

    const poolEntry = this.connectionPool.get(ws.user_id);
    if (!poolEntry) {
      return;
    }

    // Remove connection from pool
    const index = poolEntry.connections.indexOf(ws);
    if (index > -1) {
      poolEntry.connections.splice(index, 1);
      poolEntry.lastActivity = Date.now();
    }

    // Remove empty pool entry
    if (poolEntry.connections.length === 0) {
      this.connectionPool.delete(ws.user_id);
    }
  }

  /**
   * Set up event handlers for a connection
   */
  private setupConnectionHandlers(ws: AuthenticatedWebSocket): void {
    // Handle connection close
    ws.on('close', () => {
      this.removeConnection(ws);
    });

    // Handle connection errors
    ws.on('error', (error) => {
      if (process.env.NODE_ENV !== 'production') {
        logger.error(`Connection error for ${ws.connectionId}:`, error);
      }
      this.removeConnection(ws);
    });

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastPing = Date.now();
    });
  }

  /**
   * Clean up connection resources
   */
  private cleanupConnection(ws: AuthenticatedWebSocket): void {
    // Clear message buffer flush timer
    if (ws.flushTimer) {
      clearTimeout(ws.flushTimer);
      delete ws.flushTimer;
    }

    // Clear message buffer
    if (ws.messageBuffer) {
      ws.messageBuffer.length = 0;
    }

    // Clear subscriptions
    if (ws.subscriptions) {
      ws.subscriptions.clear();
    }

    // Reset connection metadata
    ws.isAlive = false;
    delete ws.user_id;
    delete ws.connectionId;
  }
}

/**
 * Factory function to create a ConnectionManager instance
 */
export function createConnectionManager(
  runtimeConfig: RuntimeConfig,
  jwtSecret?: string
): ConnectionManager {
  return new ConnectionManager(runtimeConfig, jwtSecret);
}