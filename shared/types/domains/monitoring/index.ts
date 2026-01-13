/**
 * Monitoring Domain Types
 * Standardized monitoring types following the exemplary pattern
 */

export * from './metrics';
export * from './performance';
export * from './errors';

// Explicitly re-export conflicting types to resolve ambiguity
export type { PerformanceTraceId } from './performance';
export type { ErrorEventId } from './errors';

/**
 * Monitoring domain version and metadata
 */
export const MONITORING_DOMAIN_VERSION = '1.0.0' as const;
export const MONITORING_DOMAIN_DESCRIPTION = 'Standardized monitoring and analytics system types' as const;

/**
 * Monitoring domain features
 */
export const MONITORING_FEATURES = {
  metrics: true,
  performanceMonitoring: true,
  errorAnalytics: true,
  webVitals: true,
  rum: true,
  slaMonitoring: true,
  errorAlerting: true,
  trendAnalysis: true,
} as const;