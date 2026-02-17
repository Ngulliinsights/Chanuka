export interface WebSocketManager {
    connect(url: string): Promise<void>;
    disconnect(): void;
    send(data: unknown): void;
    on(event: string, handler: (data: unknown) => void): void;
    off(event: string, handler: (data: unknown) => void): void;
    getConnectionState(): ConnectionState;
}
export interface ReconnectionConfig {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
type EventHandler = (data: unknown) => void;
export declare class WebSocketManagerImpl implements WebSocketManager {
    private ws;
    private url;
    private reconnectAttempts;
    private reconnectTimer;
    private connectionState;
    private eventHandlers;
    private config;
    constructor(config?: Partial<ReconnectionConfig>);
    connect(url: string): Promise<void>;
    disconnect(): void;
    send(data: unknown): void;
    on(event: string, handler: EventHandler): void;
    off(event: string, handler: EventHandler): void;
    getConnectionState(): ConnectionState;
    private emit;
    private handleError;
    private handleClose;
    private attemptReconnect;
    private calculateBackoff;
}
export declare function createWebSocketManager(config?: Partial<ReconnectionConfig>): WebSocketManager;
export {};
//# sourceMappingURL=manager.d.ts.map