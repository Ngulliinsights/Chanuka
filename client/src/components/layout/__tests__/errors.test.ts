import { describe, it, expect } from 'vitest';
import {
  LayoutError,
  LayoutErrorType,
  LayoutConfigurationError,
  LayoutValidationError,
  LayoutRenderError,
  LayoutResponsiveError,
  LayoutAccessibilityError,
  LayoutPerformanceError,
  LayoutNavigationError,
  LayoutUserError,
  LayoutBreakpointError,
  createLayoutConfigError,
  createLayoutValidationError,
  createLayoutRenderError,
  createLayoutResponsiveError,
  createLayoutAccessibilityError,
  createLayoutPerformanceError,
  createLayoutNavigationError,
  createLayoutUserError,
  createLayoutBreakpointError,
  isLayoutError,
  isLayoutConfigurationError,
  isLayoutValidationError,
  isLayoutRenderError,
  isLayoutResponsiveError,
  isLayoutAccessibilityError,
  isLayoutPerformanceError,
  isLayoutNavigationError,
  isLayoutUserError,
  isLayoutBreakpointError
} from '../errors';

describe('Layout Errors', () => {
  describe('LayoutError', () => {
    it('should create a basic layout error', () => {
      const error = new LayoutError('Test error message');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('LayoutError');
      expect(error.message).toBe('Test error message');
      expect(error.type).toBe(LayoutErrorType.LAYOUT_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should create a layout error with custom type and status code', () => {
      const error = new LayoutError(
        'Custom error',
        LayoutErrorType.LAYOUT_CONFIGURATION_ERROR,
        500,
        { customDetail: 'test' }
      );
      
      expect(error.message).toBe('Custom error');
      expect(error.type).toBe(LayoutErrorType.LAYOUT_CONFIGURATION_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ customDetail: 'test' });
    });

    it('should maintain proper stack trace', () => {
      const error = new LayoutError('Test error');
      expect(error.stack).toBeDefined();
    });
  });

  describe('LayoutConfigurationError', () => {
    it('should create a configuration error', () => {
      const error = new LayoutConfigurationError('Invalid config', 'sidebarState');
      
      expect(error).toBeInstanceOf(LayoutError);
      expect(error.type).toBe(LayoutErrorType.LAYOUT_CONFIGURATION_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details?.configKey).toBe('sidebarState');
    });

    it('should create a configuration error with additional details', () => {
      const error = new LayoutConfigurationError(
        'Invalid config',
        'headerStyle',
        { expectedValues: ['default', 'minimal'] }
      );
      
      expect(error.details?.configKey).toBe('headerStyle');
      expect(error.details?.expectedValues).toEqual(['default', 'minimal']);
    });
  });

  describe('LayoutValidationError', () => {
    it('should create a validation error', () => {
      const error = new LayoutValidationError('Validation failed', 'email', 'invalid-email');
      
      expect(error).toBeInstanceOf(LayoutError);
      expect(error.type).toBe(LayoutErrorType.LAYOUT_VALIDATION_ERROR);
      expect(error.statusCode).toBe(422);
      expect(error.details?.field).toBe('email');
      expect(error.details?.value).toBe('invalid-email');
    });
  });

  describe('LayoutRenderError', () => {
    it('should create a render error', () => {
      const error = new LayoutRenderError('Render failed', 'AppLayout');
      
      expect(error).toBeInstanceOf(LayoutError);
      expect(error.type).toBe(LayoutErrorType.LAYOUT_RENDER_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.message).toContain('AppLayout');
      expect(error.details?.component).toBe('AppLayout');
    });

    it('should create a render error without component', () => {
      const error = new LayoutRenderError('Render failed');
      
      expect(error.message).toBe('Layout render error: Render failed');
    });
  });

  describe('LayoutResponsiveError', () => {
    it('should create a responsive error', () => {
      const error = new LayoutResponsiveError('Breakpoint failed', 'mobile', 320);
      
      expect(error).toBeInstanceOf(LayoutError);
      expect(error.type).toBe(LayoutErrorType.LAYOUT_RESPONSIVE_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('mobile');
      expect(error.details?.breakpoint).toBe('mobile');
      expect(error.details?.currentWidth).toBe(320);
    });
  });

  describe('LayoutAccessibilityError', () => {
    it('should create an accessibility error', () => {
      const error = new LayoutAccessibilityError('Missing ARIA label', 'keyboard-navigation', 'button');
      
      expect(error).toBeInstanceOf(LayoutError);
      expect(error.type).toBe(LayoutErrorType.LAYOUT_ACCESSIBILITY_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('keyboard-navigation');
      expect(error.details?.accessibilityFeature).toBe('keyboard-navigation');
      expect(error.details?.element).toBe('button');
    });
  });

  describe('LayoutPerformanceError', () => {
    it('should create a performance error', () => {
      const error = new LayoutPerformanceError('Performance threshold exceeded', 'renderTime', 100, 150);
      
      expect(error).toBeInstanceOf(LayoutError);
      expect(error.type).toBe(LayoutErrorType.LAYOUT_PERFORMANCE_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('renderTime');
      expect(error.details?.metric).toBe('renderTime');
      expect(error.details?.threshold).toBe(100);
      expect(error.details?.actualValue).toBe(150);
    });
  });

  describe('LayoutNavigationError', () => {
    it('should create a navigation error', () => {
      const error = new LayoutNavigationError('Navigation failed', 'home', '/');
      
      expect(error).toBeInstanceOf(LayoutError);
      expect(error.type).toBe(LayoutErrorType.LAYOUT_NAVIGATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('home');
      expect(error.details?.navigationItem).toBe('home');
      expect(error.details?.href).toBe('/');
    });
  });

  describe('LayoutUserError', () => {
    it('should create a user error', () => {
      const error = new LayoutUserError('User access denied', 'user-123', 'citizen');
      
      expect(error).toBeInstanceOf(LayoutError);
      expect(error.type).toBe(LayoutErrorType.LAYOUT_USER_ERROR);
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('user-123');
      expect(error.details?.userId).toBe('user-123');
      expect(error.details?.userRole).toBe('citizen');
    });
  });

  describe('LayoutBreakpointError', () => {
    it('should create a breakpoint error', () => {
      const error = new LayoutBreakpointError('Invalid breakpoint', 'mobile', { min: 320, max: 768 }, 1024);
      
      expect(error).toBeInstanceOf(LayoutError);
      expect(error.type).toBe(LayoutErrorType.LAYOUT_BREAKPOINT_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('mobile');
      expect(error.details?.breakpoint).toBe('mobile');
      expect(error.details?.expectedRange).toEqual({ min: 320, max: 768 });
      expect(error.details?.actualValue).toBe(1024);
    });
  });

  describe('Error factory functions', () => {
    describe('createLayoutConfigError', () => {
      it('should create a configuration error', () => {
        const error = createLayoutConfigError('sidebarState', 'string', 123);
        
        expect(error).toBeInstanceOf(LayoutConfigurationError);
        expect(error.message).toContain('sidebarState');
        expect(error.message).toContain('string');
        expect(error.details?.expectedType).toBe('string');
        expect(error.details?.actualValue).toBe(123);
      });
    });

    describe('createLayoutValidationError', () => {
      it('should create a validation error', () => {
        const error = createLayoutValidationError('email', 'must be valid email', 'invalid');
        
        expect(error).toBeInstanceOf(LayoutValidationError);
        expect(error.message).toContain('email');
        expect(error.message).toContain('must be valid email');
        expect(error.details?.constraint).toBe('must be valid email');
      });
    });

    describe('createLayoutRenderError', () => {
      it('should create a render error', () => {
        const error = createLayoutRenderError('AppLayout', 'Component failed to render', { prop: 'value' });
        
        expect(error).toBeInstanceOf(LayoutRenderError);
        expect(error.message).toBe('Component failed to render');
        expect(error.details?.component).toBe('AppLayout');
        expect(error.details?.props).toEqual({ prop: 'value' });
      });
    });

    describe('createLayoutResponsiveError', () => {
      it('should create a responsive error', () => {
        const error = createLayoutResponsiveError('mobile', 320, 'show mobile navigation');
        
        expect(error).toBeInstanceOf(LayoutResponsiveError);
        expect(error.message).toContain('show mobile navigation');
        expect(error.details?.breakpoint).toBe('mobile');
        expect(error.details?.currentWidth).toBe(320);
        expect(error.details?.expectedBehavior).toBe('show mobile navigation');
      });
    });

    describe('createLayoutAccessibilityError', () => {
      it('should create an accessibility error', () => {
        const error = createLayoutAccessibilityError('keyboard-nav', 'button', 'ARIA label');
        
        expect(error).toBeInstanceOf(LayoutAccessibilityError);
        expect(error.message).toContain('ARIA label');
        expect(error.details?.accessibilityFeature).toBe('keyboard-nav');
        expect(error.details?.element).toBe('button');
        expect(error.details?.requirement).toBe('ARIA label');
      });
    });

    describe('createLayoutPerformanceError', () => {
      it('should create a performance error', () => {
        const error = createLayoutPerformanceError('renderTime', 100, 150, 'Optimize rendering');
        
        expect(error).toBeInstanceOf(LayoutPerformanceError);
        expect(error.message).toContain('renderTime');
        expect(error.message).toContain('150 > 100');
        expect(error.message).toContain('Optimize rendering');
        expect(error.details?.recommendation).toBe('Optimize rendering');
      });
    });

    describe('createLayoutNavigationError', () => {
      it('should create a navigation error', () => {
        const error = createLayoutNavigationError('home', '/', 'Access denied');
        
        expect(error).toBeInstanceOf(LayoutNavigationError);
        expect(error.message).toContain('Access denied');
        expect(error.details?.navigationItem).toBe('home');
        expect(error.details?.href).toBe('/');
        expect(error.details?.reason).toBe('Access denied');
      });
    });

    describe('createLayoutUserError', () => {
      it('should create a user error', () => {
        const error = createLayoutUserError('user-123', 'citizen', 'admin', 'access admin panel');
        
        expect(error).toBeInstanceOf(LayoutUserError);
        expect(error.message).toContain('citizen');
        expect(error.message).toContain('admin');
        expect(error.message).toContain('access admin panel');
        expect(error.details?.requiredRole).toBe('admin');
        expect(error.details?.action).toBe('access admin panel');
      });
    });

    describe('createLayoutBreakpointError', () => {
      it('should create a breakpoint error', () => {
        const error = createLayoutBreakpointError('mobile', { min: 320, max: 768 }, 1024);
        
        expect(error).toBeInstanceOf(LayoutBreakpointError);
        expect(error.message).toContain('1024');
        expect(error.message).toContain('320-768');
        expect(error.details?.expectedRange).toEqual({ min: 320, max: 768 });
        expect(error.details?.actualValue).toBe(1024);
      });
    });
  });

  describe('Error type guards', () => {
    const layoutError = new LayoutError('test');
    const configError = new LayoutConfigurationError('test');
    const validationError = new LayoutValidationError('test', 'field', 'value');
    const renderError = new LayoutRenderError('test');
    const responsiveError = new LayoutResponsiveError('test');
    const accessibilityError = new LayoutAccessibilityError('test');
    const performanceError = new LayoutPerformanceError('test');
    const navigationError = new LayoutNavigationError('test');
    const userError = new LayoutUserError('test');
    const breakpointError = new LayoutBreakpointError('test');
    const regularError = new Error('test');

    it('should correctly identify LayoutError', () => {
      expect(isLayoutError(layoutError)).toBe(true);
      expect(isLayoutError(configError)).toBe(true);
      expect(isLayoutError(regularError)).toBe(false);
    });

    it('should correctly identify LayoutConfigurationError', () => {
      expect(isLayoutConfigurationError(configError)).toBe(true);
      expect(isLayoutConfigurationError(layoutError)).toBe(false);
      expect(isLayoutConfigurationError(regularError)).toBe(false);
    });

    it('should correctly identify LayoutValidationError', () => {
      expect(isLayoutValidationError(validationError)).toBe(true);
      expect(isLayoutValidationError(layoutError)).toBe(false);
      expect(isLayoutValidationError(regularError)).toBe(false);
    });

    it('should correctly identify LayoutRenderError', () => {
      expect(isLayoutRenderError(renderError)).toBe(true);
      expect(isLayoutRenderError(layoutError)).toBe(false);
      expect(isLayoutRenderError(regularError)).toBe(false);
    });

    it('should correctly identify LayoutResponsiveError', () => {
      expect(isLayoutResponsiveError(responsiveError)).toBe(true);
      expect(isLayoutResponsiveError(layoutError)).toBe(false);
      expect(isLayoutResponsiveError(regularError)).toBe(false);
    });

    it('should correctly identify LayoutAccessibilityError', () => {
      expect(isLayoutAccessibilityError(accessibilityError)).toBe(true);
      expect(isLayoutAccessibilityError(layoutError)).toBe(false);
      expect(isLayoutAccessibilityError(regularError)).toBe(false);
    });

    it('should correctly identify LayoutPerformanceError', () => {
      expect(isLayoutPerformanceError(performanceError)).toBe(true);
      expect(isLayoutPerformanceError(layoutError)).toBe(false);
      expect(isLayoutPerformanceError(regularError)).toBe(false);
    });

    it('should correctly identify LayoutNavigationError', () => {
      expect(isLayoutNavigationError(navigationError)).toBe(true);
      expect(isLayoutNavigationError(layoutError)).toBe(false);
      expect(isLayoutNavigationError(regularError)).toBe(false);
    });

    it('should correctly identify LayoutUserError', () => {
      expect(isLayoutUserError(userError)).toBe(true);
      expect(isLayoutUserError(layoutError)).toBe(false);
      expect(isLayoutUserError(regularError)).toBe(false);
    });

    it('should correctly identify LayoutBreakpointError', () => {
      expect(isLayoutBreakpointError(breakpointError)).toBe(true);
      expect(isLayoutBreakpointError(layoutError)).toBe(false);
      expect(isLayoutBreakpointError(regularError)).toBe(false);
    });
  });
});