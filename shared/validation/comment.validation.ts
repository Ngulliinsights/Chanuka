/**
 * Comment Validation Schema
 *
 * Centralized validation rules for community comments used by both client and server.
 * Integrates with @shared/core/validation framework for enterprise features.
 */

import { z } from 'zod';

/**
 * Comment Validation Rules
 * Constants defining min/max lengths and other constraints
 */
export const COMMENT_VALIDATION_RULES = {
  MIN_LENGTH: 5,
  MAX_LENGTH: 5000,
  MIN_WORDS: 2,
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'code', 'pre'],
} as const;

/**
 * Zod Schema for Comment validation
 * Can be used with @shared/core/validation/ValidationService
 */
export const CommentSchema = z.object({
  id: z.string().uuid().optional(),
  content: z
    .string()
    .min(COMMENT_VALIDATION_RULES.MIN_LENGTH, `Comment must be at least ${COMMENT_VALIDATION_RULES.MIN_LENGTH} characters`)
    .max(COMMENT_VALIDATION_RULES.MAX_LENGTH, `Comment must not exceed ${COMMENT_VALIDATION_RULES.MAX_LENGTH} characters`)
    .refine(
      (val) => val.trim().split(/\s+/).length >= COMMENT_VALIDATION_RULES.MIN_WORDS,
      `Comment must contain at least ${COMMENT_VALIDATION_RULES.MIN_WORDS} words`
    ),
  author_id: z.string().uuid(),
  bill_id: z.string().uuid().optional(),
  argument_id: z.string().uuid().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  is_edited: z.boolean().default(false),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type CommentValidationInput = z.input<typeof CommentSchema>;
export type Comment = z.infer<typeof CommentSchema>;

/**
 * Validation helper function for comments
 * Can be used in both client and server without duplication
 */
export function validateComment(data: unknown): { valid: boolean; errors: Record<string, string[]> } {
  const result = CommentSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: {} };
  }

  const errors: Record<string, string[]> = {};
  result.error.errors.forEach((err) => {
    const field = err.path.join('.');
    if (!errors[field]) errors[field] = [];
    errors[field].push(err.message);
  });
  return { valid: false, errors };
}
