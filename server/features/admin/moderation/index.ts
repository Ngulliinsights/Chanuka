/**
 * Moderation System Exports
 * 
 * Centralized exports for the decomposed moderation system.
 */

// Types
export * from './types.js';

// Services
export { contentAnalysisService } from './content-analysis.service.js';
export { moderationQueueService } from './moderation-queue.service.js';
export { moderationDecisionService } from './moderation-decision.service.js';
export { moderationAnalyticsService } from './moderation-analytics.service.js';
export { moderationOrchestratorService } from './moderation-orchestrator.service.js';

// Main service for backward compatibility
export { moderationOrchestratorService as contentModerationService } from './moderation-orchestrator.service.js';


