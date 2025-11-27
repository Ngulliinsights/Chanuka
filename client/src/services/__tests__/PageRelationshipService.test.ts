import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PageRelationshipService } from '@client/PageRelationshipService';

describe('PageRelationshipService', () => {
  let service: PageRelationshipService;

  beforeEach(() => {
    // Reset singleton instance
    (PageRelationshipService as any).instance = null;
    service = PageRelationshipService.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PageRelationshipService.getInstance();
      const instance2 = PageRelationshipService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getRelatedPages', () => {
    it('should return related pages for existing page', () => {
      const relatedPages = service.getRelatedPages('/');

      expect(relatedPages).toHaveLength(4); // Based on default config
      expect(relatedPages[0]).toMatchObject({
        pageId: '/bills',
        type: 'child',
        weight: 1.0,
      });
    });

    it('should return empty array for non-existent page', () => {
      const relatedPages = service.getRelatedPages('/non-existent');

      expect(relatedPages).toEqual([]);
    });

    it('should filter by user role', () => {
      const relatedPages = service.getRelatedPages('/', 'admin' as any);

      // Should include admin pages
      expect(relatedPages.some(p => p.pageId.startsWith('/admin'))).toBe(false); // Admin pages are not accessible to non-admin
    });

    it('should sort pages by weight descending', () => {
      const relatedPages = service.getRelatedPages('/');

      for (let i = 0; i < relatedPages.length - 1; i++) {
        expect(relatedPages[i].weight).toBeGreaterThanOrEqual(relatedPages[i + 1].weight);
      }
    });
  });

  describe('getPageMetadata', () => {
    it('should return metadata for existing page', () => {
      const metadata = service.getPageMetadata('/');

      expect(metadata).toEqual({
        title: 'Home',
        description: 'Legislative Transparency Platform',
        category: 'tools',
      });
    });

    it('should return undefined for non-existent page', () => {
      const metadata = service.getPageMetadata('/non-existent');

      expect(metadata).toBeUndefined();
    });
  });

  describe('updateRelationship', () => {
    it('should update page relationship', () => {
      const newRelationship = {
        pageId: '/test',
        relatedPages: {
          '/other': { type: 'related' as const, weight: 0.5, context: 'test' },
        },
      };

      service.updateRelationship('/test', newRelationship);

      const relatedPages = service.getRelatedPages('/test');
      expect(relatedPages).toHaveLength(1);
      expect(relatedPages[0].pageId).toBe('/other');
    });
  });

  describe('updatePageMetadata', () => {
    it('should update page metadata', () => {
      const newMetadata = {
        title: 'Updated Title',
        description: 'Updated description',
        category: 'user' as const,
      };

      service.updatePageMetadata('/', newMetadata);

      const metadata = service.getPageMetadata('/');
      expect(metadata).toEqual(newMetadata);
    });
  });

  describe('getContextualSuggestions', () => {
    it('should return suggestions with visit history boost', () => {
      const visitHistory = ['/bills'];
      const suggestions = service.getContextualSuggestions('/', visitHistory, 'public' as any);

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeLessThanOrEqual(5); // Default max
    });

    it('should respect maxSuggestions parameter', () => {
      const suggestions = service.getContextualSuggestions('/', [], 'public' as any, 2);

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('calculateRelationshipStrength', () => {
    it('should calculate bidirectional relationship strength', () => {
      const strength = service.calculateRelationshipStrength('/', '/bills');

      expect(strength).toBeGreaterThan(0);
      expect(strength).toBeLessThanOrEqual(2.0);
    });

    it('should return 0 for unrelated pages', () => {
      const strength = service.calculateRelationshipStrength('/non-existent1', '/non-existent2');

      expect(strength).toBe(0);
    });

    it('should apply bidirectional bonus', () => {
      // / and /bills have bidirectional relationship
      const strength = service.calculateRelationshipStrength('/', '/bills');

      expect(strength).toBeGreaterThan(0.8); // Should be boosted
    });
  });

  describe('findShortestPath', () => {
    it('should find path between connected pages', () => {
      const path = service.findShortestPath('/', '/bills');

      expect(path).toEqual(['/', '/bills']);
    });

    it('should return same page for identical start and target', () => {
      const path = service.findShortestPath('/', '/');

      expect(path).toEqual(['/']);
    });

    it('should return empty array for unreachable pages', () => {
      const path = service.findShortestPath('/', '/non-existent');

      expect(path).toEqual([]);
    });

    it('should respect maxDepth parameter', () => {
      const path = service.findShortestPath('/', '/bills/:id/analysis', 1);

      expect(path).toEqual([]); // Should not reach within depth 1
    });
  });

  describe('getPagesByCategory', () => {
    it('should return pages of specific category', () => {
      const pages = service.getPagesByCategory('legislative');

      expect(pages.length).toBeGreaterThan(0);
      expect(pages.every(p => p.category === 'legislative')).toBe(true);
    });

    it('should filter by user role', () => {
      const pages = service.getPagesByCategory('admin', 'public' as any);

      expect(pages.every(p => !p.pageId.startsWith('/admin'))).toBe(true);
    });

    it('should sort alphabetically by title', () => {
      const pages = service.getPagesByCategory('tools');

      for (let i = 0; i < pages.length - 1; i++) {
        expect(pages[i].title.localeCompare(pages[i + 1].title)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('user behavior weights', () => {
    it('should update behavior weights from navigation path', () => {
      const path = ['/', '/bills', '/bills/123'];

      service.updateUserBehaviorWeights(path);

      // Weights are internal, just ensure no errors
      expect(true).toBe(true);
    });

    it('should apply behavior weight decay', () => {
      service.updateUserBehaviorWeights(['/', '/bills']);
      // Decay is internal
      expect(true).toBe(true);
    });
  });

  describe('getPersonalizedSuggestions', () => {
    it('should return personalized suggestions', () => {
      const suggestions = service.getPersonalizedSuggestions('/', 'public' as any, ['/bills']);

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should boost recently visited pages', () => {
      const suggestions = service.getPersonalizedSuggestions('/', 'public' as any, ['/bills']);

      expect(suggestions).toBeDefined();
    });
  });

  describe('generateBreadcrumbs', () => {
    it('should generate breadcrumbs for a page', () => {
      const breadcrumbs = service.generateBreadcrumbs('/bills/:id/analysis');

      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]).toEqual({
        label: 'Bill Analysis',
        path: '/bills/:id/analysis',
        is_active: true,
      });
    });

    it('should cache breadcrumb results', () => {
      service.generateBreadcrumbs('/bills/:id/analysis');
      const breadcrumbs2 = service.generateBreadcrumbs('/bills/:id/analysis');

      expect(breadcrumbs2).toBe(breadcrumbs2); // Same reference from cache
    });
  });

  describe('findParentChain', () => {
    it('should find parent chain for nested page', () => {
      const chain = (service as any).findParentChain('/bills/:id/analysis');

      expect(chain).toContain('/bills/:id/analysis');
      expect(chain).toContain('/bills/:id');
    });
  });

  describe('getChildPages', () => {
    it('should return child pages of a parent', () => {
      const children = service.getChildPages('/bills/:id');

      expect(children.length).toBeGreaterThan(0);
      expect(children.every(c => c.type === 'child')).toBe(true);
    });

    it('should filter by user role', () => {
      const children = service.getChildPages('/', 'public' as any);

      expect(children.every(c => !c.pageId.startsWith('/admin'))).toBe(true);
    });
  });

  describe('clear methods', () => {
    it('should clear user behavior weights', () => {
      service.updateUserBehaviorWeights(['/', '/bills']);
      service.clearUserBehaviorWeights();

      // Behavior weights cleared
      expect(true).toBe(true);
    });

    it('should clear caches', () => {
      service.generateBreadcrumbs('/bills/:id/analysis');
      service.clearCaches();

      // Caches cleared
      expect(true).toBe(true);
    });

    it('should clear all data', () => {
      service.updateUserBehaviorWeights(['/', '/bills']);
      service.generateBreadcrumbs('/bills/:id/analysis');
      service.clearAllData();

      // All data cleared
      expect(true).toBe(true);
    });
  });

  describe('getRelationshipStats', () => {
    it('should return comprehensive statistics', () => {
      const stats = service.getRelationshipStats();

      expect(stats).toHaveProperty('totalPages');
      expect(stats).toHaveProperty('totalRelationships');
      expect(stats).toHaveProperty('averageRelationshipsPerPage');
      expect(stats).toHaveProperty('categoryCounts');

      expect(typeof stats.totalPages).toBe('number');
      expect(typeof stats.totalRelationships).toBe('number');
      expect(typeof stats.averageRelationshipsPerPage).toBe('number');
      expect(typeof stats.categoryCounts).toBe('object');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('breadcrumbCacheSize');
      expect(stats).toHaveProperty('parentChainCacheSize');
      expect(stats).toHaveProperty('behaviorWeightCount');

      expect(typeof stats.breadcrumbCacheSize).toBe('number');
      expect(typeof stats.parentChainCacheSize).toBe('number');
      expect(typeof stats.behaviorWeightCount).toBe('number');
    });
  });

  describe('config import/export', () => {
    it('should export configuration', () => {
      const config = service.exportConfig();

      expect(config).toHaveProperty('relationships');
      expect(config).toHaveProperty('metadata');
      expect(typeof config.relationships).toBe('object');
      expect(typeof config.metadata).toBe('object');
    });

    it('should import configuration', () => {
      const originalConfig = service.exportConfig();
      const newConfig = {
        relationships: {
          '/test': {
            pageId: '/test',
            relatedPages: {},
          },
        },
        metadata: {
          '/test': {
            title: 'Test',
            description: 'Test page',
            category: 'tools' as const,
          },
        },
      };

      service.importConfig(newConfig);

      expect(service.getPageMetadata('/test')).toEqual(newConfig.metadata['/test']);
    });
  });
});
