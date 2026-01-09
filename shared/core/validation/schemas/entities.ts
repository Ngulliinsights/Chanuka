/**
 * Entity Validation Schemas - Domain Models
 *
 * Consolidated entity validators for Foundation and Citizen Participation domains
 * Moved from shared/schema/runtime-validator.ts to centralize all validations
 */

import { z } from 'zod';

import { emailSchema } from './common';

/**
 * FOUNDATION DOMAIN - Core Legislative Entities
 */

export const UserCreateSchema = z.object({
  email: emailSchema,
  password_hash: z.string().min(20), // min 160-bit hash
  role: z
    .enum(['citizen', 'verified_citizen', 'ambassador', 'expert_verifier', 'mp_staff', 'clerk', 'admin', 'auditor', 'journalist'])
    .default('citizen'),
  county: z.string().optional(),
  constituency: z.string().optional(),
  is_verified: z.boolean().default(false),
  verification_token: z.string().optional(),
  verification_expires_at: z.date().optional(),
  is_active: z.boolean().default(true),
});

export const UserUpdateSchema = UserCreateSchema.partial();

export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export const UserProfileCreateSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  display_name: z.string().max(150).optional(),
  bio: z.string().max(500).optional(),
  anonymity_level: z.enum(['public', 'verified_pseudonym', 'anonymous']).default('public'),
  county: z.string().optional(),
  preferred_language: z.string().default('en'),
  timezone: z.string().default('Africa/Nairobi'),
  email_notifications_consent: z.boolean().default(true),
  sms_notifications_consent: z.boolean().default(false),
  marketing_consent: z.boolean().default(false),
  data_processing_consent: z.boolean().default(true),
});

export const UserProfileUpdateSchema = UserProfileCreateSchema.partial();

export type UserProfileCreate = z.infer<typeof UserProfileCreateSchema>;
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;

/**
 * CITIZEN PARTICIPATION DOMAIN - Engagement & Voting
 */

export const CommentCreateSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  bill_id: z.string().uuid('Invalid bill ID'),
  body: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment too long'),
  anonymity_level: z.enum(['public', 'verified_pseudonym', 'anonymous']),
  moderation_status: z
    .enum(['pending', 'approved', 'rejected', 'flagged_for_review', 'auto_moderated'])
    .default('pending'),
});

export const CommentUpdateSchema = CommentCreateSchema.partial();

export type CommentCreate = z.infer<typeof CommentCreateSchema>;
export type CommentUpdate = z.infer<typeof CommentUpdateSchema>;

export const BillVoteCreateSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  bill_id: z.string().uuid('Invalid bill ID'),
  vote_type: z.enum(['support', 'oppose', 'amend']),
  reason: z.string().max(500).optional(),
});

export const BillVoteUpdateSchema = BillVoteCreateSchema.partial();

export type BillVoteCreate = z.infer<typeof BillVoteCreateSchema>;
export type BillVoteUpdate = z.infer<typeof BillVoteUpdateSchema>;

export const BillEngagementCreateSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  bill_id: z.string().uuid('Invalid bill ID'),
  engagement_type: z.enum(['view', 'comment', 'vote', 'share', 'follow', 'download', 'time_spent']),
  metadata: z.record(z.unknown()).optional(),
});

export const BillEngagementUpdateSchema = BillEngagementCreateSchema.partial();

export type BillEngagementCreate = z.infer<typeof BillEngagementCreateSchema>;
export type BillEngagementUpdate = z.infer<typeof BillEngagementUpdateSchema>;

/**
 * VALIDATION FUNCTIONS
 */

export function validateUserCreate(data: unknown): UserCreate {
  return UserCreateSchema.parse(data);
}

export function validateUserCreateSafe(data: unknown): z.SafeParseReturnType<UserCreate, UserCreate> {
  return UserCreateSchema.safeParse(data);
}

export function validateUserProfileCreate(data: unknown): UserProfileCreate {
  return UserProfileCreateSchema.parse(data);
}

export function validateCommentCreate(data: unknown): CommentCreate {
  return CommentCreateSchema.parse(data);
}

export function validateBillVoteCreate(data: unknown): BillVoteCreate {
  return BillVoteCreateSchema.parse(data);
}

export function validateBillEngagementCreate(data: unknown): BillEngagementCreate {
  return BillEngagementCreateSchema.parse(data);
}

/**
 * BATCH VALIDATION
 */

export function validateBatch<T>(
  schema: z.ZodSchema<T>,
  items: unknown[]
): { data: T; error: null }[] | { data: null; error: string }[] {
  return items.map((item) => {
    const result = schema.safeParse(item);
    return result.success
      ? { data: result.data, error: null }
      : { data: null, error: result.error.message };
  });
}

/**
 * SCHEMA REGISTRY - All entity validators
 */

export const entitySchemas = {
  userCreate: UserCreateSchema,
  userUpdate: UserUpdateSchema,
  userProfileCreate: UserProfileCreateSchema,
  userProfileUpdate: UserProfileUpdateSchema,
  commentCreate: CommentCreateSchema,
  commentUpdate: CommentUpdateSchema,
  billVoteCreate: BillVoteCreateSchema,
  billVoteUpdate: BillVoteUpdateSchema,
  billEngagementCreate: BillEngagementCreateSchema,
  billEngagementUpdate: BillEngagementUpdateSchema,
} as const;

export function getEntitySchema(name: keyof typeof entitySchemas) {
  return entitySchemas[name];
}

export function validateByEntitySchema(name: keyof typeof entitySchemas, data: unknown): unknown {
  const schema = getEntitySchema(name);
  return schema.parse(data);
}
