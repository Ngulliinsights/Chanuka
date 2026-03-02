/**
 * Realtime Client Sub-Module
 * 
 * Consolidated realtime functionality including:
 * - Realtime event subscriptions
 * - Pub/sub messaging
 * - Topic-based routing
 * - Subscription management
 */

// Unified realtime client
import {
  UnifiedRealtimeClient,
  createRealtimeClient,
} from './client';

export {
  UnifiedRealtimeClient,
  createRealtimeClient,
};

// Realtime types
import {
  IRealtimeClient,
  Subscription,
  EventHandler,
  RealtimeEvent,
  RealtimeOptions,
  RealtimeHubState,
  BillRealTimeUpdate,
  WebSocketSubscription,
} from '../types/realtime';

export type {
  IRealtimeClient,
  Subscription,
  EventHandler,
  RealtimeEvent,
  RealtimeOptions,
  RealtimeHubState,
  BillRealTimeUpdate,
  WebSocketSubscription,
};

// Note: Legacy realtime hub and services have been migrated to use the
// unified realtime client.

// Singleton instance for legacy compatibility
export const realTimeService = createRealtimeClient({
  url: (typeof process !== 'undefined' && process.env.VITE_WS_URL) || 'ws://localhost:5173/ws',
  autoReconnect: true,
});

// Hooks (stubs for now, to be moved to separate files if needed)
export const useWebSocket = () => ({
  connected: realTimeService.isConnected(),
  error: null,
  send: (data: unknown) => realTimeService.publish('default', data),
  subscribe: (topic: string, handler: EventHandler) => realTimeService.subscribe(topic, handler),
});

export const useBillTracking = () => ({
  isTracking: false,
  updates: [],
});

export const useCommunityRealTime = () => ({
  onlineUsers: 0,
  activeTopics: [],
});
