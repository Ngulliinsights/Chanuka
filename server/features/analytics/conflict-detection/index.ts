/**
 * Conflict Detection System Exports
 * 
 * Centralized exports for the decomposed conflict detection system.
 */

// Types
export * from './types.js';

// Services
export { conflictDetectionEngineService } from './conflict-detection-engine.service.js';
export { stakeholderAnalysisService } from './stakeholder-analysis.service.js';
export { conflictSeverityAnalyzerService } from './conflict-severity-analyzer.service.js';
export { conflictResolutionRecommendationService } from './conflict-resolution-recommendation.service.js';
export { conflictDetectionOrchestratorService } from './conflict-detection-orchestrator.service.js';

// Main service for backward compatibility
export { conflictDetectionOrchestratorService as enhancedConflictDetectionService } from './conflict-detection-orchestrator.service.js';


