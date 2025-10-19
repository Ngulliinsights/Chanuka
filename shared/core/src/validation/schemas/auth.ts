/**
 * Authentication Validation Schemas
 * 
 * Validation patterns for authentication and authorization
 */

import { z } from 'zod';
import { emailSchema, passwordSchema, strongPasswordSchema, phoneSchema, nameSchema } from './common';
import { logger } from '../../observability/logging';

import { isAgeBetween } from '../helpers';
/**
 * User registration schema
 */
export const userRegistrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  phone: phoneSchema.optional(),
  dob: z.string().optional().refine((v) => (v ? isAgeBetween(13, 120)(v) : true), {
    message: 'Date of birth indicates age must be between 13 and 120',
  }),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'Terms and conditions must be accepted',
  }),
  marketingOptIn: z.boolean().default(false),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

/**
 * Admin user registration schema (stricter requirements)
 */
export const adminRegistrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
  confirmPassword: z.string(),
  phone: phoneSchema.optional(),
  dateOfBirth: z.coerce.date().refine(
    (date) => {
      const age = new Date().getFullYear() - date.getFullYear();
      return age >= 18 && age <= 120;
    },
    { message: 'User must be between 18 and 120 years old' }
  ).optional(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'Terms and conditions must be accepted',
  }),
  role: z.enum(['admin', 'super_admin']),
  department: z.string().min(1, 'Department is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

/**
 * User login schema
 */
export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
  captcha: z.string().optional(),
});

/**
 * Multi-factor authentication login schema
 */
export const mfaLoginSchema = userLoginSchema.extend({
  mfaCode: z.string().length(6, 'MFA code must be 6 digits').regex(/^\d{6}$/, 'MFA code must contain only digits'),
});

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
  captcha: z.string().optional(),
});

/**
 * Password reset confirmation schema
 */
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

/**
 * Change password schema (for authenticated users)
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmNewPassword,
  {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  }
);

/**
 * Email verification schema
 */
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
  email: emailSchema.optional(),
});

/**
 * Phone verification schema
 */
export const phoneVerificationSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Code must contain only digits'),
});

/**
 * Two-factor authentication setup schema
 */
export const twoFactorSetupSchema = z.object({
  secret: z.string().min(1, 'Secret is required'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must contain only digits'),
  backupCodes: z.array(z.string()).length(10, 'Must provide exactly 10 backup codes'),
});

/**
 * Two-factor authentication verification schema
 */
export const twoFactorVerificationSchema = z.object({
  code: z.string().min(1, 'Code is required').refine(
    (code) => {
      // Accept either 6-digit TOTP code or 8-character backup code
      return /^\d{6}$/.test(code) || /^[A-Z0-9]{8}$/.test(code);
    },
    { message: 'Code must be 6 digits or 8-character backup code' }
  ),
});

/**
 * OAuth authorization schema
 */
export const oauthAuthorizationSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  redirectUri: z.string().url('Invalid redirect URI'),
  responseType: z.enum(['code', 'token']),
  scope: z.string().optional(),
  state: z.string().optional(),
});

/**
 * OAuth token exchange schema
 */
export const oauthTokenSchema = z.object({
  grantType: z.enum(['authorization_code', 'refresh_token', 'client_credentials']),
  code: z.string().optional(),
  redirectUri: z.string().url().optional(),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  refreshToken: z.string().optional(),
}).refine(
  (data) => {
    if (data.grantType === 'authorization_code') {
      return data.code && data.redirectUri;
    }
    if (data.grantType === 'refresh_token') {
      return data.refreshToken;
    }
    return true;
  },
  { message: 'Missing required fields for grant type' }
);

/**
 * API key creation schema
 */
export const apiKeyCreationSchema = z.object({
  name: z.string().min(1, 'API key name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  expiresAt: z.coerce.date().refine(
    (date) => date > new Date(),
    { message: 'Expiration date must be in the future' }
  ).optional(),
  ipWhitelist: z.array(z.string().ip()).optional(),
});

