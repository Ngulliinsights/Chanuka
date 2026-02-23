/**
 * Repository Input Validation Schemas
 *
 * Comprehensive validation for repository methods to ensure data integrity
 * and prevent invalid inputs from reaching database operations.
 */

import { validationService } from '@shared/core/validation';
import { z } from 'zod';
import { emailSchema, uuidSchema, userRoleSchema, paginationSchema } from '@shared/validation';

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

/**
 * UUID validation for entity IDs
 */
export const uuidParamSchema = z.string().uuid('Invalid UUID format');

/**
 * Pagination options validation
 */
export const paginationOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
}).refine(
  (data) => {
    // Ensure offset is reasonable for the given limit
    if (data.limit && data.offset && data.offset > data.limit * 1000) {
      return false;
    }
    return true;
  },
  { message: 'Offset is too large for the given limit' }
);

/**
 * Search query validation with injection protection
 */
export const searchQuerySchema = z.string()
  .min(1, 'Search query cannot be empty')
  .max(200, 'Search query is too long')
  .refine(
    (query) => {
      // Prevent SQL injection patterns
      const dangerousPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
        /(-{2}|\/\*|\*\/)/, // SQL comments
        /('|(\\x27)|(\\x2D\\x2D)|(\\x2F\\x2A)|(\\x2A\\x2F))/, // Common injection chars
      ];
      return !dangerousPatterns.some(pattern => pattern.test(query));
    },
    { message: 'Search query contains invalid characters' }
  );

// ============================================================================
// SPONSOR REPOSITORY VALIDATION
// ============================================================================

/**
 * Base sponsor schema without refinements
 */
const baseNewSponsorSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name is too long')
    .regex(/^[a-zA-Z\s\-\.\'&]+$/, 'Name contains invalid characters'),

  party: z.string()
    .max(100, 'Party name is too long')
    .optional(),

  county: z.string()
    .max(50, 'County name is too long')
    .optional(),

  constituency: z.string()
    .max(100, 'Constituency name is too long')
    .optional(),

  ward: z.string()
    .max(100, 'Ward name is too long')
    .optional(),

  chamber: z.enum(['national_assembly', 'senate'], {
    errorMap: () => ({ message: 'Chamber must be either national_assembly or senate' })
  }),

  mp_number: z.string()
    .max(50, 'MP number is too long')
    .optional(),

  position: z.string()
    .max(100, 'Position is too long')
    .optional(),

  role: z.string()
    .max(100, 'Role is too long')
    .optional(),

  bio: z.string()
    .max(2000, 'Bio is too long')
    .optional(),

  photo_url: z.string()
    .url('Invalid photo URL')
    .max(500, 'Photo URL is too long')
    .optional(),

  website: z.string()
    .url('Invalid website URL')
    .max(255, 'Website URL is too long')
    .optional(),

  email: z.string()
    .email('Invalid email format')
    .max(320, 'Email is too long')
    .optional(),

  phone: z.string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Phone number must be in international format')
    .optional(),

  office_location: z.string()
    .max(500, 'Office location is too long')
    .optional(),

  social_media: z.record(z.string(), z.string().url()).optional(),

  financial_disclosures: z.record(z.any()).optional(),

  voting_record: z.record(z.any()).optional(),

  attendance_rate: z.number()
    .min(0, 'Attendance rate cannot be negative')
    .max(100, 'Attendance rate cannot exceed 100%')
    .optional(),

  term_start: z.date().optional(),
  term_end: z.date().optional(),

  is_active: z.boolean().optional().default(true),
});

/**
 * New sponsor creation validation with refinements
 */
export const newSponsorSchema = baseNewSponsorSchema.refine(
  (data) => {
    // Validate term dates if both are provided
    if (data.term_start && data.term_end) {
      return data.term_end > data.term_start;
    }
    return true;
  },
  { message: 'Term end date must be after term start date' }
);

/**
 * Sponsor update validation (partial fields)
 */
