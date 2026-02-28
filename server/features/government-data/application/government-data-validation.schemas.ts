/**
 * Government Data Feature - Validation Schemas
 * 
 * Zod schemas for validating government data access and integration.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Data Source and Type Enums
// ============================================================================

export const DataSourceSchema = z.enum([
  'congress_gov',
  'govtrack',
  'propublica',
  'opensecrets',
  'fec',
  'census',
  'bls',
  'gao',
  'cbo',
  'state_legislature',
  'local_government'
]);

export const DataTypeSchema = z.enum([
  'legislation',
  'voting_records',
  'financial_disclosures',
  'campaign_finance',
  'demographics',
  'economic',
  'budget',
  'reports',
  'hearings',
  'amendments'
]);

export const SyncStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'partial'
]);

// ============================================================================
// Data Fetch Schemas
// ============================================================================

export const FetchLegislationSchema = z.object({
  source: DataSourceSchema,
  congress_number: z.number().int().positive().max(200).optional(),
  bill_type: z.enum(['hr', 'hres', 'hjres', 'hconres', 's', 'sres', 'sjres', 'sconres']).optional(),
  bill_number: z.number().int().positive().optional(),
  status: z.string().max(50).optional(),
  updated_since: z.string().datetime().optional(),
  limit: CommonSchemas.limit.optional(),
});

export const FetchVotingRecordsSchema = z.object({
  source: DataSourceSchema,
  legislator_id: z.string().max(100).optional(),
  congress_number: z.number().int().positive().max(200).optional(),
  chamber: z.enum(['house', 'senate', 'both']).default('both'),
  vote_type: z.enum(['passage', 'amendment', 'procedural', 'all']).default('all'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: CommonSchemas.limit.optional(),
});

export const FetchFinancialDataSchema = z.object({
  source: DataSourceSchema,
  entity_type: z.enum(['legislator', 'candidate', 'committee', 'organization']),
  entity_id: z.string().max(100),
  data_type: z.enum(['contributions', 'expenditures', 'disclosures', 'all']).default('all'),
  cycle: z.string().regex(/^\d{4}$/).optional(), // Year format
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Data Sync Schemas
// ============================================================================

export const SyncDataSourceSchema = z.object({
  source: DataSourceSchema,
  data_types: z.array(DataTypeSchema).min(1).max(10),
  full_sync: z.boolean().default(false),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  schedule: z.object({
    frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'manual']),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format
    day_of_week: z.number().int().min(0).max(6).optional(), // 0 = Sunday
    day_of_month: z.number().int().min(1).max(31).optional(),
  }).optional(),
});

export const GetSyncStatusSchema = z.object({
  source: DataSourceSchema.optional(),
  data_type: DataTypeSchema.optional(),
  status: SyncStatusSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const TriggerSyncSchema = z.object({
  source: DataSourceSchema,
  data_types: z.array(DataTypeSchema).min(1).max(10),
  force: z.boolean().default(false),
});

// ============================================================================
// Data Query Schemas
// ============================================================================

export const QueryLegislationSchema = z.object({
  congress_number: z.number().int().positive().max(200).optional(),
  chamber: z.enum(['house', 'senate', 'both']).optional(),
  status: z.string().max(50).optional(),
  sponsor_id: z.string().max(100).optional(),
  subject: z.string().max(200).optional(),
  introduced_after: z.string().datetime().optional(),
  introduced_before: z.string().datetime().optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const QueryVotesSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  legislator_id: z.string().max(100).optional(),
  chamber: z.enum(['house', 'senate', 'both']).optional(),
  vote_result: z.enum(['passed', 'failed', 'all']).default('all'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const QueryFinancialRecordsSchema = z.object({
  entity_type: z.enum(['legislator', 'candidate', 'committee', 'organization']),
  entity_id: z.string().max(100).optional(),
  transaction_type: z.enum(['contribution', 'expenditure', 'all']).default('all'),
  min_amount: z.number().nonnegative().optional(),
  max_amount: z.number().nonnegative().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Data Enrichment Schemas
// ============================================================================

export const EnrichBillDataSchema = z.object({
  bill_id: CommonSchemas.id,
  sources: z.array(DataSourceSchema).min(1).max(5),
  data_types: z.array(DataTypeSchema).optional(),
  overwrite_existing: z.boolean().default(false),
});

export const EnrichLegislatorDataSchema = z.object({
  legislator_id: z.string().max(100),
  sources: z.array(DataSourceSchema).min(1).max(5),
  include_voting_history: z.boolean().default(true),
  include_financial_data: z.boolean().default(true),
  include_committee_assignments: z.boolean().default(true),
});

// ============================================================================
// Data Validation Schemas
// ============================================================================

export const ValidateDataSchema = z.object({
  source: DataSourceSchema,
  data_type: DataTypeSchema,
  record_id: z.string().max(200),
  validation_rules: z.array(z.enum([
    'completeness',
    'accuracy',
    'consistency',
    'timeliness'
  ])).optional(),
});

export const ReportDataIssueSchema = z.object({
  source: DataSourceSchema,
  data_type: DataTypeSchema,
  record_id: z.string().max(200),
  issue_type: z.enum(['missing', 'incorrect', 'outdated', 'duplicate', 'other']),
  description: z.string().min(20).max(2000),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const GetDataQualityMetricsSchema = z.object({
  source: DataSourceSchema.optional(),
  data_type: DataTypeSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  metrics: z.array(z.enum([
    'completeness',
    'accuracy',
    'timeliness',
    'consistency',
    'availability'
  ])).optional(),
});

export const GetSyncHistorySchema = z.object({
  source: DataSourceSchema.optional(),
  data_type: DataTypeSchema.optional(),
  status: SyncStatusSchema.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const GetDataCoverageSchema = z.object({
  source: DataSourceSchema.optional(),
  data_type: DataTypeSchema.optional(),
  timeframe: z.enum(['day', 'week', 'month', 'year', 'all']).default('all'),
});

// ============================================================================
// API Configuration Schemas
// ============================================================================

export const ConfigureAPISchema = z.object({
  source: DataSourceSchema,
  api_key: z.string().min(10).max(200).optional(),
  api_secret: z.string().min(10).max(200).optional(),
  base_url: CommonSchemas.url.optional(),
  rate_limit: z.number().int().positive().optional(),
  timeout: z.number().int().positive().max(300).optional(), // seconds
  retry_attempts: z.number().int().nonnegative().max(10).optional(),
});

export const TestAPIConnectionSchema = z.object({
  source: DataSourceSchema,
  endpoint: z.string().max(200).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type FetchLegislationInput = z.infer<typeof FetchLegislationSchema>;
export type FetchVotingRecordsInput = z.infer<typeof FetchVotingRecordsSchema>;
export type FetchFinancialDataInput = z.infer<typeof FetchFinancialDataSchema>;
export type SyncDataSourceInput = z.infer<typeof SyncDataSourceSchema>;
export type GetSyncStatusInput = z.infer<typeof GetSyncStatusSchema>;
export type TriggerSyncInput = z.infer<typeof TriggerSyncSchema>;
export type QueryLegislationInput = z.infer<typeof QueryLegislationSchema>;
export type QueryVotesInput = z.infer<typeof QueryVotesSchema>;
export type QueryFinancialRecordsInput = z.infer<typeof QueryFinancialRecordsSchema>;
export type EnrichBillDataInput = z.infer<typeof EnrichBillDataSchema>;
export type EnrichLegislatorDataInput = z.infer<typeof EnrichLegislatorDataSchema>;
export type ValidateDataInput = z.infer<typeof ValidateDataSchema>;
export type ReportDataIssueInput = z.infer<typeof ReportDataIssueSchema>;
export type GetDataQualityMetricsInput = z.infer<typeof GetDataQualityMetricsSchema>;
export type GetSyncHistoryInput = z.infer<typeof GetSyncHistorySchema>;
export type GetDataCoverageInput = z.infer<typeof GetDataCoverageSchema>;
export type ConfigureAPIInput = z.infer<typeof ConfigureAPISchema>;
export type TestAPIConnectionInput = z.infer<typeof TestAPIConnectionSchema>;
export type DataSource = z.infer<typeof DataSourceSchema>;
export type DataType = z.infer<typeof DataTypeSchema>;
export type SyncStatus = z.infer<typeof SyncStatusSchema>;
