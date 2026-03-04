/**
 * Sponsors Feature - Shared Validation Schemas
 * 
 * Zod schemas for validating sponsor-related inputs.
 * Shared between client and server for consistent validation.
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

const IdSchema = z.number().int().positive();
const PageSchema = z.number().int().positive().default(1);
const LimitSchema = z.number().int().positive().max(100).default(20);

// ============================================================================
// Sponsor Type Enums
// ============================================================================

export const SponsorTypeSchema = z.enum([
  'primary',
  'co_sponsor',
  'supporter'
]);

export const SponsorRoleSchema = z.enum([
  'legislator',
  'senator',
  'representative',
  'committee_member'
]);

// ============================================================================
// Sponsor Schemas
// ============================================================================

export const GetSponsorSchema = z.object({
  sponsor_id: IdSchema,
  include_bills: z.boolean().default(true),
  include_voting_record: z.boolean().default(false),
});

export const GetSponsorsSchema = z.object({
  bill_id: IdSchema.optional(),
  role: SponsorRoleSchema.optional(),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

export const GetSponsorBillsSchema = z.object({
  sponsor_id: IdSchema,
  type: SponsorTypeSchema.optional(),
  status: z.string().max(50).optional(),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

export const GetSponsorVotingRecordSchema = z.object({
  sponsor_id: IdSchema,
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

export const SearchSponsorsSchema = z.object({
  query: z.string().min(1).max(200),
  role: SponsorRoleSchema.optional(),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type SponsorType = z.infer<typeof SponsorTypeSchema>;
export type SponsorRole = z.infer<typeof SponsorRoleSchema>;
export type GetSponsorInput = z.infer<typeof GetSponsorSchema>;
export type GetSponsorsInput = z.infer<typeof GetSponsorsSchema>;
export type GetSponsorBillsInput = z.infer<typeof GetSponsorBillsSchema>;
export type GetSponsorVotingRecordInput = z.infer<typeof GetSponsorVotingRecordSchema>;
export type SearchSponsorsInput = z.infer<typeof SearchSponsorsSchema>;
