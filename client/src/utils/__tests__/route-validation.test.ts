import { describe, it, expect } from 'vitest';
import {
  allRoutes,
  navigationLinks,
  validateRoutes,
  generateRouteMap,
  testRoutePattern,
  testCases,
  RouteDefinition,
} from '../route-validation';

describe('Route Validation', () => {
  describe('allRoutes', () => {
    it('should have valid route structure', () => {
      allRoutes.forEach(route => {
        expect(route).toHaveProperty('path');
        expect(route).toHaveProperty('component');
        expect(route).toHaveProperty('description');
        expect(route).toHaveProperty('is_active');
        expect(typeof route.path).toBe('string');
        expect(typeof route.component).toBe('string');
        expect(typeof route.description).toBe('string');
        expect(typeof route.is_active).toBe('boolean');
      });
    });

    it('should have unique paths', () => {
      const paths = allRoutes.map(route => route.path);
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(paths.length);
    });

    it('should have valid path formats', () => {
      allRoutes.forEach(route => {
        expect(route.path).toMatch(/^\/[a-zA-Z0-9\-_\/:]*$/);
      });
    });

    it('should have proper parent-child relationships', () => {
      const routesWithParents = allRoutes.filter(route => route.parentRoute);
      routesWithParents.forEach(route => {
        const parentExists = allRoutes.some(parent =>
          parent.path === route.parentRoute
        );
        expect(parentExists).toBe(true);
      });
    });
  });

  describe('navigationLinks', () => {
    it('should have valid link structure', () => {
      navigationLinks.forEach(link => {
        expect(link).toHaveProperty('label');
        expect(link).toHaveProperty('href');
        expect(link).toHaveProperty('icon');
        expect(typeof link.label).toBe('string');
        expect(typeof link.href).toBe('string');
        expect(typeof link.icon).toBe('string');
      });
    });

    it('should have unique hrefs', () => {
      const hrefs = navigationLinks.map(link => link.href);
      const uniqueHrefs = new Set(hrefs);
      expect(uniqueHrefs.size).toBe(hrefs.length);
    });
  });

  describe('validateRoutes', () => {
    it('should return validation result', () => {
      const result = validateRoutes();

      expect(result).toHaveProperty('orphanedPages');
      expect(result).toHaveProperty('brokenLinks');
      expect(result).toHaveProperty('validRoutes');
      expect(result).toHaveProperty('summary');

      expect(Array.isArray(result.orphanedPages)).toBe(true);
      expect(Array.isArray(result.brokenLinks)).toBe(true);
      expect(Array.isArray(result.validRoutes)).toBe(true);
      expect(typeof result.summary).toBe('string');
    });

    it('should identify broken navigation links', () => {
      // Mock a broken link
      const originalLinks = [...navigationLinks];
      navigationLinks.push({
        label: 'Broken Link',
        href: '/non-existent-route',
        icon: 'Broken'
      });

      const result = validateRoutes();
      expect(result.brokenLinks).toContain('/non-existent-route');

      // Restore
      navigationLinks.splice(-1, 1);
    });

    it('should generate proper summary', () => {
      const result = validateRoutes();
      const summary = result.summary;

      expect(summary).toContain('Route Validation Summary');
      expect(summary).toContain('Total Routes:');
      expect(summary).toContain('Navigation Links:');
      expect(summary).toContain('Orphaned Pages:');
      expect(summary).toContain('Broken Links:');
      expect(summary).toContain('Status:');
    });

    it('should handle routes with parameters', () => {
      const paramRoutes = allRoutes.filter(route => route.path.includes(':'));
      expect(paramRoutes.length).toBeGreaterThan(0);

      // Test parameter route validation
      const billDetailRoute = allRoutes.find(route => route.path === '/bills/:id');
      expect(billDetailRoute).toBeDefined();
      expect(billDetailRoute?.component).toBe('BillDetail');
    });
  });

  describe('generateRouteMap', () => {
    it('should generate route map string', () => {
      const routeMap = generateRouteMap();

      expect(typeof routeMap).toBe('string');
      expect(routeMap).toContain('Route Map:');
      expect(routeMap).toContain('->');
    });

    it('should include all active routes', () => {
      const routeMap = generateRouteMap();
      const activeRoutes = allRoutes.filter(route => route.is_active);

      activeRoutes.forEach(route => {
        expect(routeMap).toContain(route.path);
        expect(routeMap).toContain(route.component);
      });
    });

    it('should indent child routes', () => {
      const routeMap = generateRouteMap();
      const childRoutes = allRoutes.filter(route => route.parentRoute);

      childRoutes.forEach(route => {
        const lines = routeMap.split('\n');
        const routeLine = lines.find(line => line.includes(route.path));
        expect(routeLine).toMatch(/^\s+/); // Should start with whitespace
      });
    });
  });

  describe('testRoutePattern', () => {
    it('should match exact routes', () => {
      expect(testRoutePattern('/', '/')).toBe(true);
      expect(testRoutePattern('/dashboard', '/dashboard')).toBe(true);
      expect(testRoutePattern('/bills', '/bills')).toBe(true);
    });

    it('should match parameterized routes', () => {
      expect(testRoutePattern('/bills/:id', '/bills/123')).toBe(true);
      expect(testRoutePattern('/bills/:id/analysis', '/bills/456/analysis')).toBe(true);
      expect(testRoutePattern('/bills/:id/sponsorship-analysis/overview', '/bills/789/sponsorship-analysis/overview')).toBe(true);
    });

    it('should not match different routes', () => {
      expect(testRoutePattern('/', '/dashboard')).toBe(false);
      expect(testRoutePattern('/bills', '/dashboard')).toBe(false);
    });

    it('should match wildcard routes', () => {
      expect(testRoutePattern('*', '/any/random/path')).toBe(true);
      expect(testRoutePattern('*', '/')).toBe(true);
    });

    it('should handle complex patterns', () => {
      expect(testRoutePattern('/bills/:id/:action', '/bills/123/edit')).toBe(true);
      expect(testRoutePattern('/bills/:id/:action', '/bills/123')).toBe(false);
    });
  });

  describe('testCases', () => {
    it('should have valid test cases', () => {
      testCases.forEach(testCase => {
        expect(testCase).toHaveProperty('pattern');
        expect(testCase).toHaveProperty('testPath');
        expect(testCase).toHaveProperty('expected');
        expect(typeof testCase.pattern).toBe('string');
        expect(typeof testCase.testPath).toBe('string');
        expect(typeof testCase.expected).toBe('boolean');
      });
    });

    it('should pass all predefined test cases', () => {
      testCases.forEach(testCase => {
        const result = testRoutePattern(testCase.pattern, testCase.testPath);
        expect(result).toBe(testCase.expected);
      });
    });
  });

  describe('Route Structure Validation', () => {
    it('should have proper route hierarchy', () => {
      const rootRoutes = allRoutes.filter(route => !route.parentRoute);
      const childRoutes = allRoutes.filter(route => route.parentRoute);

      expect(rootRoutes.length).toBeGreaterThan(0);
      expect(childRoutes.length).toBeGreaterThan(0);

      // All child routes should have valid parents
      childRoutes.forEach(child => {
        const parent = allRoutes.find(route => route.path === child.parentRoute);
        expect(parent).toBeDefined();
        expect(parent?.is_active).toBe(true);
      });
    });

    it('should have consistent naming conventions', () => {
      allRoutes.forEach(route => {
        // Component names should be PascalCase
        expect(route.component).toMatch(/^[A-Z][a-zA-Z]+$/);
        // Paths should start with /
        expect(route.path.startsWith('/')).toBe(true);
      });
    });

    it('should have meaningful descriptions', () => {
      allRoutes.forEach(route => {
        expect(route.description.length).toBeGreaterThan(10);
        expect(route.description.length).toBeLessThan(100);
      });
    });
  });

  describe('Navigation Integration', () => {
    it('should have navigation links for main routes', () => {
      const mainRoutes = ['/', '/bills', '/dashboard', '/search'];
      mainRoutes.forEach(routePath => {
        const hasNavLink = navigationLinks.some(link => link.href === routePath);
        expect(hasNavLink).toBe(true);
      });
    });

    it('should have admin routes properly marked', () => {
      const adminLinks = navigationLinks.filter(link => link.adminOnly);
      adminLinks.forEach(link => {
        expect(link.href).toMatch(/^\/admin/);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty route list', () => {
      const originalRoutes = [...allRoutes];
      // Temporarily clear routes
      (allRoutes as any).length = 0;

      const result = validateRoutes();
      expect(result.validRoutes).toHaveLength(0);
      expect(result.summary).toContain('Total Routes: 0');

      // Restore
      allRoutes.push(...originalRoutes);
    });

    it('should handle routes with special characters', () => {
      const specialRoute: RouteDefinition = {
        path: '/test-route_with.special:chars',
        component: 'TestComponent',
        description: 'Test route with special characters',
        is_active: true,
      };

      allRoutes.push(specialRoute);

      const result = validateRoutes();
      expect(result.validRoutes).toContain(specialRoute);

      // Clean up
      const index = allRoutes.indexOf(specialRoute);
      if (index > -1) {
        allRoutes.splice(index, 1);
      }
    });

    it('should handle very long paths', () => {
      const longPath = '/very/long/path/with/many/segments/that/goes/on/and/on';
      const result = testRoutePattern(longPath, longPath);
      expect(result).toBe(true);
    });
  });
});