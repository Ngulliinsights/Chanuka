/**
 * Core Real-time Module
 *
 * Consolidated WebSocket and real-time functionality for the FSD architecture.
 * This module serves as the single source of truth for all real-time features.
 */

// Core Real-time Hub (primary interface)
export { RealTimeHub, realTimeHub } from './hub';
export type { RealTimeHubState } from './hub';

// Core WebSocket infrastructure
export { UnifiedWebSocketManager } from './manager';

// Real-time services
export { RealTimeService, realTimeService } from './services/realtime-service';
export { BillTrackingService } from './services/bill-tracking';
export { CommunityService } from './services/community';
export { NotificationService } from './services/notifications';

// Hooks
export { useWebSocket } from './hooks/use-websocket';
export { useBillTracking } from './hooks/use-bill-tracking';
export { useCommunityRealTime } from './hooks/use-community-realtime';

// Legacy hooks (deprecated - use new hooks above)
export { useRealTimeEngagement } from './hooks/use-realtime-engagement-legacy';

// Types
export * from './types';

// Configuration
export {
  defaultWebSocketConfig,
  defaultRealTimeConfig,
  getWebSocketConfig,
  getRealTimeConfig
} from './config';

// Utilities
export { EventEmitter } from './utils/event-emitter';