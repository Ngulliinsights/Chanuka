/**
 * Unit Tests for ConnectionManager
 */

import { verify } from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, type MockedFunction,vi } from 'vitest';
import { WebSocket } from 'ws';

import { RuntimeConfig } from '../../../../infrastructure/websocket/config/runtime-config.js';
import {
  AuthenticationError,
  ConnectionError,
  ConnectionLimitError,
  ConnectionManager,
  createConnectionManager,
} from '../../../../infrastructure/websocket/core/connection-manager.js';
import type { AuthenticatedWebSocket } from '../../../../infrastructure/websocket/types.js';

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  verify: vi.fn(),
}));

const mockVerify = verify as MockedFunction<typeof verify>;

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let runtimeConfig: RuntimeConfig;
  let mockWebSocket: AuthenticatedWebSocket;
  const testJwtSecret = 'test-secret-key';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Use fake timers for consistent timing
    vi.useFakeTimers();
    
    // Create runtime config with test values
    runtimeConfig = new RuntimeConfig({
      MAX_CONNECTIONS_PER_USER: 3,
      MESSAGE_BATCH_SIZE: 10,
      MESSAGE_BATCH_DELAY: 50,
      COMPRESSION_THRESHOLD: 1024,
      DEDUPE_CACHE_SIZE: 5000,
      DEDUPE_WINDOW: 5000,
      MEMORY_CLEANUP_INTERVAL: 180000,
    });

    // Create connection manager
    connectionManager = new ConnectionManager(runtimeConfig, testJwtSecret);

    // Create mock WebSocket
    mockWebSocket = {
      on: vi.fn(),
      terminate: vi.fn(),
      readyState: WebSocket.OPEN,
    } as unknown as AuthenticatedWebSocket;
  });

  afterEach(() => {
    // Clean up any timers or resources
    connectionManager.cleanup();
    
    // Restore real timers
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create ConnectionManager with valid config', () => {
      expect(connectionManager).toBeInstanceOf(ConnectionManager);
    });

    it('should throw error if no JWT secret provided', () => {
      expect(() => {
        new ConnectionManager(runtimeConfig);
      }).toThrow('JWT_SECRET must be provided for secure authentication');
    });

    it('should throw error if default JWT secret is used', () => {
      expect(() => {
        new ConnectionManager(runtimeConfig, 'default-secret');
      }).toThrow('JWT_SECRET must be provided for secure authentication');
    });
  });

  describe('addConnection', () => {
    it('should add connection successfully', () => {
      connectionManager.addConnection(mockWebSocket);

      expect(mockWebSocket.connectionId).toBeDefined();
      expect(mockWebSocket.isAlive).toBe(true);
      expect(mockWebSocket.lastPing).toBeDefined();
      expect(mockWebSocket.subscriptions).toBeInstanceOf(Set);
      expect(mockWebSocket.messageBuffer).toEqual([]);
      expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('pong', expect.any(Function));
    });

    it('should generate unique connection IDs', () => {
      const ws1 = { ...mockWebSocket, on: vi.fn() } as unknown as AuthenticatedWebSocket;
      const ws2 = { ...mockWebSocket, on: vi.fn() } as unknown as AuthenticatedWebSocket;

      connectionManager.addConnection(ws1);
      connectionManager.addConnection(ws2);

      expect(ws1.connectionId).toBeDefined();
      expect(ws2.connectionId).toBeDefined();
      expect(ws1.connectionId).not.toBe(ws2.connectionId);
    });

    it('should add authenticated connection to user pool', () => {
      mockWebSocket.user_id = 'user123';
      connectionManager.addConnection(mockWebSocket);

      const userConnections = connectionManager.getConnectionsForUser('user123');
      expect(userConnections).toHaveLength(1);
      expect(userConnections[0]).toBe(mockWebSocket);
    });

    it('should handle errors during connection addition', () => {
      // Mock WebSocket that throws error on event handler setup
      const errorWebSocket = {
        on: vi.fn().mockImplementation(() => {
          throw new Error('Event handler error');
        }),
      } as unknown as AuthenticatedWebSocket;

      expect(() => {
        connectionManager.addConnection(errorWebSocket);
      }).toThrow(ConnectionError);
    });
  });

  describe('removeConnection', () => {
    beforeEach(() => {
      connectionManager.addConnection(mockWebSocket);
    });

    it('should remove connection successfully', () => {
      const connectionId = mockWebSocket.connectionId;
      connectionManager.removeConnection(mockWebSocket);

      expect(connectionManager.getConnectionCount()).toBe(0);
      expect(mockWebSocket.isAlive).toBe(false);
      expect(mockWebSocket.user_id).toBeUndefined();
      expect(mockWebSocket.connectionId).toBeUndefined();
    });

    it('should remove connection from user pool', () => {
      mockWebSocket.user_id = 'user123';
      connectionManager.addConnection(mockWebSocket);
      
      expect(connectionManager.getConnectionsForUser('user123')).toHaveLength(1);
      
      connectionManager.removeConnection(mockWebSocket);
      
      expect(connectionManager.getConnectionsForUser('user123')).toHaveLength(0);
    });

    it('should handle removal of connection without ID gracefully', () => {
      const wsWithoutId = { ...mockWebSocket } as AuthenticatedWebSocket;
      delete wsWithoutId.connectionId;

      expect(() => {
        connectionManager.removeConnection(wsWithoutId);
      }).not.toThrow();
    });

    it('should clear flush timer if present', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const timer = setTimeout(() => {}, 1000) as NodeJS.Timeout;
      mockWebSocket.flushTimer = timer;

      connectionManager.removeConnection(mockWebSocket);

      expect(clearTimeoutSpy).toHaveBeenCalledWith(timer);
      expect(mockWebSocket.flushTimer).toBeUndefined();
    });
  });

  describe('authenticateConnection', () => {
    beforeEach(() => {
      connectionManager.addConnection(mockWebSocket);
    });

    it('should authenticate connection with valid token', async () => {
      const token = 'valid-jwt-token';
      const decodedToken = { user_id: 'user123' };

      mockVerify.mockReturnValue(decodedToken);

      const result = await connectionManager.authenticateConnection(mockWebSocket, token);

      expect(result).toBe(true);
      expect(mockWebSocket.user_id).toBe('user123');
      expect(mockVerify).toHaveBeenCalledWith(token, testJwtSecret);
    });

    it('should throw AuthenticationError for missing token', async () => {
      await expect(
        connectionManager.authenticateConnection(mockWebSocket, '')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for invalid token', async () => {
      const token = 'invalid-token';
      mockVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        connectionManager.authenticateConnection(mockWebSocket, token)
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for token without user_id', async () => {
      const token = 'valid-token-no-user-id';
      const decodedToken = { some_field: 'value' };

      mockVerify.mockReturnValue(decodedToken);

      await expect(
        connectionManager.authenticateConnection(mockWebSocket, token)
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw ConnectionLimitError when user exceeds connection limit', async () => {
      const token = 'valid-jwt-token';
      const decodedToken = { user_id: 'user123' };
      mockVerify.mockReturnValue(decodedToken);

      // Add connections up to the limit
      const maxConnections = runtimeConfig.get('MAX_CONNECTIONS_PER_USER');
      for (let i = 0; i < maxConnections; i++) {
        const ws = { ...mockWebSocket, on: vi.fn() } as unknown as AuthenticatedWebSocket;
        connectionManager.addConnection(ws);
        await connectionManager.authenticateConnection(ws, token);
      }

      // Try to add one more connection
      const extraWs = { ...mockWebSocket, on: vi.fn() } as unknown as AuthenticatedWebSocket;
      connectionManager.addConnection(extraWs);

      await expect(
        connectionManager.authenticateConnection(extraWs, token)
      ).rejects.toThrow(ConnectionLimitError);
    });
  });

  describe('getConnectionsForUser', () => {
    it('should return empty array for non-existent user', () => {
      const connections = connectionManager.getConnectionsForUser('nonexistent');
      expect(connections).toEqual([]);
    });

    it('should return user connections', async () => {
      const token = 'valid-jwt-token';
      const decodedToken = { user_id: 'user123' };
      mockVerify.mockReturnValue(decodedToken);

      connectionManager.addConnection(mockWebSocket);
      await connectionManager.authenticateConnection(mockWebSocket, token);

      const connections = connectionManager.getConnectionsForUser('user123');
      expect(connections).toHaveLength(1);
      expect(connections[0]).toBe(mockWebSocket);
    });

    it('should return copy of connections array', async () => {
      const token = 'valid-jwt-token';
      const decodedToken = { user_id: 'user123' };
      mockVerify.mockReturnValue(decodedToken);

      connectionManager.addConnection(mockWebSocket);
      await connectionManager.authenticateConnection(mockWebSocket, token);

      const connections1 = connectionManager.getConnectionsForUser('user123');
      const connections2 = connectionManager.getConnectionsForUser('user123');

      expect(connections1).not.toBe(connections2); // Different array instances
      expect(connections1).toEqual(connections2); // Same content
    });
  });

  describe('getConnectionCount', () => {
    it('should return 0 for no connections', () => {
      expect(connectionManager.getConnectionCount()).toBe(0);
    });

    it('should return correct count for multiple connections', () => {
      const ws1 = { ...mockWebSocket, on: vi.fn() } as unknown as AuthenticatedWebSocket;
      const ws2 = { ...mockWebSocket, on: vi.fn() } as unknown as AuthenticatedWebSocket;

      connectionManager.addConnection(ws1);
      connectionManager.addConnection(ws2);

      expect(connectionManager.getConnectionCount()).toBe(2);
    });

    it('should update count when connections are removed', () => {
      connectionManager.addConnection(mockWebSocket);
      expect(connectionManager.getConnectionCount()).toBe(1);

      connectionManager.removeConnection(mockWebSocket);
      expect(connectionManager.getConnectionCount()).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove stale connections', () => {
      connectionManager.addConnection(mockWebSocket);
      
      // Make connection stale by setting old lastPing
      mockWebSocket.lastPing = Date.now() - 120000; // 2 minutes ago

      connectionManager.cleanup();

      expect(mockWebSocket.terminate).toHaveBeenCalled();
      expect(connectionManager.getConnectionCount()).toBe(0);
    });

    it('should keep active connections', () => {
      connectionManager.addConnection(mockWebSocket);
      
      // Keep connection active
      mockWebSocket.lastPing = Date.now() - 30000; // 30 seconds ago

      connectionManager.cleanup();

      expect(mockWebSocket.terminate).not.toHaveBeenCalled();
      expect(connectionManager.getConnectionCount()).toBe(1);
    });

    it('should clean up empty user pools', async () => {
      const token = 'valid-jwt-token';
      const decodedToken = { user_id: 'user123' };
      mockVerify.mockReturnValue(decodedToken);

      connectionManager.addConnection(mockWebSocket);
      await connectionManager.authenticateConnection(mockWebSocket, token);

      expect(connectionManager.getConnectionsForUser('user123')).toHaveLength(1);

      // Remove connection manually (simulating close event)
      connectionManager.removeConnection(mockWebSocket);
      connectionManager.cleanup();

      expect(connectionManager.getConnectionsForUser('user123')).toHaveLength(0);
    });

    it('should handle cleanup errors gracefully', () => {
      connectionManager.addConnection(mockWebSocket);
      
      // Make terminate throw an error
      mockWebSocket.terminate = vi.fn().mockImplementation(() => {
        throw new Error('Terminate error');
      });
      mockWebSocket.lastPing = Date.now() - 120000; // Make it stale

      expect(() => {
        connectionManager.cleanup();
      }).not.toThrow();
    });
  });

  describe('getConnectionStats', () => {
    it('should return correct stats for empty manager', () => {
      const stats = connectionManager.getConnectionStats();

      expect(stats).toEqual({
        totalConnections: 0,
        authenticatedConnections: 0,
        userPoolSize: 0,
        averageConnectionsPerUser: 0,
      });
    });

    it('should return correct stats with mixed connections', async () => {
      const token = 'valid-jwt-token';
      const decodedToken = { user_id: 'user123' };
      mockVerify.mockReturnValue(decodedToken);

      // Add unauthenticated connection
      const ws1 = { ...mockWebSocket, on: vi.fn() } as unknown as AuthenticatedWebSocket;
      connectionManager.addConnection(ws1);

      // Add authenticated connection
      const ws2 = { ...mockWebSocket, on: vi.fn() } as unknown as AuthenticatedWebSocket;
      connectionManager.addConnection(ws2);
      await connectionManager.authenticateConnection(ws2, token);

      const stats = connectionManager.getConnectionStats();

      expect(stats.totalConnections).toBe(2);
      expect(stats.authenticatedConnections).toBe(1);
      expect(stats.userPoolSize).toBe(1);
      expect(stats.averageConnectionsPerUser).toBe(1);
    });
  });

  describe('connection event handlers', () => {
    it('should handle close event', () => {
      connectionManager.addConnection(mockWebSocket);
      
      // Get the close handler
      const closeHandler = (mockWebSocket.on as MockedFunction<typeof mockWebSocket.on>)
        .mock.calls.find(call => call[0] === 'close')?.[1];

      expect(closeHandler).toBeDefined();
      
      // Simulate close event
      if (closeHandler) {
        closeHandler();
      }

      expect(connectionManager.getConnectionCount()).toBe(0);
    });

    it('should handle error event', () => {
      connectionManager.addConnection(mockWebSocket);
      
      // Get the error handler
      const errorHandler = (mockWebSocket.on as MockedFunction<typeof mockWebSocket.on>)
        .mock.calls.find(call => call[0] === 'error')?.[1];

      expect(errorHandler).toBeDefined();
      
      // Simulate error event
      if (errorHandler) {
        errorHandler(new Error('Test error'));
      }

      expect(connectionManager.getConnectionCount()).toBe(0);
    });

    it('should handle pong event', () => {
      connectionManager.addConnection(mockWebSocket);
      const initialPing = mockWebSocket.lastPing;
      
      // Wait a small amount to ensure time difference
      vi.advanceTimersByTime(1);
      
      // Get the pong handler
      const pongHandler = (mockWebSocket.on as MockedFunction<typeof mockWebSocket.on>)
        .mock.calls.find(call => call[0] === 'pong')?.[1];

      expect(pongHandler).toBeDefined();
      
      // Simulate pong event
      if (pongHandler) {
        pongHandler();
      }

      expect(mockWebSocket.isAlive).toBe(true);
      expect(mockWebSocket.lastPing).toBeGreaterThanOrEqual(initialPing || 0);
    });
  });

  describe('createConnectionManager factory', () => {
    it('should create ConnectionManager instance', () => {
      const manager = createConnectionManager(runtimeConfig, testJwtSecret);
      expect(manager).toBeInstanceOf(ConnectionManager);
    });
  });

  describe('error classes', () => {
    it('should create ConnectionError with correct properties', () => {
      const error = new ConnectionError('Test message', 'TEST_CODE', 'conn123');
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.connectionId).toBe('conn123');
      expect(error.name).toBe('ConnectionError');
    });

    it('should create AuthenticationError with correct properties', () => {
      const error = new AuthenticationError('Auth failed', 'conn123');
      
      expect(error.message).toBe('Auth failed');
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.connectionId).toBe('conn123');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create ConnectionLimitError with correct properties', () => {
      const error = new ConnectionLimitError('Limit exceeded', 'conn123');
      
      expect(error.message).toBe('Limit exceeded');
      expect(error.code).toBe('CONNECTION_LIMIT_EXCEEDED');
      expect(error.connectionId).toBe('conn123');
      expect(error.name).toBe('ConnectionLimitError');
    });
  });
});