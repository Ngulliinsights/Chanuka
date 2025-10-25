import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { 
import { logger } from '@shared/core';
  isNavigationPathActive, 
  getActiveStateClasses,
  getActiveIconClasses,
  getActiveTextClasses,
  getRoleBasedActiveClasses
} from '../active-state';

describe('Active State Utilities', () => {
  describe('isNavigationPathActive', () => {
    it('should correctly identify home page as active', () => {
      expect(isNavigationPathActive('/', '/')).toBe(true);
      expect(isNavigationPathActive('/', '/bills')).toBe(false);
    });

    it('should handle exact match paths correctly', () => {
      expect(isNavigationPathActive('/bills', '/bills')).toBe(true);
      expect(isNavigationPathActive('/bills', '/bills/123')).toBe(false);
      expect(isNavigationPathActive('/dashboard', '/dashboard')).toBe(true);
      expect(isNavigationPathActive('/dashboard', '/dashboard/settings')).toBe(false);
    });

    it('should handle nested routes correctly', () => {
      expect(isNavigationPathActive('/admin/users', '/admin/users')).toBe(true);
      expect(isNavigationPathActive('/admin/users', '/admin/users/123')).toBe(true);
      expect(isNavigationPathActive('/admin', '/admin/users')).toBe(true);
    });

    it('should not match root path for nested routes', () => {
      expect(isNavigationPathActive('/', '/bills')).toBe(false);
      expect(isNavigationPathActive('/', '/dashboard')).toBe(false);
    });
  });

  describe('getActiveStateClasses', () => {
    it('should return correct active classes for desktop variant', () => {
      const activeClasses = getActiveStateClasses(true, 'desktop');
      expect(activeClasses).toContain('bg-blue-50');
      expect(activeClasses).toContain('text-blue-700');
      expect(activeClasses).toContain('border-blue-200');
      expect(activeClasses).toContain('font-semibold');
      expect(activeClasses).toContain('scale-[1.02]');
    });

    it('should return correct inactive classes for desktop variant', () => {
      const inactiveClasses = getActiveStateClasses(false, 'desktop');
      expect(inactiveClasses).toContain('text-gray-700');
      expect(inactiveClasses).toContain('hover:bg-gray-50');
      expect(inactiveClasses).toContain('active:scale-[0.98]');
    });

    it('should return correct active classes for mobile-bottom variant', () => {
      const activeClasses = getActiveStateClasses(true, 'mobile-bottom');
      expect(activeClasses).toContain('bg-blue-50');
      expect(activeClasses).toContain('text-blue-700');
      expect(activeClasses).toContain('scale-105');
    });

    it('should return correct inactive classes for mobile-bottom variant', () => {
      const inactiveClasses = getActiveStateClasses(false, 'mobile-bottom');
      expect(inactiveClasses).toContain('text-gray-500');
      expect(inactiveClasses).toContain('active:scale-95');
      expect(inactiveClasses).toContain('touch-manipulation');
    });
  });

  describe('getActiveIconClasses', () => {
    it('should return correct active icon classes', () => {
      const activeClasses = getActiveIconClasses(true);
      expect(activeClasses).toContain('scale-110');
      expect(activeClasses).toContain('text-blue-600');
    });

    it('should return base classes for inactive icons', () => {
      const inactiveClasses = getActiveIconClasses(false);
      expect(inactiveClasses).toContain('transition-transform');
      expect(inactiveClasses).not.toContain('scale-110');
    });
  });

  describe('getActiveTextClasses', () => {
    it('should return correct active text classes', () => {
      const activeClasses = getActiveTextClasses(true);
      expect(activeClasses).toContain('font-semibold');
    });

    it('should return correct inactive text classes', () => {
      const inactiveClasses = getActiveTextClasses(false);
      expect(inactiveClasses).toContain('font-medium');
      expect(inactiveClasses).not.toContain('font-semibold');
    });
  });

  describe('getRoleBasedActiveClasses', () => {
    it('should return correct active classes regardless of role', () => {
      const activeClasses = getRoleBasedActiveClasses(true, false, false);
      expect(activeClasses).toContain('bg-blue-50');
      expect(activeClasses).toContain('text-blue-700');
      expect(activeClasses).toContain('font-semibold');
    });

    it('should return admin-specific classes for admin-only items', () => {
      const adminClasses = getRoleBasedActiveClasses(false, true, false);
      expect(adminClasses).toContain('text-red-700');
      expect(adminClasses).toContain('hover:bg-red-50');
      expect(adminClasses).toContain('border-red-200');
    });

    it('should return expert-specific classes for expert items', () => {
      const expertClasses = getRoleBasedActiveClasses(false, false, true);
      expect(expertClasses).toContain('text-purple-700');
      expect(expertClasses).toContain('hover:bg-purple-50');
      expect(expertClasses).toContain('border-purple-200');
    });

    it('should return default classes for regular items', () => {
      const defaultClasses = getRoleBasedActiveClasses(false, false, false);
      expect(defaultClasses).toContain('text-gray-700');
      expect(defaultClasses).toContain('hover:bg-gray-50');
      expect(defaultClasses).toContain('border-gray-200');
    });
  });
});











































