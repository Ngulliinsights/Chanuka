/**
 * Real-time Core Module
 * 
 * Central entry point for the real-time subsystem.
 * USES SHARED TYPES from @client/core/api/types to ensure consistency.
 */

// ✅ IMPORT from the Central Truth
import type {
  ConnectionState,
  WebSocketMessage
} from '@client/core/api/types';

import { WebSocketClient } from '../websocket-client';

// Re-export the shared types so consumers of this module still find them here
export {
  ConnectionState,
  WebSocketClient
};

// Define ConnectionQuality locally since it's not exported from API types
export interface ConnectionQuality {
  level: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency: number;
  packetLoss?: number;
}

// ============================================================================
// Hook Return Types (These are specific to React, so keep them here)
// ============================================================================

export interface WebSocketHookReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: ConnectionQuality['level'];
  error: string | null;
  // Use proper typing for notifications
  notifications: WebSocketMessage[];
  notificationCount: number;

  connect: () => void;
  disconnect: () => void;
  subscribe: (topics: string | string[]) => void;
  unsubscribe: (topics: string | string[]) => void;
  send: (message: WebSocketMessage) => void;
}

export interface BillTrackingHookReturn {
  isConnected: boolean;
  // Use shared types for strict typing
  subscribedBills: Set<number>;
  subscribeToBill: (billId: number) => void;
  unsubscribeFromBill: (billId: number) => void;
}