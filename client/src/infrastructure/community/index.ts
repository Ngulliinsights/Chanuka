/**
 * Core Community Infrastructure
 *
 * DEPRECATED: This module is being migrated to features/community
 * Community is a business domain, not infrastructure
 * 
 * For WebSocket functionality, use @client/infrastructure/realtime
 * For community business logic, use @client/features/community
 */

// Shared types only - these can stay in infrastructure as they're used across layers
export type {
  UnifiedComment,
  UnifiedThread,
  UnifiedModeration,
  CommunityState,
  DiscussionState,
} from './types';

// Services - these should be moved to features/community
export { ModerationService } from './services/moderation.service';
export { StateSyncService } from './services/state-sync.service';

// NOTE: Community hooks have been moved to @client/features/community
// Import from features layer instead:
// - useUnifiedDiscussion
// - useUnifiedCommunity  
// - useRealtime
