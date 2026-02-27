/**
 * Sanitization Tests
 *
 * Tests for input sanitization utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeHtml,
  sanitizePlainText,
  escapeHtml,
  unescapeHtml,
  hasSqlInjection,
  hasXss,
  sanitizeFilename,
  sanitizeUsername,
  sanitizeSearchQuery,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeCurrency,
  checkSecurity,
} from '../sanitization';

describe('Sanitization', () => {
  describe('sanitizeInput', () => {
    it('should trim whitespace by default', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeInput('HELLO', { lowercase: true })).toBe('hello');
    });

    it('should convert to uppercase', () => {
      expect(sanitizeInput('hello', { uppercase: true })).toBe('HELLO');
    });

    it('should remove extra spaces', () => {
      expect(sanitizeInput('hello   world', { removeExtraSpaces: true })).toBe('hello world');
    });

    it('should limit length', () => {
      expect(sanitizeInput('hello world', { maxLength: 5 })).toBe('hello');
    });

    it('should strip HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>hello', { stripTags: true })).toBe(
        'hello'
      );
    });
  });

  describe('sanitizeEmail', () => {
    it('should sanitize email address', () => {
      expect(sanitizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
    });

    it('should limit email length', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const sanitized = sanitizeEmail(longEmail);
      expect(sanitized.length).toBeLessThanOrEqual(254);
    });
  });

  describe('sanitizePhone', () => {
    it('should remove non-phone characters', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
      expect(sanitizePhone('abc555def1234')).toBe('5551234');
    });
  });

  describe('sanitizeUrl', () => {
    it('should add https protocol if missing', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
    });

    it('should preserve existing protocol', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });
  });

  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const sanitized = sanitizeHtml(html);
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
    });

    it('should remove dangerous tags', () => {
      const html = '<script>alert("xss")</script><p>Hello</p>';
      const sanitized = sanitizeHtml(html);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>');
    });

    it('should allow custom tags', () => {
      const html = '<div>Hello</div><p>World</p>';
      const sanitized = sanitizeHtml(html, ['div']);
      expect(sanitized).toContain('<div>');
      expect(sanitized).not.toContain('<p>');
    });
  });

  describe('sanitizePlainText', () => {
    it('should remove all HTML tags', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      expect(sanitizePlainText(html)).toBe('Hello world');
    });
  });

  describe('escapeHtml / unescapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should unescape HTML special characters', () => {
      expect(unescapeHtml('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')).toBe(
        '<script>alert("xss")</script>'
      );
    });
  });

  describe('security checks', () => {
    it('should detect SQL injection patterns', () => {
      expect(hasSqlInjection("'; DROP TABLE users; --")).toBe(true);
      expect(hasSqlInjection('SELECT * FROM users')).toBe(true);
      expect(hasSqlInjection('normal text')).toBe(false);
    });

    it('should detect XSS patterns', () => {
      expect(hasXss('<script>alert("xss")</script>')).toBe(true);
      expect(hasXss('normal text')).toBe(false);
    });

    it('should perform comprehensive security check', () => {
      const result1 = checkSecurity('normal text');
      expect(result1.safe).toBe(true);
      expect(result1.threats).toHaveLength(0);

      const result2 = checkSecurity('<script>alert("xss")</script>');
      expect(result2.safe).toBe(false);
      expect(result2.threats.length).toBeGreaterThan(0);
    });
  });

  describe('specialized sanitizers', () => {
    it('should sanitize filename', () => {
      expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..');
      expect(sanitizeFilename('file<>name.txt')).toBe('file__name.txt');
    });

    it('should sanitize username', () => {
      expect(sanitizeUsername('User Name!')).toBe('username');
      expect(sanitizeUsername('user_name-123')).toBe('user_name-123');
    });

    it('should sanitize search query', () => {
      const query = '  <script>alert("xss")</script>  search   term  ';
      const sanitized = sanitizeSearchQuery(query);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toBe('search term');
    });

    it('should sanitize number', () => {
      expect(sanitizeNumber('$1,234.56')).toBe('1234.56');
      expect(sanitizeNumber('-123.45')).toBe('-123.45');
    });

    it('should sanitize integer', () => {
      expect(sanitizeInteger('$1,234')).toBe('1234');
      expect(sanitizeInteger('-123')).toBe('-123');
    });

    it('should sanitize currency', () => {
      expect(sanitizeCurrency('$1,234.56')).toBe('1234.56');
    });
  });
});
