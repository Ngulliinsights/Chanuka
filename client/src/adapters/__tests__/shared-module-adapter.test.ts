/**
 * Shared Module Adapter Integration Tests
 * 
 * Tests to ensure safe integration with shared modules without server dependencies
 */

import { describe, it, expect, vi } from 'vitest';
import { ClientSharedAdapter } from '../shared-module-adapter';
import type { UserProfile, AnonymityLevel } from '@shared/schema';

describe('ClientSharedAdapter', () => {
  describe('Validation Utilities', () => {
    it('should validate emails correctly', () => {
      expect(ClientSharedAdapter.validation.email('test@example.com')).toBe(true);
      expect(ClientSharedAdapter.validation.email('invalid-email')).toBe(false);
      expect(ClientSharedAdapter.validation.email('')).toBe(false);
    });

    it('should validate Kenya phone numbers', () => {
      expect(ClientSharedAdapter.validation.phone('+254712345678')).toBe(true);
      expect(ClientSharedAdapter.validation.phone('0712345678')).toBe(true);
      expect(ClientSharedAdapter.validation.phone('invalid-phone')).toBe(false);
    });

    it('should provide enhanced validation with error messages', () => {
      const validEmail = ClientSharedAdapter.validation.validateEmail('test@example.com');
      expect(validEmail.isValid).toBe(true);
      expect(validEmail.error).toBeNull();

      const invalidEmail = ClientSharedAdapter.validation.validateEmail('invalid');
      expect(invalidEmail.isValid).toBe(false);
      expect(invalidEmail.error).toBe('Please enter a valid email address');
    });
  });

  describe('Formatting Utilities', () => {
    it('should format currency correctly', () => {
      const formatted = ClientSharedAdapter.formatting.currency(1000, 'KES');
      expect(formatted).toContain('1,000');
      expect(formatted).toContain('KES');
    });

    it('should handle safe formatting with null values', () => {
      expect(ClientSharedAdapter.formatting.safeCurrency(null)).toBe('N/A');
      expect(ClientSharedAdapter.formatting.safeCurrency(undefined)).toBe('N/A');
      expect(ClientSharedAdapter.formatting.safeCurrency(NaN)).toBe('N/A');
      expect(ClientSharedAdapter.formatting.safeCurrency(1000)).toContain('1,000');
    });

    it('should format dates safely', () => {
      const date = new Date('2024-01-01');
      const formatted = ClientSharedAdapter.formatting.safeDate(date);
      expect(formatted).toContain('2024');

      expect(ClientSharedAdapter.formatting.safeDate(null)).toBe('N/A');
      expect(ClientSharedAdapter.formatting.safeDate(undefined)).toBe('N/A');
    });

    it('should format relative time', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const formatted = ClientSharedAdapter.formatting.relativeTime(oneHourAgo);
      expect(formatted).toContain('hour');
    });
  });

  describe('String Utilities', () => {
    it('should slugify strings correctly', () => {
      expect(ClientSharedAdapter.strings.slugify('Hello World!')).toBe('hello-world');
      expect(ClientSharedAdapter.strings.slugify('Test & Example')).toBe('test-example');
    });

    it('should truncate strings safely', () => {
      expect(ClientSharedAdapter.strings.truncate('Long text here', 8)).toBe('Long ...');
      expect(ClientSharedAdapter.strings.truncate('Short', 10)).toBe('Short');
    });

    it('should handle safe string operations with null values', () => {
      expect(ClientSharedAdapter.strings.safeSlugify(null)).toBe('');
      expect(ClientSharedAdapter.strings.safeSlugify(undefined)).toBe('');
      expect(ClientSharedAdapter.strings.safeTruncate(null, 10)).toBe('');
    });

    it('should check if strings are empty', () => {
      expect(ClientSharedAdapter.strings.isEmpty('')).toBe(true);
      expect(ClientSharedAdapter.strings.isEmpty('   ')).toBe(true);
      expect(ClientSharedAdapter.strings.isEmpty(null)).toBe(true);
      expect(ClientSharedAdapter.strings.isEmpty('content')).toBe(false);
    });

    it('should convert case correctly', () => {
      expect(ClientSharedAdapter.strings.capitalize('hello')).toBe('Hello');
      expect(ClientSharedAdapter.strings.titleCase('hello world')).toBe('Hello World');
      expect(ClientSharedAdapter.strings.camelCase('hello world')).toBe('helloWorld');
      expect(ClientSharedAdapter.strings.kebabCase('Hello World')).toBe('hello-world');
    });
  });

  describe('Array Utilities', () => {
    it('should create unique arrays', () => {
      const input = [1, 2, 2, 3, 3, 3];
      const result = ClientSharedAdapter.arrays.unique(input);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should group arrays by key', () => {
      const input = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 }
      ];
      const result = ClientSharedAdapter.arrays.groupBy(input, item => item.category);
      expect(result.A).toHaveLength(2);
      expect(result.B).toHaveLength(1);
    });

    it('should chunk arrays correctly', () => {
      const input = [1, 2, 3, 4, 5];
      const result = ClientSharedAdapter.arrays.chunk(input, 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle safe array operations with null values', () => {
      expect(ClientSharedAdapter.arrays.safeUnique(null)).toEqual([]);
      expect(ClientSharedAdapter.arrays.safeUnique(undefined)).toEqual([]);
      expect(ClientSharedAdapter.arrays.safeChunk(null, 2)).toEqual([]);
      expect(ClientSharedAdapter.arrays.isEmpty(null)).toBe(true);
      expect(ClientSharedAdapter.arrays.isEmpty([])).toBe(true);
      expect(ClientSharedAdapter.arrays.isEmpty([1])).toBe(false);
    });
  });

  describe('Object Utilities', () => {
    it('should pick object properties', () => {
      const input = { a: 1, b: 2, c: 3 };
      const result = ClientSharedAdapter.objects.pick(input, ['a', 'c']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should omit object properties', () => {
      const input = { a: 1, b: 2, c: 3 };
      const result = ClientSharedAdapter.objects.omit(input, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle safe object operations with null values', () => {
      expect(ClientSharedAdapter.objects.safePick(null, ['a'])).toEqual({});
      expect(ClientSharedAdapter.objects.safeOmit(null, ['a'])).toEqual({});
    });

    it('should check if objects are empty', () => {
      expect(ClientSharedAdapter.objects.isEmpty({})).toBe(true);
      expect(ClientSharedAdapter.objects.isEmpty(null)).toBe(true);
      expect(ClientSharedAdapter.objects.isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe('Civic Utilities', () => {
    it('should calculate bill urgency scores', () => {
      const bill = {
        introducedDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
        status: 'second_reading',
        policyAreas: ['taxation'],
        constitutionalFlags: true
      };

      const score = ClientSharedAdapter.civic.calculateUrgencyScore(bill);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(5);
    });

    it('should get bill urgency levels', () => {
      const bill = {
        introducedDate: new Date().toISOString(),
        status: 'first_reading',
        policyAreas: ['education'],
        constitutionalFlags: false
      };

      const urgencyLevel = ClientSharedAdapter.civic.getBillUrgencyLevel(bill);
      expect(urgencyLevel).toHaveProperty('level');
      expect(urgencyLevel).toHaveProperty('color');
      expect(urgencyLevel).toHaveProperty('label');
      expect(['critical', 'high', 'medium', 'low']).toContain(urgencyLevel.level);
    });

    it('should generate engagement summaries', () => {
      const engagement = {
        views: 1000,
        comments: 50,
        votes: 25,
        shares: 10
      };

      const summary = ClientSharedAdapter.civic.generateEngagementSummary(engagement);
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should get engagement levels', () => {
      const highEngagement = {
        views: 1000,
        comments: 100,
        votes: 50,
        shares: 25
      };

      const level = ClientSharedAdapter.civic.getEngagementLevel(highEngagement);
      expect(level).toHaveProperty('summary');
      expect(level).toHaveProperty('total');
      expect(level).toHaveProperty('level');
      expect(['high', 'medium', 'low', 'none']).toContain(level.level);
    });
  });

  describe('Anonymity Services', () => {
    it('should generate anonymous IDs', () => {
      const id = ClientSharedAdapter.anonymity.generateId();
      expect(id).toMatch(/^Citizen_[A-Z0-9]{6}$/);
    });

    it('should generate pseudonym suggestions', () => {
      const suggestions = ClientSharedAdapter.anonymity.generateSuggestions('nairobi');
      expect(suggestions).toHaveLength(6); // 5 random + 1 county-based
      expect(suggestions.some(s => s.includes('Nairobi'))).toBe(true);
    });

    it('should get anonymity level information', () => {
      const publicInfo = ClientSharedAdapter.anonymity.getAnonymityLevelInfo('public');
      expect(publicInfo.label).toBe('Public');
      expect(publicInfo.privacy).toBe('low');

      const anonymousInfo = ClientSharedAdapter.anonymity.getAnonymityLevelInfo('anonymous');
      expect(anonymousInfo.label).toBe('Anonymous');
      expect(anonymousInfo.privacy).toBe('high');
    });

    it('should get display identity for different anonymity levels', () => {
      const mockUserProfile: UserProfile = {
        id: 1,
        user_id: 1,
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        pseudonym: 'CivicAdvocate123',
        anonymous_id: 'Citizen_ABC123',
        anonymity_level: 'public',
        privacy_settings: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      const publicIdentity = ClientSharedAdapter.anonymity.getDisplayIdentity(mockUserProfile, false);
      expect(publicIdentity.displayName).toBe('John Doe');
      expect(publicIdentity.showLocation).toBe(true);

      const pseudonymousProfile = { ...mockUserProfile, anonymity_level: 'pseudonymous' as AnonymityLevel };
      const pseudonymousIdentity = ClientSharedAdapter.anonymity.getDisplayIdentity(pseudonymousProfile, false);
      expect(pseudonymousIdentity.displayName).toBe('CivicAdvocate123');

      const anonymousProfile = { ...mockUserProfile, anonymity_level: 'anonymous' as AnonymityLevel };
      const anonymousIdentity = ClientSharedAdapter.anonymity.getDisplayIdentity(anonymousProfile, false);
      expect(anonymousIdentity.displayName).toBe('Citizen_ABC123');
      expect(anonymousIdentity.showLocation).toBe(false);
    });

    it('should check action permissions based on anonymity level', () => {
      const publicProfile: UserProfile = {
        id: 1,
        user_id: 1,
        first_name: 'John',
        last_name: 'Doe',
        anonymity_level: 'public',
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(ClientSharedAdapter.anonymity.canPerformAction(publicProfile, 'comment')).toBe(true);
      expect(ClientSharedAdapter.anonymity.canPerformAction(publicProfile, 'vote')).toBe(true);
      expect(ClientSharedAdapter.anonymity.canPerformAction(publicProfile, 'create_campaign')).toBe(true);
      expect(ClientSharedAdapter.anonymity.canPerformAction(publicProfile, 'moderate')).toBe(true);

      const anonymousProfile = { ...publicProfile, anonymity_level: 'anonymous' as AnonymityLevel };
      expect(ClientSharedAdapter.anonymity.canPerformAction(anonymousProfile, 'comment')).toBe(true);
      expect(ClientSharedAdapter.anonymity.canPerformAction(anonymousProfile, 'create_campaign')).toBe(false);
      expect(ClientSharedAdapter.anonymity.canPerformAction(anonymousProfile, 'moderate')).toBe(false);
    });
  });

  describe('Function Utilities', () => {
    it('should create debounced functions', () => {
      const mockFn = vi.fn();
      const debouncedFn = ClientSharedAdapter.functions.debounce(mockFn, 100);

      debouncedFn('test1');
      debouncedFn('test2');
      debouncedFn('test3');

      expect(mockFn).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test3');
    });

    it('should create throttled functions', () => {
      const mockFn = vi.fn();
      const throttledFn = ClientSharedAdapter.functions.throttle(mockFn, 100);

      throttledFn('test1');
      throttledFn('test2');
      throttledFn('test3');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test1');
    });

    it('should create memoized functions', () => {
      const expensiveFn = vi.fn((x: number) => x * 2);
      const memoizedFn = ClientSharedAdapter.functions.memoize(expensiveFn);

      expect(memoizedFn(5)).toBe(10);
      expect(memoizedFn(5)).toBe(10);
      expect(expensiveFn).toHaveBeenCalledTimes(1);

      expect(memoizedFn(10)).toBe(20);
      expect(expensiveFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Logger Integration', () => {
    it('should provide logging methods', () => {
      expect(typeof ClientSharedAdapter.logger.debug).toBe('function');
      expect(typeof ClientSharedAdapter.logger.info).toBe('function');
      expect(typeof ClientSharedAdapter.logger.warn).toBe('function');
      expect(typeof ClientSharedAdapter.logger.error).toBe('function');
    });

    it('should provide enhanced logging methods', () => {
      expect(typeof ClientSharedAdapter.logger.logUserAction).toBe('function');
      expect(typeof ClientSharedAdapter.logger.logPerformance).toBe('function');
      expect(typeof ClientSharedAdapter.logger.logError).toBe('function');
    });
  });

  describe('Utility Methods', () => {
    it('should detect browser environment', () => {
      expect(ClientSharedAdapter.isBrowser()).toBe(true); // In test environment
    });

    it('should provide environment information', () => {
      const env = ClientSharedAdapter.getEnvironment();
      expect(env).toHaveProperty('isBrowser');
      expect(env).toHaveProperty('isProduction');
      expect(env).toHaveProperty('isDevelopment');
      expect(env).toHaveProperty('timestamp');
    });

    it('should create safe error handlers', () => {
      const throwingFn = () => {
        throw new Error('Test error');
      };

      const safeFn = ClientSharedAdapter.createSafeHandler(throwingFn, 'fallback');
      expect(safeFn()).toBe('fallback');
    });
  });

  describe('Type Safety', () => {
    it('should export shared types correctly', () => {
      // This test ensures types are properly exported and accessible
      const mockUser: import('../shared-module-adapter').User = {
        id: 1,
        email: 'test@example.com',
        role: 'citizen',
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(mockUser.id).toBe(1);
      expect(mockUser.email).toBe('test@example.com');
    });
  });

  describe('Bundle Safety', () => {
    it('should not expose server-only functionality', () => {
      // Ensure no server-only imports are accessible
      expect(() => {
        // This should not be available in the adapter
        (ClientSharedAdapter as any).database;
      }).not.toThrow();

      // The adapter should not have database methods
      expect((ClientSharedAdapter as any).database).toBeUndefined();
    });

    it('should only expose client-safe utilities', () => {
      const adapterKeys = Object.keys(ClientSharedAdapter);
      const expectedKeys = [
        'validation',
        'formatting', 
        'strings',
        'arrays',
        'functions',
        'objects',
        'civic',
        'anonymity',
        'logger',
        'isBrowser',
        'getEnvironment',
        'createSafeHandler'
      ];

      expectedKeys.forEach(key => {
        expect(adapterKeys).toContain(key);
      });

      // Should not contain server-only utilities
      const forbiddenKeys = ['database', 'middleware', 'server'];
      forbiddenKeys.forEach(key => {
        expect(adapterKeys).not.toContain(key);
      });
    });
  });
});