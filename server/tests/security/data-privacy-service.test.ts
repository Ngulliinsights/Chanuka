import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataPrivacyService } from '../../infrastructure/security/data-privacy-service.js';

// Mock the security audit service
vi.mock('../../features/security/security-audit-service.js', () => ({
  securityAuditService: {
    logDataAccess: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('DataPrivacyService', () => {
  describe('sanitizeUserData', () => {
    it('should sanitize user data while preserving utility', () => {
      const userData = {
        id: 'user123',
        email: 'user@example.com',
        name: 'John Doe',
        role: 'citizen',
        location: '123 Main St, Springfield, IL, USA',
        lastActive: new Date('2024-01-15'),
        preferences: {
          theme: 'dark',
          notifications_enabled: true,
          private_setting: 'secret'
        }
      };

      const sanitized = dataPrivacyService.sanitizeUserData(userData);

      expect(sanitized.id).not.toBe(userData.id); // Should be hashed
      expect(sanitized.id).toMatch(/^user_/); // Should have hash prefix
      expect(sanitized.role).toBe('citizen');
      expect(sanitized.generalLocation).toBe('IL, USA'); // Generalized location
      expect(sanitized.activityLevel).toBeDefined();
      expect(sanitized.preferences?.theme).toBe('dark');
      expect(sanitized.preferences?.private_setting).toBeUndefined(); // Sensitive data removed
    });

    it('should handle missing or invalid data gracefully', () => {
      const invalidData = {
        id: 'user123'
      };

      const sanitized = dataPrivacyService.sanitizeUserData(invalidData);

      expect(sanitized.id).toMatch(/^user_/);
      expect(sanitized.role).toBeUndefined();
    });

    it('should calculate activity levels correctly', () => {
      const recentUser = {
        id: 'user1',
        lastActive: new Date() // Very recent
      };

      const oldUser = {
        id: 'user2',
        lastActive: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      };

      const recentSanitized = dataPrivacyService.sanitizeUserData(recentUser);
      const oldSanitized = dataPrivacyService.sanitizeUserData(oldUser);

      expect(recentSanitized.activityLevel).toBe('high');
      expect(oldSanitized.activityLevel).toBe('low');
    });
  });

  describe('checkDataAccess', () => {
    it('should allow access for valid requests', () => {
      const result = dataPrivacyService.checkDataAccess(
        'user123',
        'engagement_analytics',
        { user: { role: 'citizen' } }
      );

      expect(result.allowed).toBe(true);
      expect(result.restrictions).toContain('anonymize_required');
      expect(result.restrictions).toContain('aggregate_only');
    });

    it('should deny access for insufficient permissions', () => {
      const result = dataPrivacyService.checkDataAccess(
        'user123',
        'admin_analytics',
        { user: { role: 'citizen' } }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Insufficient role');
    });

    it('should require ownership for personal data', () => {
      const result = dataPrivacyService.checkDataAccess(
        'user123',
        'user_profile',
        { user: { role: 'citizen' }, targetUserId: 'user456' }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('ownership');
    });

    it('should allow access to own data', () => {
      const result = dataPrivacyService.checkDataAccess(
        'user123',
        'user_profile',
        { user: { role: 'citizen' }, targetUserId: 'user123' }
      );

      expect(result.allowed).toBe(true);
    });

    it('should handle admin access correctly', () => {
      const result = dataPrivacyService.checkDataAccess(
        'admin123',
        'admin_analytics',
        { user: { role: 'admin' } }
      );

      expect(result.allowed).toBe(true);
      expect(result.restrictions).toBeUndefined();
    });
  });

  describe('aggregateDataPrivately', () => {
    const sampleData = [
      { category: 'A', value: 10, sensitiveField: 'secret1' },
      { category: 'A', value: 20, sensitiveField: 'secret2' },
      { category: 'A', value: 30, sensitiveField: 'secret3' },
      { category: 'A', value: 40, sensitiveField: 'secret4' },
      { category: 'A', value: 50, sensitiveField: 'secret5' },
      { category: 'B', value: 15, sensitiveField: 'secret6' },
      { category: 'B', value: 25, sensitiveField: 'secret7' }
    ];

    it('should aggregate data with k-anonymity protection', () => {
      const options = {
        anonymize: true,
        minGroupSize: 5,
        excludeFields: ['sensitiveField']
      };

      const result = dataPrivacyService.aggregateDataPrivately(
        sampleData,
        'category',
        options
      );

      // Only category A should be included (has 5+ items)
      expect(result).toHaveLength(1);
      expect(result[0].groupKey).toBe('A');
      expect(result[0].count).toBe(5);
      expect(result[0].value_avg).toBe(30); // Average of 10,20,30,40,50
    });

    it('should exclude small groups for privacy', () => {
      const options = {
        anonymize: true,
        minGroupSize: 3,
        excludeFields: ['sensitiveField']
      };

      const result = dataPrivacyService.aggregateDataPrivately(
        sampleData,
        'category',
        options
      );

      // Category A has 5 items (>= 3), Category B has 2 items (< 3)
      expect(result).toHaveLength(1);
      expect(result[0].groupKey).toBe('A');
    });

    it('should handle non-anonymized aggregation', () => {
      const options = {
        anonymize: false,
        minGroupSize: 2,
        excludeFields: ['sensitiveField']
      };

      const result = dataPrivacyService.aggregateDataPrivately(
        sampleData,
        'category',
        options
      );

      expect(result).toHaveLength(2); // Both A and B included
      expect(result[0].items).toBeDefined();
      expect(result[0].items[0].sensitiveField).toBeUndefined(); // Excluded field removed
    });
  });

  describe('auditDataAccess', () => {
    it('should audit data access without throwing errors', async () => {
      await expect(
        dataPrivacyService.auditDataAccess(
          'user123',
          'view_data',
          'user_profile',
          { additional: 'metadata' }
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Privacy Compliance', () => {
    it('should consistently hash user IDs', () => {
      const userData1 = { id: 'user123', role: 'citizen' };
      const userData2 = { id: 'user123', role: 'expert' };

      const sanitized1 = dataPrivacyService.sanitizeUserData(userData1);
      const sanitized2 = dataPrivacyService.sanitizeUserData(userData2);

      // Same user ID should produce same hash
      expect(sanitized1.id).toBe(sanitized2.id);
    });

    it('should remove all sensitive fields', () => {
      const userData = {
        id: 'user123',
        email: 'user@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        ip_address: '192.168.1.1',
        session_id: 'sess123',
        role: 'citizen'
      };

      const sanitized = dataPrivacyService.sanitizeUserData(userData);

      expect(sanitized.email).toBeUndefined();
      expect(sanitized.phone).toBeUndefined();
      expect(sanitized.address).toBeUndefined();
      expect(sanitized.ip_address).toBeUndefined();
      expect(sanitized.session_id).toBeUndefined();
      expect(sanitized.role).toBe('citizen'); // Non-sensitive field preserved
    });

    it('should generalize location data appropriately', () => {
      const testCases = [
        {
          input: '123 Main St, Springfield, IL, USA',
          expected: 'IL, USA'
        },
        {
          input: 'New York, NY',
          expected: 'New York, NY'
        },
        {
          input: 'London',
          expected: 'London'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const userData = { id: 'user123', location: input };
        const sanitized = dataPrivacyService.sanitizeUserData(userData);
        expect(sanitized.generalLocation).toBe(expected);
      });
    });
  });
});