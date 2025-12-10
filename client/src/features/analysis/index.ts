/**
 * Analysis Feature - Conflict of Interest Detection & Visualization
 *
 * This feature provides sophisticated analysis tools for identifying potential conflicts
 * of interest, tracking financial exposure, analyzing voting patterns, and calculating
 * transparency scores.
 *
 * Phase 1 (Current): Mock data with visualization components
 * Phase 2 (Future): Service layer abstraction for easy API integration
 * Phase 3 (Future): Real API integration with backend data sources
 */

// UI Components
export { ConflictOfInterestAnalysis, AnalysisDashboard } from './ui';

// Hooks
export { useConflictAnalysis, useBillAnalysis } from './model/hooks';

// Services
export {
  MockConflictDetectionService,
  RealConflictDetectionService,
  createConflictDetectionService,
  type ConflictDetectionService
} from './model/services';

// Re-export types for convenience
export type {
  ConflictAnalysis,
  FinancialInterest,
  VotingPattern,
  TransparencyScore,
  NetworkNode,
  NetworkLink,
  ImplementationWorkaround,
  ConflictOfInterestAnalysisProps
} from '@client/types/conflict-of-interest';
