/**
 * Community Feature Services
 * 
 * Business logic services for community-related operations.
 * Integrated from client/src/services/ following FSD principles.
 */

// Re-export the consolidated community service
export { CommunityService, communityService } from './community-service';

// Backend service for community API integration (real API with WebSocket support)
export { communityBackendService } from './backend';
export { communityBackend } from './backend'; // Alias for flexibility

// Export types
export type {
  CommunityServiceConfig,
  DiscussionCreateRequest,
  CommentCreateRequest,
  ModerationRequest
} from './community-service';