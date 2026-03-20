/**
 * Unit Tests for Realtime Client
 * 
 * Tests topic subscriptions, event publishing, message routing,
 * and subscription management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedRealtimeClient, createRealtimeClient } from '../realtime/client';
import type { RealtimeOptions, EventHandler } from '../types/realtime';
import { WebSocketMessage } from '@shared/types/api/websocket';

// Mock dependencies
vi.mock('@client/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@client/infrastructure/observability', () => ({
  observability: {
    trackError: vi.fn(),
    trackPerformance: vi.fn(),
  },
}));

// Mock WebSocket client
const mockWsClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  getConnectionState: vi.fn(() => 'connected'),
  on: vi.fn(),
  off: vi.fn(),
  getSubscriptions: vi.fn(() => []),
};

vi.mock('../websocket/client', () => ({
  createWebSocketClient: vi.fn(() => mockWsClient),
}));

describe('UnifiedRealtimeClient', () => {
  let client: UnifiedRealtimeClient;
  const defaultOptions: RealtimeOptions = {
    url: 'wss://api.example.com/realtime',
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    enableHeartbeat: true,
    heartbeatInterval: 30000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new UnifiedRealtimeClient(defaultOptions);
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('Initialization', () => {
    it('should create WebSocket client with correct config', () => {
      const { createWebSocketClient } = require('../websocket/client');

      expect(createWebSocketClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: defaultOptions.url,
          reconnect: expect.objectContaining({
            enabled: true,
            maxAttempts: 5,
            delay: 1000,
          }),
          heartbeat: expect.objectContaining({
            interval: 30000,
          }),
        })
      );
    });

    it('should auto-connect on initialization', () => {
      expect(mockWsClient.connect).toHaveBeenCalled();
    });

    it('should set up message routing', () => {
      expect(mockWsClient.on).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('Subscriptions', () => {
    it('should subscribe to a topic', () => {
      const handler: EventHandler = vi.fn();

      const subscription = client.subscribe('test-topic', handler);

      expect(subscription).toMatchObject({
        id: expect.any(String),
        topic: 'test-topic',
        unsubscribe: expect.any(Function),
      });
      expect(mockWsClient.subscribe).toHaveBeenCalledWith('test-topic');
    });

    it('should generate unique subscription IDs', () => {
      const handler: EventHandler = vi.fn();

      const sub1 = client.subscribe('topic1', handler);
      const sub2 = client.subscribe('topic2', handler);

      expect(sub1.id).not.toBe(sub2.id);
    });

    it('should track subscriptions', () => {
      const handler: EventHandler = vi.fn();

      client.subscribe('topic1', handler);
      client.subscribe('topic2', handler);

      const subscriptions = client.getSubscriptions();

      expect(subscriptions).toHaveLength(2);
      expect(subscriptions.map(s => s.topic)).toEqual(
        expect.arrayContaining(['topic1', 'topic2'])
      );
    });

    it('should unsubscribe from a topic', () => {
      const handler: EventHandler = vi.fn();

      const subscription = client.subscribe('test-topic', handler);
      client.unsubscribe(subscription);

      expect(mockWsClient.unsubscribe).toHaveBeenCalledWith('test-topic');
      expect(client.getSubscriptions()).toHaveLength(0);
    });

    it('should not unsubscribe from WebSocket if other subscriptions exist', () => {
      const handler1: EventHandler = vi.fn();
      const handler2: EventHandler = vi.fn();

      const sub1 = client.subscribe('test-topic', handler1);
      const sub2 = client.subscribe('test-topic', handler2);

      client.unsubscribe(sub1);

      // Should not unsubscribe from WebSocket yet
      expect(mockWsClient.unsubscribe).not.toHaveBeenCalled();

      client.unsubscribe(sub2);

      // Now should unsubscribe from WebSocket
      expect(mockWsClient.unsubscribe).toHaveBeenCalledWith('test-topic');
    });

    it('should provide unsubscribe method on subscription', () => {
      const handler: EventHandler = vi.fn();

      const subscription = client.subscribe('test-topic', handler);
      subscription.unsubscribe();

      expect(client.getSubscriptions()).toHaveLength(0);
    });

    it('should clear all subscriptions', () => {
      const handler: EventHandler = vi.fn();

      client.subscribe('topic1', handler);
      client.subscribe('topic2', handler);
      client.subscribe('topic3', handler);

      client.clearSubscriptions();

      expect(client.getSubscriptions()).toHaveLength(0);
      expect(mockWsClient.unsubscribe).toHaveBeenCalledTimes(3);
    });
  });

  describe('Publishing', () => {
    it('should publish events to a topic', () => {
      const data = { message: 'Hello, World!' };

      client.publish('test-topic', data);

      expect(mockWsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'publish',
          data: {
            topic: 'test-topic',
            payload: data,
          },
          timestamp: expect.any(Number),
        })
      );
    });

    it('should publish different data types', () => {
      client.publish('topic1', 'string data');
      client.publish('topic2', 123);
      client.publish('topic3', { complex: 'object' });
      client.publish('topic4', ['array', 'data']);

      expect(mockWsClient.send).toHaveBeenCalledTimes(4);
    });
  });

  describe('Message Routing', () => {
    it('should route messages to topic handlers', () => {
      const handler: EventHandler = vi.fn();
      client.subscribe('test-topic', handler);

      // Get the message handler registered with WebSocket client
      const messageHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const message: WebSocketMessage = {
        type: 'test',
        data: {
          topic: 'test-topic',
          payload: { content: 'Hello' },
        },
        timestamp: Date.now(),
      };

      messageHandler(message);

      expect(handler).toHaveBeenCalledWith({ content: 'Hello' });
    });

    it('should route messages to multiple handlers for same topic', () => {
      const handler1: EventHandler = vi.fn();
      const handler2: EventHandler = vi.fn();

      client.subscribe('test-topic', handler1);
      client.subscribe('test-topic', handler2);

      const messageHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const message: WebSocketMessage = {
        type: 'test',
        data: {
          topic: 'test-topic',
          payload: { content: 'Hello' },
        },
        timestamp: Date.now(),
      };

      messageHandler(message);

      expect(handler1).toHaveBeenCalledWith({ content: 'Hello' });
      expect(handler2).toHaveBeenCalledWith({ content: 'Hello' });
    });

    it('should not route messages to unsubscribed handlers', () => {
      const handler: EventHandler = vi.fn();
      const subscription = client.subscribe('test-topic', handler);

      client.unsubscribe(subscription);

      const messageHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const message: WebSocketMessage = {
        type: 'test',
        data: {
          topic: 'test-topic',
          payload: { content: 'Hello' },
        },
        timestamp: Date.now(),
      };

      messageHandler(message);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle messages without topic', () => {
      const { logger } = require('@client/lib/utils/logger');

      const messageHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const message: WebSocketMessage = {
        type: 'test',
        data: { content: 'Hello' },
        timestamp: Date.now(),
      };

      messageHandler(message);

      expect(logger.warn).toHaveBeenCalledWith(
        'Received message without topic',
        expect.any(Object)
      );
    });

    it('should extract topic from message type as fallback', () => {
      const handler: EventHandler = vi.fn();
      client.subscribe('test', handler);

      const messageHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const message: WebSocketMessage = {
        type: 'test',
        data: { content: 'Hello' },
        timestamp: Date.now(),
      };

      messageHandler(message);

      expect(handler).toHaveBeenCalledWith({ content: 'Hello' });
    });

    it('should extract data from different message formats', () => {
      const handler: EventHandler = vi.fn();
      client.subscribe('test-topic', handler);

      const messageHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      // Format 1: data.payload
      messageHandler({
        type: 'test',
        data: {
          topic: 'test-topic',
          payload: { content: 'Format 1' },
        },
        timestamp: Date.now(),
      });

      // Format 2: data.data
      messageHandler({
        type: 'test',
        data: {
          topic: 'test-topic',
          data: { content: 'Format 2' },
        },
        timestamp: Date.now(),
      });

      // Format 3: data directly
      messageHandler({
        type: 'test',
        data: {
          topic: 'test-topic',
          content: 'Format 3',
        },
        timestamp: Date.now(),
      });

      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenNthCalledWith(1, { content: 'Format 1' });
      expect(handler).toHaveBeenNthCalledWith(2, { content: 'Format 2' });
      expect(handler).toHaveBeenNthCalledWith(3, {
        topic: 'test-topic',
        content: 'Format 3',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in message handlers gracefully', () => {
      const { logger } = require('@client/lib/utils/logger');
      const { observability } = require('@client/infrastructure/observability');

      const errorHandler: EventHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler: EventHandler = vi.fn();

      client.subscribe('test-topic', errorHandler);
      client.subscribe('test-topic', normalHandler);

      const messageHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const message: WebSocketMessage = {
        type: 'test',
        data: {
          topic: 'test-topic',
          payload: { content: 'Hello' },
        },
        timestamp: Date.now(),
      };

      messageHandler(message);

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(observability.trackError).toHaveBeenCalled();
    });

    it('should track errors with observability', () => {
      const { observability } = require('@client/infrastructure/observability');

      const errorHandler: EventHandler = vi.fn(() => {
        throw new Error('Handler error');
      });

      client.subscribe('test-topic', errorHandler);

      const messageHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const message: WebSocketMessage = {
        type: 'test',
        data: {
          topic: 'test-topic',
          payload: { content: 'Hello' },
        },
        timestamp: Date.now(),
      };

      messageHandler(message);

      expect(observability.trackError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'RealtimeClient',
          operation: 'handleMessage',
        })
      );
    });
  });

  describe('Connection State', () => {
    it('should check if connected', () => {
      mockWsClient.getConnectionState.mockReturnValue('connected');

      expect(client.isConnected()).toBe(true);
    });

    it('should return false when disconnected', () => {
      mockWsClient.getConnectionState.mockReturnValue('disconnected');

      expect(client.isConnected()).toBe(false);
    });
  });

  describe('Disconnection', () => {
    it('should clear subscriptions on disconnect', () => {
      const handler: EventHandler = vi.fn();

      client.subscribe('topic1', handler);
      client.subscribe('topic2', handler);

      client.disconnect();

      expect(client.getSubscriptions()).toHaveLength(0);
      expect(mockWsClient.disconnect).toHaveBeenCalled();
    });

    it('should unsubscribe from all topics on disconnect', () => {
      const handler: EventHandler = vi.fn();

      client.subscribe('topic1', handler);
      client.subscribe('topic2', handler);
      client.subscribe('topic3', handler);

      client.disconnect();

      expect(mockWsClient.unsubscribe).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance Tracking', () => {
    it('should track slow message processing', () => {
      const { observability } = require('@client/infrastructure/observability');

      const slowHandler: EventHandler = vi.fn(() => {
        // Simulate slow processing
        const start = Date.now();
        while (Date.now() - start < 150) {
          // Busy wait
        }
      });

      client.subscribe('test-topic', slowHandler);

      const messageHandler = mockWsClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const message: WebSocketMessage = {
        type: 'test',
        data: {
          topic: 'test-topic',
          payload: { content: 'Hello' },
        },
        timestamp: Date.now(),
      };

      messageHandler(message);

      expect(observability.trackPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'realtime_message_processing',
          unit: 'ms',
        })
      );
    });
  });
});

describe('createRealtimeClient', () => {
  it('should create a realtime client instance', () => {
    const options: RealtimeOptions = {
      url: 'wss://api.example.com/realtime',
    };

    const client = createRealtimeClient(options);

    expect(client).toBeInstanceOf(UnifiedRealtimeClient);
  });
});
