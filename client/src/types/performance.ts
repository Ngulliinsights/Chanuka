export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB';
  value: number;
  timestamp: Date;
  navigationType?: 'navigate' | 'reload' | 'back_forward' | 'prerender';
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  entries: PerformanceEntry[];
  id: string;
}

export interface PerformanceBudget {
  metric: string;
  budget: number;
  unit: 'ms' | 'bytes' | 'score' | 'count';
  operator: 'lessThan' | 'greaterThan' | 'equal';
  category?: string;
  resourceType?: 'script' | 'stylesheet' | 'image' | 'font' | 'document' | 'other';
}

export interface BudgetCheckResult {
  budget: PerformanceBudget;
  actual: number;
  passed: boolean;
  difference: number;
  percentage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceReport {
  id: string;
  timestamp: Date;
  url: string;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  connectionType?: string;
  webVitals: WebVitalsMetric[];
  budgets: BudgetCheckResult[];
  resources: ResourceTiming[];
  navigation: NavigationTiming;
  paint: PaintTiming[];
  memory?: MemoryInfo;
  overallScore: number;
  recommendations: PerformanceRecommendation[];
  metadata: Record<string, any>;
}

export interface ResourceTiming {
  name: string;
  initiatorType: string;
  duration: number;
  startTime: number;
  responseEnd: number;
  transferSize: number;
  decodedBodySize: number;
  encodedBodySize: number;
  nextHopProtocol?: string;
  serverTiming?: ServerTiming[];
}

export interface NavigationTiming {
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  secureConnectionStart?: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  domInteractive: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  domComplete: number;
  loadEventStart: number;
  loadEventEnd: number;
  unloadEventStart?: number;
  unloadEventEnd?: number;
}

export interface PaintTiming {
  name: 'first-paint' | 'first-contentful-paint';
  startTime: number;
  duration?: number;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface ServerTiming {
  name: string;
  duration?: number;
  description?: string;
}

export interface PerformanceRecommendation {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  category: string;
  resources?: string[];
  code?: string;
}

export interface PerformanceThreshold {
  metric: string;
  good: number;
  poor: number;
  unit: string;
}

export interface PerformanceAlert {
  id: string;
  type: 'budget-exceeded' | 'metric-degraded' | 'anomaly-detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric?: string;
  threshold?: number;
  actual?: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface PerformanceTrend {
  metric: string;
  period: 'hour' | 'day' | 'week' | 'month';
  data: TrendDataPoint[];
  trend: 'improving' | 'degrading' | 'stable';
  changePercent: number;
  average: number;
  min: number;
  max: number;
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  count?: number;
}

export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number;
  budgets: PerformanceBudget[];
  thresholds: PerformanceThreshold[];
  alerts: boolean;
  realTimeMonitoring: boolean;
  reportEndpoint?: string;
  excludedUrls?: string[];
  customMetrics?: string[];
}

export interface PerformanceObserverEntry {
  entryType: string;
  name: string;
  startTime: number;
  duration: number;
  toJSON: () => any;
}

export interface PerformanceMark extends PerformanceObserverEntry {
  entryType: 'mark';
  detail?: any;
}

export interface PerformanceMeasure extends PerformanceObserverEntry {
  entryType: 'measure';
  detail?: any;
}