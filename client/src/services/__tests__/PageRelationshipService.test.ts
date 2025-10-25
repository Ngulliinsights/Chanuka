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

import { PageRelationshipService } from '../PageRelationshipService';
import { RelatedPage, UserRole } from '@/components/navigation';
import { logger } from '@shared/core';

describe('PageRelationshipService', () => {
  let service: PageRelationshipService;

  beforeEach(() => {
    service = PageRelationshipService.getInstance();
    // Clear any existing relationships
    service.clearAllRelationships();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PageRelationshipService.getInstance();
      const instance2 = PageRelationshipService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = PageRelationshipService.getInstance();
      instance1.addRelationship('/test', '/related', 'child', 0.8);
      
      const instance2 = PageRelationshipService.getInstance();
      const relationships = instance2.getRelatedPages('/test');
      
      expect(relationships).toHaveLength(1);
      expect(relationships[0].path).toBe('/related');
    });
  });

  describe('Relationship Management', () => {
    it('should add relationships correctly', () => {
      service.addRelationship('/bills', '/bills/123', 'child', 0.9);
      service.addRelationship('/bills', '/community', 'related', 0.6);
      
      const relationships = service.getRelatedPages('/bills');
      
      expect(relationships).toHaveLength(2);
      expect(relationships[0].path).toBe('/bills/123'); // Higher weight first
      expect(relationships[0].relevanceScore).toBe(0.9);
      expect(relationships[1].path).toBe('/community');
      expect(relationships[1].relevanceScore).toBe(0.6);
    });

    it('should handle bidirectional relationships', () => {
      service.addRelationship('/bills/123', '/bills/123/analysis', 'child', 0.8);
      
      const childRelationships = service.getRelatedPages('/bills/123');
      const parentRelationships = service.getRelatedPages('/bills/123/analysis');
      
      expect(childRelationships).toHaveLength(1);
      expect(childRelationships[0].path).toBe('/bills/123/analysis');
      
      expect(parentRelationships).toHaveLength(1);
      expect(parentRelationships[0].path).toBe('/bills/123');
    });

    it('should update existing relationships', () => {
      service.addRelationship('/bills', '/community', 'related', 0.5);
      service.addRelationship('/bills', '/community', 'related', 0.8);
      
      const relationships = service.getRelatedPages('/bills');
      
      expect(relationships).toHaveLength(1);
      expect(relationships[0].relevanceScore).toBe(0.8);
    });

    it('should remove relationships', () => {
      service.addRelationship('/bills', '/community', 'related', 0.6);
      service.addRelationship('/bills', '/analysis', 'related', 0.7);
      
      expect(service.getRelatedPages('/bills')).toHaveLength(2);
      
      service.removeRelationship('/bills', '/community');
      
      const relationships = service.getRelatedPages('/bills');
      expect(relationships).toHaveLength(1);
      expect(relationships[0].path).toBe('/analysis');
    });

    it('should clear all relationships', () => {
      service.addRelationship('/bills', '/community', 'related', 0.6);
      service.addRelationship('/admin', '/admin/users', 'child', 0.9);
      
      expect(service.getRelatedPages('/bills')).toHaveLength(1);
      expect(service.getRelatedPages('/admin')).toHaveLength(1);
      
      service.clearAllRelationships();
      
      expect(service.getRelatedPages('/bills')).toHaveLength(0);
      expect(service.getRelatedPages('/admin')).toHaveLength(0);
    });
  });

  describe('Page Relationship Calculation', () => {
    beforeEach(() => {
      // Set up a comprehensive relationship network
      service.addRelationship('/bills', '/bills/123', 'child', 0.9);
      service.addRelationship('/bills', '/bills/456', 'child', 0.9);
      service.addRelationship('/bills/123', '/bills/123/analysis', 'child', 0.8);
      service.addRelationship('/bills/123', '/bill-sponsorship-analysis', 'related', 0.7);
      service.addRelationship('/bills/123', '/community', 'related', 0.6);
      service.addRelationship('/community', '/expert-verification', 'related', 0.8);
      service.addRelationship('/admin', '/admin/users', 'child', 0.9);
      service.addRelationship('/admin', '/admin/system', 'child', 0.8);
    });

    it('should calculate related pages for bill details', () => {
      const relatedPages = service.getRelatedPages('/bills/123');
      
      expect(relatedPages.length).toBeGreaterThan(0);
      
      const paths = relatedPages.map(p => p.path);
      expect(paths).toContain('/bills/123/analysis');
      expect(paths).toContain('/bill-sponsorship-analysis');
      expect(paths).toContain('/community');
      expect(paths).toContain('/bills'); // Parent relationship
    });

    it('should sort related pages by relevance score', () => {
      const relatedPages = service.getRelatedPages('/bills/123');
      
      // Should be sorted by relevance score (descending)
      for (let i = 0; i < relatedPages.length - 1; i++) {
        expect(relatedPages[i].relevanceScore).toBeGreaterThanOrEqual(
          relatedPages[i + 1].relevanceScore
        );
      }
    });

    it('should limit the number of related pages', () => {
      // Add many relationships
      for (let i = 0; i < 20; i++) {
        service.addRelationship('/bills', `/bills/${i}`, 'child', Math.random());
      }
      
      const relatedPages = service.getRelatedPages('/bills', { limit: 5 });
      
      expect(relatedPages).toHaveLength(5);
    });

    it('should filter by relationship type', () => {
      const childPages = service.getRelatedPages('/bills', { 
        relationshipTypes: ['child'] 
      });
      
      childPages.forEach(page => {
        expect(page.description).toContain('child');
      });
    });

    it('should filter by minimum relevance score', () => {
      const highRelevancePages = service.getRelatedPages('/bills/123', { 
        minRelevanceScore: 0.7 
      });
      
      highRelevancePages.forEach(page => {
        expect(page.relevanceScore).toBeGreaterThanOrEqual(0.7);
      });
    });
  });

  describe('Role-Based Filtering', () => {
    beforeEach(() => {
      service.addRelationship('/bills', '/bills/123', 'child', 0.9);
      service.addRelationship('/bills', '/admin', 'related', 0.5, ['admin']);
      service.addRelationship('/bills', '/community', 'related', 0.8);
      service.addRelationship('/admin', '/admin/users', 'child', 0.9, ['admin']);
    });

    it('should filter pages based on user role', () => {
      const publicPages = service.getRelatedPages('/bills', { userRole: 'public' });
      const adminPages = service.getRelatedPages('/bills', { userRole: 'admin' });
      
      const publicPaths = publicPages.map(p => p.path);
      const adminPaths = adminPages.map(p => p.path);
      
      expect(publicPaths).not.toContain('/admin');
      expect(adminPaths).toContain('/admin');
      
      expect(publicPaths).toContain('/community');
      expect(adminPaths).toContain('/community');
    });

    it('should handle citizen role permissions', () => {
      service.addRelationship('/bills', '/profile', 'related', 0.7, ['citizen', 'admin']);
      
      const publicPages = service.getRelatedPages('/bills', { userRole: 'public' });
      const citizenPages = service.getRelatedPages('/bills', { userRole: 'citizen' });
      
      const publicPaths = publicPages.map(p => p.path);
      const citizenPaths = citizenPages.map(p => p.path);
      
      expect(publicPaths).not.toContain('/profile');
      expect(citizenPaths).toContain('/profile');
    });

    it('should handle multiple role requirements', () => {
      service.addRelationship('/bills', '/special', 'related', 0.8, ['citizen', 'admin']);
      
      const publicPages = service.getRelatedPages('/bills', { userRole: 'public' });
      const citizenPages = service.getRelatedPages('/bills', { userRole: 'citizen' });
      const adminPages = service.getRelatedPages('/bills', { userRole: 'admin' });
      
      expect(publicPages.map(p => p.path)).not.toContain('/special');
      expect(citizenPages.map(p => p.path)).toContain('/special');
      expect(adminPages.map(p => p.path)).toContain('/special');
    });
  });

  describe('Page Metadata', () => {
    it('should provide page metadata', () => {
      service.addRelationship('/bills', '/bills/123', 'child', 0.9);
      service.addRelationship('/bills/123', '/bills/123/analysis', 'child', 0.8);
      service.addRelationship('/community', '/bills/123', 'related', 0.6);
      
      const metadata = service.getPageMetadata('/bills/123');
      
      expect(metadata.totalRelationships).toBe(3); // parent, child, and related
      expect(metadata.childrenCount).toBe(1);
      expect(metadata.parentCount).toBe(1);
      expect(metadata.relatedCount).toBe(1);
      expect(metadata.averageRelevanceScore).toBeCloseTo(0.77, 1);
    });

    it('should handle pages with no relationships', () => {
      const metadata = service.getPageMetadata('/nonexistent');
      
      expect(metadata.totalRelationships).toBe(0);
      expect(metadata.childrenCount).toBe(0);
      expect(metadata.parentCount).toBe(0);
      expect(metadata.relatedCount).toBe(0);
      expect(metadata.averageRelevanceScore).toBe(0);
    });
  });

  describe('Relationship Statistics', () => {
    beforeEach(() => {
      service.addRelationship('/bills', '/bills/123', 'child', 0.9);
      service.addRelationship('/bills', '/bills/456', 'child', 0.8);
      service.addRelationship('/bills/123', '/bills/123/analysis', 'child', 0.7);
      service.addRelationship('/community', '/expert-verification', 'related', 0.6);
      service.addRelationship('/admin', '/admin/users', 'child', 0.9);
    });

    it('should provide comprehensive relationship statistics', () => {
      const stats = service.getRelationshipStats();
      
      expect(stats.totalPages).toBe(7); // Unique pages in the network
      expect(stats.totalRelationships).toBe(5);
      expect(stats.averageRelationshipsPerPage).toBeCloseTo(1.43, 1);
      expect(stats.relationshipTypeDistribution).toEqual({
        child: 4,
        related: 1,
        parent: 4, // Bidirectional relationships create parent relationships
      });
    });

    it('should identify most connected pages', () => {
      const stats = service.getRelationshipStats();
      
      expect(stats.mostConnectedPages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ pageId: '/bills', connectionCount: 2 }),
          expect.objectContaining({ pageId: '/bills/123', connectionCount: 2 }),
        ])
      );
    });

    it('should calculate relevance score distribution', () => {
      const stats = service.getRelationshipStats();
      
      expect(stats.averageRelevanceScore).toBeCloseTo(0.78, 1);
      expect(stats.relevanceScoreDistribution).toEqual({
        high: 2, // >= 0.8
        medium: 2, // 0.5-0.79
        low: 1, // < 0.5
      });
    });
  });

  describe('Path Analysis', () => {
    it('should analyze path patterns', () => {
      service.addRelationship('/bills', '/bills/123', 'child', 0.9);
      service.addRelationship('/bills/123', '/bills/123/analysis', 'child', 0.8);
      service.addRelationship('/bills/456', '/bills/456/analysis', 'child', 0.8);
      
      const analysis = service.analyzePathPatterns();
      
      expect(analysis.commonPatterns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            pattern: '/bills/:id/analysis',
            frequency: 2,
          }),
        ])
      );
    });

    it('should suggest missing relationships', () => {
      service.addRelationship('/bills', '/bills/123', 'child', 0.9);
      service.addRelationship('/bills', '/bills/456', 'child', 0.9);
      service.addRelationship('/bills/123', '/bills/123/analysis', 'child', 0.8);
      // Missing: /bills/456 -> /bills/456/analysis
      
      const suggestions = service.suggestMissingRelationships();
      
      expect(suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            from: '/bills/456',
            to: '/bills/456/analysis',
            type: 'child',
            confidence: expect.any(Number),
          }),
        ])
      );
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large numbers of relationships efficiently', () => {
      const startTime = Date.now();
      
      // Add 1000 relationships
      for (let i = 0; i < 1000; i++) {
        service.addRelationship(`/page${i}`, `/page${i}/child`, 'child', Math.random());
      }
      
      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should complete within 1 second
      
      const queryStartTime = Date.now();
      const results = service.getRelatedPages('/page500');
      const queryTime = Date.now() - queryStartTime;
      
      expect(queryTime).toBeLessThan(100); // Should query within 100ms
      expect(results).toHaveLength(1);
    });

    it('should manage memory usage with large datasets', () => {
      // Add many relationships
      for (let i = 0; i < 5000; i++) {
        service.addRelationship(`/page${i}`, `/page${i}/child`, 'child', Math.random());
      }
      
      const stats = service.getRelationshipStats();
      expect(stats.totalPages).toBe(10000); // 5000 parents + 5000 children
      expect(stats.totalRelationships).toBe(5000);
      
      // Clear and verify memory is freed
      service.clearAllRelationships();
      const clearedStats = service.getRelationshipStats();
      expect(clearedStats.totalPages).toBe(0);
      expect(clearedStats.totalRelationships).toBe(0);
    });

    it('should handle concurrent access safely', async () => {
      const promises = [];
      
      // Simulate concurrent relationship additions
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            service.addRelationship(`/concurrent${i}`, `/concurrent${i}/child`, 'child', 0.8);
          })
        );
      }
      
      await Promise.all(promises);
      
      const stats = service.getRelationshipStats();
      expect(stats.totalRelationships).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid relationship types gracefully', () => {
      expect(() => {
        service.addRelationship('/test', '/related', 'invalid' as any, 0.5);
      }).not.toThrow();
      
      const relationships = service.getRelatedPages('/test');
      expect(relationships).toHaveLength(0);
    });

    it('should handle invalid relevance scores', () => {
      service.addRelationship('/test', '/related1', 'child', -0.5); // Invalid: negative
      service.addRelationship('/test', '/related2', 'child', 1.5);  // Invalid: > 1
      service.addRelationship('/test', '/related3', 'child', 0.5);  // Valid
      
      const relationships = service.getRelatedPages('/test');
      expect(relationships).toHaveLength(1);
      expect(relationships[0].path).toBe('/related3');
    });

    it('should handle empty or null paths', () => {
      expect(() => {
        service.addRelationship('', '/related', 'child', 0.5);
        service.addRelationship('/test', '', 'child', 0.5);
        service.addRelationship(null as any, '/related', 'child', 0.5);
      }).not.toThrow();
      
      const relationships = service.getRelatedPages('');
      expect(relationships).toHaveLength(0);
    });

    it('should handle circular relationships', () => {
      service.addRelationship('/a', '/b', 'child', 0.8);
      service.addRelationship('/b', '/c', 'child', 0.8);
      service.addRelationship('/c', '/a', 'child', 0.8); // Creates a cycle
      
      const relationshipsA = service.getRelatedPages('/a');
      const relationshipsB = service.getRelatedPages('/b');
      const relationshipsC = service.getRelatedPages('/c');
      
      // Should handle cycles without infinite loops
      expect(relationshipsA.length).toBeGreaterThan(0);
      expect(relationshipsB.length).toBeGreaterThan(0);
      expect(relationshipsC.length).toBeGreaterThan(0);
    });
  });
});











































