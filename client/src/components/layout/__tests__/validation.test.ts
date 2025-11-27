import { describe, it, expect } from 'vitest';
import {
  validateLayoutConfig,
  validateNavigationItem,
  validateUser,
  validateHeaderAction,
  safeValidateLayoutConfig,
  safeValidateNavigationItem,
  safeValidateUser,
  validateBreakpointOrder,
  validateLayoutConsistency,
  validateAccessibilityRequirements,
  LayoutConfigSchema,
  NavigationItemSchema,
  UserSchema
} from '@client/validation';
import { LayoutValidationError } from '@client/errors';

describe('Layout Validation', () => {
  describe('validateLayoutConfig', () => {
    it('should validate a correct layout configuration', () => {
      const validConfig = {
        type: 'app',
        showSidebar: true,
        showHeader: true,
        showFooter: true,
        sidebarState: 'expanded',
        headerStyle: 'default',
        footerStyle: 'default',
        enableMobileOptimization: true,
        enableAccessibility: true,
        enablePerformanceOptimization: true,
      };

      expect(() => validateLayoutConfig(validConfig)).not.toThrow();
      const result = validateLayoutConfig(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should throw LayoutValidationError for invalid type', () => {
      const invalidConfig = {
        type: 'invalid-type',
        showSidebar: true,
        showHeader: true,
        showFooter: true,
        sidebarState: 'expanded',
        headerStyle: 'default',
        footerStyle: 'default',
        enableMobileOptimization: true,
        enableAccessibility: true,
        enablePerformanceOptimization: true,
      };

      expect(() => validateLayoutConfig(invalidConfig)).toThrow(LayoutValidationError);
    });

    it('should throw LayoutValidationError for missing required fields', () => {
      const incompleteConfig = {
        type: 'app',
        showSidebar: true,
        // Missing other required fields
      };

      expect(() => validateLayoutConfig(incompleteConfig)).toThrow(LayoutValidationError);
    });

    it('should throw LayoutValidationError for invalid boolean values', () => {
      const invalidConfig = {
        type: 'app',
        showSidebar: 'true', // Should be boolean
        showHeader: true,
        showFooter: true,
        sidebarState: 'expanded',
        headerStyle: 'default',
        footerStyle: 'default',
        enableMobileOptimization: true,
        enableAccessibility: true,
        enablePerformanceOptimization: true,
      };

      expect(() => validateLayoutConfig(invalidConfig)).toThrow(LayoutValidationError);
    });
  });

  describe('validateNavigationItem', () => {
    it('should validate a correct navigation item', () => {
      const validItem = {
        id: 'home',
        label: 'Home',
        href: '/home',
        badge: 5,
        disabled: false,
        requiresAuth: true,
        adminOnly: false,
        section: 'main',
        priority: 10
      };

      expect(() => validateNavigationItem(validItem)).not.toThrow();
      const result = validateNavigationItem(validItem);
      expect(result.id).toBe('home');
      expect(result.label).toBe('Home');
      expect(result.href).toBe('/home');
    });

    it('should throw LayoutValidationError for empty id', () => {
      const invalidItem = {
        id: '',
        label: 'Home',
        href: '/home'
      };

      expect(() => validateNavigationItem(invalidItem)).toThrow(LayoutValidationError);
    });

    it('should throw LayoutValidationError for invalid href format', () => {
      const invalidItem = {
        id: 'home',
        label: 'Home',
        href: 'invalid-href' // Should start with /
      };

      expect(() => validateNavigationItem(invalidItem)).toThrow(LayoutValidationError);
    });

    it('should throw LayoutValidationError for label too long', () => {
      const invalidItem = {
        id: 'home',
        label: 'A'.repeat(101), // Too long
        href: '/home'
      };

      expect(() => validateNavigationItem(invalidItem)).toThrow(LayoutValidationError);
    });

    it('should validate optional fields', () => {
      const minimalItem = {
        id: 'home',
        label: 'Home',
        href: '/home'
      };

      expect(() => validateNavigationItem(minimalItem)).not.toThrow();
    });
  });

  describe('validateUser', () => {
    it('should validate a correct user', () => {
      const validUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'citizen',
        avatar: 'https://example.com/avatar.jpg',
        preferences: {
          theme: 'light',
          sidebarCollapsed: false,
          enableAnimations: true,
          enableNotifications: true,
          language: 'en'
        }
      };

      expect(() => validateUser(validUser)).not.toThrow();
      const result = validateUser(validUser);
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('john@example.com');
    });

    it('should throw LayoutValidationError for invalid email', () => {
      const invalidUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'invalid-email',
        role: 'citizen'
      };

      expect(() => validateUser(invalidUser)).toThrow(LayoutValidationError);
    });

    it('should throw LayoutValidationError for invalid role', () => {
      const invalidUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'invalid-role'
      };

      expect(() => validateUser(invalidUser)).toThrow(LayoutValidationError);
    });

    it('should validate minimal user', () => {
      const minimalUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'public'
      };

      expect(() => validateUser(minimalUser)).not.toThrow();
    });
  });

  describe('validateHeaderAction', () => {
    it('should validate a correct header action', () => {
      const validAction = {
        id: 'search',
        label: 'Search',
        onClick: () => {},
        badge: 3,
        disabled: false,
        className: 'custom-class'
      };

      expect(() => validateHeaderAction(validAction)).not.toThrow();
    });

    it('should throw LayoutValidationError for empty id', () => {
      const invalidAction = {
        id: '',
        label: 'Search',
        onClick: () => {}
      };

      expect(() => validateHeaderAction(invalidAction)).toThrow(LayoutValidationError);
    });

    it('should throw LayoutValidationError for label too long', () => {
      const invalidAction = {
        id: 'search',
        label: 'A'.repeat(51), // Too long
        onClick: () => {}
      };

      expect(() => validateHeaderAction(invalidAction)).toThrow(LayoutValidationError);
    });
  });

  describe('Safe validation functions', () => {
    describe('safeValidateLayoutConfig', () => {
      it('should return success for valid config', () => {
        const validConfig = {
          type: 'app',
          showSidebar: true,
          showHeader: true,
          showFooter: true,
          sidebarState: 'expanded',
          headerStyle: 'default',
          footerStyle: 'default',
          enableMobileOptimization: true,
          enableAccessibility: true,
          enablePerformanceOptimization: true,
        };

        const result = safeValidateLayoutConfig(validConfig);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validConfig);
        expect(result.error).toBeUndefined();
      });

      it('should return error for invalid config', () => {
        const invalidConfig = {
          type: 'invalid-type'
        };

        const result = safeValidateLayoutConfig(invalidConfig);
        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBeInstanceOf(LayoutValidationError);
      });
    });

    describe('safeValidateNavigationItem', () => {
      it('should return success for valid item', () => {
        const validItem = {
          id: 'home',
          label: 'Home',
          href: '/home'
        };

        const result = safeValidateNavigationItem(validItem);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validItem);
        expect(result.error).toBeUndefined();
      });

      it('should return error for invalid item', () => {
        const invalidItem = {
          id: '',
          label: 'Home',
          href: '/home'
        };

        const result = safeValidateNavigationItem(invalidItem);
        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBeInstanceOf(LayoutValidationError);
      });
    });

    describe('safeValidateUser', () => {
      it('should return success for valid user', () => {
        const validUser = {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'citizen'
        };

        const result = safeValidateUser(validUser);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validUser);
        expect(result.error).toBeUndefined();
      });

      it('should return error for invalid user', () => {
        const invalidUser = {
          id: 'user-123',
          name: 'John Doe',
          email: 'invalid-email',
          role: 'citizen'
        };

        const result = safeValidateUser(invalidUser);
        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBeInstanceOf(LayoutValidationError);
      });
    });
  });

  describe('Layout-specific validation helpers', () => {
    describe('validateBreakpointOrder', () => {
      it('should return true for correct breakpoint order', () => {
        const breakpoints = {
          mobile: 320,
          tablet: 768,
          desktop: 1024,
          wide: 1440
        };

        expect(validateBreakpointOrder(breakpoints)).toBe(true);
      });

      it('should return false for incorrect breakpoint order', () => {
        const breakpoints = {
          mobile: 768,
          tablet: 320, // Wrong order
          desktop: 1024,
          wide: 1440
        };

        expect(validateBreakpointOrder(breakpoints)).toBe(false);
      });
    });

    describe('validateLayoutConsistency', () => {
      it('should return valid for consistent config', () => {
        const config = {
          showSidebar: true,
          sidebarState: 'expanded',
          showHeader: true,
          footerStyle: 'default',
          enableMobileOptimization: true,
          type: 'app'
        };

        const result = validateLayoutConsistency(config);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return errors for inconsistent config', () => {
        const config = {
          showSidebar: true,
          sidebarState: 'hidden', // Inconsistent
          showHeader: false,
          footerStyle: 'sticky', // Inconsistent with hidden header
          enableMobileOptimization: true,
          type: 'desktop' // Inconsistent with mobile optimization
        };

        const result = validateLayoutConsistency(config);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('validateAccessibilityRequirements', () => {
      it('should return valid with warnings for disabled accessibility', () => {
        const config = {
          enableAccessibility: false,
          headerStyle: 'default'
        };

        const result = validateAccessibilityRequirements(config);
        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
      });

      it('should return warnings for transparent header without accessibility', () => {
        const config = {
          enableAccessibility: false,
          headerStyle: 'transparent'
        };

        const result = validateAccessibilityRequirements(config);
        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(1);
      });

      it('should return no warnings for enabled accessibility', () => {
        const config = {
          enableAccessibility: true,
          headerStyle: 'default'
        };

        const result = validateAccessibilityRequirements(config);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });
    });
  });
});

