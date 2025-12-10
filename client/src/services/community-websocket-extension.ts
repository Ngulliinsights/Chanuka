/**
 * Community WebSocket Extension
 * Provides real-time community features and notifications
 */

export interface CommunityWebSocketExtension {
  connect(): Promise<void>;
  disconnect(): void;
  subscribeToUpdates(callback: (data: Record<string, unknown>) => void): () => void;
  sendMessage(message: Record<string, unknown>): void;
  isConnected(): boolean;
}

export class CommunityWebSocketManager implements CommunityWebSocketExtension {
  private ws: WebSocket | null = null;
  private callbacks: Set<(data: Record<string, unknown>) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Use mock WebSocket for development
        if (process.env.NODE_ENV === 'development') {
          this.ws = new MockWebSocket() as unknown as WebSocket;
          resolve();
          return;
        }

        const wsUrl = process.env.VITE_WS_URL || 'ws://localhost:3001/community';
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as Record<string, unknown>;
            this.callbacks.forEach(callback => callback(data));
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.clear();
  }

  subscribeToUpdates(callback: (data: Record<string, unknown>) => void): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  sendMessage(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }
}

// Mock WebSocket for development
class MockWebSocket {
  readyState = WebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor() {
    setTimeout(() => {
      this.onopen?.(new Event('open'));
    }, 100);
  }

  send(data: string): void {
    console.log('Mock WebSocket send:', data);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

export const communityWebSocketManager = new CommunityWebSocketManager();
export default communityWebSocketManager;