/**
 * Session management schema
 */
export const sessionSchema = z.object({
  userId: z.string().uuid(),
  deviceId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  expiresAt: z.coerce.date(),
  isActive: z.boolean().default(true),
});

/**
 * Role-based access control schema
 */
export const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50, 'Role name is too long'),
  description: z.string().max(200, 'Description is too long').optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  isActive: z.boolean().default(true),
});

/**
 * Permission schema
 */
export const permissionSchema = z.object({
  resource: z.string().min(1, 'Resource is required'),
  action: z.enum(['create', 'read', 'update', 'delete', 'admin']),
  conditions: z.record(z.string(), z.any()).optional(),
});

/**
 * User profile update schema
 */
export const userProfileUpdateSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema.optional(),
  dateOfBirth: z.coerce.date().refine(
    (date) => {
      const age = new Date().getFullYear() - date.getFullYear();
      return age >= 18 && age <= 120;
    },
    { message: 'User must be between 18 and 120 years old' }
  ).optional(),
  bio: z.string().max(500, 'Bio is too long').optional(),
  website: z.string().url('Invalid website URL').optional(),
  location: z.string().max(100, 'Location is too long').optional(),
  timezone: z.string().optional(),
  language: z.string().length(2, 'Language must be 2-letter code').optional(),
  marketingOptIn: z.boolean().optional(),
});

/**
 * Account deactivation schema
 */
export const accountDeactivationSchema = z.object({
  password: z.string().min(1, 'Password is required for account deactivation'),
  reason: z.enum([
    'temporary_break',
    'privacy_concerns',
    'too_many_emails',
    'not_useful',
    'technical_issues',
    'other'
  ]),
  feedback: z.string().max(1000, 'Feedback is too long').optional(),
  deleteData: z.boolean().default(false),
});

/**
 * Security question schema
 */
export const securityQuestionSchema = z.object({
  question: z.string().min(1, 'Security question is required').max(200, 'Question is too long'),
  answer: z.string().min(1, 'Answer is required').max(100, 'Answer is too long'),
});

/**
 * Device registration schema (for device-based authentication)
 */
export const deviceRegistrationSchema = z.object({
  deviceName: z.string().min(1, 'Device name is required').max(100, 'Device name is too long'),
  deviceType: z.enum(['mobile', 'tablet', 'desktop', 'other']),
  deviceId: z.string().min(1, 'Device ID is required'),
  publicKey: z.string().min(1, 'Public key is required'),
  userAgent: z.string().optional(),
});

/**
 * Biometric authentication schema
 */
export const biometricAuthSchema = z.object({
  type: z.enum(['fingerprint', 'face', 'voice', 'iris']),
  data: z.string().min(1, 'Biometric data is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  challenge: z.string().min(1, 'Challenge is required'),
});

/**
 * Authentication schemas collection
 */
export const authSchemas = {
  userRegistration: userRegistrationSchema,
  adminRegistration: adminRegistrationSchema,
  userLogin: userLoginSchema,
  mfaLogin: mfaLoginSchema,
  passwordResetRequest: passwordResetRequestSchema,
  passwordResetConfirm: passwordResetConfirmSchema,
  changePassword: changePasswordSchema,
  emailVerification: emailVerificationSchema,
  phoneVerification: phoneVerificationSchema,
  twoFactorSetup: twoFactorSetupSchema,
  twoFactorVerification: twoFactorVerificationSchema,
  oauthAuthorization: oauthAuthorizationSchema,
  oauthToken: oauthTokenSchema,
  apiKeyCreation: apiKeyCreationSchema,
  session: sessionSchema,
  role: roleSchema,
  permission: permissionSchema,
  userProfileUpdate: userProfileUpdateSchema,
  accountDeactivation: accountDeactivationSchema,
  securityQuestion: securityQuestionSchema,
  deviceRegistration: deviceRegistrationSchema,
  biometricAuth: biometricAuthSchema,
} as const;











































