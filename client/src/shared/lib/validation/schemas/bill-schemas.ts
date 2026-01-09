/**
 * Bill Validation Schemas
 *
 * Validation schemas for bill-related operations
 */

import { z } from 'zod';
import { validationPatterns } from '../types/validation.types';

/**
 * Search/filter schema for bills
 */
export const billSearchSchema = z.object({
  query: z.string().min(1, 'Search term is required').max(500, 'Search term too long'),
  filters: z
    .object({
      status: z.enum(['active', 'passed', 'failed', 'all']).optional(),
      urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      policyArea: z.string().optional(),
      dateRange: z
        .object({
          from: z.date().optional(),
          to: z.date().optional(),
        })
        .optional(),
    })
    .optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

/**
 * Advanced filter schema for bills
 */
export const billAdvancedFilterSchema = z.object({
  status: z.enum(['active', 'passed', 'failed', 'all']).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  policyArea: z.string().optional(),
  sponsors: z.array(z.string()).optional(),
  dateIntroduced: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .optional(),
  constitutionalFlags: z.boolean().optional(),
  engagementLevel: z.enum(['low', 'medium', 'high']).optional(),
  sortBy: z.enum(['date', 'title', 'urgency', 'engagement']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * Create bill schema
 */
export const billCreateSchema = z
  .object({
    title: z
      .string()
      .min(10, 'Title must be at least 10 characters')
      .max(200, 'Title must not exceed 200 characters'),

    description: z
      .string()
      .min(50, 'Description must be at least 50 characters')
      .max(5000, 'Description must not exceed 5000 characters'),

    policyArea: z.string().min(1, 'Policy area is required').max(100, 'Policy area too long'),

    urgency: z.enum(['low', 'medium', 'high', 'critical'], {
      errorMap: () => ({ message: 'Select a valid urgency level' }),
    }),

    tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),

    sponsors: z.array(z.string()).optional(),

    constitutionalImpact: z.string().max(1000, 'Constitutional impact too long').optional(),

    estimatedCost: z.number().nonnegative('Cost must be non-negative').optional(),
  })
  .strict();

/**
 * Update bill schema
 */
export const billUpdateSchema = z
  .object({
    title: z.string().min(10).max(200).optional(),
    description: z.string().min(50).max(5000).optional(),
    policyArea: z.string().optional(),
    urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['draft', 'active', 'passed', 'failed']).optional(),
    tags: z.array(z.string()).max(10).optional(),
  })
  .partial();

/**
 * Comment on bill schema
 */
export const billCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment must not exceed 5000 characters'),

  billId: validationPatterns.uuid,

  parentCommentId: validationPatterns.uuid.optional(),

  stance: z.enum(['support', 'oppose', 'neutral']).optional(),
});

/**
 * Rate/engage with bill schema
 */
export const billEngagementSchema = z.object({
  billId: validationPatterns.uuid,
  type: z.enum(['view', 'share', 'comment', 'vote', 'save']),
  metadata: z.record(z.any()).optional(),
});

/**
 * Bill search query type
 */
export type BillSearchQuery = z.infer<typeof billSearchSchema>;

/**
 * Bill filter type
 */
export type BillFilter = z.infer<typeof billAdvancedFilterSchema>;

/**
 * Create bill data type
 */
export type CreateBillData = z.infer<typeof billCreateSchema>;

/**
 * Update bill data type
 */
export type UpdateBillData = z.infer<typeof billUpdateSchema>;

/**
 * Bill comment data type
 */
export type BillCommentData = z.infer<typeof billCommentSchema>;

/**
 * Bill engagement data type
 */
export type BillEngagementData = z.infer<typeof billEngagementSchema>;

/**
 * All bill validation schemas
 */
export const billValidationSchemas = {
  search: billSearchSchema,
  advancedFilter: billAdvancedFilterSchema,
  billCreate: billCreateSchema,
  billUpdate: billUpdateSchema,
  billComment: billCommentSchema,
  billEngagement: billEngagementSchema,
};
