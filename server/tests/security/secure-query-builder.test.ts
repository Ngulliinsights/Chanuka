import { describe, it, expect, beforeEach } from 'vitest';
import { secureQueryBuilder } from '@server/infrastructure/security/secure-query-builder.js';

describe('SecureQueryBuilder', () => {
  describe('validateInputs', () => {
    it('should validate and sanitize string inputs', () => {
      const inputs = ['normal string', 'string with <script>alert("xss")</script>'];
      const result = secureQueryBuilder.validateInputs(inputs);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedParams).toBeDefined();
      expect(result.sanitizedParams!.param_1).not.toContain('<script>');
    });

    it('should reject inputs that are too long', () => {
      const longString = 'a'.repeat(10001);
      const result = secureQueryBuilder.validateInputs([longString]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Parameter 0: String too long (max 10000 characters)');
    });

    it('should validate numeric inputs', () => {
      const inputs = [123, 45.67, NaN, Infinity];
      const result = secureQueryBuilder.validateInputs(inputs);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Parameter 2: Invalid number');
      expect(result.errors).toContain('Parameter 3: Invalid number');
    });

    it('should handle null and undefined inputs', () => {
      const inputs = [null, undefined, ''];
      const result = secureQueryBuilder.validateInputs(inputs);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedParams!.param_0).toBe(null);
      expect(result.sanitizedParams!.param_1).toBe(null);
    });

    it('should validate array inputs', () => {
      const smallArray = ['a', 'b', 'c'];
      const largeArray = new Array(1001).fill('item');
      
      const result1 = secureQueryBuilder.validateInputs([smallArray]);
      expect(result1.isValid).toBe(true);
      
      const result2 = secureQueryBuilder.validateInputs([largeArray]);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Parameter 0: Array too large (max 1000 items)');
    });
  });

  describe('sanitizeOutput', () => {
    it('should remove sensitive fields from output', () => {
      const data = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        password_hash: 'secret123',
        token: 'abc123',
        normalField: 'safe data'
      };

      const sanitized = secureQueryBuilder.sanitizeOutput(data);
      
      expect(sanitized.id).toBe('123');
      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.normalField).toBe('safe data');
      expect(sanitized.password_hash).toBeUndefined();
      expect(sanitized.token).toBeUndefined();
    });

    it('should sanitize HTML in string outputs', () => {
      const data = {
        content: '<script>alert("xss")</script>Hello World',
        description: 'Normal text'
      };

      const sanitized = secureQueryBuilder.sanitizeOutput(data);
      
      expect(sanitized.content).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;Hello World');
      expect(sanitized.description).toBe('Normal text');
    });

    it('should handle arrays and nested objects', () => {
      const data = {
        users: [
          { id: '1', name: 'User 1', password_hash: 'secret1' },
          { id: '2', name: 'User 2', token: 'token123' }
        ],
        metadata: {
          count: 2,
          secret: 'hidden'
        }
      };

      const sanitized = secureQueryBuilder.sanitizeOutput(data);
      
      expect(sanitized.users).toHaveLength(2);
      expect(sanitized.users[0].password_hash).toBeUndefined();
      expect(sanitized.users[1].token).toBeUndefined();
      expect(sanitized.metadata.count).toBe(2);
      expect(sanitized.metadata.secret).toBeUndefined();
    });
  });

  describe('createSafeLikePattern', () => {
    it('should escape special LIKE characters', () => {
      const searchTerm = 'test%_\\search';
      const pattern = secureQueryBuilder.createSafeLikePattern(searchTerm);
      
      expect(pattern).toBe('%test\\%\\_\\\\search%');
    });

    it('should handle empty or invalid inputs', () => {
      expect(secureQueryBuilder.createSafeLikePattern('')).toBe('%');
      expect(secureQueryBuilder.createSafeLikePattern(null as any)).toBe('%');
      expect(secureQueryBuilder.createSafeLikePattern(undefined as any)).toBe('%');
    });
  });

  describe('validatePaginationParams', () => {
    it('should validate and sanitize pagination parameters', () => {
      const result = secureQueryBuilder.validatePaginationParams('2', '50');
      
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(50);
    });

    it('should enforce limits and defaults', () => {
      const result1 = secureQueryBuilder.validatePaginationParams('0', '200');
      expect(result1.page).toBe(1); // Minimum page is 1
      expect(result1.limit).toBe(100); // Maximum limit is 100

      const result2 = secureQueryBuilder.validatePaginationParams('invalid', 'invalid');
      expect(result2.page).toBe(1); // Default page
      expect(result2.limit).toBe(20); // Default limit
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in string sanitization', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "/* comment */ SELECT * FROM users",
        "UNION SELECT password FROM users"
      ];

      maliciousInputs.forEach(input => {
        const result = secureQueryBuilder.validateInputs([input]);
        expect(result.isValid).toBe(true);
        
        const sanitized = result.sanitizedParams!.param_0;
        expect(sanitized).not.toContain('--');
        expect(sanitized).not.toContain('/*');
        expect(sanitized).not.toContain('*/');
      });
    });
  });
});
