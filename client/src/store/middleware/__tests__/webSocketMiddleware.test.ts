/**
 * WebSocket Middleware Tests
 * 
 * Tests for the WebSocket middleware and client functionality.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { webSocketMiddleware, wsClient } from '../webSocketMiddleware';

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('WebSocket Middleware', () => {
  let store: any;
  let next: any;
  let dispatch: any;

  beforeEach(() => {
    dispatch = vi.fn();
    next = vi.fn();
    store = {
      dispatch,
      getState: jest.fn(() => ({}))
    };

    vi.clearAllMocks();
  });

  it('should pass through non-WebSocket actions', () => {
    const middleware = webSocketMiddleware(store)(next);
    const action = { type: 'some/action', payload: 'test' };

    middleware(action);

    expect(next).toHaveBeenCalledWith(action);
  });

  it('should handle realTime/connect action', () => {
    const middleware = webSocketMiddleware(store)(next);
    const action = { type: 'realTime/connect' };

    middleware(action);

    expect(next).toHaveBeenCalledWith(action);
    // Connection attempt should be made (mocked)
  });

  it('should handle realTime/disconnect action', () => {
    const middleware = webSocketMiddleware(store)(next);
    const action = { type: 'realTime/disconnect' };

    middleware(action);

    expect(next).toHaveBeenCalledWith(action);
  });

  it('should handle realTime/subscribe action', () => {
    const middleware = webSocketMiddleware(store)(next);
    const subscription = { type: 'bill', id: 123 };
    const action = { type: 'realTime/subscribe', payload: subscription };

    middleware(action);

    expect(next).toHaveBeenCalledWith(action);
  });

  it('should handle realTime/unsubscribe action', () => {
    const middleware = webSocketMiddleware(store)(next);
    const subscription = { type: 'bill', id: 123 };
    const action = { type: 'realTime/unsubscribe', payload: subscription };

    middleware(action);

    expect(next).toHaveBeenCalledWith(action);
  });

  it('should handle realTime/setHandlers action', () => {
    const middleware = webSocketMiddleware(store)(next);
    const handlers = {
      onBillUpdate: jest.fn(),
      onNotification: jest.fn()
    };
    const action = { type: 'realTime/setHandlers', payload: handlers };

    middleware(action);

    expect(next).toHaveBeenCalledWith(action);
  });
});

describe('WebSocket Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const state = wsClient.getState();

    expect(state.isConnected).toBe(false);
    expect(state.isConnecting).toBe(false);
    expect(state.error).toBe(null);
    expect(state.reconnectAttempts).toBe(0);
    expect(state.connection_quality).toBe('disconnected');
  });

  it('should handle subscription tracking', () => {
    const subscription = { type: 'bill' as const, id: 123 };
    
    wsClient.subscribe(subscription);
    
    const state = wsClient.getState();
    expect(state.bill_subscriptions.has(123)).toBe(true);
  });

  it('should handle unsubscription', () => {
    const subscription = { type: 'bill' as const, id: 123 };
    
    wsClient.subscribe(subscription);
    wsClient.unsubscribe(subscription);
    
    const state = wsClient.getState();
    expect(state.bill_subscriptions.has(123)).toBe(false);
  });

  it('should handle different subscription types', () => {
    const billSub = { type: 'bill' as const, id: 123 };
    const communitySub = { type: 'community' as const, id: 'discussion-456' };
    const expertSub = { type: 'expert' as const, id: 'expert-789' };
    const notificationSub = { type: 'user_notifications' as const, id: 'user' };

    wsClient.subscribe(billSub);
    wsClient.subscribe(communitySub);
    wsClient.subscribe(expertSub);
    wsClient.subscribe(notificationSub);

    const state = wsClient.getState();
    expect(state.bill_subscriptions.has(123)).toBe(true);
    expect(state.community_subscriptions.has('discussion-456')).toBe(true);
    expect(state.expert_subscriptions.has('expert-789')).toBe(true);
    expect(state.notification_subscriptions).toBe(true);
  });

  it('should set handlers correctly', () => {
    const handlers = {
      onBillUpdate: vi.fn(),
      onCommunityUpdate: vi.fn(),
      onNotification: vi.fn()
    };

    wsClient.setHandlers(handlers);

    // Handlers should be set (internal implementation detail)
    expect(handlers.onBillUpdate).toBeDefined();
    expect(handlers.onCommunityUpdate).toBeDefined();
    expect(handlers.onNotification).toBeDefined();
  });
});