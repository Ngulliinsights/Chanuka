/**
 * Government Data Domain Entity
 * Core business object representing government data
 */

export interface GovernmentDataEntity {
  id: number;
  dataType: string;
  source: string;
  externalId?: string;
  title?: string;
  content: any;
  metadata?: any;
  status?: string;
  publishedDate?: Date;
  effectiveDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GovernmentSyncLogEntity {
  id: number;
  source: string;
  operation: string;
  status: 'success' | 'error' | 'partial';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errorDetails?: any;
  metadata?: any;
  createdAt: Date;
}

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

export interface GovernmentDataCreateInput {
  dataType: string;
  source: string;
  externalId?: string;
  title?: string;
  content: any;
  metadata?: any;
  status?: string;
  publishedDate?: Date;
  effectiveDate?: Date;
}

export interface GovernmentDataUpdateInput {
  title?: string;
  content?: any;
  metadata?: any;
  status?: string;
  publishedDate?: Date;
  effectiveDate?: Date;
}

export interface SyncLogCreateInput {
  source: string;
  operation: string;
  status: 'success' | 'error' | 'partial';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errorDetails?: any;
  metadata?: any;
}