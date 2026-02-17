import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { WebSocketManagerImpl } from '../core/websocket/manager';
class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = MockWebSocket.CONNECTING;
    url;
    onopen = null;
    onclose = null;
    onerror = null;
    onmessage = null;
    constructor(url) {
        this.url = url;
    }
    send(data) {
        if (this.readyState !== MockWebSocket.OPEN) {
            throw new Error('WebSocket is not open');
        }
    }
    close() {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose) {
            this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
        }
    }
    simulateOpen() {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) {
            this.onopen(new Event('open'));
        }
    }
    simulateClose(code = 1006, reason = 'Connection lost') {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose) {
            this.onclose(new CloseEvent('close', { code, reason, wasClean: false }));
        }
    }
    simulateError() {
        if (this.onerror) {
            this.onerror(new Event('error'));
        }
    }
}
describe('Property 10: WebSocket Reconnection with Backoff', () => {
    let originalWebSocket;
    let mockWebSocketInstances = [];
    beforeEach(() => {
        originalWebSocket = global.WebSocket;
        global.WebSocket = vi.fn((url) => {
            const instance = new MockWebSocket(url);
            mockWebSocketInstances.push(instance);
            return instance;
        });
        global.WebSocket.CONNECTING = MockWebSocket.CONNECTING;
        global.WebSocket.OPEN = MockWebSocket.OPEN;
        global.WebSocket.CLOSING = MockWebSocket.CLOSING;
        global.WebSocket.CLOSED = MockWebSocket.CLOSED;
        mockWebSocketInstances = [];
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
        global.WebSocket = originalWebSocket;
        mockWebSocketInstances = [];
    });
    it.prop([
        fc.record({
            initialDelay: fc.integer({ min: 100, max: 2000 }),
            maxDelay: fc.integer({ min: 5000, max: 60000 }),
            backoffMultiplier: fc.integer({ min: 2, max: 3 }),
            maxRetries: fc.integer({ min: 3, max: 10 }),
        }),
    ])('should use exponential backoff for reconnection delays', async (config) => {
        const manager = new WebSocketManagerImpl(config);
        const delays = [];
        manager.on('reconnecting', (data) => {
            delays.push(data.delay);
        });
        const connectPromise = manager.connect('ws://test.example.com');
        const firstWs = mockWebSocketInstances[0];
        firstWs.simulateError();
        firstWs.simulateClose(1006, 'Connection failed');
        await expect(connectPromise).rejects.toThrow();
        for (let attempt = 0; attempt < Math.min(config.maxRetries, 5); attempt++) {
            await vi.runAllTimersAsync();
            if (mockWebSocketInstances.length > attempt + 1) {
                const ws = mockWebSocketInstances[attempt + 1];
                ws.simulateError();
                ws.simulateClose(1006, 'Connection failed');
            }
        }
        for (let i = 0; i < delays.length; i++) {
            const expectedDelay = Math.min(config.initialDelay * Math.pow(config.backoffMultiplier, i), config.maxDelay);
            expect(delays[i]).toBe(expectedDelay);
        }
        manager.disconnect();
    });
    it.prop([
        fc.record({
            initialDelay: fc.integer({ min: 100, max: 1000 }),
            maxDelay: fc.integer({ min: 5000, max: 30000 }),
            backoffMultiplier: fc.constant(2),
            maxRetries: fc.integer({ min: 1, max: 5 }),
        }),
    ])('should not exceed maxRetries reconnection attempts', async (config) => {
        const manager = new WebSocketManagerImpl(config);
        let reconnectAttempts = 0;
        let failedEventFired = false;
        manager.on('reconnecting', () => {
            reconnectAttempts++;
        });
        manager.on('reconnect_failed', () => {
            failedEventFired = true;
        });
        const connectPromise = manager.connect('ws://test.example.com');
        const firstWs = mockWebSocketInstances[0];
        firstWs.simulateError();
        firstWs.simulateClose(1006, 'Connection failed');
        await expect(connectPromise).rejects.toThrow();
        for (let i = 0; i < config.maxRetries + 2; i++) {
            await vi.runAllTimersAsync();
            if (mockWebSocketInstances.length > i + 1) {
                const ws = mockWebSocketInstances[i + 1];
                ws.simulateError();
                ws.simulateClose(1006, 'Connection failed');
            }
        }
        expect(reconnectAttempts).toBeLessThanOrEqual(config.maxRetries);
        if (reconnectAttempts === config.maxRetries) {
            expect(failedEventFired).toBe(true);
        }
        manager.disconnect();
    });
    it.prop([
        fc.record({
            initialDelay: fc.integer({ min: 100, max: 1000 }),
            maxDelay: fc.integer({ min: 5000, max: 30000 }),
            backoffMultiplier: fc.constant(2),
            maxRetries: fc.integer({ min: 3, max: 10 }),
        }),
        fc.integer({ min: 1, max: 3 }),
    ])('should reset reconnection counter after successful connection', async (config, failuresBeforeSuccess) => {
        const manager = new WebSocketManagerImpl(config);
        const delays = [];
        manager.on('reconnecting', (data) => {
            delays.push(data.delay);
        });
        const connectPromise = manager.connect('ws://test.example.com');
        const firstWs = mockWebSocketInstances[0];
        firstWs.simulateError();
        firstWs.simulateClose(1006, 'Connection failed');
        await expect(connectPromise).rejects.toThrow();
        for (let i = 0; i < failuresBeforeSuccess; i++) {
            await vi.runAllTimersAsync();
            if (mockWebSocketInstances.length > i + 1) {
                const ws = mockWebSocketInstances[i + 1];
                if (i < failuresBeforeSuccess - 1) {
                    ws.simulateError();
                    ws.simulateClose(1006, 'Connection failed');
                }
                else {
                    ws.simulateOpen();
                }
            }
        }
        const lastSuccessfulWs = mockWebSocketInstances[mockWebSocketInstances.length - 1];
        lastSuccessfulWs.simulateClose(1006, 'Connection lost');
        await vi.runAllTimersAsync();
        const delayAfterSuccess = delays[delays.length - 1];
        expect(delayAfterSuccess).toBe(config.initialDelay);
        manager.disconnect();
    });
    it.prop([
        fc.record({
            initialDelay: fc.integer({ min: 100, max: 1000 }),
            maxDelay: fc.integer({ min: 5000, max: 30000 }),
            backoffMultiplier: fc.constant(2),
            maxRetries: fc.integer({ min: 3, max: 10 }),
        }),
    ])('should not reconnect after manual disconnect', async (config) => {
        const manager = new WebSocketManagerImpl(config);
        let reconnectAttempts = 0;
        manager.on('reconnecting', () => {
            reconnectAttempts++;
        });
        const connectPromise = manager.connect('ws://test.example.com');
        const ws = mockWebSocketInstances[0];
        ws.simulateOpen();
        await connectPromise;
        manager.disconnect();
        await vi.runAllTimersAsync();
        expect(reconnectAttempts).toBe(0);
        expect(manager.getConnectionState()).toBe('disconnected');
    });
    it.prop([
        fc.record({
            initialDelay: fc.integer({ min: 100, max: 1000 }),
            maxDelay: fc.integer({ min: 2000, max: 10000 }),
            backoffMultiplier: fc.integer({ min: 2, max: 4 }),
            maxRetries: fc.integer({ min: 5, max: 15 }),
        }),
    ])('should cap reconnection delay at maxDelay', async (config) => {
        const manager = new WebSocketManagerImpl(config);
        const delays = [];
        manager.on('reconnecting', (data) => {
            delays.push(data.delay);
        });
        const connectPromise = manager.connect('ws://test.example.com');
        const firstWs = mockWebSocketInstances[0];
        firstWs.simulateError();
        firstWs.simulateClose(1006, 'Connection failed');
        await expect(connectPromise).rejects.toThrow();
        for (let i = 0; i < Math.min(config.maxRetries, 10); i++) {
            await vi.runAllTimersAsync();
            if (mockWebSocketInstances.length > i + 1) {
                const ws = mockWebSocketInstances[i + 1];
                ws.simulateError();
                ws.simulateClose(1006, 'Connection failed');
            }
        }
        delays.forEach((delay) => {
            expect(delay).toBeLessThanOrEqual(config.maxDelay);
        });
        manager.disconnect();
    });
});
//# sourceMappingURL=websocket-reconnection.property.test.js.map