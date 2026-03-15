/**
 * Conflict Detection System Exports
 * 
 * Centralized exports for the decomposed conflict detection system.
 */

// Types
export * from './types';

// Services
export { conflictDetectionEngineService } from './conflict-detection-engine.service';
export { stakeholderAnalysisService } from './stakeholder-analysis.service';
export { conflictSeverityAnalyzerService } from './conflict-severity-analyzer.service';
export { conflictResolutionRecommendationService } from './conflict-resolution-recommendation.service';
export { conflictDetectionOrchestratorService } from './conflict-detection-orchestrator.service';

// Main service for backward compatibility
export { conflictDetectionOrchestratorService as enhancedConflictDetectionService } from './conflict-detection-orchestrator.service';


