import { z } from 'zod';

import { NavigationValidationError, InvalidNavigationPathError } from './errors';

/**
 * Navigation validation schemas and utilities
 */

export const NavigationPathSchema = z.string()
  .min(1, 'Navigation path cannot be empty')
  .regex(/^\/[a-zA-Z0-9\-_\/]*$/, 'Invalid navigation path format')
  .max(200, 'Navigation path too long');

export const UserRoleSchema = z.enum(['public', 'citizen', 'expert', 'admin', 'journalist', 'advocate']);

export const NavigationItemSchema = z.object({
  id: z.string().min(1, 'ID cannot be empty'),
  label: z.string().min(1, 'Label cannot be empty').max(100, 'Label too long'),
  href: NavigationPathSchema,
  section: z.enum(['legislative', 'community', 'tools', 'user', 'admin']),
  description: z.string().max(500, 'Description too long').optional(),
  badge: z.number().int().min(0).optional(),
  allowedRoles: z.array(UserRoleSchema).optional(),
  requiresAuth: z.boolean().optional(),
  adminOnly: z.boolean().optional(),
  condition: z.function().optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

export const RelatedPageSchema = z.object({
  pageId: z.string().min(1, 'Page ID cannot be empty'),
  title: z.string().min(1, 'Title cannot be empty').max(100, 'Title too long'),
  path: NavigationPathSchema,
  description: z.string().max(500, 'Description too long'),
  category: z.enum(['legislative', 'community', 'tools', 'user', 'admin']),
  type: z.enum(['parent', 'child', 'sibling', 'related']).optional(),
  weight: z.number().int().min(0).max(100),
  context: z.string().max(200, 'Context too long').optional(),
  relevanceScore: z.number().min(0).max(10),
});

export const UseRelatedPagesOptionsSchema = z.object({
  maxResults: z.number().int().min(1).max(50).optional(),
  includeBreadcrumbs: z.boolean().optional(),
  filterByRole: z.boolean().optional(),
});

/**
 * Validation utility functions
 */

export function validateNavigationPath(path: string): string {
  try {
    return NavigationPathSchema.parse(path);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid navigation path';
      throw new InvalidNavigationPathError(path, message);
    }
    throw new InvalidNavigationPathError(path, 'Navigation path validation failed');
  }
}

export function validateUserRole(role: string): string {
  try {
    return UserRoleSchema.parse(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid user role';
      throw new NavigationValidationError(message, 'role', role, { zodError: error });
    }
    throw new NavigationValidationError('User role validation failed', 'role', role);
  }
}

export function validateNavigationItem(item: unknown): any {
  try {
    return NavigationItemSchema.parse(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid navigation item';
      throw new NavigationValidationError(message, field, item, { zodError: error });
    }
    throw new NavigationValidationError('Navigation item validation failed', 'item', item);
  }
}

export function validateRelatedPage(page: unknown): any {
  try {
    return RelatedPageSchema.parse(page);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid related page';
      throw new NavigationValidationError(message, field, page, { zodError: error });
    }
    throw new NavigationValidationError('Related page validation failed', 'page', page);
  }
}

export function validateUseRelatedPagesOptions(options: unknown): any {
  try {
    return UseRelatedPagesOptionsSchema.parse(options);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid options';
      throw new NavigationValidationError(message, field, options, { zodError: error });
    }
    throw new NavigationValidationError('Options validation failed', 'options', options);
  }
}

/**
 * Safe validation functions that return validation results
 */

export function safeValidateNavigationPath(path: string): { success: boolean; data?: string; error?: NavigationValidationError } {
  try {
    const data = validateNavigationPath(path);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as NavigationValidationError };
  }
}

export function safeValidateUserRole(role: string): { success: boolean; data?: string; error?: NavigationValidationError } {
  try {
    const data = validateUserRole(role);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as NavigationValidationError };
  }
}

