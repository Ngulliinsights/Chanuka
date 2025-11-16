/**
 * Security Validation Schemas
 * Comprehensive Zod schemas for input validation and sanitization
 */

import { z } from 'zod';

// Base validation patterns
const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  billNumber: /^[A-Z]{1,3}\s?\d{1,5}$/,
  phoneNumber: /^\+?[\d\s\-\(\)]{10,15}$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  safeString: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
  noScript: /^(?!.*<script).*$/i,
  noSql: /^(?!.*(union|select|insert|update|delete|drop|create|alter|exec|execute)).*$/i
};

// Custom validation functions
const createSafeStringSchema = (minLength = 1, maxLength = 1000) => 
  z.string()
    .min(minLength, `Must be at least ${minLength} characters`)
    .max(maxLength, `Must be no more than ${maxLength} characters`)
    .refine(val => VALIDATION_PATTERNS.noScript.test(val), 'Script tags not allowed')
    .refine(val => VALIDATION_PATTERNS.noSql.test(val), 'SQL keywords not allowed')
    .transform(val => val.trim());

const createEmailSchema = () =>
  z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .toLowerCase()
    .transform(val => val.trim());

const createUrlSchema = () =>
  z.string()
    .url('Invalid URL format')
    .refine(val => VALIDATION_PATTERNS.url.test(val), 'Only HTTP/HTTPS URLs allowed')
    .max(2048, 'URL too long');

