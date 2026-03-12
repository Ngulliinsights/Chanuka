// Admin Feature Domain
// Centralized exports for administrative functionality

// Application Layer - Routes
export { router as adminRouter } from './presentation/http/admin.routes';
export { router as moderationRouter } from './domain/moderation-service';
export { router as systemRouter } from './presentation/http/system.routes';
export { router as externalApiDashboardRouter } from './presentation/http/external-api-dashboard.routes';
export { router as contentModerationRouter } from './presentation/http/content-moderation.routes';

// Domain Layer - Services
export { AdminService } from './presentation/http/admin.routes';
export { ContentModerationService } from './presentation/http/content-moderation.routes';

// Moderation subsystem
export * from './moderation';


















































export * from './application/services/moderation-service';
