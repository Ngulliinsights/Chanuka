/**
 * Validation Helpers - Server-Specific
 * 
 * Server-specific validation schemas and helpers.
 * Imports primitive schemas from shared validation (single source of truth).
 * 
 * ARCHITECTURE:
 * - Shared validation: Primitive schemas, common patterns, domain schemas
 * - Server validation: Server-specific transformations, middleware, services
 * - Client validation: React Hook Form integration, form helpers, UI patterns
 */

import { z } from 'zod';
import { 
  emailSchema, 
  uuidSchema, 
  phoneSchema,
  urlSchema,
  searchQuerySchema,
} from '@shared/validation/schemas/common';

/**
 * Common validation schemas
 * 
 * NOTE: Primitive schemas (email, UUID, pagination, search, date range) are imported
 * from shared validation to maintain single source of truth. Only server-specific
 * schemas are defined here.
 */
export const CommonSchemas = {
  // ============================================================================
  // IMPORTED FROM SHARED (Single Source of Truth)
  // ============================================================================
  
  /** UUID validation - imported from shared */
  id: uuidSchema,
  
  /** Email validation - imported from shared */
  email: emailSchema,
  
  /** Phone validation - imported from shared */
  phone: phoneSchema,
  
  /** URL validation - imported from shared */
  url: urlSchema,
  
  /** Search query validation - imported from shared */
  searchQuery: searchQuerySchema.shape.q,
  
  // ============================================================================
  // SERVER-SPECIFIC SCHEMAS
  // ============================================================================
  
  /** Numeric ID validation (server-specific for legacy systems) */
  numericId: z.number().int().positive('ID must be a positive integer'),
  
  /** Page number from query string (server-specific transformation) */
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('1'),
  
  /** Limit from query string (server-specific transformation) */
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
  
  /** Date string validation (server-specific) */
  dateString: z.string().datetime(),
  
  /** Title validation (server-specific max length) */
  title: z.string().min(1).max(500).trim(),
  
  /** Description validation (server-specific max length) */
  description: z.string().min(1).max(5000).trim(),
  
  /** Content validation (server-specific max length) */
  content: z.string().min(1).max(50000).trim(),
  
  /** Password validation (server-specific) */
  password: z.string().min(8, 'Password must be at least 8 characters'),
  
  /** Name validation (server-specific) */
  name: z.string().min(2).max(100).trim(),
  
  /** Boolean string transformation (server-specific for query params) */
  booleanString: z.enum(['true', 'false']).transform(val => val === 'true'),
  
  /** Sort order validation (server-specific) */
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  /** String array validation (server-specific) */
  stringArray: z.array(z.string()),
  
  /** ID array validation (server-specific) */
  idArray: z.array(uuidSchema),
};

/**
 * Pagination parameters schema (server-specific for query string parsing)
 * 
 * NOTE: This differs from shared paginationSchema which uses limit/offset.
 * Server uses page/limit for query string parameters with string-to-number transformation.
 */
export const PaginationSchema = z.object({
  page: CommonSchemas.page,
  limit: CommonSchemas.limit,
});

/**
 * Search parameters schema (server-specific for query string parsing)
 * 
 * NOTE: Uses page/limit instead of shared's limit/offset approach.
 */
export const SearchSchema = z.object({
  query: CommonSchemas.searchQuery,
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

/**
 * Date range filter schema (server-specific for query string parsing)
 * 
 * NOTE: Uses startDate/endDate field names for query params.
 * Shared dateRangeSchema uses start_date/end_date for consistency with database.
 */
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Validate data against schema
 */
export async function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<ValidationResult<T>> {
  try {
    const validated = await schema.parseAsync(data);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    return {
      success: false,
      errors: [{ field: 'unknown', message: 'Validation failed' }],
    };
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: string, limit?: string): {
  page: number;
  limit: number;
  offset: number;
} {
  const result = PaginationSchema.parse({ page, limit });
  return {
    page: result.page,
    limit: result.limit,
    offset: (result.page - 1) * result.limit,
  };
}

/**
 * Sanitize string for SQL LIKE queries
 */
export function sanitizeForLike(input: string): string {
  return input
    .replace(/[%_\\]/g, '\\$&')
    .trim();
}

/**
 * Create safe LIKE pattern
 */
export function createSafeLikePattern(searchTerm: string): string {
  const sanitized = sanitizeForLike(searchTerm);
  return `%${sanitized}%`;
}

/**
 * Validate and sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .trim();
}

/**
 * Validate array of IDs
 */
export function validateIds(ids: unknown): string[] {
  const result = CommonSchemas.idArray.parse(ids);
  return result;
}
