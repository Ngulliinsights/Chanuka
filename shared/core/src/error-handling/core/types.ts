export interface ErrorContext {
  traceId?: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: any;
  params?: any;
  endpoint?: string;
  currentAvg?: number;
  baselineAvg?: number;
  regressionPercent?: number;
}

export interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'database' | 'authentication' | 'validation' | 'external_api' | 'system' | 'business_logic';
  timestamp: Date;
  context: ErrorContext;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  fingerprint: string; // For grouping similar errors
}

export interface ErrorPattern {
  fingerprint: string;
  message: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
  alertSent: boolean;
  alertThreshold: number;
}

export type ErrorType = 'javascript' | 'network' | 'chunk' | 'timeout' | 'memory' | 'security' | 'unknown';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorContextType = 'page' | 'component' | 'api' | 'navigation' | 'authentication' | 'data-loading';