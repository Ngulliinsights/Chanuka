/**
 * Features analytics type declarations
 */

export interface AnalyticsEvent {
  name: string;
  properties: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
}

export interface AnalyticsDashboard {
  metrics: AnalyticsMetric[];
  events: AnalyticsEvent[];
  insights: string[];
  period: {
    start: string;
    end: string;
  };
}
