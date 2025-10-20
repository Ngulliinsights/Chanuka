import { z } from 'zod';
import { LayoutValidationError } from './errors';

/**
 * Layout validation schemas and utilities
 * Following navigation component patterns for consistency
 */

export const LayoutTypeSchema = z.enum(['app', 'auth', 'landing', 'admin', 'mobile']);

export const LayoutBreakpointSchema = z.enum(['mobile', 'tablet', 'desktop', 'wide']);

export const SidebarStateSchema = z.enum(['expanded', 'collapsed', 'hidden']);

export const HeaderStyleSchema = z.enum(['default', 'minimal', 'transparent', 'fixed']);

export const FooterStyleSchema = z.enum(['default', 'minimal', 'hidden', 'sticky']);

export const UserRoleSchema = z.enum(['public', 'citizen', 'expert', 'admin', 'journalist', 'advocate']);

export const LayoutConfigSchema = z.object({
  type: LayoutTypeSchema,
  showSidebar: z.boolean(),
  showHeader: z.boolean(),
  showFooter: z.boolean(),
  sidebarState: SidebarStateSchema,
  headerStyle: HeaderStyleSchema,
  footerStyle: FooterStyleSchema,
  enableMobileOptimization: z.boolean(),
  enableAccessibility: z.boolean(),
  enablePerformanceOptimization: z.boolean(),
});

export const HeaderActionSchema = z.object({
  id: z.string().min(1, 'Action ID cannot be empty'),
  label: z.string().min(1, 'Action label cannot be empty').max(50, 'Action label too long'),
  onClick: z.function(),
  badge: z.number().int().min(0).optional(),
  disabled: z.boolean().optional(),
  className: z.string().optional(),
});

export const NavigationItemSchema = z.object({
  id: z.string().min(1, 'Navigation item ID cannot be empty'),
  label: z.string().min(1, 'Navigation item label cannot be empty').max(100, 'Label too long'),
  href: z.string().min(1, 'Navigation href cannot be empty').regex(/^\/[a-zA-Z0-9\-_\/]*$/, 'Invalid href format'),
  badge: z.number().int().min(0).optional(),
  disabled: z.boolean().optional(),
  requiresAuth: z.boolean().optional(),
  adminOnly: z.boolean().optional(),
  section: z.string().max(50, 'Section name too long').optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  sidebarCollapsed: z.boolean(),
  enableAnimations: z.boolean(),
  enableNotifications: z.boolean(),
  language: z.string().min(2, 'Language code too short').max(5, 'Language code too long'),
});

export const UserSchema = z.object({
  id: z.string().min(1, 'User ID cannot be empty'),
  name: z.string().min(1, 'User name cannot be empty').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  role: UserRoleSchema,
  avatar: z.string().url('Invalid avatar URL').optional(),
  preferences: UserPreferencesSchema.optional(),
});

export const ResponsiveLayoutConfigSchema = z.object({
  breakpoints: z.object({
    mobile: z.number().int().min(0).max(2000),
    tablet: z.number().int().min(0).max(2000),
    desktop: z.number().int().min(0).max(4000),
    wide: z.number().int().min(0).max(8000),
  }),
  sidebarBehavior: z.object({
    mobile: SidebarStateSchema,
    tablet: SidebarStateSchema,
    desktop: SidebarStateSchema,
    wide: SidebarStateSchema,
  }),
  headerBehavior: z.object({
    mobile: HeaderStyleSchema,
    tablet: HeaderStyleSchema,
    desktop: HeaderStyleSchema,
    wide: HeaderStyleSchema,
  }),
});

export const TouchGestureConfigSchema = z.object({
  enableSwipe: z.boolean(),
  enablePinch: z.boolean(),
  enableTap: z.boolean(),
  swipeThreshold: z.number().min(10).max(200),
  tapTimeout: z.number().min(100).max(1000),
  preventZoom: z.boolean(),
});

export const LayoutAnimationConfigSchema = z.object({
  enableTransitions: z.boolean(),
  transitionDuration: z.number().min(0).max(2000),
  easing: z.string().min(1, 'Easing function cannot be empty'),
  enableGPUAcceleration: z.boolean(),
  respectReducedMotion: z.boolean(),
});

