/**
 * Property-Based Tests: WebSocket Reconnection with Backoff
 * 
 * Feature: comprehensive-bug-fixes, Property 10: WebSocket Reconnection with Backoff
 * 
 * Tests that WebSocket manager implements proper reconnection logic with exponential backoff.
 * 
 * Requirements: 7.2, 13.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { WebSocketManagerImpl, type ReconnectionConfig } from '../core/websocket/manager';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
    }
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateClose(code: number = 1006, reason: string = 'Connection lost'): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason, wasClean: false }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('Property 10: WebSocket Reconnection with Backoff', () => {
  let originalWebSocket: typeof WebSocket;
  let mockWebSocketInstances: MockWebSocket[] = [];

  beforeEach(() => {
    // Save original WebSocket
    originalWebSocket = global.WebSocket as any;

    // Mock WebSocket constructor
    global.WebSocket = vi.fn((url: string) => {
      const instance = new MockWebSocket(url);
      mockWebSocketInstances.push(instance);
      return instance as any;
    }) as any;

    // Add static properties
    (global.WebSocket as any).CONNECTING = MockWebSocket.CONNECTING;
    (global.WebSocket as any).OPEN = MockWebSocket.OPEN;
    (global.WebSocket as any).CLOSING = MockWebSocket.CLOSING;
    (global.WebSocket as any).CLOSED = MockWebSocket.CLOSED;

    mockWebSocketInstances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.WebSocket = originalWebSocket;
    mockWebSocketInstances = [];
  });

  /**
   * Property: Exponential backoff delays increase correctly
   * 
   * For any valid reconnection config, the delay between reconnection attempts
   * should follow exponential backoff: delay = min(initialDelay * (multiplier ^ attempt), maxDelay)
   */
  it.prop([
    fc.record({
      initialDelay: fc.integer({ min: 100, max: 2000 }),
      maxDelay: fc.integer({ min: 5000, max: 60000 }),
      backoffMultiplier: fc.integer({ min: 2, max: 3 }),
      maxRetries: fc.integer({ min: 3, max: 10 }),
    }),
  ])('should use exponential backoff for reconnection delays', async (config: ReconnectionConfig) => {
    const manager = new WebSocketManagerImpl(config);
    const delays: number[] = [];

    // Track reconnection events to capture delays
    manager.on('reconnecting', (data: any) => {
      delays.push(data.delay);
    });

    // Start connection
    const connectPromise = manager.connect('ws://test.example.com');
    
    // Simulate initial connection failure
    const firstWs = mockWebSocketInstances[0];
    firstWs.simulateError();
    firstWs.simulateClose(1006, 'Connection failed');

    await expect(connectPromise).rejects.toThrow();

    // Simulate multiple reconnection attempts
    for (let attempt = 0; attempt < Math.min(config.maxRetries, 5); attempt++) {
      // Fast-forward to trigger reconnection
      await vi.runAllTimersAsync();

      if (mockWebSocketInstances.length > attempt + 1) {
        const ws = mockWebSocketInstances[attempt + 1];
        ws.simulateError();
        ws.simulateClose(1006, 'Connection failed');
      }
    }

    // Verify exponential backoff
    for (let i = 0; i < delays.length; i++) {
      const expectedDelay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, i),
        config.maxDelay
      );
      expect(delays[i]).toBe(expectedDelay);
    }

    manager.disconnect();
  });

  /**
   * Property: Reconnection attempts respect maxRetries limit
   * 
   * For any valid config, the manager should not attempt more than maxRetries reconnections
   */
  it.prop([
    fc.record({
      initialDelay: fc.integer({ min: 100, max: 1000 }),
      maxDelay: fc.integer({ min: 5000, max: 30000 }),
      backoffMultiplier: fc.constant(2),
      maxRetries: fc.integer({ min: 1, max: 5 }),
    }),
  ])('should not exceed maxRetries reconnection attempts', async (config: ReconnectionConfig) => {
    const manager = new WebSocketManagerImpl(config);
    let reconnectAttempts = 0;
    let failedEventFired = false;

    manager.on('reconnecting', () => {
      reconnectAttempts++;
    });

    manager.on('reconnect_failed', () => {
      failedEventFired = true;
    });

    // Start connection
    const connectPromise = manager.connect('ws://test.example.com');
    
    // Simulate initial connection failure
    const firstWs = mockWebSocketInstances[0];
    firstWs.simulateError();
    firstWs.simulateClose(1006, 'Connection failed');

    await expect(connectPromise).rejects.toThrow();

    // Simulate failures for all reconnection attempts
    for (let i = 0; i < config.maxRetries + 2; i++) {
      await vi.runAllTimersAsync();

      if (mockWebSocketInstances.length > i + 1) {
        const ws = mockWebSocketInstances[i + 1];
        ws.simulateError();
        ws.simulateClose(1006, 'Connection failed');
      }
    }

    // Should not exceed maxRetries
    expect(reconnectAttempts).toBeLessThanOrEqual(config.maxRetries);
    
    // Should fire reconnect_failed event after maxRetries
    if (reconnectAttempts === config.maxRetries) {
      expect(failedEventFired).toBe(true);
    }

    manager.disconnect();
  });

  /**
   * Property: Successful reconnection resets attempt counter
   * 
   * After a successful reconnection, the attempt counter should reset to 0
   */
  it.prop([
    fc.record({
      initialDelay: fc.integer({ min: 100, max: 1000 }),
      maxDelay: fc.integer({ min: 5000, max: 30000 }),
      backoffMultiplier: fc.constant(2),
      maxRetries: fc.integer({ min: 3, max: 10 }),
    }),
    fc.integer({ min: 1, max: 3 }), // Number of failures before success
  ])('should reset reconnection counter after successful connection', async (config: ReconnectionConfig, failuresBeforeSuccess: number) => {
    const manager = new WebSocketManagerImpl(config);
    const delays: number[] = [];

    manager.on('reconnecting', (data: any) => {
      delays.push(data.delay);
    });

    // Start connection
    const connectPromise = manager.connect('ws://test.example.com');
    
    // Simulate initial connection failure
    const firstWs = mockWebSocketInstances[0];
    firstWs.simulateError();
    firstWs.simulateClose(1006, 'Connection failed');

    await expect(connectPromise).rejects.toThrow();

    // Simulate some failures
    for (let i = 0; i < failuresBeforeSuccess; i++) {
      await vi.runAllTimersAsync();

      if (mockWebSocketInstances.length > i + 1) {
        const ws = mockWebSocketInstances[i + 1];
        
        if (i < failuresBeforeSuccess - 1) {
          // Fail this attempt
          ws.simulateError();
          ws.simulateClose(1006, 'Connection failed');
        } else {
          // Succeed on this attempt
          ws.simulateOpen();
        }
      }
    }

    // Now disconnect and reconnect - should start from initial delay again
    const lastSuccessfulWs = mockWebSocketInstances[mockWebSocketInstances.length - 1];
    lastSuccessfulWs.simulateClose(1006, 'Connection lost');

    await vi.runAllTimersAsync();

    // The next reconnection delay should be the initial delay (counter was reset)
    const delayAfterSuccess = delays[delays.length - 1];
    expect(delayAfterSuccess).toBe(config.initialDelay);

    manager.disconnect();
  });

  /**
   * Property: Manual disconnect prevents reconnection
   * 
   * When disconnect() is called manually, no reconnection attempts should occur
   */
  it.prop([
    fc.record({
      initialDelay: fc.integer({ min: 100, max: 1000 }),
      maxDelay: fc.integer({ min: 5000, max: 30000 }),
      backoffMultiplier: fc.constant(2),
      maxRetries: fc.integer({ min: 3, max: 10 }),
    }),
  ])('should not reconnect after manual disconnect', async (config: ReconnectionConfig) => {
    const manager = new WebSocketManagerImpl(config);
    let reconnectAttempts = 0;

    manager.on('reconnecting', () => {
      reconnectAttempts++;
    });

    // Connect successfully
    const connectPromise = manager.connect('ws://test.example.com');
    const ws = mockWebSocketInstances[0];
    ws.simulateOpen();
    await connectPromise;

    // Manually disconnect
    manager.disconnect();

    // Fast-forward time
    await vi.runAllTimersAsync();

    // Should not have attempted any reconnections
    expect(reconnectAttempts).toBe(0);
    expect(manager.getConnectionState()).toBe('disconnected');
  });

  /**
   * Property: Delay never exceeds maxDelay
   * 
   * For any number of reconnection attempts, the delay should never exceed maxDelay
   */
  it.prop([
    fc.record({
      initialDelay: fc.integer({ min: 100, max: 1000 }),
      maxDelay: fc.integer({ min: 2000, max: 10000 }),
      backoffMultiplier: fc.integer({ min: 2, max: 4 }),
      maxRetries: fc.integer({ min: 5, max: 15 }),
    }),
  ])('should cap reconnection delay at maxDelay', async (config: ReconnectionConfig) => {
    const manager = new WebSocketManagerImpl(config);
    const delays: number[] = [];

    manager.on('reconnecting', (data: any) => {
      delays.push(data.delay);
    });

    // Start connection
    const connectPromise = manager.connect('ws://test.example.com');
    
    // Simulate initial connection failure
    const firstWs = mockWebSocketInstances[0];
    firstWs.simulateError();
    firstWs.simulateClose(1006, 'Connection failed');

    await expect(connectPromise).rejects.toThrow();

    // Simulate many reconnection attempts
    for (let i = 0; i < Math.min(config.maxRetries, 10); i++) {
      await vi.runAllTimersAsync();

      if (mockWebSocketInstances.length > i + 1) {
        const ws = mockWebSocketInstances[i + 1];
        ws.simulateError();
        ws.simulateClose(1006, 'Connection failed');
      }
    }

    // All delays should be <= maxDelay
    delays.forEach((delay) => {
      expect(delay).toBeLessThanOrEqual(config.maxDelay);
    });

    manager.disconnect();
  });
});
