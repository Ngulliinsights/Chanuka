/**
 * Privacy Feature - Validation Schemas
 * 
 * Zod schemas for validating privacy-related inputs (GDPR compliance, data export, etc.)
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// PRIVACY PREFERENCES SCHEMAS
// ============================================================================

const DataProcessingPreferencesSchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
  research: z.boolean(),
  personalization: z.boolean(),
});

const DataSharingPreferencesSchema = z.object({
  publicProfile: z.boolean(),
  shareEngagement: z.boolean(),
  shareComments: z.boolean(),
  shareVotingHistory: z.boolean(),
});

const DataRetentionPreferencesSchema = z.object({
  keepComments: z.boolean(),
  keepEngagementHistory: z.boolean(),
  keepNotifications: z.boolean(),
  retentionPeriodMonths: z.number().int().min(1).max(120),
});

const CommunicationsPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  marketingEmails: z.boolean(),
});

const CookiePreferencesSchema = z.object({
  essential: z.boolean().default(true), // Always true
  analytics: z.boolean(),
  marketing: z.boolean(),
  preferences: z.boolean(),
});

export const PrivacyPreferencesSchema = z.object({
  dataProcessing: DataProcessingPreferencesSchema,
  dataSharing: DataSharingPreferencesSchema,
  dataRetention: DataRetentionPreferencesSchema,
  communications: CommunicationsPreferencesSchema,
  cookies: CookiePreferencesSchema,
});

// ============================================================================
// DATA EXPORT SCHEMAS
// ============================================================================

export const ExportUserDataSchema = z.object({
  user_id: CommonSchemas.id,
  requestedBy: CommonSchemas.id,
  format: z.enum(['json', 'csv', 'xml']).default('json'),
  includeDeleted: z.boolean().default(false),
});

export const GetExportStatusSchema = z.object({
  exportId: CommonSchemas.id,
});

// ============================================================================
// DATA DELETION SCHEMAS
// ============================================================================

export const RequestDataDeletionSchema = z.object({
  user_id: CommonSchemas.id,
  reason: z.string().max(500).optional(),
  deleteImmediately: z.boolean().default(false),
});

export const GetDeletionStatusSchema = z.object({
  deletionRequestId: CommonSchemas.id,
});

// ============================================================================
// PRIVACY PREFERENCES MANAGEMENT SCHEMAS
// ============================================================================

export const GetPrivacyPreferencesSchema = z.object({
  user_id: CommonSchemas.id,
});

export const UpdatePrivacyPreferencesSchema = z.object({
  user_id: CommonSchemas.id,
  preferences: PrivacyPreferencesSchema.partial(),
});

// ============================================================================
// CONSENT MANAGEMENT SCHEMAS
// ============================================================================

export const RecordConsentSchema = z.object({
  user_id: CommonSchemas.id,
  consentType: z.enum(['terms', 'privacy', 'marketing', 'analytics', 'cookies']),
  granted: z.boolean(),
  version: z.string().max(20),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
});

export const GetConsentHistorySchema = z.object({
  user_id: CommonSchemas.id,
  consentType: z.enum(['terms', 'privacy', 'marketing', 'analytics', 'cookies']).optional(),
});

// ============================================================================
// DATA RETENTION SCHEMAS
// ============================================================================

export const GetRetentionPoliciesSchema = z.object({
  dataType: z.string().max(100).optional(),
  activeOnly: z.boolean().default(true),
});

export const RunDataCleanupSchema = z.object({
  dataType: z.string().max(100).optional(),
  dryRun: z.boolean().default(false),
});

// ============================================================================
// GDPR COMPLIANCE SCHEMAS
// ============================================================================

export const GetComplianceReportSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  includeMetrics: z.boolean().default(true),
});

export const VerifyComplianceSchema = z.object({
  user_id: CommonSchemas.id,
  checkType: z.enum(['data_export', 'data_deletion', 'consent', 'preferences', 'all']).default('all'),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ExportUserDataInput = z.infer<typeof ExportUserDataSchema>;
export type GetExportStatusInput = z.infer<typeof GetExportStatusSchema>;
export type RequestDataDeletionInput = z.infer<typeof RequestDataDeletionSchema>;
export type GetDeletionStatusInput = z.infer<typeof GetDeletionStatusSchema>;
export type GetPrivacyPreferencesInput = z.infer<typeof GetPrivacyPreferencesSchema>;
export type UpdatePrivacyPreferencesInput = z.infer<typeof UpdatePrivacyPreferencesSchema>;
export type RecordConsentInput = z.infer<typeof RecordConsentSchema>;
export type GetConsentHistoryInput = z.infer<typeof GetConsentHistorySchema>;
export type GetRetentionPoliciesInput = z.infer<typeof GetRetentionPoliciesSchema>;
export type RunDataCleanupInput = z.infer<typeof RunDataCleanupSchema>;
export type GetComplianceReportInput = z.infer<typeof GetComplianceReportSchema>;
export type VerifyComplianceInput = z.infer<typeof VerifyComplianceSchema>;
export type PrivacyPreferences = z.infer<typeof PrivacyPreferencesSchema>;
