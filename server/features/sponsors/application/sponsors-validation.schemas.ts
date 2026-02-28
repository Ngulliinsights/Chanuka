/**
 * Sponsors Feature - Validation Schemas
 * 
 * Zod schemas for validating sponsor-related inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Sponsor Type and Affiliation Enums
// ============================================================================

export const SponsorTypeSchema = z.enum([
  'individual',
  'organization',
  'corporation',
  'pac',
  'super_pac',
  'nonprofit',
  'government'
]);

export const AffiliationTypeSchema = z.enum([
  'employment',
  'board_member',
  'consultant',
  'donor',
  'lobbyist',
  'family',
  'other'
]);

export const ConflictSeveritySchema = z.enum([
  'none',
  'low',
  'medium',
  'high',
  'critical'
]);

// ============================================================================
// Sponsor Creation and Update Schemas
// ============================================================================

export const CreateSponsorSchema = z.object({
  name: CommonSchemas.name,
  type: SponsorTypeSchema,
  description: CommonSchemas.description.optional(),
  website: CommonSchemas.url.optional(),
  contact_email: CommonSchemas.email.optional(),
  contact_phone: CommonSchemas.phone.optional(),
  address: z.string().max(500).optional(),
  industry: z.string().max(100).optional(),
  annual_revenue: z.number().positive().optional(),
  employee_count: z.number().int().positive().optional(),
});

export const UpdateSponsorSchema = z.object({
  name: CommonSchemas.name.optional(),
  type: SponsorTypeSchema.optional(),
  description: CommonSchemas.description.optional(),
  website: CommonSchemas.url.optional(),
  contact_email: CommonSchemas.email.optional(),
  contact_phone: CommonSchemas.phone.optional(),
  address: z.string().max(500).optional(),
  industry: z.string().max(100).optional(),
  annual_revenue: z.number().positive().optional(),
  employee_count: z.number().int().positive().optional(),
});

// ============================================================================
// Affiliation Schemas
// ============================================================================

export const CreateAffiliationSchema = z.object({
  sponsor_id: CommonSchemas.id,
  entity_id: CommonSchemas.id,
  entity_type: z.enum(['user', 'organization', 'bill']),
  affiliation_type: AffiliationTypeSchema,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().max(1000).optional(),
  financial_amount: z.number().nonnegative().optional(),
  is_disclosed: z.boolean().default(true),
});

export const UpdateAffiliationSchema = z.object({
  affiliation_type: AffiliationTypeSchema.optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().max(1000).optional(),
  financial_amount: z.number().nonnegative().optional(),
  is_disclosed: z.boolean().optional(),
});

// ============================================================================
// Conflict Analysis Schemas
// ============================================================================

export const AnalyzeConflictsSchema = z.object({
  bill_id: CommonSchemas.id,
  sponsor_id: CommonSchemas.id.optional(),
  include_indirect: z.boolean().default(true),
  severity_threshold: ConflictSeveritySchema.default('low'),
});

export const GetConflictMappingSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  sponsor_id: CommonSchemas.id.optional(),
  severity: ConflictSeveritySchema.optional(),
  include_resolved: z.boolean().default(false),
});

export const ReportConflictSchema = z.object({
  bill_id: CommonSchemas.id,
  sponsor_id: CommonSchemas.id,
  conflict_type: z.enum(['financial', 'employment', 'family', 'political', 'other']),
  description: z.string().min(20).max(2000),
  evidence: z.array(z.object({
    type: z.enum(['document', 'link', 'citation']),
    source: z.string().max(500),
    description: z.string().max(500),
  })).min(1).max(10),
  severity: ConflictSeveritySchema,
});

// ============================================================================
// Transparency and Disclosure Schemas
// ============================================================================

export const CreateDisclosureSchema = z.object({
  sponsor_id: CommonSchemas.id,
  disclosure_type: z.enum(['financial', 'affiliation', 'lobbying', 'donation', 'other']),
  amount: z.number().nonnegative().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(2000),
  source: z.string().max(500).optional(),
  is_verified: z.boolean().default(false),
});

export const GetTransparencyScoreSchema = z.object({
  sponsor_id: CommonSchemas.id,
  include_history: z.boolean().default(false),
});

// ============================================================================
// Query and Filter Schemas
// ============================================================================

export const SearchSponsorsSchema = z.object({
  query: CommonSchemas.searchQuery,
  type: SponsorTypeSchema.optional(),
  industry: z.string().max(100).optional(),
  min_revenue: z.number().positive().optional(),
  max_revenue: z.number().positive().optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const GetSponsorsByBillSchema = z.object({
  bill_id: CommonSchemas.id,
  include_indirect: z.boolean().default(false),
});

export const GetBillsBySponsorSchema = z.object({
  sponsor_id: CommonSchemas.id,
  status: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const GetSponsorInfluenceSchema = z.object({
  sponsor_id: CommonSchemas.id,
  timeframe: z.enum(['month', 'quarter', 'year', 'all']).default('year'),
  include_indirect: z.boolean().default(true),
});

export const GetSponsorNetworkSchema = z.object({
  sponsor_id: CommonSchemas.id,
  depth: z.number().int().positive().max(3).default(1),
  min_connection_strength: z.number().min(0).max(1).default(0.3),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateSponsorInput = z.infer<typeof CreateSponsorSchema>;
export type UpdateSponsorInput = z.infer<typeof UpdateSponsorSchema>;
export type CreateAffiliationInput = z.infer<typeof CreateAffiliationSchema>;
export type UpdateAffiliationInput = z.infer<typeof UpdateAffiliationSchema>;
export type AnalyzeConflictsInput = z.infer<typeof AnalyzeConflictsSchema>;
export type GetConflictMappingInput = z.infer<typeof GetConflictMappingSchema>;
export type ReportConflictInput = z.infer<typeof ReportConflictSchema>;
export type CreateDisclosureInput = z.infer<typeof CreateDisclosureSchema>;
export type GetTransparencyScoreInput = z.infer<typeof GetTransparencyScoreSchema>;
export type SearchSponsorsInput = z.infer<typeof SearchSponsorsSchema>;
export type GetSponsorsByBillInput = z.infer<typeof GetSponsorsByBillSchema>;
export type GetBillsBySponsorInput = z.infer<typeof GetBillsBySponsorSchema>;
export type GetSponsorInfluenceInput = z.infer<typeof GetSponsorInfluenceSchema>;
export type GetSponsorNetworkInput = z.infer<typeof GetSponsorNetworkSchema>;
export type SponsorType = z.infer<typeof SponsorTypeSchema>;
export type AffiliationType = z.infer<typeof AffiliationTypeSchema>;
export type ConflictSeverity = z.infer<typeof ConflictSeveritySchema>;
