/**
 * Core Community Module
 * 
 * Unified community and discussion system consolidating:
 * - features/community/hooks/useDiscussion.ts
 * - features/community/hooks/useCommunity.ts  
 * - Resolving type conflicts and state management inconsistencies
 */

// Unified hooks
export { useUnifiedDiscussion } from './hooks/useUnifiedDiscussion';
export { useUnifiedCommunity } from './hooks/useUnifiedCommunity';
export { useRealtime } from './hooks/useRealtime';

// Unified types (single source of truth)
export type {
  UnifiedComment,
  UnifiedThread,
  UnifiedModeration,
  CommunityState,
  DiscussionState,
} from './types';

// Services
export { WebSocketManager } from './services/websocket-manager';
export { ModerationService } from './services/moderation.service';
export { StateSyncService } from './services/state-sync.service';