/**
 * User Validation Schemas
 *
 * Validation schemas for user-related operations
 */

import { z } from 'zod';
import { validationPatterns } from '../types/validation.types';

/**
 * User registration schema
 */
export const userRegisterSchema = z
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
  });

/**
 * Login schema
 */
export const userLoginSchema = z.object({
  email: validationPatterns.email,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

/**
 * Profile update schema
 */
export const userProfileUpdateSchema = z
  .object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    bio: z.string().max(500, 'Bio too long').optional(),
    phone: validationPatterns.phone.optional(),
    avatar: z.string().url().optional(),
    location: z.string().max(100).optional(),
    website: validationPatterns.url.optional(),
  })
  .partial();

/**
 * Password change schema
 */
export const userPasswordChangeSchema = z
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
  });

/**
 * Password reset schema
 */
export const userPasswordResetSchema = z.object({
  email: validationPatterns.email,
});

/**
 * Password reset confirm schema
 */
export const userPasswordResetConfirmSchema = z
  .object({
    token: z.string().min(1, 'Reset token required'),
    password: validationPatterns.password,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * User preferences schema
 */
export const userPreferencesSchema = z.object({
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
});

/**
 * Notification preferences schema
 */
export const userNotificationPreferencesSchema = z.object({
  billUpdates: z.boolean(),
  commentReplies: z.boolean(),
  followerActivity: z.boolean(),
  weeklyDigest: z.boolean(),
  platformNews: z.boolean(),
  sponsorUpdates: z.boolean(),
});

/**
 * User registration data type
 */
export type UserRegisterData = z.infer<typeof userRegisterSchema>;

/**
 * User login data type
 */
export type UserLoginData = z.infer<typeof userLoginSchema>;

/**
 * User profile data type
 */
export type UserProfileData = z.infer<typeof userProfileUpdateSchema>;

/**
 * User preferences data type
 */
export type UserPreferencesData = z.infer<typeof userPreferencesSchema>;

/**
 * Password change data type
 */
export type UserPasswordChangeData = z.infer<typeof userPasswordChangeSchema>;

/**
 * Password reset data type
 */
export type UserPasswordResetData = z.infer<typeof userPasswordResetSchema>;

/**
 * Password reset confirm data type
 */
export type UserPasswordResetConfirmData = z.infer<typeof userPasswordResetConfirmSchema>;

/**
 * Notification preferences data type
 */
export type UserNotificationPreferencesData = z.infer<typeof userNotificationPreferencesSchema>;

/**
 * All user validation schemas
 */
export const userValidationSchemas = {
  register: userRegisterSchema,
  login: userLoginSchema,
  profileUpdate: userProfileUpdateSchema,
  passwordChange: userPasswordChangeSchema,
  passwordReset: userPasswordResetSchema,
  passwordResetConfirm: userPasswordResetConfirmSchema,
  preferences: userPreferencesSchema,
  notificationPreferences: userNotificationPreferencesSchema,
};