export const updateSponsorSchema = baseNewSponsorSchema.partial();

/**
 * Sponsor search options validation
 */
export const sponsorSearchOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  chamber: z.enum(['national_assembly', 'senate']).optional(),
  is_active: z.boolean().optional(),
});

// ============================================================================
// BILL REPOSITORY VALIDATION
// ============================================================================

/**
 * Base bill schema without refinements
 */
const baseNewBillSchema = z.object({
  bill_number: z.string()
    .min(1, 'Bill number is required')
    .max(50, 'Bill number is too long')
    .regex(/^[A-Za-z0-9\-\s/]+$/, 'Bill number contains invalid characters'),

  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title is too long'),

  summary: z.string()
    .max(5000, 'Summary is too long')
    .optional(),

  full_text: z.string()
    .max(100000, 'Full text is too long')
    .optional(),

  bill_type: z.string()
    .max(50, 'Bill type is too long')
    .optional(),

  status: z.enum([
    'drafted', 'introduced', 'first_reading', 'second_reading',
    'committee_stage', 'report_stage', 'third_reading', 'passed',
    'assented', 'rejected', 'withdrawn'
  ], {
    errorMap: () => ({ message: 'Invalid bill status' })
  }).default('drafted'),

  introduced_date: z.date().optional(),
  last_action_date: z.date().optional(),

  chamber: z.enum(['national_assembly', 'senate'], {
    errorMap: () => ({ message: 'Chamber must be either national_assembly or senate' })
  }),

  parliament_session: z.string()
    .max(50, 'Parliament session is too long')
    .optional(),

  sponsor_id: uuidParamSchema.optional(),

  committee: z.string()
    .max(255, 'Committee name is too long')
    .optional(),

  committee_report_url: z.string()
    .url('Invalid committee report URL')
    .max(500, 'Committee report URL is too long')
    .optional(),

  affected_counties: z.array(z.string().max(50)).max(47).optional(), // Max 47 counties in Kenya

  impact_areas: z.array(z.string().max(100)).max(20).optional(),

  public_participation_date: z.date().optional(),
  public_participation_venue: z.string().max(255).optional(),
  public_participation_status: z.string().max(50).optional(),

  view_count: z.number().int().min(0).optional().default(0),
  comment_count: z.number().int().min(0).optional().default(0),
  share_count: z.number().int().min(0).optional().default(0),
  vote_count_for: z.number().int().min(0).optional().default(0),
  vote_count_against: z.number().int().min(0).optional().default(0),
  engagement_score: z.number().min(0).optional().default(0),

  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(100)).max(10).optional(),
  external_urls: z.array(z.string().url()).max(5).optional(),
  metadata: z.record(z.any()).optional(),

  constitutional_analysis_status: z.enum(['pending', 'processing', 'completed', 'failed'])
    .optional().default('pending'),

  argument_synthesis_status: z.enum(['pending', 'processing', 'completed', 'failed'])
    .optional().default('pending'),
});

/**
 * New bill creation validation with refinements
 */
export const newBillSchema = baseNewBillSchema.refine(
  (data) => {
    // Validate date logic
    if (data.last_action_date && data.introduced_date) {
      return data.last_action_date >= data.introduced_date;
    }
    return true;
  },
  { message: 'Last action date cannot be before introduced date' }
);

/**
 * Bill update validation (partial fields)
 */
export const updateBillSchema = baseNewBillSchema.partial();

/**
 * Bill search options validation
 */
export const billSearchOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  status: z.enum([
    'drafted', 'introduced', 'first_reading', 'second_reading',
    'committee_stage', 'report_stage', 'third_reading', 'passed',
    'assented', 'rejected', 'withdrawn'
  ]).optional(),
  chamber: z.enum(['national_assembly', 'senate']).optional(),
});

// ============================================================================
// USER REPOSITORY VALIDATION
// ============================================================================

/**
 * New user creation validation
 */