/**
 * Validation utility functions
 */

export function validateLayoutConfig(config: unknown): any {
  try {
    return LayoutConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid layout configuration';
      throw new LayoutValidationError(message, field, config, { zodError: error });
    }
    throw new LayoutValidationError('Layout configuration validation failed', 'config', config);
  }
}

export function validateNavigationItem(item: unknown): any {
  try {
    return NavigationItemSchema.parse(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid navigation item';
      throw new LayoutValidationError(message, field, item, { zodError: error });
    }
    throw new LayoutValidationError('Navigation item validation failed', 'item', item);
  }
}

export function validateUser(user: unknown): any {
  try {
    return UserSchema.parse(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid user data';
      throw new LayoutValidationError(message, field, user, { zodError: error });
    }
    throw new LayoutValidationError('User validation failed', 'user', user);
  }
}

export function validateHeaderAction(action: unknown): any {
  try {
    return HeaderActionSchema.parse(action);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid header action';
      throw new LayoutValidationError(message, field, action, { zodError: error });
    }
    throw new LayoutValidationError('Header action validation failed', 'action', action);
  }
}

export function validateResponsiveLayoutConfig(config: unknown): any {
  try {
    return ResponsiveLayoutConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid responsive layout configuration';
      throw new LayoutValidationError(message, field, config, { zodError: error });
    }
    throw new LayoutValidationError('Responsive layout configuration validation failed', 'config', config);
  }
}

export function validateTouchGestureConfig(config: unknown): any {
  try {
    return TouchGestureConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid touch gesture configuration';
      throw new LayoutValidationError(message, field, config, { zodError: error });
    }
    throw new LayoutValidationError('Touch gesture configuration validation failed', 'config', config);
  }
}

export function validateLayoutAnimationConfig(config: unknown): any {
  try {
    return LayoutAnimationConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid layout animation configuration';
      throw new LayoutValidationError(message, field, config, { zodError: error });
    }
    throw new LayoutValidationError('Layout animation configuration validation failed', 'config', config);
  }
}

/**
 * Safe validation functions that return validation results
 */

export function safeValidateLayoutConfig(config: unknown): { success: boolean; data?: any; error?: LayoutValidationError } {
  try {
    const data = validateLayoutConfig(config);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as LayoutValidationError };
  }
}

export function safeValidateNavigationItem(item: unknown): { success: boolean; data?: any; error?: LayoutValidationError } {
  try {
    const data = validateNavigationItem(item);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as LayoutValidationError };
  }
}

export function safeValidateUser(user: unknown): { success: boolean; data?: any; error?: LayoutValidationError } {
  try {
    const data = validateUser(user);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as LayoutValidationError };
  }
}

/**
 * Layout-specific validation helpers
 */

export function validateBreakpointOrder(breakpoints: { mobile: number; tablet: number; desktop: number; wide: number }): boolean {
  return breakpoints.mobile < breakpoints.tablet && 
         breakpoints.tablet < breakpoints.desktop && 
         breakpoints.desktop < breakpoints.wide;
}

export function validateLayoutConsistency(config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if sidebar is shown but state is hidden
  if (config.showSidebar && config.sidebarState === 'hidden') {
    errors.push('Cannot show sidebar when sidebar state is hidden');
  }

  // Check if header is hidden but footer is sticky
  if (!config.showHeader && config.footerStyle === 'sticky') {
    errors.push('Sticky footer requires header to be shown for proper layout');
  }

  // Check mobile optimization consistency
  if (config.enableMobileOptimization && config.type === 'desktop') {
    errors.push('Mobile optimization should not be enabled for desktop-only layouts');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateAccessibilityRequirements(config: any): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!config.enableAccessibility) {
    warnings.push('Accessibility features are disabled - consider enabling for better user experience');
  }

  if (config.headerStyle === 'transparent' && !config.enableAccessibility) {
    warnings.push('Transparent headers may cause accessibility issues without proper contrast');
  }

  return {
    isValid: true, // Warnings don't make config invalid
    warnings
  };
}