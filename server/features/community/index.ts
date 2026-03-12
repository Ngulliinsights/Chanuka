// Community Feature Domain
// Centralized exports for community and social functionality

// Routes
export { router as communityRouter } from './community';

// Services (canonical — ADR-012/021 security-integrated)
export { CommunityService, communityService, createCommunityService } from './application/community-service';

// Legacy services (to be consolidated into CommunityService)
export { CommentService } from './comment';
export { CommentVotingService } from './comment-voting';
export { SocialIntegrationService } from './social-integration';

// Storage classes removed - using direct Drizzle ORM services instead
export { SocialShareStorage } from './social-share-storage';















































