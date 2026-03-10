/**
 * Government Data Feature Types
 * Complete TypeScript definitions for government data management
 */

// ==========================================================================
// Core Data Types
// ==========================================================================

export interface GovernmentData {
  id: number;
  data_type: string;
  source: string;
  external_id?: string;
  title?: string;
  content: any;
  metadata?: any;
  status?: string;
  published_date?: Date;
  effective_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface GovernmentSyncLog {
  id: number;
  source: string;
  operation: string;
  status: 'success' | 'error' | 'partial';
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_details?: any;
  metadata?: any;
  created_at: Date;
}

// ==========================================================================
// Query & Filter Types
// ==========================================================================

export interface GovernmentDataQueryOptions {
  dataType?: string;
  source?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'data_type' | 'source';
  sortOrder?: 'asc' | 'desc';
}

export interface GovernmentDataFilters {
  dataType?: string;
  source?: string;
  status?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  search?: string;
}

// ==========================================================================
// API Request/Response Types
// ==========================================================================

export interface GovernmentDataCreateInput {
  data_type: string;
  source: string;
  external_id?: string;
  title?: string;
  content: any;
  metadata?: any;
  status?: string;
  published_date?: Date;
  effective_date?: Date;
}

export interface GovernmentDataUpdateInput {
  title?: string;
  content?: any;
  metadata?: any;
  status?: string;
  published_date?: Date;
  effective_date?: Date;
}

export interface GovernmentDataListResponse {
  success: boolean;
  data: GovernmentData[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface GovernmentDataResponse {
  success: boolean;
  data: GovernmentData;
}

export interface GovernmentDataMetadata {
  dataTypes: string[];
  sources: string[];
  statistics: {
    total: number;
    byDataType: Record<string, number>;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

// ==========================================================================
// Sync Types
// ==========================================================================

export interface SyncTriggerOptions {
  sources?: string[];
  since?: Date;
  dryRun?: boolean;
  maxRecords?: number;
}

export interface SyncStatus {
  status: 'initiated' | 'running' | 'completed' | 'failed';
  timestamp: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

// ==========================================================================
// Health Check Types
// ==========================================================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    cache: boolean;
    externalAPIs: boolean;
  };
  lastSync: Date | null;
  totalRecords: number;
}

// ==========================================================================
// UI Component Types
// ==========================================================================

export interface GovernmentDataCardProps {
  data: GovernmentData;
  onView?: (data: GovernmentData) => void;
  onEdit?: (data: GovernmentData) => void;
  onDelete?: (data: GovernmentData) => void;
  showActions?: boolean;
  compact?: boolean;
}

export interface GovernmentDataListProps {
  filters?: GovernmentDataFilters;
  onFiltersChange?: (filters: GovernmentDataFilters) => void;
  onDataSelect?: (data: GovernmentData) => void;
  selectable?: boolean;
  showActions?: boolean;
  pageSize?: number;
}

export interface GovernmentDataDetailProps {
  dataId: number;
  onEdit?: (data: GovernmentData) => void;
  onDelete?: (data: GovernmentData) => void;
  showActions?: boolean;
}

export interface SyncLogViewerProps {
  source?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// ==========================================================================
// Form Types
// ==========================================================================

export interface GovernmentDataFormData {
  data_type: string;
  source: string;
  external_id?: string;
  title?: string;
  content: string; // JSON string for form handling
  metadata?: string; // JSON string for form handling
  status?: string;
  published_date?: string; // ISO string for form handling
  effective_date?: string; // ISO string for form handling
}

export interface GovernmentDataFormProps {
  initialData?: GovernmentData;
  onSubmit: (data: GovernmentDataFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

// ==========================================================================
// Search & Discovery Types
// ==========================================================================

export interface SearchOptions {
  query: string;
  dataTypes?: string[];
  sources?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  limit?: number;
}

export interface SearchResult {
  data: GovernmentData[];
  total: number;
  facets: {
    dataTypes: Array<{ value: string; count: number }>;
    sources: Array<{ value: string; count: number }>;
    statuses: Array<{ value: string; count: number }>;
  };
}

// ==========================================================================
// Analytics Types
// ==========================================================================

export interface DataAnalytics {
  totalRecords: number;
  recordsThisMonth: number;
  recordsThisWeek: number;
  topDataTypes: Array<{ type: string; count: number; percentage: number }>;
  topSources: Array<{ source: string; count: number; percentage: number }>;
  statusDistribution: Array<{ status: string; count: number; percentage: number }>;
  syncHealth: {
    lastSync: Date | null;
    successRate: number;
    averageRecordsPerSync: number;
    failureReasons: Array<{ reason: string; count: number }>;
  };
}

// ==========================================================================
// Error Types
// ==========================================================================

export interface GovernmentDataError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export type GovernmentDataErrorCode = 
  | 'FETCH_FAILED'
  | 'CREATE_FAILED'
  | 'UPDATE_FAILED'
  | 'DELETE_FAILED'
  | 'NOT_FOUND'
  | 'INVALID_ID'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'SYNC_FAILED'
  | 'HEALTH_CHECK_FAILED'
  | 'INTERNAL_ERROR';

// ==========================================================================
// Utility Types
// ==========================================================================

export type GovernmentDataSortField = 'created_at' | 'updated_at' | 'data_type' | 'source' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: GovernmentDataSortField;
  order: SortOrder;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

// ==========================================================================
// Constants
// ==========================================================================

export const GOVERNMENT_DATA_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft',
  ARCHIVED: 'archived',
  PENDING: 'pending',
} as const;

export const SYNC_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PARTIAL: 'partial',
} as const;

export const DATA_TYPES = {
  BILL: 'bill',
  REGULATION: 'regulation',
  POLICY: 'policy',
  REPORT: 'report',
  ANNOUNCEMENT: 'announcement',
  MEETING_MINUTES: 'meeting_minutes',
  BUDGET: 'budget',
  PROCUREMENT: 'procurement',
} as const;

export const SOURCES = {
  PARLIAMENT_KENYA: 'parliament-kenya',
  KENYA_LAW: 'kenya-law',
  MZALENDO: 'mzalendo',
  COUNTY_GOVERNMENT: 'county-government',
  JUDICIARY: 'judiciary',
  TREASURY: 'treasury',
} as const;

export type GovernmentDataStatus = typeof GOVERNMENT_DATA_STATUS[keyof typeof GOVERNMENT_DATA_STATUS];
export type SyncLogStatus = typeof SYNC_STATUS[keyof typeof SYNC_STATUS];
export type DataType = typeof DATA_TYPES[keyof typeof DATA_TYPES];
export type Source = typeof SOURCES[keyof typeof SOURCES];