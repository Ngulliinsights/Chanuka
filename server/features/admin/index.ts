// Admin Feature Domain
// Centralized exports for administrative functionality

// Application Layer - Routes
export { router as adminRouter } from './application/admin.routes';
export { router as moderationRouter } from './domain/moderation-service';
export { router as systemRouter } from './application/system.routes';
export { router as externalApiDashboardRouter } from './application/external-api-dashboard.routes';
export { router as contentModerationRouter } from './application/content-moderation.routes';

// Domain Layer - Services
export { AdminService } from './application/admin.routes';
export { ContentModerationService } from './application/content-moderation.routes';

// Moderation subsystem
export * from './moderation';

















































