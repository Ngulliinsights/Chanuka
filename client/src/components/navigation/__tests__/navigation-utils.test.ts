import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  findNavigationItemByPath,
  findNavigationItemById,
  getNavigationItemsBySection,
  getAccessibleNavigationItems,
  determineCurrentSection,
  getPageTitle,
  isValidNavigationPath,
} from '@/utils/navigation-utils';
import { InvalidNavigationPathError } from '../errors';

describe('navigation-utils', () => {
  describe('findNavigationItemByPath', () => {
    it('should find navigation item by path', () => {
      const item = findNavigationItemByPath('/bills');
      expect(item).toBeDefined();
      expect(item?.id).toBe('bills');
      expect(item?.label).toBe('Bills');
    });

    it('should return null for non-existent path', () => {
      const item = findNavigationItemByPath('/non-existent');
      expect(item).toBeNull();
    });

    it('should return null for invalid path format', () => {
      const item = findNavigationItemByPath('invalid-path');
      expect(item).toBeNull();
    });

    it('should return null for empty path', () => {
      const item = findNavigationItemByPath('');
      expect(item).toBeNull();
    });
  });

  describe('findNavigationItemById', () => {
    it('should find navigation item by id', () => {
      const item = findNavigationItemById('home');
      expect(item).toBeDefined();
      expect(item?.href).toBe('/');
      expect(item?.label).toBe('Home');
    });

    it('should return null for non-existent id', () => {
      const item = findNavigationItemById('non-existent');
      expect(item).toBeNull();
    });

    it('should return null for null or undefined id', () => {
      expect(findNavigationItemById(null as any)).toBeNull();
      expect(findNavigationItemById(undefined as any)).toBeNull();
      expect(findNavigationItemById('')).toBeNull();
    });
  });

  describe('getNavigationItemsBySection', () => {
    it('should return items for legislative section', () => {
      const items = getNavigationItemsBySection('legislative');
      expect(items.length).toBeGreaterThan(0);
      expect(items.every(item => item.section === 'legislative')).toBe(true);
    });

    it('should return empty array for section with no items', () => {
      const items = getNavigationItemsBySection('admin');
      expect(items.length).toBe(1); // admin item exists
      expect(items[0].id).toBe('admin');
    });

    it('should return empty array for null or undefined section', () => {
      expect(getNavigationItemsBySection(null as any)).toEqual([]);
      expect(getNavigationItemsBySection(undefined as any)).toEqual([]);
    });
  });

  describe('getAccessibleNavigationItems', () => {
    it('should return accessible items for citizen role', () => {
      const items = getAccessibleNavigationItems('citizen', { id: '1' });
      expect(items.length).toBeGreaterThan(0);
      expect(items.some(item => item.id === 'bills')).toBe(true);
    });

    it('should exclude admin-only items for non-admin users', () => {
      const items = getAccessibleNavigationItems('citizen', { id: '1' });
      expect(items.some(item => item.adminOnly)).toBe(false);
    });

    it('should exclude auth-required items for unauthenticated users', () => {
      const items = getAccessibleNavigationItems('public', null);
      expect(items.some(item => item.requiresAuth)).toBe(false);
    });

    it('should return empty array for invalid user role', () => {
      const items = getAccessibleNavigationItems(null as any, { id: '1' });
      expect(items).toEqual([]);
    });

    it('should handle condition evaluation errors gracefully', () => {
      // Mock a navigation item with a problematic condition
      const mockItem = {
        id: 'test',
        label: 'Test',
        href: '/test',
        section: 'tools' as const,
        condition: () => { throw new Error('Test error'); }
      };

      // Temporarily add the mock item to test error handling
      const originalMap = require('../constants').DEFAULT_NAVIGATION_MAP;
      originalMap.push(mockItem);

      const items = getAccessibleNavigationItems('citizen', { id: '1' });

      // Should still return items, excluding the problematic one
      expect(items.length).toBeGreaterThan(0);
      expect(items.some(item => item.id === 'test')).toBe(false);

      // Clean up
      originalMap.pop();
    });
  });

  describe('determineCurrentSection', () => {
    it('should determine legislative section for bills path', () => {
      const section = determineCurrentSection('/bills');
      expect(section).toBe('legislative');
    });

    it('should determine community section for community path', () => {
      const section = determineCurrentSection('/community');
      expect(section).toBe('community');
    });

    it('should default to legislative for unknown paths', () => {
      const section = determineCurrentSection('/unknown');
      expect(section).toBe('legislative');
    });

    it('should default to legislative for invalid paths', () => {
      const section = determineCurrentSection('invalid-path');
      expect(section).toBe('legislative');
    });
  });

  describe('getPageTitle', () => {
    it('should return page title for valid path', () => {
      const title = getPageTitle('/bills');
      expect(title).toBe('Bills');
    });

    it('should return default title for invalid path', () => {
      const title = getPageTitle('/invalid');
      expect(title).toBe('Page');
    });

    it('should return default title for invalid path format', () => {
      const title = getPageTitle('invalid-path');
      expect(title).toBe('Page');
    });
  });

  describe('isValidNavigationPath', () => {
    it('should return true for valid paths', () => {
      expect(isValidNavigationPath('/')).toBe(true);
      expect(isValidNavigationPath('/bills')).toBe(true);
    });

    it('should return false for invalid paths', () => {
      expect(isValidNavigationPath('/invalid')).toBe(false);
      expect(isValidNavigationPath('/non-existent')).toBe(false);
    });

    it('should return false for invalid path formats', () => {
      expect(isValidNavigationPath('invalid-path')).toBe(false);
      expect(isValidNavigationPath('')).toBe(false);
      expect(isValidNavigationPath('/path with spaces')).toBe(false);
    });
  });
});

