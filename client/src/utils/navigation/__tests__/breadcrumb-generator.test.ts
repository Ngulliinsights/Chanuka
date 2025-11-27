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

import { generateBreadcrumbs, getPageTitle } from '@client/breadcrumb-generator';
import { logger } from '../../logger';

describe('breadcrumb-generator', () => {
  describe('generateBreadcrumbs', () => {
    it('should generate breadcrumbs for home page', () => {
      const breadcrumbs = generateBreadcrumbs('/');
      
      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]).toEqual({
        label: 'Home',
        path: '/',
        is_active: true,
      });
    });

    it('should generate breadcrumbs for bills dashboard', () => {
      const breadcrumbs = generateBreadcrumbs('/bills');
      
      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0]).toEqual({
        label: 'Home',
        path: '/',
        is_active: false,
      });
      expect(breadcrumbs[1]).toEqual({
        label: 'Bills',
        path: '/bills',
        is_active: true,
      });
    });

    it('should generate breadcrumbs for bill detail page', () => {
      const breadcrumbs = generateBreadcrumbs('/bills/123');
      
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]).toEqual({
        label: 'Home',
        path: '/',
        is_active: false,
      });
      expect(breadcrumbs[1]).toEqual({
        label: 'Bills',
        path: '/bills',
        is_active: false,
      });
      expect(breadcrumbs[2]).toEqual({
        label: 'Bill Details',
        path: '/bills/123',
        is_active: true,
      });
    });

    it('should generate breadcrumbs for bill analysis page', () => {
      const breadcrumbs = generateBreadcrumbs('/bills/456/analysis');
      
      expect(breadcrumbs).toHaveLength(4);
      expect(breadcrumbs[0]).toEqual({
        label: 'Home',
        path: '/',
        is_active: false,
      });
      expect(breadcrumbs[1]).toEqual({
        label: 'Bills',
        path: '/bills',
        is_active: false,
      });
      expect(breadcrumbs[2]).toEqual({
        label: 'Bill Details',
        path: '/bills/456',
        is_active: false,
      });
      expect(breadcrumbs[3]).toEqual({
        label: 'Analysis',
        path: '/bills/456/analysis',
        is_active: true,
      });
    });

    it('should generate breadcrumbs for nested sponsorship analysis pages', () => {
      const breadcrumbs = generateBreadcrumbs('/bills/789/sponsorship-analysis/overview');
      
      expect(breadcrumbs).toHaveLength(5);
      expect(breadcrumbs[0]).toEqual({
        label: 'Home',
        path: '/',
        is_active: false,
      });
      expect(breadcrumbs[1]).toEqual({
        label: 'Bills',
        path: '/bills',
        is_active: false,
      });
      expect(breadcrumbs[2]).toEqual({
        label: 'Bill Details',
        path: '/bills/789',
        is_active: false,
      });
      expect(breadcrumbs[3]).toEqual({
        label: 'Sponsorship Analysis',
        path: '/bills/789/sponsorship-analysis',
        is_active: false,
      });
      expect(breadcrumbs[4]).toEqual({
        label: 'Overview',
        path: '/bills/789/sponsorship-analysis/overview',
        is_active: true,
      });
    });

    it('should generate breadcrumbs for admin pages', () => {
      const breadcrumbs = generateBreadcrumbs('/admin/database');
      
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]).toEqual({
        label: 'Home',
        path: '/',
        is_active: false,
      });
      expect(breadcrumbs[1]).toEqual({
        label: 'Admin Panel',
        path: '/admin',
        is_active: false,
      });
      expect(breadcrumbs[2]).toEqual({
        label: 'Database Management',
        path: '/admin/database',
        is_active: true,
      });
    });

    it('should handle unknown routes gracefully', () => {
      const breadcrumbs = generateBreadcrumbs('/unknown/route');
      
      expect(breadcrumbs).toHaveLength(0);
    });
  });

  describe('getPageTitle', () => {
    it('should return correct title for home page', () => {
      expect(getPageTitle('/')).toBe('Home');
    });

    it('should return correct title for bills dashboard', () => {
      expect(getPageTitle('/bills')).toBe('Bills');
    });

    it('should return correct title for bill detail with ID', () => {
      expect(getPageTitle('/bills/123')).toBe('Bill Details');
    });

    it('should return correct title for bill analysis', () => {
      expect(getPageTitle('/bills/456/analysis')).toBe('Analysis');
    });

    it('should return fallback title for unknown routes', () => {
      expect(getPageTitle('/unknown/route')).toBe('Route');
    });

    it('should handle paths with dashes correctly', () => {
      expect(getPageTitle('/bill-sponsorship-analysis')).toBe('Bill Sponsorship Analysis');
    });
  });
});












































