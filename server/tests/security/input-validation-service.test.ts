import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { inputValidationService } from '../../infrastructure/security/input-validation-service.js';

describe('InputValidationService', () => {
  describe('validateApiInput', () => {
    it('should validate valid input against schema', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0)
      });

      const validInput = { name: 'John', age: 25 };
      const result = inputValidationService.validateApiInput(schema, validInput);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validInput);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid input with detailed errors', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0)
      });

      const invalidInput = { name: '', age: -5 };
      const result = inputValidationService.validateApiInput(schema, invalidInput);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[1].field).toBe('age');
    });
  });

  describe('sanitizeHtmlInput', () => {
    it('should remove script tags and dangerous content', () => {
      const maliciousInput = '<script>alert("xss")</script><p onclick="alert()">Hello</p>';
      const sanitized = inputValidationService.sanitizeHtmlInput(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('javascript:');
    });

    it('should remove dangerous event handlers', () => {
      const input = '<div onload="malicious()" onmouseover="bad()">Content</div>';
      const sanitized = inputValidationService.sanitizeHtmlInput(input);

      expect(sanitized).not.toContain('onload');
      expect(sanitized).not.toContain('onmouseover');
      expect(sanitized).toContain('Content');
    });

    it('should remove javascript: and data: URLs', () => {
      const input = '<a href="javascript:alert()">Link</a><img src="data:text/html,<script>alert()</script>">';
      const sanitized = inputValidationService.sanitizeHtmlInput(input);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('data:');
    });

    it('should handle non-string inputs', () => {
      expect(inputValidationService.sanitizeHtmlInput(123 as any)).toBe('123');
      expect(inputValidationService.sanitizeHtmlInput(null as any)).toBe('null');
      expect(inputValidationService.sanitizeHtmlInput(undefined as any)).toBe('undefined');
    });
  });

  describe('validateFileUpload', () => {
    const imageOptions = {
      maxSize: 1024 * 1024, // 1MB
      allowedTypes: ['image/jpeg', 'image/png'],
      allowedExtensions: ['jpg', 'jpeg', 'png']
    };

    it('should validate valid file upload', () => {
      const validFile = {
        size: 500000,
        mimetype: 'image/jpeg',
        originalname: 'photo.jpg'
      };

      const result = inputValidationService.validateFileUpload(validFile, imageOptions);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file that is too large', () => {
      const largeFile = {
        size: 2 * 1024 * 1024, // 2MB
        mimetype: 'image/jpeg',
        originalname: 'large.jpg'
      };

      const result = inputValidationService.validateFileUpload(largeFile, imageOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('file.size');
    });

    it('should reject invalid file type', () => {
      const invalidFile = {
        size: 500000,
        mimetype: 'application/pdf',
        originalname: 'document.pdf'
      };

      const result = inputValidationService.validateFileUpload(invalidFile, imageOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('file.type');
    });

    it('should reject invalid file extension', () => {
      const invalidFile = {
        size: 500000,
        mimetype: 'image/jpeg',
        originalname: 'photo.gif'
      };

      const result = inputValidationService.validateFileUpload(invalidFile, imageOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('file.extension');
    });

    it('should detect malicious file names', () => {
      const maliciousFiles = [
        { size: 1000, mimetype: 'image/jpeg', originalname: 'virus.exe' },
        { size: 1000, mimetype: 'image/jpeg', originalname: '../../../etc/passwd' },
        { size: 1000, mimetype: 'image/jpeg', originalname: 'file\0.jpg' }
      ];

      maliciousFiles.forEach(file => {
        const result = inputValidationService.validateFileUpload(file, imageOptions);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateUserRole', () => {
    it('should validate valid user roles', () => {
      const validRoles = ['citizen', 'expert', 'admin', 'journalist', 'advocate'];
      
      validRoles.forEach(role => {
        const result = inputValidationService.validateUserRole(role);
        expect(result.isValid).toBe(true);
        expect(result.data).toBe(role);
      });
    });

    it('should reject invalid user roles', () => {
      const invalidRoles = ['superuser', 'root', '', null, undefined];
      
      invalidRoles.forEach(role => {
        const result = inputValidationService.validateUserRole(role as any);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
      });
    });
  });

  describe('validateEmail', () => {
    it('should validate valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@test-domain.org'
      ];

      validEmails.forEach(email => {
        const result = inputValidationService.validateEmail(email);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com'
      ];

      invalidEmails.forEach(email => {
        const result = inputValidationService.validateEmail(email);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateSearchQuery', () => {
    it('should validate and sanitize search queries', () => {
      const query = 'search term with <script>alert()</script>';
      const result = inputValidationService.validateSearchQuery(query);

      expect(result.isValid).toBe(true);
      expect(result.data).not.toContain('<script>');
      expect(result.data).toContain('search term');
    });

    it('should reject empty or too long queries', () => {
      const emptyResult = inputValidationService.validateSearchQuery('');
      expect(emptyResult.isValid).toBe(false);

      const longQuery = 'a'.repeat(201);
      const longResult = inputValidationService.validateSearchQuery(longQuery);
      expect(longResult.isValid).toBe(true);
      expect(longResult.data?.length).toBe(200); // Truncated
    });
  });

  describe('validatePaginationParams', () => {
    it('should validate and transform pagination parameters', () => {
      const result = inputValidationService.validatePaginationParams('2', '50');
      
      expect(result.isValid).toBe(true);
      expect(result.data?.page).toBe(2);
      expect(result.data?.limit).toBe(50);
    });

    it('should apply defaults and limits', () => {
      const result1 = inputValidationService.validatePaginationParams();
      expect(result1.data?.page).toBe(1);
      expect(result1.data?.limit).toBe(20);

      const result2 = inputValidationService.validatePaginationParams('0', '200');
      expect(result2.data?.page).toBe(1); // Minimum 1
      expect(result2.data?.limit).toBe(100); // Maximum 100
    });
  });
});