/**
 * Government Data API Contracts
 * Request/response types for government data endpoints
 */

import { ApiResponse, BaseQueryParams, HealthCheckResponse, HealthStatus, MetadataResponse, SyncResponse } from './core.contracts';

// Government Data Entity
export interface GovernmentData {
  id: string;
  dataType: GovernmentDataType;
  source: GovernmentDataSource;
  title: string;
  content: Record<string, any>;
  metadata: GovernmentDataMetadata;
  status: GovernmentDataStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface GovernmentDataMetadata {
  originalId?: string;
  url?: string;
  publishedDate?: string;
  lastModified?: string;
  version?: string;
  language?: string;
  format?: string;
  size?: number;
  checksum?: string;
}

// Enums
export enum GovernmentDataType {
  BILL = 'bill',
  REGULATION = 'regulation',
  POLICY = 'policy',
  REPORT = 'report',
  BUDGET = 'budget',
  HANSARD = 'hansard',
  COMMITTEE_REPORT = 'committee_report',
  LEGAL_NOTICE = 'legal_notice'
}

export enum GovernmentDataSource {
  PARLIAMENT_KENYA = 'parliament_kenya',
  SENATE_KENYA = 'senate_kenya',
  COUNTY_ASSEMBLY = 'county_assembly',
  MINISTRY = 'ministry',
  JUDICIARY = 'judiciary',
  TREASURY = 'treasury',
  EXTERNAL_API = 'external_api'
}

export enum GovernmentDataStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
  PENDING = 'pending',
  PROCESSING = 'processing',
  ERROR = 'error'
}

// Query Parameters
export interface GovernmentDataQueryParams extends BaseQueryParams {
  dataType?: GovernmentDataType;
  source?: GovernmentDataSource;
  status?: GovernmentDataStatus;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  hasContent?: boolean;
}

// Request Types
export interface CreateGovernmentDataRequest {
  dataType: GovernmentDataType;
  source: GovernmentDataSource;
  title: string;
  content: Record<string, any>;
  metadata?: Partial<GovernmentDataMetadata>;
  tags?: string[];
  status?: GovernmentDataStatus;
}

export interface UpdateGovernmentDataRequest {
  title?: string;
  content?: Record<string, any>;
  metadata?: Partial<GovernmentDataMetadata>;
  tags?: string[];
  status?: GovernmentDataStatus;
}

export interface BulkUpdateRequest {
  ids: string[];
  updates: Partial<UpdateGovernmentDataRequest>;
}

// Response Types
export interface GovernmentDataResponse extends ApiResponse<GovernmentData> {}

export interface GovernmentDataListResponse extends ApiResponse<GovernmentData[]> {}

export interface GovernmentDataCountResponse extends ApiResponse<{ count: number }> {}

export interface GovernmentDataStatsResponse extends ApiResponse<{
  totalRecords: number;
  byType: Record<GovernmentDataType, number>;
  bySource: Record<GovernmentDataSource, number>;
  byStatus: Record<GovernmentDataStatus, number>;
  recentActivity: {
    created: number;
    updated: number;
    synced: number;
  };
}> {}

export interface GovernmentDataHealthResponse extends Omit<HealthCheckResponse, 'checks'> {
  checks: {
    database: HealthStatus;
    cache: HealthStatus;
    externalApis: {
      parliamentKenya: HealthStatus;
      senateKenya: HealthStatus;
      countyAssemblies: HealthStatus;
    };
  };
}

export interface GovernmentDataMetadataResponse extends MetadataResponse<{
  dataTypes: GovernmentDataType[];
  sources: GovernmentDataSource[];
  statuses: GovernmentDataStatus[];
  requiredFields: string[];
  optionalFields: string[];
}> {}

export interface GovernmentDataSyncResponse extends SyncResponse {
  source?: GovernmentDataSource;
  dataType?: GovernmentDataType;
  newRecords?: number;
  updatedRecords?: number;
  errorRecords?: number;
}