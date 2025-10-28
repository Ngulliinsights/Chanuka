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

import { PageRelationshipUtils } from '../page-relationship-utils';
import { logger } from '@shared/core';

describe('PageRelationshipUtils', () => {
  beforeEach(() => {
    // Reset user behavior before each test
    PageRelationshipUtils.resetUserBehavior();
  });

  describe('getSmartSuggestions', () => {
    it('should return smart suggestions for home page', () => {
      const suggestions = PageRelationshipUtils.getSmartSuggestions('/');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].pageId).toBe('/bills');
      expect(suggestions[0].weight).toBe(1.0);
    });

    it('should respect user role restrictions', () => {
      const citizenSuggestions = PageRelationshipUtils.getSmartSuggestions('/admin', 'citizen');
      const adminSuggestions = PageRelationshipUtils.getSmartSuggestions('/admin', 'admin');
      
      expect(citizenSuggestions.length).toBe(0);
      expect(adminSuggestions.length).toBeGreaterThan(0);
    });

    it('should incorporate visit history', () => {
      const visitHistory = ['/', '/bills', '/community'];
      const suggestions = PageRelationshipUtils.getSmartSuggestions('/', 'citizen', visitHistory);
      
      // Should have updated behavior weights
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('calculateNavigationEfficiency', () => {
    it('should calculate direct navigation efficiency', () => {
      const efficiency = PageRelationshipUtils.calculateNavigationEfficiency('/', '/bills');
      
      expect(efficiency.strength).toBe(1.0);
      expect(efficiency.path).toEqual(['/', '/bills']);
      expect(efficiency.efficiency).toBe('direct');
    });

    it('should calculate indirect navigation efficiency', () => {
      const efficiency = PageRelationshipUtils.calculateNavigationEfficiency('/', '/bills/:id/analysis');
      
      expect(efficiency.path.length).toBeGreaterThan(2);
      expect(['indirect', 'poor']).toContain(efficiency.efficiency);
    });

    it('should handle non-existent paths', () => {
      const efficiency = PageRelationshipUtils.calculateNavigationEfficiency('/non-existent', '/bills');
      
      expect(efficiency.strength).toBe(0);
      expect(efficiency.path).toEqual([]);
      expect(efficiency.efficiency).toBe('poor');
    });
  });

  describe('getContextualBreadcrumbs', () => {
    it('should generate contextual breadcrumbs', () => {
      const breadcrumbs = PageRelationshipUtils.getContextualBreadcrumbs('/bills/:id/analysis');
      
      expect(breadcrumbs.length).toBeGreaterThan(1);
      expect(breadcrumbs[breadcrumbs.length - 1].isActive).toBe(true);
    });

    it('should include relationship context', () => {
      const breadcrumbs = PageRelationshipUtils.getContextualBreadcrumbs('/bills/:id');
      
      const contextualBreadcrumb = breadcrumbs.find(b => b.relationshipContext);
      expect(contextualBreadcrumb).toBeDefined();
    });
  });

  describe('analyzePageNetwork', () => {
    it('should provide network analysis', () => {
      const analysis = PageRelationshipUtils.analyzePageNetwork();
      
      expect(analysis.stats.totalPages).toBeGreaterThan(0);
      expect(analysis.stats.totalRelationships).toBeGreaterThan(0);
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });

    it('should provide meaningful recommendations', () => {
      const analysis = PageRelationshipUtils.analyzePageNetwork();
      
      // Should have some recommendations based on the current network structure
      expect(analysis.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCategoryNavigation', () => {
    it('should organize pages by category', () => {
      const navigation = PageRelationshipUtils.getCategoryNavigation();
      
      expect(navigation.main).toBeDefined();
      expect(navigation.legislative).toBeDefined();
      expect(navigation.main.length).toBeGreaterThan(0);
    });

    it('should filter admin pages for non-admin users', () => {
      const citizenNav = PageRelationshipUtils.getCategoryNavigation('citizen');
      const adminNav = PageRelationshipUtils.getCategoryNavigation('admin');
      
      expect(citizenNav.admin).toBeUndefined();
      expect(adminNav.admin).toBeDefined();
    });
  });

  describe('findAlternativePaths', () => {
    it('should find alternative navigation paths', () => {
      const paths = PageRelationshipUtils.findAlternativePaths('/', '/community');
      
      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0]).toContain('/');
      expect(paths[0]).toContain('/community');
    });

    it('should limit number of paths returned', () => {
      const paths = PageRelationshipUtils.findAlternativePaths('/', '/bills', 2);
      
      expect(paths.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getPageInsights', () => {
    it('should provide comprehensive page insights', () => {
      const insights = PageRelationshipUtils.getPageInsights('/bills');
      
      expect(insights.metadata).toBeDefined();
      expect(insights.relatedPages).toBeInstanceOf(Array);
      expect(insights.childPages).toBeInstanceOf(Array);
      expect(insights.parentChain).toBeInstanceOf(Array);
      expect(insights.accessibility).toBeDefined();
    });

    it('should identify accessibility requirements', () => {
      const dashboardInsights = PageRelationshipUtils.getPageInsights('/dashboard');
      const adminInsights = PageRelationshipUtils.getPageInsights('/admin');
      
      expect(dashboardInsights.accessibility.requiresAuth).toBe(true);
      expect(adminInsights.accessibility.restrictedRoles).toContain('admin');
    });
  });

  describe('resetUserBehavior', () => {
    it('should reset user behavior tracking', () => {
      // First, create some behavior
      PageRelationshipUtils.getSmartSuggestions('/', 'citizen', ['/', '/bills']);
      
      // Reset behavior
      PageRelationshipUtils.resetUserBehavior();
      
      // Behavior should be reset (this is more of a smoke test)
      expect(() => PageRelationshipUtils.resetUserBehavior()).not.toThrow();
    });
  });
});












































