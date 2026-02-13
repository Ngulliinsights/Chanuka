/**
 * Unit Tests for Security and Validation Utilities
 * 
 * Tests input sanitization, password validation, and security validation functions.
 * Note: Crypto-based functions (encryption, hashing) are Node.js only and tested separately.
 * 
 * **Validates: Requirements 7.1**
 */

import {
  sanitizeHtml,
  sanitizeSql,
  sanitizeFilename,
  validatePasswordStrength,
  generateSecurePassword,
  validateEmail,
  validateUrl,
  sanitizeUserInput,
  DEFAULT_PASSWORD_POLICY
} from './security-utils';

describe('Security and Validation Utilities', () => {
  describe('Input Sanitization', () => {
    describe('sanitizeHtml', () => {
      it('should remove all HTML tags by default', () => {
        const input = '<script>alert("xss")</script>Hello';
        const result = sanitizeHtml(input);
        expect(result).toBe('Hello');
      });

      it('should remove dangerous script tags', () => {
        const input = '<p>Safe</p><script>alert("xss")</script>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<script>');
      });

      it('should remove event handlers', () => {
        const input = '<div onclick="alert()">Click</div>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onclick');
      });

      it('should remove javascript: protocol', () => {
        const input = '<a href="javascript:alert()">Link</a>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('javascript:');
      });

      it('should trim whitespace', () => {
        const input = '  <p>Test</p>  ';
        const result = sanitizeHtml(input);
        expect(result).toBe('Test');
      });

      it('should limit length when maxLength specified', () => {
        const input = 'This is a very long string';
        const result = sanitizeHtml(input, { maxLength: 10 });
        expect(result.length).toBe(10);
      });

      it('should handle empty strings', () => {
        expect(sanitizeHtml('')).toBe('');
      });

      it('should handle non-string input', () => {
        expect(sanitizeHtml(null as any)).toBe('');
        expect(sanitizeHtml(undefined as any)).toBe('');
      });
    });

    describe('sanitizeSql', () => {
      it('should escape single quotes', () => {
        const input = "O'Brien";
        const result = sanitizeSql(input);
        expect(result).toBe("O''Brien");
      });

      it('should remove semicolons', () => {
        const input = 'test; DROP TABLE users;';
        const result = sanitizeSql(input);
        expect(result).not.toContain(';');
      });

      it('should remove SQL comments', () => {
        const input = 'test -- comment';
        const result = sanitizeSql(input);
        expect(result).not.toContain('--');
      });

      it('should remove block comments', () => {
        const input = 'test /* comment */ value';
        const result = sanitizeSql(input);
        expect(result).not.toContain('/*');
        expect(result).not.toContain('*/');
      });

      it('should trim whitespace', () => {
        const input = '  test  ';
        const result = sanitizeSql(input);
        expect(result).toBe('test');
      });

      it('should handle empty strings', () => {
        expect(sanitizeSql('')).toBe('');
      });
    });

    describe('sanitizeFilename', () => {
      it('should remove dangerous characters', () => {
        const input = 'file<>:"/\\|?*.txt';
        const result = sanitizeFilename(input);
        expect(result).not.toMatch(/[<>:"/\\|?*]/);
      });

      it('should remove leading dots', () => {
        const input = '...hidden.txt';
        const result = sanitizeFilename(input);
        expect(result).not.toMatch(/^\./);
      });

      it('should replace multiple dots with single dot', () => {
        const input = 'file...txt';
        const result = sanitizeFilename(input);
        expect(result).toBe('file.txt');
      });

      it('should trim whitespace', () => {
        const input = '  file.txt  ';
        const result = sanitizeFilename(input);
        expect(result).toBe('file.txt');
      });

      it('should limit length to 255 characters', () => {
        const input = 'a'.repeat(300) + '.txt';
        const result = sanitizeFilename(input);
        expect(result.length).toBeLessThanOrEqual(255);
      });

      it('should handle valid filenames', () => {
        const input = 'document-2024.pdf';
        const result = sanitizeFilename(input);
        expect(result).toBe('document-2024.pdf');
      });
    });

    describe('sanitizeUserInput', () => {
      it('should trim whitespace', () => {
        const input = '  test  ';
        const result = sanitizeUserInput(input);
        expect(result).toBe('test');
      });

      it('should remove control characters', () => {
        const input = 'test\x00\x01\x1F';
        const result = sanitizeUserInput(input);
        expect(result).toBe('test');
      });

      it('should remove HTML by default', () => {
        const input = '<script>alert("xss")</script>test';
        const result = sanitizeUserInput(input);
        expect(result).toBe('test');
      });

      it('should handle empty strings', () => {
        expect(sanitizeUserInput('')).toBe('');
      });
    });
  });

  describe('Password Security', () => {
    describe('validatePasswordStrength', () => {
      it('should accept strong passwords', () => {
        const result = validatePasswordStrength('StrongP@ss123');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject passwords that are too short', () => {
        const result = validatePasswordStrength('Short1!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      });

      it('should reject passwords without uppercase', () => {
        const result = validatePasswordStrength('lowercase123!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });

      it('should reject passwords without lowercase', () => {
        const result = validatePasswordStrength('UPPERCASE123!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });

      it('should reject passwords without numbers', () => {
        const result = validatePasswordStrength('NoNumbers!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('should reject passwords without special characters', () => {
        const result = validatePasswordStrength('NoSpecial123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one special character');
      });

      it('should reject common passwords', () => {
        const result = validatePasswordStrength('password123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is too common');
      });

      it('should reject passwords with too many consecutive characters', () => {
        const result = validatePasswordStrength('Passsss123!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          `Password cannot contain more than ${DEFAULT_PASSWORD_POLICY.maxConsecutiveChars} consecutive identical characters`
        );
      });

      it('should accept passwords with custom policy', () => {
        const customPolicy = {
          minLength: 6,
          requireUppercase: false,
          requireLowercase: true,
          requireNumbers: false,
          requireSpecialChars: false,
          preventCommonPasswords: false,
          maxConsecutiveChars: 5
        };
        const result = validatePasswordStrength('simple', customPolicy);
        expect(result.isValid).toBe(true);
      });

      it('should return multiple errors for weak passwords', () => {
        const result = validatePasswordStrength('weak');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });

    describe('generateSecurePassword', () => {
      it('should generate password of specified length', () => {
        const password = generateSecurePassword(16);
        expect(password.length).toBe(16);
      });

      it('should generate password with default length', () => {
        const password = generateSecurePassword();
        expect(password.length).toBe(12);
      });

      it('should generate password with uppercase letters', () => {
        const password = generateSecurePassword(20);
        expect(password).toMatch(/[A-Z]/);
      });

      it('should generate password with lowercase letters', () => {
        const password = generateSecurePassword(20);
        expect(password).toMatch(/[a-z]/);
      });

      it('should generate password with numbers', () => {
        const password = generateSecurePassword(20);
        expect(password).toMatch(/\d/);
      });

      it('should generate password with special characters', () => {
        const password = generateSecurePassword(20);
        expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/);
      });

      it('should generate different passwords each time', () => {
        const password1 = generateSecurePassword(16);
        const password2 = generateSecurePassword(16);
        expect(password1).not.toBe(password2);
      });

      it('should pass strength validation', () => {
        const password = generateSecurePassword(12);
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Input Validation', () => {
    describe('validateEmail', () => {
      it('should accept valid email addresses', () => {
        const result = validateEmail('user@example.com');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept email with subdomain', () => {
        const result = validateEmail('user@mail.example.com');
        expect(result.isValid).toBe(true);
      });

      it('should accept email with plus sign', () => {
        const result = validateEmail('user+tag@example.com');
        expect(result.isValid).toBe(true);
      });

      it('should accept email with dots', () => {
        const result = validateEmail('first.last@example.com');
        expect(result.isValid).toBe(true);
      });

      it('should reject email without @', () => {
        const result = validateEmail('userexample.com');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid email format');
      });

      it('should reject email without domain', () => {
        const result = validateEmail('user@');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid email format');
      });

      it('should reject email without TLD', () => {
        const result = validateEmail('user@example');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid email format');
      });

      it('should reject email with consecutive dots', () => {
        const result = validateEmail('user..name@example.com');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid email format');
      });

      it('should reject email starting with dot', () => {
        const result = validateEmail('.user@example.com');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid email format');
      });

      it('should reject email ending with dot', () => {
        const result = validateEmail('user.@example.com');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid email format');
      });

      it('should reject email that is too long', () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        const result = validateEmail(longEmail);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Email is too long');
      });

      it('should reject empty email', () => {
        const result = validateEmail('');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Email is required');
      });

      it('should sanitize email to lowercase and trim', () => {
        const result = validateEmail('  User@Example.COM  ');
        expect(result.sanitizedValue).toBe('user@example.com');
      });
    });

    describe('validateUrl', () => {
      it('should accept valid HTTP URLs', () => {
        const result = validateUrl('http://example.com');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept valid HTTPS URLs', () => {
        const result = validateUrl('https://example.com');
        expect(result.isValid).toBe(true);
      });

      it('should accept URLs with paths', () => {
        const result = validateUrl('https://example.com/path/to/page');
        expect(result.isValid).toBe(true);
      });

      it('should accept URLs with query parameters', () => {
        const result = validateUrl('https://example.com?param=value');
        expect(result.isValid).toBe(true);
      });

      it('should accept URLs with ports', () => {
        const result = validateUrl('https://example.com:8080');
        expect(result.isValid).toBe(true);
      });

      it('should reject URLs with invalid protocol', () => {
        const result = validateUrl('ftp://example.com');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('URL must use HTTP or HTTPS protocol');
      });

      it('should reject invalid URL format', () => {
        const result = validateUrl('not-a-url');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid URL format');
      });

      it('should reject empty URL', () => {
        const result = validateUrl('');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('URL is required');
      });

      it('should trim URL', () => {
        const result = validateUrl('  https://example.com  ');
        expect(result.sanitizedValue).toBe('https://example.com');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null input in sanitizeHtml', () => {
      expect(sanitizeHtml(null as any)).toBe('');
    });

    it('should handle undefined input in sanitizeHtml', () => {
      expect(sanitizeHtml(undefined as any)).toBe('');
    });

    it('should handle non-string input in sanitizeSql', () => {
      expect(sanitizeSql(null as any)).toBe('');
      expect(sanitizeSql(undefined as any)).toBe('');
    });

    it('should handle non-string input in sanitizeFilename', () => {
      expect(sanitizeFilename(null as any)).toBe('');
      expect(sanitizeFilename(undefined as any)).toBe('');
    });

    it('should handle non-string input in validateEmail', () => {
      const result = validateEmail(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });

    it('should handle non-string input in validateUrl', () => {
      const result = validateUrl(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('URL is required');
    });
  });
});
