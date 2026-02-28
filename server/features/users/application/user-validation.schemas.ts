/**
 * Users Feature - Validation Schemas
 * 
 * Zod schemas for validating user-related inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// User Role and Status Enums
// ============================================================================

export const UserRoleSchema = z.enum([
  'user',
  'admin',
  'moderator',
  'expert',
  'verified_citizen'
]);

export const VerificationStatusSchema = z.enum([
  'unverified',
  'pending',
  'verified',
  'rejected'
]);

export const ExpertiseLevelSchema = z.enum([
  'novice',
  'intermediate',
  'advanced',
  'expert'
]);

// ============================================================================
// User Registration and Profile Schemas
// ============================================================================

export const RegisterUserSchema = z.object({
  email: CommonSchemas.email,
  password: CommonSchemas.password,
  name: CommonSchemas.name,
  phone: CommonSchemas.phone.optional(),
  role: UserRoleSchema.default('user'),
});

export const UpdateUserSchema = z.object({
  email: CommonSchemas.email.optional(),
  name: CommonSchemas.name.optional(),
  phone: CommonSchemas.phone.optional(),
  role: UserRoleSchema.optional(),
});

export const UpdateProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  expertise: z.array(z.string().min(1).max(100)).max(20).optional(),
  location: z.string().max(200).optional(),
  organization: z.string().max(200).optional(),
  is_public: z.boolean().optional(),
});

export const UpdateInterestsSchema = z.object({
  interests: z.array(z.string().min(1).max(100)).max(50),
});

// ============================================================================
// User Search and Query Schemas
// ============================================================================

export const SearchUsersSchema = z.object({
  query: CommonSchemas.searchQuery,
  role: UserRoleSchema.optional(),
  verification_status: VerificationStatusSchema.optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const GetUserByIdSchema = CommonSchemas.id;

// ============================================================================
// Verification Schemas
// ============================================================================

export const VerificationTypeSchema = z.enum([
  'fact_check',
  'expertise_claim',
  'impact_analysis',
  'constitutional_review'
]);

export const EvidenceSchema = z.object({
  type: z.enum(['document', 'link', 'citation', 'data']),
  source: z.string().url().or(z.string().max(500)),
  description: z.string().max(1000),
  credibility_score: z.number().min(0).max(1).optional(),
});

export const SubmitVerificationSchema = z.object({
  bill_id: z.number().int().positive(),
  verification_type: VerificationTypeSchema,
  claim: z.string().min(10).max(5000),
  evidence: z.array(EvidenceSchema).min(1).max(10),
  expertise: ExpertiseLevelSchema,
  reasoning: z.string().min(50).max(10000),
});

export const EndorseVerificationSchema = z.object({
  verification_id: CommonSchemas.id,
});

export const DisputeVerificationSchema = z.object({
  verification_id: CommonSchemas.id,
  reason: z.string().min(20).max(2000),
});

export const FactCheckSchema = z.object({
  bill_id: z.number().int().positive(),
  claim: z.string().min(10).max(5000),
});

// ============================================================================
// Password and Authentication Schemas
// ============================================================================

export const ChangePasswordSchema = z.object({
  current_password: CommonSchemas.password,
  new_password: CommonSchemas.password,
  confirm_password: CommonSchemas.password,
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

export const ResetPasswordSchema = z.object({
  email: CommonSchemas.email,
});

export const ConfirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  new_password: CommonSchemas.password,
  confirm_password: CommonSchemas.password,
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

// ============================================================================
// Type Exports
// ============================================================================

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateInterestsInput = z.infer<typeof UpdateInterestsSchema>;
export type SearchUsersInput = z.infer<typeof SearchUsersSchema>;
export type SubmitVerificationInput = z.infer<typeof SubmitVerificationSchema>;
export type EndorseVerificationInput = z.infer<typeof EndorseVerificationSchema>;
export type DisputeVerificationInput = z.infer<typeof DisputeVerificationSchema>;
export type FactCheckInput = z.infer<typeof FactCheckSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ConfirmPasswordResetInput = z.infer<typeof ConfirmPasswordResetSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
export type ExpertiseLevel = z.infer<typeof ExpertiseLevelSchema>;
export type VerificationType = z.infer<typeof VerificationTypeSchema>;
