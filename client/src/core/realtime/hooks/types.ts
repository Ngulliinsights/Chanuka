/**
 * Real-time Hooks Types
 * Type definitions for real-time WebSocket hooks
 */

export interface CommunityRealTimeHookReturn {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (message: any) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

export interface WebSocketHookOptions {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (message: any) => void;
  error: Event | null;
}
