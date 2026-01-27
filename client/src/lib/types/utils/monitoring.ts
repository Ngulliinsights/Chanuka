/**
 * Monitoring and analytics utility types
 */

// Performance utilities
export type PerformanceMetric = {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
};

// Analytics utilities
export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
};

export type PageView = {
  path: string;
  title?: string;
  referrer?: string;
  timestamp?: number;
};

// Feature flag utilities
export type FeatureFlag = {
  key: string;
  enabled: boolean;
  metadata?: Record<string, any>;
  rollout?: number; // Percentage 0-100
};
