/**
 * Validation utilities and schemas
 */

import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be less than 50 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// Route validation
export const routeSchema = z.object({
  path: z.string(),
  requiresAuth: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
});

// User validation
export const userSchema = z.object({
  id: z.string(),
  email: emailSchema,
  username: usernameSchema,
  role: z.enum(['admin', 'user', 'moderator']),
  isActive: z.boolean(),
});

// Bill validation
export const billSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['draft', 'introduced', 'committee', 'passed', 'failed', 'signed', 'vetoed']),
  sponsor: z.string().optional(),
  dateIntroduced: z.date().optional(),
});

// Validation helper functions
export function validateRoute(route: unknown) {
  return routeSchema.safeParse(route);
}

export function validateUser(user: unknown) {
  return userSchema.safeParse(user);
}

export function validateBill(bill: unknown) {
  return billSchema.safeParse(bill);
}

export function validateEmail(email: string) {
  return emailSchema.safeParse(email);
}

export function validatePassword(password: string) {
  return passwordSchema.safeParse(password);
}

export function validateUsername(username: string) {
  return usernameSchema.safeParse(username);
}

export function validateNavigationPath(path: string) {
  const pathSchema = z.string().min(1, 'Path cannot be empty').startsWith('/', 'Path must start with /');
  return pathSchema.safeParse(path);
}

export function validateUserRole(role: string) {
  const roleSchema = z.enum(['admin', 'user', 'moderator', 'citizen', 'expert', 'official']);
  return roleSchema.safeParse(role);
}

export function validateRelatedPage(page: unknown) {
  const relatedPageSchema = z.object({
    path: z.string(),
    title: z.string(),
    description: z.string().optional(),
    relationship: z.enum(['parent', 'child', 'sibling', 'related']),
  });
  return relatedPageSchema.safeParse(page);
}

export function validateUseRelatedPagesOptions(options: unknown) {
  const optionsSchema = z.object({
    currentPath: z.string(),
    maxDepth: z.number().optional(),
    includeParents: z.boolean().optional(),
    includeChildren: z.boolean().optional(),
    includeSiblings: z.boolean().optional(),
  });
  return optionsSchema.safeParse(options);
}

// Generic validation function
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { 
      success: false, 
      error: result.error.errors.map(e => e.message).join(', ')
    };
  }
}

export default {
  emailSchema,
  passwordSchema,
  usernameSchema,
  routeSchema,
  userSchema,
  billSchema,
  validateRoute,
  validateUser,
  validateBill,
  validateEmail,
  validatePassword,
  validateUsername,
  validate,
};