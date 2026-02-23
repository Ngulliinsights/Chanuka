/**
 * Real-time Hooks Types
 * Type definitions for real-time WebSocket hooks
 */

export interface CommunityRealTimeHookReturn {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (message: unknown) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

export interface WebSocketHookOptions {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (message: unknown) => void;
  error: Event | null;
}
