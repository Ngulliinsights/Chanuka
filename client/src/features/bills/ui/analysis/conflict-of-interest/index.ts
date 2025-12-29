/**
 * Conflict of Interest Components - Export Index
 * 
 * Centralized exports for all conflict of interest analysis components.
 */

export { ConflictOfInterestAnalysis } from './ConflictOfInterestAnalysis';
export { ConflictNetworkVisualization } from './ConflictNetworkVisualization';
export { FinancialExposureTracker } from './FinancialExposureTracker';
export { TransparencyScoring } from './TransparencyScoring';
export { HistoricalPatternAnalysis } from './HistoricalPatternAnalysis';
export { ImplementationWorkaroundsTracker } from './ImplementationWorkaroundsTracker';

// Re-export types for convenience
export type {
  ConflictAnalysis,
  FinancialInterest,
  OrganizationalConnection,
  VotingPattern,
  TransparencyScore,
  NetworkNode,
  NetworkLink,
  NetworkData,
  ImplementationWorkaround,
  ConflictVisualizationProps,
  AccessibilityFallbackData
} from '@client/features/analysis/types';

export type { ConflictOfInterestAnalysisProps } from './ConflictOfInterestAnalysis';