export const newUserSchema = z.object({
  email: emailSchema.max(320, 'Email is too long'),

  password_hash: z.string()
    .min(1, 'Password hash is required')
    .max(255, 'Password hash is too long'),

  role: userRoleSchema.default('citizen'),

  county: z.string().max(50).optional(),
  constituency: z.string().max(100).optional(),

  is_verified: z.boolean().optional().default(false),

  verification_token: z.string().max(64).optional(),
  verification_expires_at: z.date().optional(),

  password_reset_token: z.string().max(64).optional(),
  password_reset_expires_at: z.date().optional(),

  two_factor_enabled: z.boolean().optional().default(false),
  two_factor_secret: z.string().max(32).optional(),
  backup_codes: z.array(z.string()).max(10).optional(),

  is_active: z.boolean().optional().default(true),
});

/**
 * User update validation (partial fields)
 */
export const updateUserSchema = newUserSchema.partial().omit({
  email: true, // Email should not be updatable via this method
});

/**
 * User profile creation/update validation
 */
export const userProfileSchema = z.object({
  user_id: uuidParamSchema,

  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  display_name: z.string().max(150).optional(),
  bio: z.string().max(1000).optional(),

  anonymity_level: z.enum(['public', 'pseudonymous', 'anonymous'])
    .optional().default('public'),

  anonymous_id: z.string().max(20).optional(),
  pseudonym: z.string().max(100).optional(),

  county: z.string().max(50).optional(),
  constituency: z.string().max(100).optional(),
  ward: z.string().max(100).optional(),

  national_id_hash: z.string().length(64).optional(), // SHA-256 hash
  is_id_verified: z.boolean().optional().default(false),

  phone_number: z.string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Phone number must be in international format')
    .optional(),

  phone_verified: z.boolean().optional().default(false),
  phone_verification_code: z.string().max(10).optional(),
  phone_verification_expires_at: z.date().optional(),

  email_notifications_consent: z.boolean().optional().default(true),
  sms_notifications_consent: z.boolean().optional().default(false),
  marketing_consent: z.boolean().optional().default(false),
  data_processing_consent: z.boolean().optional().default(true),
  consent_date: z.date().optional(),

  preferred_language: z.string().length(2).optional().default('en'),
  timezone: z.string().max(50).optional().default('Africa/Nairobi'),
  accessibility_needs: z.record(z.any()).optional(),

  emergency_contact_name: z.string().max(200).optional(),
  emergency_contact_phone: z.string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Emergency contact phone must be in international format')
    .optional(),
  emergency_contact_relationship: z.string().max(50).optional(),

  avatar_url: z.string().url().max(500).optional(),
  website: z.string().url().max(255).optional(),
  preferences: z.record(z.any()).optional(),
  privacy_settings: z.record(z.any()).optional(),
});

/**
 * User search options validation
 */
export const userSearchOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional(),
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate repository input and return Result
 */
export async function validateRepositoryInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string = 'repository input'
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const validatedData = await validationService.validate(schema, data, {
      preprocess: true,
      abortEarly: false,
    }, {
      schemaName: context,
    });
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error };
    }
    return { success: false, error: new Error(`Validation failed for ${context}: ${String(error)}`) };
  }
}

/**
 * Validate search parameters
 */
export async function validateSearchParams(
  query: string,
  options?: any,
  schema?: z.ZodSchema
): Promise<{ success: true; query: string; options?: any } | { success: false; error: Error }> {
  try {
    const validatedQuery = await validationService.validate(searchQuerySchema, query, {}, {
      schemaName: 'search query',
    });

    let validatedOptions;
    if (options && schema) {
      validatedOptions = await validationService.validate(schema, options, {}, {
        schemaName: 'search options',
      });
    }

    return { success: true, query: validatedQuery, options: validatedOptions };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error };
    }
    return { success: false, error: new Error(`Search validation failed: ${String(error)}`) };
  }
}