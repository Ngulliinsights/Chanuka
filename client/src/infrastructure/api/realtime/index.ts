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
export {
  UnifiedRealtimeClient,
  createRealtimeClient,
} from './client';

// Realtime types
export type {
  IRealtimeClient,
  Subscription,
  EventHandler,
  RealtimeEvent,
  RealtimeOptions,
  RealtimeHubState,
} from '../types/realtime';

// Note: Legacy realtime hub and services remain in infrastructure/realtime
// for backward compatibility. They will be gradually migrated to use the
// unified realtime client.
