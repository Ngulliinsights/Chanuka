/**
 * Moderation System Exports
 * 
 * Centralized exports for the decomposed moderation system.
 */

// Types
export * from './types';

// Services
export { contentAnalysisService } from './content-analysis.service';
export { moderationQueueService } from './moderation-queue.service';
export { moderationDecisionService } from './moderation-decision.service';
export { moderationAnalyticsService } from './moderation-analytics.service';
export { moderationOrchestratorService } from './moderation-orchestrator.service';

// Main service for backward compatibility
export { moderationOrchestratorService as contentModerationService } from './moderation-orchestrator.service';


