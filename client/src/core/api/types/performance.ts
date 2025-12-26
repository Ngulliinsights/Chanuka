export interface WebVitals {
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  lcp: number; // Largest Contentful Paint
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

export interface PerformanceBudget {
  [metric: string]: number; // Threshold values for various metrics
}

export interface BudgetCheckResult {
  passed: boolean;
  violations: Array<{
    metric: string;
    actual: number;
    threshold: number;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface ResourceTiming {
  name: string;
  startTime: number;
  duration: number;
  transferSize?: number;
  decodedBodySize?: number;
  initiatorType: string;
  nextHopProtocol?: string;
}

export interface PerformanceReport {
  timestamp: Date;
  url: string;
  vitals: WebVitals;
  budgetCheck: BudgetCheckResult;
  resources: ResourceTiming[];
  overallScore: number; // 0-100
}

export interface PerformanceRecommendation {
  id: string;
  type: 'optimization' | 'warning' | 'critical';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestions: string[];
}