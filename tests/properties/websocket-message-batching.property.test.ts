/**
 * Property Test: WebSocket Message Batching
 * Feature: comprehensive-bug-fixes, Property 12: WebSocket Message Batching
 * 
 * Validates: Requirements 12.4
 * 
 * This property test verifies that:
 * - Rapid sequences of WebSocket messages (>10 messages within 100ms) are batched
 * - Batched updates trigger at most one re-render per batch
 * - Message order is preserved within batches
 * - Batching prevents excessive re-renders that could degrade performance
 * - Individual messages outside the batching window are processed immediately
 * - Batch size and timing thresholds are configurable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { WebSocketManagerImpl, type ReconnectionConfig } from '@client/core/websocket/manager';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate immediate connection for testing
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
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

  // Test helper to simulate receiving a message
  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      const messageData = typeof data === 'string' ? data : JSON.stringify(data);
      this.onmessage(new MessageEvent('message', { data: messageData }));
    }
  }
}

// Extended WebSocket Manager with batching capabilities
interface BatchingConfig {
  batchThreshold: number;  // Number of messages to trigger batching
  batchWindow: number;     // Time window in ms for batching
}

class WebSocketManagerWithBatching {
  private manager: WebSocketManagerImpl;
  private messageQueue: unknown[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private batchConfig: BatchingConfig = {
    batchThreshold: 10,
    batchWindow: 100,
  };
  private renderCount = 0;
  private eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(
    reconnectionConfig?: Partial<ReconnectionConfig>,
    batchingConfig?: Partial<BatchingConfig>
  ) {
    this.manager = new WebSocketManagerImpl(reconnectionConfig);
    if (batchingConfig) {
      this.batchConfig = { ...this.batchConfig, ...batchingConfig };
    }

    // Intercept messages from the base manager
    this.manager.on('message', (data) => {
      this.handleMessage(data);
    });
  }

  async connect(url: string): Promise<void> {
    return this.manager.connect(url);
  }

  disconnect(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.manager.disconnect();
  }

  send(data: unknown): void {
    this.manager.send(data);
  }

  on(event: string, handler: (data: unknown) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: (data: unknown) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  getConnectionState() {
    return this.manager.getConnectionState();
  }

  private handleMessage(data: unknown): void {
    this.messageQueue.push(data);

    // If we've reached the batch threshold, process immediately
    if (this.messageQueue.length >= this.batchConfig.batchThreshold) {
      this.processBatch();
    } else {
      // Otherwise, schedule batch processing
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.batchConfig.batchWindow);
      }
    }
  }

  private processBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.messageQueue.length === 0) {
      return;
    }

    const batch = [...this.messageQueue];
    this.messageQueue = [];

    // Increment render count (simulates a re-render)
    this.renderCount++;

    // Emit batched messages
    this.emit('batch', {
      messages: batch,
      count: batch.length,
      renderCount: this.renderCount,
    });

    // Also emit individual messages for compatibility
    batch.forEach((message) => {
      this.emit('message', message);
    });
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('[WebSocketBatching] Error in event handler', {
            event,
            error,
          });
        }
      });
    }
  }

  getRenderCount(): number {
    return this.renderCount;
  }

  getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  // Force batch processing (for testing)
  flushBatch(): void {
    this.processBatch();
  }
}

describe('Feature: comprehensive-bug-fixes, Property 12: WebSocket Message Batching', () => {
  let originalWebSocket: typeof WebSocket;
  let mockWebSocketInstance: MockWebSocket | null = null;

  beforeEach(() => {
    // Save original WebSocket
    originalWebSocket = global.WebSocket as unknown as typeof WebSocket;

    // Mock WebSocket constructor
    global.WebSocket = vi.fn((url: string) => {
      mockWebSocketInstance = new MockWebSocket(url);
      return mockWebSocketInstance as unknown as WebSocket;
    }) as unknown as typeof WebSocket;

    // Add static properties
    (global.WebSocket as any).CONNECTING = MockWebSocket.CONNECTING;
    (global.WebSocket as any).OPEN = MockWebSocket.OPEN;
    (global.WebSocket as any).CLOSING = MockWebSocket.CLOSING;
    (global.WebSocket as any).CLOSED = MockWebSocket.CLOSED;

    // Mock CloseEvent for Node environment
    if (typeof CloseEvent === 'undefined') {
      (global as any).CloseEvent = class CloseEvent extends Event {
        code: number;
        reason: string;
        wasClean: boolean;

        constructor(type: string, eventInitDict?: { code?: number; reason?: string; wasClean?: boolean }) {
          super(type);
          this.code = eventInitDict?.code ?? 0;
          this.reason = eventInitDict?.reason ?? '';
          this.wasClean = eventInitDict?.wasClean ?? false;
        }
      };
    }

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original WebSocket
    global.WebSocket = originalWebSocket;
    mockWebSocketInstance = null;
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('should batch rapid sequences of messages (>10 messages within 100ms)', async () => {
    vi.useFakeTimers();

    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 11, max: 50 }), // Number of rapid messages
        async (messageCount) => {
          const manager = new WebSocketManagerWithBatching(
            { maxRetries: 0 },
            { batchThreshold: 10, batchWindow: 100 }
          );

          const batches: any[] = [];
          manager.on('batch', (data) => {
            batches.push(data);
          });

          await manager.connect('ws://test.example.com');
          await vi.runOnlyPendingTimersAsync();

          // Send rapid sequence of messages
          for (let i = 0; i < messageCount; i++) {
            mockWebSocketInstance?.simulateMessage({ id: i, data: `message-${i}` });
          }

          // Process batches
          await vi.runOnlyPendingTimersAsync();

          // Should have batched the messages
          expect(batches.length).toBeGreaterThan(0);
          
          // Total messages in all batches should equal sent messages
          const totalMessages = batches.reduce((sum, batch) => sum + batch.count, 0);
          expect(totalMessages).toBe(messageCount);

          // Render count should be less than message count (batching occurred)
          expect(manager.getRenderCount()).toBeLessThan(messageCount);

          manager.disconnect();
        }
      ),
      { numRuns: 20 }
    );

    vi.useRealTimers();
  });

  it('should trigger at most one re-render per batch', async () => {
    vi.useFakeTimers();

    const manager = new WebSocketManagerWithBatching(
      { maxRetries: 0 },
      { batchThreshold: 10, batchWindow: 100 }
    );

    const batches: any[] = [];
    manager.on('batch', (data) => {
      batches.push(data);
    });

    await manager.connect('ws://test.example.com');
    await vi.runOnlyPendingTimersAsync();

    // Send exactly 10 messages rapidly (should trigger one batch)
    for (let i = 0; i < 10; i++) {
      mockWebSocketInstance?.simulateMessage({ id: i });
    }

    // Should batch immediately when threshold is reached
    expect(batches.length).toBe(1);
    expect(batches[0].count).toBe(10);
    expect(manager.getRenderCount()).toBe(1);

    // Send another 10 messages
    for (let i = 10; i < 20; i++) {
      mockWebSocketInstance?.simulateMessage({ id: i });
    }

    // Should create another batch
    expect(batches.length).toBe(2);
    expect(batches[1].count).toBe(10);
    expect(manager.getRenderCount()).toBe(2);

    manager.disconnect();
    vi.useRealTimers();
  });

  it('should preserve message order within batches', async () => {
    vi.useFakeTimers();

    fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 10, maxLength: 30 }),
        async (messageIds) => {
          const manager = new WebSocketManagerWithBatching(
            { maxRetries: 0 },
            { batchThreshold: 10, batchWindow: 100 }
          );

          const receivedMessages: number[] = [];
          manager.on('message', (data: any) => {
            receivedMessages.push(data.id);
          });

          await manager.connect('ws://test.example.com');
          await vi.runOnlyPendingTimersAsync();

          // Send messages in order
          for (const id of messageIds) {
            mockWebSocketInstance?.simulateMessage({ id });
          }

          // Process all batches
          await vi.runOnlyPendingTimersAsync();

          // Messages should be received in the same order
          expect(receivedMessages).toEqual(messageIds);

          manager.disconnect();
        }
      ),
      { numRuns: 20 }
    );

    vi.useRealTimers();
  });

  it('should process individual messages immediately when below batch threshold', async () => {
    vi.useFakeTimers();

    const manager = new WebSocketManagerWithBatching(
      { maxRetries: 0 },
      { batchThreshold: 10, batchWindow: 100 }
    );

    const batches: any[] = [];
    manager.on('batch', (data) => {
      batches.push(data);
    });

    await manager.connect('ws://test.example.com');
    await vi.runOnlyPendingTimersAsync();

    // Send 5 messages (below threshold)
    for (let i = 0; i < 5; i++) {
      mockWebSocketInstance?.simulateMessage({ id: i });
    }

    // Should not batch yet
    expect(batches.length).toBe(0);
    expect(manager.getQueuedMessageCount()).toBe(5);

    // Wait for batch window to expire
    await vi.advanceTimersByTimeAsync(100);

    // Should now process the batch
    expect(batches.length).toBe(1);
    expect(batches[0].count).toBe(5);
    expect(manager.getRenderCount()).toBe(1);

    manager.disconnect();
    vi.useRealTimers();
  });

  it('should respect configurable batch size and timing thresholds', async () => {
    vi.useFakeTimers();

    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),  // batchThreshold
        fc.integer({ min: 50, max: 200 }), // batchWindow
        async (batchThreshold, batchWindow) => {
          const manager = new WebSocketManagerWithBatching(
            { maxRetries: 0 },
            { batchThreshold, batchWindow }
          );

          const batches: any[] = [];
          manager.on('batch', (data) => {
            batches.push(data);
          });

          await manager.connect('ws://test.example.com');
          await vi.runOnlyPendingTimersAsync();

          // Send exactly threshold number of messages
          for (let i = 0; i < batchThreshold; i++) {
            mockWebSocketInstance?.simulateMessage({ id: i });
          }

          // Should batch immediately when threshold is reached
          expect(batches.length).toBe(1);
          expect(batches[0].count).toBe(batchThreshold);

          // Send fewer than threshold messages
          const belowThreshold = Math.floor(batchThreshold / 2);
          for (let i = 0; i < belowThreshold; i++) {
            mockWebSocketInstance?.simulateMessage({ id: i + batchThreshold });
          }

          // Should not batch yet
          expect(batches.length).toBe(1);

          // Wait for batch window
          await vi.advanceTimersByTimeAsync(batchWindow);

          // Should now process the second batch
          expect(batches.length).toBe(2);
          expect(batches[1].count).toBe(belowThreshold);

          manager.disconnect();
        }
      ),
      { numRuns: 20 }
    );

    vi.useRealTimers();
  });

  it('should prevent excessive re-renders with rapid message bursts', async () => {
    vi.useFakeTimers();

    const manager = new WebSocketManagerWithBatching(
      { maxRetries: 0 },
      { batchThreshold: 10, batchWindow: 100 }
    );

    await manager.connect('ws://test.example.com');
    await vi.runOnlyPendingTimersAsync();

    // Simulate 100 rapid messages
    for (let i = 0; i < 100; i++) {
      mockWebSocketInstance?.simulateMessage({ id: i, timestamp: Date.now() });
    }

    // Process all batches
    await vi.runOnlyPendingTimersAsync();

    // Should have significantly fewer renders than messages
    // With batch threshold of 10, we expect 10 renders for 100 messages
    expect(manager.getRenderCount()).toBe(10);
    expect(manager.getRenderCount()).toBeLessThan(100);

    manager.disconnect();
    vi.useRealTimers();
  });

  it('should handle mixed rapid and slow message patterns', async () => {
    vi.useFakeTimers();

    const manager = new WebSocketManagerWithBatching(
      { maxRetries: 0 },
      { batchThreshold: 10, batchWindow: 100 }
    );

    const batches: any[] = [];
    manager.on('batch', (data) => {
      batches.push(data);
    });

    await manager.connect('ws://test.example.com');
    await vi.runOnlyPendingTimersAsync();

    // Send 15 rapid messages (should create 1 batch of 10, then queue 5)
    for (let i = 0; i < 15; i++) {
      mockWebSocketInstance?.simulateMessage({ id: i });
    }

    expect(batches.length).toBe(1);
    expect(batches[0].count).toBe(10);

    // Wait for batch window
    await vi.advanceTimersByTimeAsync(100);

    // Should process remaining 5 messages
    expect(batches.length).toBe(2);
    expect(batches[1].count).toBe(5);

    // Send 3 slow messages (one at a time with delays)
    for (let i = 15; i < 18; i++) {
      mockWebSocketInstance?.simulateMessage({ id: i });
      await vi.advanceTimersByTimeAsync(150); // Wait longer than batch window
    }

    // Each slow message should create its own batch
    expect(batches.length).toBe(5); // 2 from rapid + 3 from slow
    expect(batches[2].count).toBe(1);
    expect(batches[3].count).toBe(1);
    expect(batches[4].count).toBe(1);

    manager.disconnect();
    vi.useRealTimers();
  });

  it('should clear batch timer on disconnect', async () => {
    vi.useFakeTimers();

    const manager = new WebSocketManagerWithBatching(
      { maxRetries: 0 },
      { batchThreshold: 10, batchWindow: 100 }
    );

    const batches: any[] = [];
    manager.on('batch', (data) => {
      batches.push(data);
    });

    await manager.connect('ws://test.example.com');
    await vi.runOnlyPendingTimersAsync();

    // Send 5 messages (below threshold, will wait for timer)
    for (let i = 0; i < 5; i++) {
      mockWebSocketInstance?.simulateMessage({ id: i });
    }

    expect(batches.length).toBe(0);
    expect(manager.getQueuedMessageCount()).toBe(5);

    // Disconnect before timer fires
    manager.disconnect();

    // Advance timers
    await vi.advanceTimersByTimeAsync(200);

    // Should not have processed the batch after disconnect
    expect(batches.length).toBe(0);

    vi.useRealTimers();
  });

  it('should handle empty message batches gracefully', async () => {
    vi.useFakeTimers();

    const manager = new WebSocketManagerWithBatching(
      { maxRetries: 0 },
      { batchThreshold: 10, batchWindow: 100 }
    );

    const batches: any[] = [];
    manager.on('batch', (data) => {
      batches.push(data);
    });

    await manager.connect('ws://test.example.com');
    await vi.runOnlyPendingTimersAsync();

    // Force flush with no messages
    manager.flushBatch();

    // Should not create an empty batch
    expect(batches.length).toBe(0);
    expect(manager.getRenderCount()).toBe(0);

    manager.disconnect();
    vi.useRealTimers();
  });

  it('should batch messages with varying data sizes', async () => {
    vi.useFakeTimers();

    fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer(),
            data: fc.string({ minLength: 0, maxLength: 1000 }),
            metadata: fc.option(fc.record({
              timestamp: fc.integer(),
              priority: fc.integer({ min: 0, max: 10 }),
            })),
          }),
          { minLength: 10, maxLength: 30 }
        ),
        async (messages) => {
          const manager = new WebSocketManagerWithBatching(
            { maxRetries: 0 },
            { batchThreshold: 10, batchWindow: 100 }
          );

          const receivedMessages: any[] = [];
          manager.on('message', (data) => {
            receivedMessages.push(data);
          });

          await manager.connect('ws://test.example.com');
          await vi.runOnlyPendingTimersAsync();

          // Send all messages
          for (const message of messages) {
            mockWebSocketInstance?.simulateMessage(message);
          }

          // Process all batches
          await vi.runOnlyPendingTimersAsync();

          // All messages should be received
          expect(receivedMessages.length).toBe(messages.length);

          // Messages should be in order
          receivedMessages.forEach((received, index) => {
            expect(received.id).toBe(messages[index].id);
          });

          // Render count should be less than message count
          expect(manager.getRenderCount()).toBeLessThan(messages.length);

          manager.disconnect();
        }
      ),
      { numRuns: 20 }
    );

    vi.useRealTimers();
  });
});
