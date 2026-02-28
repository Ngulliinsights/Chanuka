/**
 * Bills Feature - Validation Schemas
 * 
 * Zod schemas for validating Bills feature inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Bill Status and Category Enums
// ============================================================================

export const BillStatusSchema = z.enum([
  'draft',
  'introduced',
  'committee_stage',
  'second_reading',
  'third_reading',
  'passed',
  'rejected',
  'withdrawn',
  'enacted'
]);

export const BillCategorySchema = z.enum([
  'agriculture',
  'budget',
  'defense',
  'education',
  'energy',
  'environment',
  'finance',
  'foreign_affairs',
  'health',
  'infrastructure',
  'justice',
  'labor',
  'social_welfare',
  'technology',
  'trade',
  'transportation',
  'other'
]);

// ============================================================================
// Bill Creation and Update Schemas
// ============================================================================

export const CreateBillSchema = z.object({
  title: CommonSchemas.title,
  summary: CommonSchemas.description,
  full_text: CommonSchemas.content.optional(),
  bill_number: z.string().min(1).max(50).regex(/^[A-Z]{1,3}-\d{4}-\d{3,4}$/, 'Invalid bill number format (e.g., HR-2024-001)').optional(),
  status: BillStatusSchema.default('draft'),
  category: BillCategorySchema,
  sponsor_id: CommonSchemas.id.optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  introduced_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  last_action_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

export const UpdateBillSchema = z.object({
  title: CommonSchemas.title.optional(),
  summary: CommonSchemas.description.optional(),
  full_text: CommonSchemas.content.optional(),
  bill_number: z.string().min(1).max(50).regex(/^[A-Z]{1,3}-\d{4}-\d{3,4}$/).optional(),
  status: BillStatusSchema.optional(),
  category: BillCategorySchema.optional(),
  sponsor_id: CommonSchemas.id.nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  introduced_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  last_action_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ============================================================================
// Bill Query and Filter Schemas
// ============================================================================

export const BillFiltersSchema = z.object({
  status: BillStatusSchema.optional(),
  category: BillCategorySchema.optional(),
  sponsor_id: CommonSchemas.id.optional(),
  search: CommonSchemas.searchQuery.optional(),
});

export const SearchBillsSchema = z.object({
  query: CommonSchemas.searchQuery,
  filters: BillFiltersSchema.optional(),
});

export const PaginationSchema = z.object({
  page: CommonSchemas.page,
  limit: CommonSchemas.limit,
  sortBy: z.enum(['created_at', 'updated_at', 'title', 'status', 'introduced_date']).optional(),
  sortOrder: CommonSchemas.sortOrder.optional(),
});

export const GetAllBillsSchema = z.object({
  filters: BillFiltersSchema.optional(),
  pagination: PaginationSchema.optional(),
});

// ============================================================================
// Bill Engagement Schemas
// ============================================================================

export const RecordEngagementSchema = z.object({
  bill_id: CommonSchemas.id,
  user_id: CommonSchemas.id,
  engagement_type: z.enum(['view', 'comment', 'share']),
});

// ============================================================================
// Bill ID Validation
// ============================================================================

export const BillIdSchema = CommonSchemas.id;

export const BillIdsSchema = z.object({
  ids: CommonSchemas.idArray,
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateBillInput = z.infer<typeof CreateBillSchema>;
export type UpdateBillInput = z.infer<typeof UpdateBillSchema>;
export type BillFilters = z.infer<typeof BillFiltersSchema>;
export type SearchBillsInput = z.infer<typeof SearchBillsSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type GetAllBillsInput = z.infer<typeof GetAllBillsSchema>;
export type RecordEngagementInput = z.infer<typeof RecordEngagementSchema>;
export type BillStatus = z.infer<typeof BillStatusSchema>;
export type BillCategory = z.infer<typeof BillCategorySchema>;
