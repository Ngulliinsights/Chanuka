export class WebSocketManagerImpl {
    ws = null;
    url = '';
    reconnectAttempts = 0;
    reconnectTimer = null;
    connectionState = 'disconnected';
    eventHandlers = new Map();
    config = {
        maxRetries: 10,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
    };
    constructor(config) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }
    async connect(url) {
        this.url = url;
        this.connectionState = 'connecting';
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);
                this.ws.onopen = () => {
                    this.connectionState = 'connected';
                    this.reconnectAttempts = 0;
                    console.log('[WebSocket] Connected successfully', {
                        url: this.url,
                        timestamp: new Date().toISOString(),
                    });
                    this.emit('connected', { url: this.url });
                    resolve();
                };
                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.emit('message', data);
                        if (data.type) {
                            this.emit(data.type, data);
                        }
                    }
                    catch (error) {
                        console.error('[WebSocket] Failed to parse message', {
                            error,
                            rawData: event.data,
                        });
                    }
                };
                this.ws.onerror = (event) => {
                    this.handleError(event);
                    reject(new Error('WebSocket connection failed'));
                };
                this.ws.onclose = (event) => {
                    this.handleClose(event);
                };
            }
            catch (error) {
                this.connectionState = 'failed';
                reject(error);
            }
        });
    }
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connectionState = 'disconnected';
        this.reconnectAttempts = 0;
        console.log('[WebSocket] Disconnected', {
            url: this.url,
            timestamp: new Date().toISOString(),
        });
    }
    send(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[WebSocket] Cannot send message - not connected', {
                state: this.connectionState,
                readyState: this.ws?.readyState,
            });
            return;
        }
        try {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            this.ws.send(message);
        }
        catch (error) {
            console.error('[WebSocket] Failed to send message', {
                error,
                data,
            });
        }
    }
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(handler);
    }
    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.eventHandlers.delete(event);
            }
        }
    }
    getConnectionState() {
        return this.connectionState;
    }
    emit(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(data);
                }
                catch (error) {
                    console.error('[WebSocket] Error in event handler', {
                        event,
                        error,
                    });
                }
            });
        }
    }
    handleError(event) {
        const context = {
            operation: 'websocket_error',
            layer: 'client',
            timestamp: new Date(),
            severity: 'high',
            metadata: {
                readyState: this.ws?.readyState,
                reconnectAttempts: this.reconnectAttempts,
                url: this.url,
            },
        };
        console.error('[WebSocket] Error occurred', event, context);
        this.emit('error', { event, context });
    }
    handleClose(event) {
        console.log('[WebSocket] Connection closed', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            reconnectAttempts: this.reconnectAttempts,
        });
        this.emit('disconnected', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
        });
        if (this.connectionState !== 'disconnected') {
            this.attemptReconnect();
        }
    }
    attemptReconnect() {
        if (this.reconnectAttempts >= this.config.maxRetries) {
            this.connectionState = 'failed';
            console.error('[WebSocket] Max reconnection attempts reached', {
                maxRetries: this.config.maxRetries,
                url: this.url,
            });
            this.emit('reconnect_failed', {
                attempts: this.reconnectAttempts,
                maxRetries: this.config.maxRetries,
            });
            return;
        }
        this.connectionState = 'reconnecting';
        const delay = this.calculateBackoff();
        console.log('[WebSocket] Attempting reconnection', {
            attempt: this.reconnectAttempts + 1,
            maxRetries: this.config.maxRetries,
            delay,
            url: this.url,
        });
        this.emit('reconnecting', {
            attempt: this.reconnectAttempts + 1,
            delay,
        });
        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(this.url).catch((error) => {
                console.error('[WebSocket] Reconnection failed', {
                    error,
                    attempt: this.reconnectAttempts,
                });
            });
        }, delay);
    }
    calculateBackoff() {
        const delay = Math.min(this.config.initialDelay * Math.pow(this.config.backoffMultiplier, this.reconnectAttempts), this.config.maxDelay);
        return delay;
    }
}
export function createWebSocketManager(config) {
    return new WebSocketManagerImpl(config);
}
//# sourceMappingURL=manager.js.map