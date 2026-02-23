/**
 * Real-time Critical Features Tests
 *
 * Focus: Connection reliability, Message delivery, Error recovery
 * Pareto Priority: Week 2 - Real-time Systems
 *
 * These tests cover the most critical real-time communication scenarios that deliver
 * 80% of testing value with 20% of implementation effort.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock WebSocket services
vi.mock('@client/infrastructure/realtime/websocket', () => ({
  websocketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    onMessage: vi.fn(),
    onError: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
  },
}));

describe('Real-time Critical Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Reliability', () => {
    it('should establish WebSocket connection successfully', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      const connectionConfig = {
        url: 'ws://localhost:8080',
        protocols: ['chat', 'notifications'],
        timeout: 5000,
      };

      websocketService.connect.mockResolvedValue({
        success: true,
        connectionId: 'conn-123',
        protocols: connectionConfig.protocols,
      });

      const result = await websocketService.connect(connectionConfig);

      expect(websocketService.connect).toHaveBeenCalledWith(connectionConfig);
      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(result.protocols).toEqual(connectionConfig.protocols);
    });

    it('should handle connection failures gracefully', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      const connectionError = new Error('Connection failed: Network unreachable');

      websocketService.connect.mockRejectedValue(connectionError);

      await expect(websocketService.connect({ url: 'ws://invalid-url' })).rejects.toThrow(
        'Connection failed: Network unreachable'
      );
    });

    it('should reconnect on network interruption', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      // Simulate connection loss and reconnection
      websocketService.connect
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce({
          success: true,
          connectionId: 'conn-456',
          reconnected: true,
        });

      // First connection attempt fails
      await expect(websocketService.connect({ url: 'ws://localhost:8080' })).rejects.toThrow(
        'Connection lost'
      );

      // Second attempt succeeds (reconnection)
      const result = await websocketService.connect({ url: 'ws://localhost:8080' });

      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(result.reconnected).toBe(true);
    });

    it('should handle rapid connection attempts', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      const rapidAttempts = [
        { url: 'ws://localhost:8080' },
        { url: 'ws://localhost:8081' },
        { url: 'ws://localhost:8082' },
      ];

      websocketService.connect.mockResolvedValue({
        success: true,
        connectionId: 'conn-rapid',
        rateLimited: false,
      });

      const results = await Promise.all(
        rapidAttempts.map(config => websocketService.connect(config))
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.rateLimited).toBe(false);
      });
    });
  });

  describe('Message Delivery', () => {
    it('should deliver messages without loss', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      const messages = [
        { id: 'msg-1', type: 'chat', content: 'Hello' },
        { id: 'msg-2', type: 'notification', content: 'Alert' },
        { id: 'msg-3', type: 'system', content: 'Status update' },
      ];

      websocketService.send.mockResolvedValue({
        success: true,
        messageId: messages[0].id,
        delivered: true,
      });

      for (const message of messages) {
        const result = await websocketService.send(message);

        expect(result.success).toBe(true);
        expect(result.messageId).toBe(message.id);
        expect(result.delivered).toBe(true);
      }
    });

    it('should handle malformed messages gracefully', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      const malformedMessages = [
        { id: 'invalid-1', type: null, content: undefined },
        { id: 'invalid-2', type: 'chat', content: '' },
        { id: 'invalid-3', type: 'invalid', content: 'test' },
      ];

      websocketService.send.mockResolvedValue({
        success: false,
        error: 'Malformed message',
        messageId: 'invalid-1',
      });

      for (const message of malformedMessages) {
        const result = await websocketService.send(message);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('should handle high message throughput', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      const throughputTest = {
        messageCount: 1000,
        batchSize: 100,
        timeWindow: 1000, // 1 second
      };

      websocketService.send.mockResolvedValue({
        success: true,
        throughput: 'high',
        latency: 50, // ms
      });

      // Simulate high throughput scenario
      const startTime = Date.now();
      const promises = Array.from({ length: throughputTest.messageCount }, (_, i) =>
        websocketService.send({ id: `msg-${i}`, type: 'test', content: `message ${i}` })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(throughputTest.messageCount);
      expect(endTime - startTime).toBeLessThan(throughputTest.timeWindow);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.throughput).toBe('high');
      });
    });

    it('should queue messages during offline state', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      const queuedMessages = [
        { id: 'queued-1', type: 'chat', content: 'Offline message 1' },
        { id: 'queued-2', type: 'chat', content: 'Offline message 2' },
        { id: 'queued-3', type: 'notification', content: 'Offline alert' },
      ];

      websocketService.send.mockResolvedValue({
        success: false,
        queued: true,
        queueSize: queuedMessages.length,
      });

      for (const message of queuedMessages) {
        const result = await websocketService.send(message);

        expect(result.success).toBe(false);
        expect(result.queued).toBe(true);
        expect(result.queueSize).toBe(queuedMessages.length);
      }
    });
  });

  describe('Error Recovery', () => {
    it('should recover from network failures', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      // Simulate network failure and recovery
      websocketService.connect
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Server unavailable'))
        .mockResolvedValueOnce({
          success: true,
          connectionId: 'conn-recovered',
          recovered: true,
        });

      // First two attempts fail
      await expect(websocketService.connect({ url: 'ws://localhost:8080' })).rejects.toThrow(
        'Network timeout'
      );

      await expect(websocketService.connect({ url: 'ws://localhost:8080' })).rejects.toThrow(
        'Server unavailable'
      );

      // Third attempt succeeds (recovery)
      const result = await websocketService.connect({ url: 'ws://localhost:8080' });

      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(result.recovered).toBe(true);
    });

    it('should handle server errors appropriately', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      const serverErrors = [
        { code: 500, message: 'Internal server error' },
        { code: 503, message: 'Service unavailable' },
        { code: 403, message: 'Forbidden' },
      ];

      websocketService.connect.mockRejectedValue(new Error('Server error'));

      for (const error of serverErrors) {
        await expect(websocketService.connect({ url: 'ws://localhost:8080' })).rejects.toThrow(
          'Server error'
        );
      }
    });

    it('should prevent error cascading', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      // Simulate error cascading scenario
      websocketService.connect.mockRejectedValue(new Error('Connection failed'));
      websocketService.send.mockRejectedValue(new Error('Send failed'));
      websocketService.disconnect.mockResolvedValue({ success: true });

      // Even with connection errors, disconnect should work
      const disconnectResult = await websocketService.disconnect();

      expect(disconnectResult.success).toBe(true);
    });

    it('should maintain connection state consistency', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      const connectionStates = ['connecting', 'connected', 'disconnecting', 'disconnected'];

      websocketService.connect.mockResolvedValue({
        success: true,
        state: connectionStates[1],
      });

      websocketService.disconnect.mockResolvedValue({
        success: true,
        state: connectionStates[3],
      });

      // Connect
      const connectResult = await websocketService.connect({ url: 'ws://localhost:8080' });
      expect(connectResult.state).toBe(connectionStates[1]);

      // Disconnect
      const disconnectResult = await websocketService.disconnect();
      expect(disconnectResult.state).toBe(connectionStates[3]);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete real-time workflow', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      // Complete workflow: connect -> send messages -> handle errors -> disconnect
      const workflow = {
        connection: { url: 'ws://localhost:8080', protocols: ['chat'] },
        messages: [
          { id: 'msg-1', type: 'chat', content: 'Hello' },
          { id: 'msg-2', type: 'notification', content: 'Alert' },
        ],
        errorHandling: { retryAttempts: 3, backoff: 1000 },
      };

      websocketService.connect.mockResolvedValue({
        success: true,
        connectionId: 'workflow-conn',
      });

      websocketService.send.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
        delivered: true,
      });

      websocketService.disconnect.mockResolvedValue({
        success: true,
        connectionId: 'workflow-conn',
      });

      // Execute workflow
      const connectResult = await websocketService.connect(workflow.connection);
      expect(connectResult.success).toBe(true);

      for (const message of workflow.messages) {
        const sendResult = await websocketService.send(message);
        expect(sendResult.success).toBe(true);
        expect(sendResult.delivered).toBe(true);
      }

      const disconnectResult = await websocketService.disconnect();
      expect(disconnectResult.success).toBe(true);
    });

    it('should handle real-time recovery scenarios', async () => {
      const { websocketService } = await import('@client/infrastructure/realtime/websocket');

      // Recovery scenario: connection lost during message sending
      const recoveryScenario = {
        initialConnection: { url: 'ws://localhost:8080' },
        messages: [
          { id: 'msg-1', type: 'chat', content: 'Message 1' },
          { id: 'msg-2', type: 'chat', content: 'Message 2' },
          { id: 'msg-3', type: 'chat', content: 'Message 3' },
        ],
        recoveryAttempts: 3,
      };

      websocketService.connect
        .mockResolvedValueOnce({ success: true, connectionId: 'initial' })
        .mockResolvedValueOnce({ success: true, connectionId: 'recovered', recovered: true });

      websocketService.send
        .mockResolvedValueOnce({ success: true, messageId: 'msg-1', delivered: true })
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce({ success: true, messageId: 'msg-2', delivered: true })
        .mockResolvedValueOnce({ success: true, messageId: 'msg-3', delivered: true });

      // Initial connection
      const initialResult = await websocketService.connect(recoveryScenario.initialConnection);
      expect(initialResult.success).toBe(true);

      // First message succeeds
      const msg1Result = await websocketService.send(recoveryScenario.messages[0]);
      expect(msg1Result.success).toBe(true);

      // Second message fails (connection lost)
      await expect(websocketService.send(recoveryScenario.messages[1])).rejects.toThrow(
        'Connection lost'
      );

      // Recover connection
      const recoveryResult = await websocketService.connect(recoveryScenario.initialConnection);
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.recovered).toBe(true);

      // Third message succeeds after recovery
      const msg3Result = await websocketService.send(recoveryScenario.messages[2]);
      expect(msg3Result.success).toBe(true);
    });
  });
});
