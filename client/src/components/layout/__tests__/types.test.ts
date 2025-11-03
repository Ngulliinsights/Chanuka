import { describe, it, expect } from 'vitest';
import {
  LayoutType,
  LayoutBreakpoint,
  SidebarState,
  HeaderStyle,
  FooterStyle,
  LayoutConfig,
  NavigationItem,
  User,
  UserPreferences
} from '@shared/core/src/types';

describe('Layout Types', () => {
  describe('LayoutType', () => {
    it('should include all expected layout types', () => {
      const validTypes: LayoutType[] = ['app', 'auth', 'landing', 'admin', 'mobile'];
      expect(validTypes).toHaveLength(5);
      expect(validTypes).toContain('app');
      expect(validTypes).toContain('auth');
      expect(validTypes).toContain('landing');
      expect(validTypes).toContain('admin');
      expect(validTypes).toContain('mobile');
    });
  });

  describe('LayoutBreakpoint', () => {
    it('should include all expected breakpoints', () => {
      const validBreakpoints: LayoutBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];
      expect(validBreakpoints).toHaveLength(4);
      expect(validBreakpoints).toContain('mobile');
      expect(validBreakpoints).toContain('tablet');
      expect(validBreakpoints).toContain('desktop');
      expect(validBreakpoints).toContain('wide');
    });
  });

  describe('SidebarState', () => {
    it('should include all expected sidebar states', () => {
      const validStates: SidebarState[] = ['expanded', 'collapsed', 'hidden'];
      expect(validStates).toHaveLength(3);
      expect(validStates).toContain('expanded');
      expect(validStates).toContain('collapsed');
      expect(validStates).toContain('hidden');
    });
  });

  describe('HeaderStyle', () => {
    it('should include all expected header styles', () => {
      const validStyles: HeaderStyle[] = ['default', 'minimal', 'transparent', 'fixed'];
      expect(validStyles).toHaveLength(4);
      expect(validStyles).toContain('default');
      expect(validStyles).toContain('minimal');
      expect(validStyles).toContain('transparent');
      expect(validStyles).toContain('fixed');
    });
  });

  describe('FooterStyle', () => {
    it('should include all expected footer styles', () => {
      const validStyles: FooterStyle[] = ['default', 'minimal', 'hidden', 'sticky'];
      expect(validStyles).toHaveLength(4);
      expect(validStyles).toContain('default');
      expect(validStyles).toContain('minimal');
      expect(validStyles).toContain('hidden');
      expect(validStyles).toContain('sticky');
    });
  });

  describe('LayoutConfig', () => {
    it('should have all required properties', () => {
      const config: LayoutConfig = {
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

      expect(config.type).toBe('app');
      expect(config.showSidebar).toBe(true);
      expect(config.showHeader).toBe(true);
      expect(config.showFooter).toBe(true);
      expect(config.sidebarState).toBe('expanded');
      expect(config.headerStyle).toBe('default');
      expect(config.footerStyle).toBe('default');
      expect(config.enableMobileOptimization).toBe(true);
      expect(config.enableAccessibility).toBe(true);
      expect(config.enablePerformanceOptimization).toBe(true);
    });
  });

  describe('NavigationItem', () => {
    it('should have all required properties', () => {
      const item: NavigationItem = {
        id: 'test-item',
        label: 'Test Item',
        href: '/test',
        icon: null
      };

      expect(item.id).toBe('test-item');
      expect(item.label).toBe('Test Item');
      expect(item.href).toBe('/test');
      expect(item.icon).toBeNull();
    });

    it('should support optional properties', () => {
      const item: NavigationItem = {
        id: 'test-item',
        label: 'Test Item',
        href: '/test',
        icon: null,
        badge: 5,
        disabled: true,
        requiresAuth: true,
        adminOnly: false,
        section: 'main',
        priority: 10
      };

      expect(item.badge).toBe(5);
      expect(item.disabled).toBe(true);
      expect(item.requiresAuth).toBe(true);
      expect(item.adminOnly).toBe(false);
      expect(item.section).toBe('main');
      expect(item.priority).toBe(10);
    });
  });

  describe('User', () => {
    it('should have all required properties', () => {
      const user: User = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'citizen'
      };

      expect(users.id).toBe('user-123');
      expect(users.name).toBe('John Doe');
      expect(users.email).toBe('john@example.com');
      expect(users.role).toBe('citizen');
    });

    it('should support optional properties', () => {
      const preferences: UserPreferences = {
        theme: 'dark',
        sidebarCollapsed: true,
        enableAnimations: false,
        enableNotifications: true,
        language: 'en'
      };

      const user: User = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        avatar: 'https://example.com/avatar.jpg',
        preferences
      };

      expect(users.avatar).toBe('https://example.com/avatar.jpg');
      expect(users.preferences).toEqual(preferences);
    });
  });

  describe('UserPreferences', () => {
    it('should have all required properties', () => {
      const preferences: UserPreferences = {
        theme: 'light',
        sidebarCollapsed: false,
        enableAnimations: true,
        enableNotifications: true,
        language: 'en'
      };

      expect(preferences.theme).toBe('light');
      expect(preferences.sidebarCollapsed).toBe(false);
      expect(preferences.enableAnimations).toBe(true);
      expect(preferences.enableNotifications).toBe(true);
      expect(preferences.language).toBe('en');
    });

    it('should support all theme options', () => {
      const themes = ['light', 'dark', 'system'] as const;
      
      themes.forEach(theme => {
        const preferences: UserPreferences = {
          theme,
          sidebarCollapsed: false,
          enableAnimations: true,
          enableNotifications: true,
          language: 'en'
        };
        expect(preferences.theme).toBe(theme);
      });
    });
  });
});

