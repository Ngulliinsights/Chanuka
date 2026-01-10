/**
 * Comprehensive Validation Schemas
 *
 * Type-safe validation using Zod with React Hook Form integration
 * Covers bills, users, comments, search, and form validation
 */

import { z } from 'zod';

// ============================================================================
// Common Validation Patterns
// ============================================================================

export const validationPatterns = {
  email: z.string().min(1, 'Email is required').email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),

  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),

  url: z.string().url('Invalid URL'),

  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),

  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),

  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),

  uuid: z.string().uuid('Invalid UUID'),

  date: z.date().refine(date => date < new Date(), 'Date cannot be in the future'),

  futureDate: z.date().refine(date => date > new Date(), 'Date must be in the future'),

  positiveNumber: z.number().positive('Number must be positive'),

  percentage: z
    .number()
    .min(0, 'Percentage must be between 0 and 100')
    .max(100, 'Percentage must be between 0 and 100'),
};

// ============================================================================
// Bill-Related Validation Schemas
// ============================================================================

export const billValidationSchemas = {
  // Search/filter schema
  search: z.object({
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
  }),

  // Advanced filter schema
  advancedFilter: z.object({
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
  }),

  // Create bill schema
  billCreate: z
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
    .strict(),

  // Update bill schema
  billUpdate: z
    .object({
      title: z.string().min(10).max(200).optional(),
      description: z.string().min(50).max(5000).optional(),
      policyArea: z.string().optional(),
      urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      status: z.enum(['draft', 'active', 'passed', 'failed']).optional(),
      tags: z.array(z.string()).max(10).optional(),
    })
    .partial(),

  // Comment on bill schema
  billComment: z.object({
    content: z
      .string()
      .min(1, 'Comment cannot be empty')
      .max(5000, 'Comment must not exceed 5000 characters'),

    billId: validationPatterns.uuid,

    parentCommentId: validationPatterns.uuid.optional(),

    stance: z.enum(['support', 'oppose', 'neutral']).optional(),
  }),

  // Rate/engage with bill schema
  billEngagement: z.object({
    billId: validationPatterns.uuid,
    type: z.enum(['view', 'share', 'comment', 'vote', 'save']),
    metadata: z.record(z.any()).optional(),
  }),
};

// ============================================================================
// User-Related Validation Schemas
// ============================================================================

export const userValidationSchemas = {
  // User registration schema
  register: z
    .object({
      firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),

      lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),

      email: validationPatterns.email,

      username: validationPatterns.username,

      password: validationPatterns.password,

      confirmPassword: z.string(),

      agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms'),

      newsletter: z.boolean().optional(),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),

  // Login schema
  login: z.object({
    email: validationPatterns.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  }),

  // Profile update schema
  profileUpdate: z
    .object({
      firstName: z.string().min(1).max(50).optional(),
      lastName: z.string().min(1).max(50).optional(),
      bio: z.string().max(500, 'Bio too long').optional(),
      phone: validationPatterns.phone.optional(),
      avatar: z.string().url().optional(),
      location: z.string().max(100).optional(),
      website: validationPatterns.url.optional(),
    })
    .partial(),

  // Password change schema
  passwordChange: z
    .object({
      currentPassword: z.string().min(1, 'Current password required'),
      newPassword: validationPatterns.password,
      confirmPassword: z.string(),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
      message: 'New passwords do not match',
      path: ['confirmPassword'],
    })
    .refine(data => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }),

  // Password reset schema
  passwordReset: z.object({
    email: validationPatterns.email,
  }),

  // Password reset confirm schema
  passwordResetConfirm: z
    .object({
      token: z.string().min(1, 'Reset token required'),
      password: validationPatterns.password,
      confirmPassword: z.string(),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),

  // User preferences schema
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system'], {
      errorMap: () => ({ message: 'Select a valid theme' }),
    }),

    notifications: z.boolean(),

    emailDigest: z.enum(['daily', 'weekly', 'monthly', 'never']),

    language: z.enum(['en', 'es', 'fr']).optional(),

    timezone: z.string().optional(),

    accessibility: z
      .object({
        reducedMotion: z.boolean(),
        highContrast: z.boolean(),
        fontSize: z.enum(['small', 'medium', 'large']),
        screenReaderOptimized: z.boolean().optional(),
      })
      .optional(),

    privacy: z
      .object({
        profilePublic: z.boolean(),
        showActivity: z.boolean(),
        allowMessages: z.boolean(),
      })
      .optional(),
  }),

  // Notification preferences
  notificationPreferences: z.object({
    billUpdates: z.boolean(),
    commentReplies: z.boolean(),
    followerActivity: z.boolean(),
    weeklyDigest: z.boolean(),
    platformNews: z.boolean(),
    sponsorUpdates: z.boolean(),
  }),
};

