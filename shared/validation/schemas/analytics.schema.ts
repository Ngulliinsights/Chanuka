/**
 * Analytics Validation Schemas
 * Zod schemas for validating analytics API responses and data
 */

import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

export const analyticsEventSchema = z.object({
  id: z.string(),
  type: z.enum(['track', 'page_view', 'user_action', 'performance', 'error']),
  category: z.string(),
  action: z.string(),
  label: z.string().optional(),
  value: z.number().optional(),
  timestamp: z.string().datetime(),
  sessionId: z.string(),
  userId: z.string().optional(),
  anonymized: z.boolean(),
  consentGiven: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
});

export const userConsentSchema = z.object({
  analytics: z.boolean(),
  performance: z.boolean(),
  functional: z.boolean(),
  timestamp: z.string().datetime(),
  version: z.string(),
});

export const analyticsMetricsSchema = z.object({
  totalEvents: z.number().int().nonnegative(),
  anonymizedEvents: z.number().int().nonnegative(),
  consentedEvents: z.number().int().nonnegative(),
  categoriesTracked: z.array(z.string()),
  retentionCompliance: z.boolean(),
  lastFlush: z.string().datetime(),
  queueSize: z.number().int().nonnegative(),
  failedSends: z.number().int().nonnegative(),
  circuitBreakerOpen: z.boolean(),
});

// ============================================================================
// Bill Analysis Schemas
// ============================================================================

export const stakeholderImpactSchema = z.object({
  group: z.string(),
  impactLevel: z.enum(['high', 'medium', 'low']),
  description: z.string(),
  affectedPopulation: z.number().int().nonnegative(),
});

export const corporateConnectionSchema = z.object({
  organization: z.string(),
  connectionType: z.enum(['financial', 'advisory', 'employment']),
  influenceLevel: z.number().int().min(1).max(10),
  potentialConflict: z.boolean(),
});

export const billAnalysisSchema = z.object({
  id: z.string(),
  bill_id: z.number().int().positive(),
  conflictScore: z.number().int().min(0).max(100),
  transparencyRating: z.number().int().min(0).max(100),
  stakeholderAnalysis: z.array(stakeholderImpactSchema),
  constitutionalConcerns: z.array(z.string()),
  publicBenefit: z.number().int().min(0).max(100),
  corporateInfluence: z.array(corporateConnectionSchema),
  timestamp: z.union([z.string().datetime(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

// ============================================================================
// Data Export/Deletion Schemas
// ============================================================================

export const exportedUserDataSchema = z.object({
  events: z.array(analyticsEventSchema),
  summary: analyticsMetricsSchema,
  consent: userConsentSchema.nullable(),
  exportDate: z.string().datetime(),
});

export const dataExportResponseSchema = z.object({
  success: z.boolean(),
  data: z.record(z.unknown()).optional(),
  format: z.string(),
  exportedAt: z.string().datetime(),
});

export const dataDeletionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedAt: z.string().datetime(),
});

// ============================================================================
// Offline Analytics Schemas
// ============================================================================

export const offlineEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    'page_view',
    'user_action',
    'api_error',
    'sync_error',
    'connection_change',
    'cache_hit',
    'cache_miss',
    'performance_metric',
    'visibility_change',
  ]),
  timestamp: z.number().int().positive(),
  data: z.record(z.unknown()),
  userAgent: z.string(),
  url: z.string().url(),
  session_id: z.string(),
  connectionType: z.string().optional(),
  isOffline: z.boolean(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
export type UserConsent = z.infer<typeof userConsentSchema>;
export type AnalyticsMetrics = z.infer<typeof analyticsMetricsSchema>;
export type BillAnalysis = z.infer<typeof billAnalysisSchema>;
export type StakeholderImpact = z.infer<typeof stakeholderImpactSchema>;
export type CorporateConnection = z.infer<typeof corporateConnectionSchema>;
export type ExportedUserData = z.infer<typeof exportedUserDataSchema>;
export type DataExportResponse = z.infer<typeof dataExportResponseSchema>;
export type DataDeletionResponse = z.infer<typeof dataDeletionResponseSchema>;
export type OfflineEvent = z.infer<typeof offlineEventSchema>;