// Common field schemas
export const CommonSchemas = {
  // Basic types
  id: z.string().uuid('Invalid ID format'),
  email: createEmailSchema(),
  url: createUrlSchema(),
  safeString: createSafeStringSchema(),
  longText: createSafeStringSchema(1, 5000),
  shortText: createSafeStringSchema(1, 255),
  
  // Numbers
  positiveInt: z.number().int().positive('Must be a positive integer'),
  nonNegativeInt: z.number().int().min(0, 'Must be non-negative'),
  percentage: z.number().min(0).max(100, 'Must be between 0 and 100'),
  
  // Dates
  dateString: z.string().datetime('Invalid date format'),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).refine(data => {
    if (data.start && data.end) {
      return new Date(data.start) <= new Date(data.end);
    }
    return true;
  }, 'Start date must be before end date'),

  // Pagination
  pagination: z.object({
    page: z.number().int().min(1).max(1000).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sortBy: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),

  // Search
  searchQuery: z.string()
    .min(1, 'Search query required')
    .max(200, 'Search query too long')
    .refine(val => !/[<>'"&]/.test(val), 'Invalid characters in search query')
    .transform(val => val.trim())
};

// User-related schemas
export const UserSchemas = {
  // Registration
  registration: z.object({
    email: CommonSchemas.email,
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .refine(val => /[A-Z]/.test(val), 'Password must contain uppercase letter')
      .refine(val => /[a-z]/.test(val), 'Password must contain lowercase letter')
      .refine(val => /\d/.test(val), 'Password must contain number')
      .refine(val => /[!@#$%^&*]/.test(val), 'Password must contain special character'),
    firstName: createSafeStringSchema(1, 50),
    lastName: createSafeStringSchema(1, 50),
    acceptTerms: z.boolean().refine(val => val === true, 'Must accept terms')
  }),

  // Login
  login: z.object({
    email: CommonSchemas.email,
    password: z.string().min(1, 'Password required').max(128, 'Password too long'),
    rememberMe: z.boolean().optional()
  }),

  // Profile update
  profileUpdate: z.object({
    firstName: createSafeStringSchema(1, 50).optional(),
    lastName: createSafeStringSchema(1, 50).optional(),
    bio: createSafeStringSchema(0, 500).optional(),
    location: createSafeStringSchema(0, 100).optional(),
    website: createUrlSchema().optional(),
    phoneNumber: z.string()
      .regex(VALIDATION_PATTERNS.phoneNumber, 'Invalid phone number')
      .optional(),
    preferences: z.object({
      emailNotifications: z.boolean().default(true),
      smsNotifications: z.boolean().default(false),
      pushNotifications: z.boolean().default(true),
      privacyLevel: z.enum(['public', 'private', 'limited']).default('public')
    }).optional()
  }),

  // Password change
  passwordChange: z.object({
    currentPassword: z.string().min(1, 'Current password required'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .refine(val => /[A-Z]/.test(val), 'Password must contain uppercase letter')
      .refine(val => /[a-z]/.test(val), 'Password must contain lowercase letter')
      .refine(val => /\d/.test(val), 'Password must contain number')
      .refine(val => /[!@#$%^&*]/.test(val), 'Password must contain special character'),
    confirmPassword: z.string()
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })
};

// Bill-related schemas
export const BillSchemas = {
  // Bill creation/update
  billData: z.object({
    billNumber: z.string()
      .regex(VALIDATION_PATTERNS.billNumber, 'Invalid bill number format')
      .transform(val => val.toUpperCase().replace(/\s+/g, ' ').trim()),
    title: createSafeStringSchema(5, 200),
    summary: createSafeStringSchema(10, 1000),
    fullText: createSafeStringSchema(50, 50000),
    status: z.enum(['introduced', 'committee', 'floor', 'passed', 'failed', 'signed', 'vetoed']),
    urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    policyAreas: z.array(createSafeStringSchema(1, 100)).max(20, 'Too many policy areas'),
    sponsors: z.array(CommonSchemas.id).max(50, 'Too many sponsors'),
    committees: z.array(CommonSchemas.id).max(10, 'Too many committees'),
    introducedDate: CommonSchemas.dateString,
    lastUpdated: CommonSchemas.dateString.optional()
  }),

  // Bill filters
  billFilters: z.object({
    status: z.array(z.string().max(50)).max(10).optional(),
    policyAreas: z.array(createSafeStringSchema(1, 100)).max(20).optional(),
    urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    dateRange: CommonSchemas.dateRange.optional(),
    sponsors: z.array(CommonSchemas.id).max(50).optional(),
    committees: z.array(CommonSchemas.id).max(10).optional(),
    searchQuery: CommonSchemas.searchQuery.optional()
  }),

  // Bill comment
  billComment: z.object({
    billId: CommonSchemas.id,
    content: createSafeStringSchema(10, 2000),
    parentCommentId: CommonSchemas.id.optional(),
    isExpertAnalysis: z.boolean().default(false)
  })
};

// Community-related schemas
export const CommunitySchemas = {
  // Discussion thread
  discussionThread: z.object({
    title: createSafeStringSchema(5, 200),
    content: createSafeStringSchema(10, 5000),
    category: z.enum(['general', 'analysis', 'question', 'announcement']),
    tags: z.array(createSafeStringSchema(1, 50)).max(10, 'Too many tags'),
    billId: CommonSchemas.id.optional()
  }),

  // Comment
  comment: z.object({
    content: createSafeStringSchema(10, 2000),
    threadId: CommonSchemas.id.optional(),
    billId: CommonSchemas.id.optional(),
    parentCommentId: CommonSchemas.id.optional()
  }),

  // Vote
  vote: z.object({
    targetId: CommonSchemas.id,
    targetType: z.enum(['comment', 'thread', 'bill']),
    voteType: z.enum(['up', 'down', 'neutral'])
  })
};

// Expert verification schemas
export const ExpertSchemas = {
  // Expert application
  expertApplication: z.object({
    credentials: z.array(z.object({
      type: z.enum(['education', 'experience', 'certification', 'publication']),
      title: createSafeStringSchema(5, 200),
      institution: createSafeStringSchema(2, 200),
      description: createSafeStringSchema(10, 1000),
      verificationUrl: createUrlSchema().optional(),
      dateObtained: CommonSchemas.dateString.optional()
    })).min(1, 'At least one credential required').max(20, 'Too many credentials'),
    specializations: z.array(createSafeStringSchema(2, 100)).min(1).max(10),
    bio: createSafeStringSchema(50, 2000),
    contactEmail: CommonSchemas.email,
    linkedinProfile: createUrlSchema().optional(),
    website: createUrlSchema().optional()
  }),

  // Expert analysis
  expertAnalysis: z.object({
    billId: CommonSchemas.id,
    analysisType: z.enum(['constitutional', 'legal', 'policy', 'economic', 'social']),
    title: createSafeStringSchema(10, 200),
    content: createSafeStringSchema(100, 10000),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    recommendations: z.array(createSafeStringSchema(10, 500)).max(10).optional(),
    sources: z.array(z.object({
      title: createSafeStringSchema(5, 200),
      url: createUrlSchema(),
      description: createSafeStringSchema(10, 500).optional()
    })).max(20).optional()
  })
};

// Administrative schemas
export const AdminSchemas = {
  // User management
  userUpdate: z.object({
    userId: CommonSchemas.id,
    role: z.enum(['user', 'expert', 'moderator', 'admin']).optional(),
    status: z.enum(['active', 'suspended', 'banned']).optional(),
    reason: createSafeStringSchema(10, 500).optional()
  }),

  // Content moderation
  moderationAction: z.object({
    targetId: CommonSchemas.id,
    targetType: z.enum(['comment', 'thread', 'bill', 'user']),
    action: z.enum(['approve', 'reject', 'flag', 'remove', 'warn']),
    reason: createSafeStringSchema(10, 500),
    notes: createSafeStringSchema(0, 1000).optional()
  }),

  // System configuration
  systemConfig: z.object({
    maintenanceMode: z.boolean().optional(),
    registrationEnabled: z.boolean().optional(),
    expertApplicationsEnabled: z.boolean().optional(),
    rateLimits: z.object({
      api: z.number().int().positive().optional(),
      auth: z.number().int().positive().optional(),
      search: z.number().int().positive().optional()
    }).optional(),
    features: z.object({
      aiAnalysis: z.boolean().optional(),
      expertVerification: z.boolean().optional(),
      realTimeUpdates: z.boolean().optional()
    }).optional()
  })
};

// API response schemas
export const ResponseSchemas = {
  // Success response
  success: <T>(dataSchema: z.ZodSchema<T>) => z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime()
  }),

  // Error response
  error: z.object({
    success: z.literal(false),
    error: z.string(),
    code: z.string(),
    details: z.any().optional(),
    timestamp: z.string().datetime()
  }),

  // Paginated response
  paginated: <T>(itemSchema: z.ZodSchema<T>) => z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    }),
    timestamp: z.string().datetime()
  })
};

// Export all schemas
export const SecuritySchemas = {
  Common: CommonSchemas,
  User: UserSchemas,
  Bill: BillSchemas,
  Community: CommunitySchemas,
  Expert: ExpertSchemas,
  Admin: AdminSchemas,
  Response: ResponseSchemas
};

// Utility function to create validation middleware
export const createValidationMiddleware = (schema: z.ZodSchema) => {
  return async (req: any, res: any, next: any) => {
    try {
      const result = await schema.safeParseAsync(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: result.error.errors,
          timestamp: new Date().toISOString()
        });
      }
      req.body = result.data;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Internal validation error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  };
};