// ============================================================================
// Form-Related Validation Schemas
// ============================================================================

export const formValidationSchemas = {
  // Contact form
  contactForm: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),

    email: validationPatterns.email,

    subject: z
      .string()
      .min(5, 'Subject must be at least 5 characters')
      .max(200, 'Subject too long'),

    message: z
      .string()
      .min(10, 'Message must be at least 10 characters')
      .max(5000, 'Message too long'),

    priority: z.enum(['low', 'medium', 'high']).optional(),

    attachments: z.array(z.string()).optional(),
  }),

  // Newsletter signup
  newsletterSignup: z.object({
    email: validationPatterns.email,
    frequency: z.enum(['weekly', 'monthly', 'never']),
    interests: z.array(z.string()).min(1, 'Select at least one interest'),
  }),

  // Feedback form
  feedbackForm: z.object({
    type: z.enum(['bug', 'feature', 'feedback', 'other']),
    title: z.string().min(5).max(200),
    description: z.string().min(10).max(2000),
    severity: z.enum(['low', 'medium', 'high']).optional(),
    email: validationPatterns.email.optional(),
    screenshot: z.string().url().optional(),
  }),

  // Payment form
  paymentForm: z.object({
    cardNumber: z
      .string()
      .regex(/^\d{4}(?:\s?\d{4}){3}$|^\d{13,19}$/, 'Invalid card number')
      .transform(val => val.replace(/\s/g, '')),

    expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, 'Invalid expiry date format (MM/YY)'),

    cvc: z.string().regex(/^\d{3,4}$/, 'Invalid CVC'),

    amount: validationPatterns.positiveNumber,

    currency: z.enum(['USD', 'EUR', 'GBP']),

    description: z.string().optional(),
  }),
};

// ============================================================================
// Export Combined Schemas
// ============================================================================

export const allValidationSchemas = {
  ...billValidationSchemas,
  ...userValidationSchemas,
  ...formValidationSchemas,
};

// ============================================================================
// Type Inference
// ============================================================================

export type BillSearchQuery = z.infer<typeof billValidationSchemas.search>;
export type BillFilter = z.infer<typeof billValidationSchemas.advancedFilter>;
export type CreateBillData = z.infer<typeof billValidationSchemas.billCreate>;
export type UpdateBillData = z.infer<typeof billValidationSchemas.billUpdate>;
export type BillCommentData = z.infer<typeof billValidationSchemas.billComment>;

export type UserRegisterData = z.infer<typeof userValidationSchemas.register>;
export type UserLoginData = z.infer<typeof userValidationSchemas.login>;
export type UserProfileData = z.infer<typeof userValidationSchemas.profileUpdate>;
export type UserPreferencesData = z.infer<typeof userValidationSchemas.preferences>;

export type ContactFormData = z.infer<typeof formValidationSchemas.contactForm>;
export type FeedbackFormData = z.infer<typeof formValidationSchemas.feedbackForm>;
export type PaymentFormData = z.infer<typeof formValidationSchemas.paymentForm>;
