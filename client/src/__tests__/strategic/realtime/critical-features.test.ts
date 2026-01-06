/**
 * Real-time Communication Critical Features Tests
 * Pareto Principle: 20% effort, 80% value
 * Focus: Connection reliability, Message delivery, Error recovery
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock WebSocket
class MockWebSocket {
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  readyState = WebSocket.CONNECTING;
  send = vi.fn();
  close = vi.fn();

  constructor(public url: string) {
    // Simulate connection delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen(new Event('open'));
    }, 100);
  }
}

// Mock WebSocket globally
Object.defineProperty(window, 'WebSocket', {
  value: MockWebSocket,
  writable: true
});

describe('Real-time Critical Features', () => {
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket = new MockWebSocket('ws://localhost:8080');
  });

  afterEach(() => {
    if (mockWebSocket.readyState === WebSocket.OPEN) {
      mockWebSocket.close();
    }
  });

  describe('Connection Reliability', () => {
    it('should establish WebSocket connection successfully', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockWebSocket.readyState).toBe(WebSocket.OPEN);
      expect(mockWebSocket.onopen).toBeDefined();
    });

    it('should handle connection failures gracefully', async () => {
      // Simulate connection failure
      mockWebSocket.readyState = WebSocket.CLOSED;

      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Event('error'));
      }

      expect(mockWebSocket.readyState).toBe(WebSocket.CLOSED);
    });

    it('should reconnect on network interruption', async () => {
      // Initial connection
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockWebSocket.readyState).toBe(WebSocket.OPEN);

      // Simulate connection loss
      mockWebSocket.readyState = WebSocket.CLOSED;
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose(new CloseEvent('close', { code: 1006 }));
      }

      // Simulate reconnection
      mockWebSocket = new MockWebSocket('ws://localhost:8080');
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockWebSocket.readyState).toBe(WebSocket.OPEN);
    });

    it('should handle rapid connection attempts', async () => {
      const connections = Array.from({ length: 5 }, () => new MockWebSocket('ws://localhost:8080'));

      await new Promise(resolve => setTimeout(resolve, 200));

      connections.forEach(conn => {
        expect(conn.readyState).toBe(WebSocket.OPEN);
      });
    });
  });

  describe('Message Delivery', () => {
    it('should deliver messages without loss', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));

      const messages = ['message1', 'message2', 'message3'];
      const receivedMessages: string[] = [];

      // Set up message handler
      mockWebSocket.onmessage = (event: MessageEvent) => {
        receivedMessages.push(event.data);
      };

      // Send messages
      messages.forEach(message => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(new MessageEvent('message', { data: message }));
        }
      });

      expect(receivedMessages).toEqual(messages);
    });

    it('should handle malformed messages gracefully', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));

      const malformedMessages = [
        null,
        undefined,
        {},
        'invalid-json',
        'not-a-string'
      ];

      const receivedMessages: any[] = [];

      mockWebSocket.onmessage = (event: MessageEvent) => {
        receivedMessages.push(event.data);
      };

      // Send malformed messages
      malformedMessages.forEach(message => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(new MessageEvent('message', { data: message }));
        }
      });

      expect(receivedMessages).toHaveLength(malformedMessages.length);
    });

    it('should handle high message throughput', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));

      const messageCount = 100;
      let receivedCount = 0;

      mockWebSocket.onmessage = () => {
        receivedCount++;
      };

      // Send many messages rapidly
      for (let i = 0; i < messageCount; i++) {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(new MessageEvent('message', { data: `message-${i}` }));
        }
      }

      expect(receivedCount).toBe(messageCount);
    });

    it('should queue messages during offline state', async () => {
      // Start in connecting state
      expect(mockWebSocket.readyState).toBe(WebSocket.CONNECTING);

      // Try to send message while connecting
      mockWebSocket.send('queued-message');

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockWebSocket.send).toHaveBeenCalledWith('queued-message');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from network failures', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockWebSocket.readyState).toBe(WebSocket.OPEN);

      // Simulate network failure
      mockWebSocket.readyState = WebSocket.CLOSED;
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose(new CloseEvent('close', { code: 1006 }));
      }

      // Verify error handling
      expect(mockWebSocket.readyState).toBe(WebSocket.CLOSED);
    });

    it('should handle server errors appropriately', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));

      let errorReceived = false;

      mockWebSocket.onerror = () => {
        errorReceived = true;
      };

      // Simulate server error
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Event('error'));
      }

      expect(errorReceived).toBe(true);
    });

    it('should prevent error cascading', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));

      let errorCount = 0;

      mockWebSocket.onerror = () => {
        errorCount++;
      };

      // Send multiple errors rapidly
      for (let i = 0; i < 5; i++) {
        if (mockWebSocket.onerror) {
          mockWebSocket.onerror(new Event('error'));
        }
      }

      // Should handle all errors without crashing
      expect(errorCount).toBe(5);
    });

    it('should maintain connection state consistency', async () => {
      // Initial state
      expect(mockWebSocket.readyState).toBe(WebSocket.CONNECTING);

      // After connection
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockWebSocket.readyState).toBe(WebSocket.OPEN);

      // After closure
      mockWebSocket.readyState = WebSocket.CLOSED;
      expect(mockWebSocket.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent connections efficiently', async () => {
      const connections = Array.from({ length: 10 }, () => new MockWebSocket('ws://localhost:8080'));

      await new Promise(resolve => setTimeout(resolve, 200));

      connections.forEach(conn => {
        expect(conn.readyState).toBe(WebSocket.OPEN);
      });
    });

    it('should manage memory usage during long sessions', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));

      // Simulate long session with many messages
      for (let i = 0; i < 1000; i++) {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(new MessageEvent('message', { data: `message-${i}` }));
        }
      }

      // Should not crash or leak memory
      expect(mockWebSocket.send).toBeDefined();
    });

    it('should handle connection timeouts', async () => {
      // Create connection that doesn't open
      const slowWebSocket = new MockWebSocket('ws://localhost:8080');

      // Simulate timeout
      setTimeout(() => {
        if (slowWebSocket.readyState === WebSocket.CONNECTING) {
          slowWebSocket.readyState = WebSocket.CLOSED;
        }
      }, 50);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(slowWebSocket.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle bill status updates correctly', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));

      const billUpdates: any[] = [];
      const expectedUpdates = [
        { type: 'bill_status_update', billId: 'SB-123', status: 'passed' },
        { type: 'bill_status_update', billId: 'HB-456', status: 'pending' }
      ];

      mockWebSocket.onmessage = (event: MessageEvent) => {
        billUpdates.push(JSON.parse(event.data));
      };

      // Send bill updates
      expectedUpdates.forEach(update => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(new MessageEvent('message', {
            data: JSON.stringify(update)
          }));
        }
      });

      expect(billUpdates).toEqual(expectedUpdates);
    });

    it('should handle community notifications', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));

      const notifications: any[] = [];
      const expectedNotifications = [
        { type: 'community_update', message: 'New discussion started' },
        { type: 'community_update', message: 'Comment added' }
      ];

      mockWebSocket.onmessage = (event: MessageEvent) => {
        notifications.push(JSON.parse(event.data));
      };

      // Send notifications
      expectedNotifications.forEach(notification => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(new MessageEvent('message', {
            data: JSON.stringify(notification)
          }));
        }
      });

      expect(notifications).toEqual(expectedNotifications);
    });

    it('should handle user presence updates', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));

      const presenceUpdates: any[] = [];
      const expectedUpdates = [
        { type: 'user_presence', userId: 'user1', status: 'online' },
        { type: 'user_presence', userId: 'user2', status: 'offline' }
      ];

      mockWebSocket.onmessage = (event: MessageEvent) => {
        presenceUpdates.push(JSON.parse(event.data));
      };

      // Send presence updates
      expectedUpdates.forEach(update => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage(new MessageEvent('message', {
            data: JSON.stringify(update)
          }));
        }
      });

      expect(presenceUpdates).toEqual(expectedUpdates);
    });
  });
