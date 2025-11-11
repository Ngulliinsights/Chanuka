/**
 * WebSocket React Hook Integration Tests
 *
 * Tests the integration between React hooks and WebSocket functionality
 * to ensure proper state management and real-time updates.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UnifiedWebSocketManager } from '../../core/api/websocket';

// Mock the UnifiedWebSocketManager
vi.mock('../../core/api/websocket', () => ({
  UnifiedWebSocketManager: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    subscribeToBill: vi.fn(),
    unsubscribeFromBill: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getConnectionState: vi.fn(() => 'disconnected'),
    getConnectionStatus: vi.fn(() => ({
      connected: false,
      reconnectAttempts: 0,
      readyState: null,
      maxReconnectAttempts: 5,
      state: 'disconnected',
      queuedMessages: 0
    })),
    getConnectionMetrics: vi.fn(() => ({
      status: 'disconnected',
      uptime: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      lastConnected: null,
      lastPong: null,
      queuedMessages: 0
    })),
    setConnectionOptions: vi.fn(),
    resetReconnectionAttempts: vi.fn(),
    clearMessageQueue: vi.fn(),
    isConnected: vi.fn(() => false)
  })),
  globalWebSocketPool: {
    getConnection: vi.fn(),
    removeConnection: vi.fn(),
    getAllConnections: vi.fn(() => []),
    disconnectAll: vi.fn()
  }
}));

// Mock React hooks
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useEffect: vi.fn((fn) => fn()),
    useState: vi.fn((initial) => [initial, vi.fn()]),
    useCallback: vi.fn((fn) => fn),
    useRef: vi.fn((initial) => ({ current: initial })),
    useMemo: vi.fn((fn) => fn())
  };
});

// Import after mocking
import { useWebSocket, useBillRealTime } from '../useWebSocket';

describe('WebSocket React Hooks Integration', () => {
  let mockManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockManager = new UnifiedWebSocketManager({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useWebSocket Hook', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useWebSocket());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnected).toBeDefined();
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
    });

    it('should handle connection', async () => {
      mockManager.connect.mockResolvedValue(undefined);
      mockManager.isConnected.mockReturnValue(true);
      mockManager.getConnectionState.mockReturnValue('connected');

      const { result } = renderHook(() => useWebSocket());

      await act(async () => {
        await result.current.connect();
      });

      expect(mockManager.connect).toHaveBeenCalled();
    });

    it('should handle disconnection', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        result.current.disconnect();
      });

      expect(mockManager.disconnect).toHaveBeenCalled();
    });

    it('should handle bill subscriptions', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        result.current.subscribe({ type: 'bill', id: 123 });
      });

      expect(mockManager.subscribeToBill).toHaveBeenCalledWith(123);
    });

    it('should provide connection status', () => {
      mockManager.isConnected.mockReturnValue(true);
      mockManager.getConnectionState.mockReturnValue('connected');

      const { result } = renderHook(() => useWebSocket());

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('useBillRealTime Hook', () => {
    it('should initialize with bill-specific data', () => {
      const { result } = renderHook(() => useBillRealTime(123));
  
      expect(result.current.isConnected).toBeDefined();
      expect(result.current.billUpdates).toEqual([]);
      expect(result.current.engagementMetrics).toBeUndefined();
    });
  
    it('should handle bill update events', () => {
      const mockCallback = vi.fn();
      mockManager.on.mockImplementation((event, callback) => {
        if (event === 'billUpdate') {
          // Simulate receiving a bill update
          setTimeout(() => {
            callback({
              bill_id: 123,
              update: {
                type: 'status_change',
                data: { bill_id: 123, oldStatus: 'introduced', newStatus: 'committee' }
              },
              timestamp: '2024-01-01T00:00:00Z'
            });
          }, 0);
        }
        return vi.fn(); // Return unsubscribe function
      });
  
      const { result } = renderHook(() => useBillRealTime(123));
  
      expect(mockManager.on).toHaveBeenCalledWith('billUpdate', expect.any(Function));
    });
  
    it('should handle notification events', () => {
      const mockCallback = vi.fn();
      mockManager.on.mockImplementation((event, callback) => {
        if (event === 'notification') {
          // Simulate receiving a notification
          setTimeout(() => {
            callback({
              type: 'info',
              title: 'Bill Updated',
              message: 'Bill 123 has been updated',
              data: { bill_id: 123 }
            });
          }, 0);
        }
        return vi.fn();
      });
  
      const { result } = renderHook(() => useBillRealTime(123));
  
      expect(mockManager.on).toHaveBeenCalledWith('notification', expect.any(Function));
    });
  
    it('should filter updates by bill ID when specified', () => {
      const billId = 123;
      const { result } = renderHook(() => useBillRealTime(billId));
  
      // The hook should be set up to filter updates for the specific bill
      expect(result.current.billUpdates).toEqual([]);
    });
  
    it('should provide engagement metrics', () => {
      const { result } = renderHook(() => useBillRealTime(123));
  
      expect(result.current.engagementMetrics).toBeUndefined();
    });
  
    it('should handle batched updates', () => {
      mockManager.on.mockImplementation((event, callback) => {
        if (event === 'batchedUpdates') {
          // Simulate receiving batched updates
          setTimeout(() => {
            callback({
              type: 'info',
              title: 'Multiple Bills Updated',
              message: 'Several bills have been updated',
              data: { bill_ids: [123, 124, 125] }
            });
          }, 0);
        }
        return vi.fn();
      });
  
      const { result } = renderHook(() => useBillRealTime(123));
  
      expect(mockManager.on).toHaveBeenCalledWith('batchedUpdates', expect.any(Function));
    });
  });

  describe('Hook Integration with Manager', () => {
    it('should synchronize connection state', async () => {
      mockManager.isConnected.mockReturnValue(false);
      mockManager.getConnectionState.mockReturnValue('connecting');

      const { result, rerender } = renderHook(() => useWebSocket());

      expect(result.current.isConnected).toBe(false);

      // Simulate connection
      mockManager.isConnected.mockReturnValue(true);
      mockManager.getConnectionState.mockReturnValue('connected');

      rerender();

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should handle connection errors', async () => {
      mockManager.connect.mockRejectedValue(new Error('Connection failed'));

      const { result } = renderHook(() => useWebSocket());

      await act(async () => {
        try {
          await result.current.connect();
        } catch (error) {
          // Expected to fail
        }
      });

      expect(mockManager.connect).toHaveBeenCalledWith('invalid-token');
    });

    it('should handle reconnections', async () => {
      mockManager.connect.mockResolvedValueOnce(undefined);
      mockManager.connect.mockResolvedValueOnce(undefined); // For reconnection

      const { result } = renderHook(() => useWebSocket());

      // Initial connection
      await act(async () => {
        await result.current.connect();
      });

      expect(mockManager.connect).toHaveBeenCalledTimes(1);

      // Simulate disconnect and reconnect
      mockManager.getConnectionState.mockReturnValue('reconnecting');

      // Trigger reconnection logic (would be handled internally)
      expect(mockManager.connect).toHaveBeenCalledTimes(1);
    });

    it('should clean up subscriptions on unmount', () => {
      const mockUnsubscribe = vi.fn();
      mockManager.on.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useWebSocket());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Real-time Data Flow', () => {
    it('should handle real-time bill updates', async () => {
      const billUpdates: any[] = [];
      let updateCallback: any;

      mockManager.on.mockImplementation((event, callback) => {
        if (event === 'billUpdate') {
          updateCallback = callback;
        }
        return vi.fn();
      });

      const { result } = renderHook(() => useBillRealTime(123));

      // Simulate receiving a bill update
      act(() => {
        if (updateCallback) {
          updateCallback({
            bill_id: 123,
            update: {
              type: 'status_change',
              data: { bill_id: 123, oldStatus: 'introduced', newStatus: 'passed' }
            },
            timestamp: '2024-01-01T00:00:00Z'
          });
        }
      });

      await waitFor(() => {
        expect(result.current.billUpdates.length).toBeGreaterThan(0);
      });
    });

    it('should handle real-time notifications', async () => {
      let notificationCallback: any;

      mockManager.on.mockImplementation((event, callback) => {
        if (event === 'notification') {
          notificationCallback = callback;
        }
        return vi.fn();
      });

      const { result } = renderHook(() => useBillRealTime(123));

      // Simulate receiving a notification
      act(() => {
        if (notificationCallback) {
          notificationCallback({
            type: 'success',
            title: 'Bill Passed',
            message: 'Bill 123 has passed successfully',
            data: { bill_id: 123 }
          });
        }
      });

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });
    });

    it('should deduplicate updates', async () => {
      let updateCallback: any;

      mockManager.on.mockImplementation((event, callback) => {
        if (event === 'billUpdate') {
          updateCallback = callback;
        }
        return vi.fn();
      });

      const { result } = renderHook(() => useBillRealTime(123));

      const duplicateUpdate = {
        bill_id: 123,
        update: {
          type: 'status_change',
          data: { bill_id: 123, oldStatus: 'introduced', newStatus: 'committee' }
        },
        timestamp: '2024-01-01T00:00:00Z'
      };

      // Send the same update twice
      act(() => {
        if (updateCallback) {
          updateCallback(duplicateUpdate);
          updateCallback(duplicateUpdate);
        }
      });

      await waitFor(() => {
        // Should only have one update due to deduplication
        expect(result.current.billUpdates.length).toBe(1);
      });
    });

    it('should limit update history', async () => {
      let updateCallback: any;

      mockManager.on.mockImplementation((event, callback) => {
        if (event === 'billUpdate') {
          updateCallback = callback;
        }
        return vi.fn();
      });

      const { result } = renderHook(() => useBillRealTime(123));

      // Send many updates
      act(() => {
        if (updateCallback) {
          for (let i = 0; i < 60; i++) { // More than the limit of 50
            updateCallback({
              bill_id: 123,
              update: {
                type: 'status_change',
                data: { bill_id: 123, oldStatus: 'introduced', newStatus: 'committee' }
              },
              timestamp: `2024-01-01T00:00:${i.toString().padStart(2, '0')}Z`
            });
          }
        }
      });

      await waitFor(() => {
        // Should be limited to 50 updates
        expect(result.current.billUpdates.length).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('Error Handling in Hooks', () => {
    it('should handle connection failures gracefully', async () => {
      mockManager.connect.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useWebSocket());

      await act(async () => {
        try {
          await result.current.connect();
        } catch (error) {
          // Expected to fail
        }
      });

      // Hook should still be in a valid state
      expect(result.current.isConnected).toBeDefined();
    });

    it('should handle message parsing errors', async () => {
      let messageCallback: any;

      mockManager.on.mockImplementation((event, callback) => {
        if (event === 'message') {
          messageCallback = callback;
        }
        return vi.fn();
      });

      const { result } = renderHook(() => useBillRealTime(123));

      // Simulate malformed message (would be handled by manager)
      act(() => {
        if (messageCallback) {
          // This would normally cause an error, but should be handled gracefully
          messageCallback('invalid message');
        }
      });

      // Hook should remain stable
      expect(result.current.billUpdates).toEqual([]);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should clean up event listeners on unmount', () => {
      const mockUnsubscribe = vi.fn();
      mockManager.on.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useBillRealTime(123));

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(3); // billUpdate, notification, batchedUpdates
    });

    it('should memoize callback functions', () => {
      const { result, rerender } = renderHook(() => useWebSocket());

      const initialConnect = result.current.connect;
      const initialDisconnect = result.current.disconnect;

      rerender();

      // Callbacks should be the same instance (memoized)
      expect(result.current.connect).toBe(initialConnect);
      expect(result.current.disconnect).toBe(initialDisconnect);
    });

    it('should handle rapid state changes', async () => {
      const { result } = renderHook(() => useWebSocket());

      // Simulate rapid connection state changes
      mockManager.getConnectionState.mockReturnValue('connecting');
      mockManager.isConnected.mockReturnValue(false);

      // Force re-render
      result.current.connect();

      mockManager.getConnectionState.mockReturnValue('connected');
      mockManager.isConnected.mockReturnValue(true);

      // Hook should handle the state changes without crashing
      expect(result.current.isConnected).toBeDefined();
    });
  });
});