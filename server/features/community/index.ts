// Community Feature Domain
// Centralized exports for community and social functionality

// Routes
export { router as communityRouter } from './application/community';

// Services (canonical — ADR-012/021 security-integrated)
export { CommunityService, communityService, createCommunityService } from './application/community-service';

// Legacy services (to be consolidated into CommunityService)
export { CommentService } from './application/comment';
export { CommentVotingService } from './application/comment-voting';
export { SocialIntegrationService } from './application/social-integration';

// Storage classes removed - using direct Drizzle ORM services instead
export { SocialShareStorage } from './infrastructure/social-share-storage';















































