// Common analytics types shared across all analytics modules

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PaginationParams {
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface AnalyticsMetadata {
  generatedAt: Date;
  dataSource: string;
  processingTime?: number;
  cacheHit?: boolean;
  version?: string;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  confidence: number;
  period: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: string[];
  recommendations: string[];
}

export interface CacheConfig {
  ttl: number;
  keyPrefix: string;
  enabled: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}