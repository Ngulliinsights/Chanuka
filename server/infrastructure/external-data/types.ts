/**
 * Type definitions for external data integration
 */

export interface DataSource {
  id: string;
  name: string;
  type: 'government' | 'legislative' | 'financial' | 'voting';
  baseUrl: string;
  apiKey?: string;
  authType: 'none' | 'api_key' | 'oauth' | 'bearer';
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  endpoints: ApiEndpoint[];
  isActive: boolean;
  priority: number; // Higher number = higher priority for conflict resolution
  lastSync?: Date;
  healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown';
}

export interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  dataType: 'bills' | 'sponsors' | 'votes' | 'committees' | 'amendments';
  parameters?: Record<string, any>;
  responseFormat: 'json' | 'xml' | 'csv';
  cacheTtl: number; // Cache time-to-live in seconds
  syncFrequency: 'real-time' | 'hourly' | 'daily' | 'weekly';
}

export interface SyncJob {
  id: string;
  dataSourceId: string;
  endpointId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  recordsProcessed: number;
  recordsUpdated: number;
  recordsCreated: number;
  recordsSkipped: number;
  errors: SyncError[];
  nextRunTime?: Date;
  isIncremental: boolean;
  lastSyncTimestamp?: Date;
}

export interface SyncError {
  timestamp: Date;
  level: 'warning' | 'error' | 'critical';
  message: string;
  details?: any;
  recordId?: string;
  endpoint?: string;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidence: number; // 0-100
  dataQualityScore: number; // 0-100
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ConflictResolution {
  conflictId: string;
  dataType: string;
  recordId: string;
  sources: ConflictSource[];
  resolution: 'manual' | 'automatic' | 'pending';
  resolvedValue?: any;
  resolvedBy?: string;
  resolvedAt?: Date;
  confidence: number;
}

export interface ConflictSource {
  sourceId: string;
  sourceName: string;
  value: any;
  timestamp: Date;
  priority: number;
  confidence: number;
}

export interface ExternalDataConfig {
  dataSources: DataSource[];
  syncSchedule: {
    realTime: boolean;
    hourlyJobs: string[];
    dailyJobs: string[];
    weeklyJobs: string[];
  };
  validation: {
    enableStrictValidation: boolean;
    requiredFields: Record<string, string[]>;
    customValidators: Record<string, string>;
  };
  conflictResolution: {
    autoResolveThreshold: number;
    priorityWeights: Record<string, number>;
    manualReviewRequired: string[];
  };
  fallback: {
    enableFallback: boolean;
    cacheTimeout: number;
    maxRetries: number;
    retryDelay: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    source: string;
    timestamp: Date;
    requestId: string;
    rateLimit?: {
      remaining: number;
      resetTime: Date;
    };
  };
}

export interface BillData {
  billNumber: string;
  title: string;
  summary?: string;
  content?: string;
  status: string;
  introducedDate: Date;
  lastActionDate?: Date;
  sponsors: SponsorData[];
  committees?: string[];
  votes?: VoteData[];
  amendments?: AmendmentData[];
  tags?: string[];
  sourceUrl?: string;
  sourceId: string;
}

export interface SponsorData {
  id: string;
  name: string;
  party?: string;
  state?: string;
  district?: string;
  role: 'primary' | 'co-sponsor';
  sponsorshipDate: Date;
}

export interface VoteData {
  id: string;
  billId: string;
  date: Date;
  type: 'committee' | 'floor' | 'amendment';
  result: 'passed' | 'failed' | 'tabled';
  votes: {
    yes: number;
    no: number;
    abstain: number;
    present: number;
  };
  details?: any;
}

export interface AmendmentData {
  id: string;
  billId: string;
  title: string;
  description?: string;
  sponsor: string;
  status: string;
  introducedDate: Date;
  content?: string;
}

export interface DataSourceHealth {
  sourceId: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  uptime: number;
  issues: HealthIssue[];
}

export interface HealthIssue {
  type: 'connectivity' | 'rate_limit' | 'authentication' | 'data_quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}