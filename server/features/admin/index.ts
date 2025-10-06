// Admin Feature Domain
// Centralized exports for administrative functionality

// Routes
export { default as adminRouter } from './admin';
export { default as moderationRouter } from './moderation';
export { default as systemRouter } from './system';

// Services
export { AdminService } from './admin';
export { ContentModerationService } from './content-moderation';