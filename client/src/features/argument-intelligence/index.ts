/**
 * Argument Intelligence Feature
 * 
 * Exports all argument intelligence components, hooks, and types.
 */

// Types
export type {
  Argument,
  Claim,
  Evidence,
  ArgumentCluster,
  SentimentData,
  QualityMetrics,
  PositionTracking,
  ArgumentStatistics,
  ArgumentMapNode,
  ArgumentMapEdge,
  ArgumentMap,
  ArgumentFilters,
  ArgumentSearchResult,
} from './types';

// API
export * as argumentIntelligenceApi from './api/argument-intelligence-api';

// Hooks
export { useArgumentIntelligence } from './hooks/useArgumentIntelligence';

// UI Components
export { ArgumentIntelligenceDashboard } from './ui/ArgumentIntelligenceDashboard';
export { ArgumentIntelligenceWidget } from './ui/ArgumentIntelligenceWidget';
export { ArgumentClusterDisplay } from './ui/ArgumentClusterDisplay';
export { SentimentHeatmap } from './ui/SentimentHeatmap';
export { QualityMetricsDisplay } from './ui/QualityMetricsDisplay';
export { PositionTrackingChart } from './ui/PositionTrackingChart';
export { ArgumentFilters } from './ui/ArgumentFilters';
