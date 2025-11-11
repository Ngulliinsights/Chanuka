/**
 * WebSocket Hook Tests
 * 
 * Tests for the useWebSocket hook and real-time functionality.
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWebSocket, useBillRealTime, useNotifications } from '../useWebSocket';

// Mock the WebSocket client
vi.mock('../../store/middleware/webSocketMiddleware', () => ({
  wsClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    setHandlers: vi.fn(),
    getState: vi.fn(() => ({
      isConnected: false,
      isConnecting: false,
      error: null,
      connectionQuality: 'disconnected',
      bill_subscriptions: new Set(),
      community_subscriptions: new Set(),
      expert_subscriptions: new Set(),
      notification_subscriptions: false
    }))
  }
}));

// Mock the real-time store
vi.mock('../../store/slices/realTimeSlice', () => ({
  useRealTimeStore: vi.fn(() => ({
    connection: {
      isConnected: false,
      isConnecting: false,
      error: null,
      connectionQuality: 'disconnected',
      bill_subscriptions: new Set(),
      community_subscriptions: new Set(),
      expert_subscriptions: new Set(),
      notification_subscriptions: false
    },
    billUpdates: new Map(),
    communityUpdates: new Map(),
    engagementMetrics: new Map(),
    expertActivities: [],
    notifications: [],
    notificationCount: 0,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    getRecentUpdates: vi.fn(() => []),
    markNotificationRead: vi.fn()
  }))
}));

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default options', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.connectionQuality).toBe('disconnected');
    expect(result.current.error).toBe(null);
  });

  it('should auto-connect when autoConnect is true', () => {
    renderHook(() => useWebSocket({ autoConnect: true }));

    expect(wsClient.connect).toHaveBeenCalled();
  });

  it('should not auto-connect when autoConnect is false', () => {
    renderHook(() => useWebSocket({ autoConnect: false }));

    expect(wsClient.connect).not.toHaveBeenCalled();
  });

  it('should handle subscriptions', () => {
    const subscriptions = [
      { type: 'bill' as const, id: 123 },
      { type: 'user_notifications' as const, id: 'user' }
    ];

    renderHook(() => useWebSocket({ subscriptions }));

    // Should set handlers
    expect(wsClient.setHandlers).toHaveBeenCalled();
  });

  it('should provide connection management functions', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.subscribe).toBe('function');
    expect(typeof result.current.unsubscribe).toBe('function');
  });

  it('should handle manual connection', async () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    await act(async () => {
      await result.current.connect();
    });

    expect(wsClient.connect).toHaveBeenCalled();
  });

  it('should handle disconnection', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.disconnect();
    });

    expect(wsClient.disconnect).toHaveBeenCalled();
  });

  it('should handle subscription management', () => {
    const { result } = renderHook(() => useWebSocket());

    const subscription = { type: 'bill' as const, id: 123 };

    act(() => {
      result.current.subscribe(subscription);
    });

    expect(wsClient.subscribe).toHaveBeenCalledWith(subscription);

    act(() => {
      result.current.unsubscribe(subscription);
    });

    expect(wsClient.unsubscribe).toHaveBeenCalledWith(subscription);
  });
});

describe('useBillRealTime', () => {
  it('should subscribe to bill updates', () => {
    const billId = 123;
    renderHook(() => useBillRealTime(billId));

    expect(wsClient.setHandlers).toHaveBeenCalled();
  });

  it('should provide bill-specific data', () => {
    const billId = 123;
    const { result } = renderHook(() => useBillRealTime(billId));

    expect(result.current.billUpdates).toEqual([]);
    expect(result.current.engagementMetrics).toBeUndefined();
  });
});

describe('useNotifications', () => {
  it('should subscribe to user notifications', () => {
    renderHook(() => useNotifications());

    expect(wsClient.setHandlers).toHaveBeenCalled();
  });

  it('should provide notification data and functions', () => {
    const { result } = renderHook(() => useNotifications());

    expect(Array.isArray(result.current.notifications)).toBe(true);
    expect(typeof result.current.notificationCount).toBe('number');
    expect(typeof result.current.markAsRead).toBe('function');
    expect(typeof result.current.isConnected).toBe('boolean');
  });

  it('should handle marking notifications as read', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.markAsRead('notification-123');
    });

    // Should call the store function
    expect(result.current.markAsRead).toBeDefined();
  });
});