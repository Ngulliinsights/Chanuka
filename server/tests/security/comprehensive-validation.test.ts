import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Comprehensive Input Validation Tests
 * Tests all aspects of input validation including API inputs, file uploads, and sanitization
 */

describe('Comprehensive Input Validation', () => {
  describe('API Input Validation', () => {
    // Mock validation function similar to our implementation
    const validateApiInput = (schema: any, input: unknown) => {
      try {
        // Simple validation logic for testing
        if (schema.type === 'object' && schema.required) {
          const errors: any[] = [];
          
          if (typeof input !== 'object' || input === null) {
            errors.push({ field: 'root', message: 'Must be an object' });
            return { isValid: false, errors };
          }

          const inputObj = input as Record<string, any>;
          
          schema.required.forEach((field: string) => {
            if (!(field in inputObj) || inputObj[field] === undefined || inputObj[field] === null) {
              errors.push({ field, message: `${field} is required` });
            }
          });

          if (schema.properties) {
            Object.entries(schema.properties).forEach(([field, fieldSchema]: [string, any]) => {
              const value = inputObj[field];
              if (value !== undefined) {
                if (fieldSchema.type === 'string' && typeof value !== 'string') {
                  errors.push({ field, message: `${field} must be a string` });
                }
                if (fieldSchema.type === 'number' && typeof value !== 'number') {
                  errors.push({ field, message: `${field} must be a number` });
                }
                if (fieldSchema.minLength && typeof value === 'string' && value.length < fieldSchema.minLength) {
                  errors.push({ field, message: `${field} must be at least ${fieldSchema.minLength} characters` });
                }
                if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
                  errors.push({ field, message: `${field} must be one of: ${fieldSchema.enum.join(', ')}` });
                }
              }
            });
          }

          return {
            isValid: errors.length === 0,
            errors,
            data: errors.length === 0 ? input : undefined
          };
        }

        return { isValid: true, errors: [], data: input };
      } catch (error) {
        return {
          isValid: false,
          errors: [{ field: 'validation', message: 'Validation error' }]
        };
      }
    };

    it('should validate user registration input', () => {
      const userSchema = {
        type: 'object',
        required: ['email', 'name', 'role'],
        properties: {
          email: { type: 'string', minLength: 1 },
          name: { type: 'string', minLength: 1 },
          role: { type: 'string', enum: ['citizen', 'expert', 'admin'] }
        }
      };

      const validInput = {
        email: 'user@example.com',
        name: 'John Doe',
        role: 'citizen'
      };

      const result = validateApiInput(userSchema, validInput);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validInput);
    });

    it('should reject invalid user registration input', () => {
      const userSchema = {
        type: 'object',
        required: ['email', 'name', 'role'],
        properties: {
          email: { type: 'string', minLength: 1 },
          name: { type: 'string', minLength: 1 },
          role: { type: 'string', enum: ['citizen', 'expert', 'admin'] }
        }
      };

      const invalidInput = {
        email: '',
        name: 123,
        role: 'superuser'
      };

      const result = validateApiInput(userSchema, invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it('should validate bill comment input', () => { const commentSchema = {
        type: 'object',
        required: ['content', 'bill_id'],
        properties: {
          content: { type: 'string', minLength: 1  },
          bill_id: { type: 'number' },
          parent_id: { type: 'number' },
          commentType: { type: 'string', enum: ['general', 'expert_analysis', 'concern', 'support'] }
        }
      };

      const validComment = { content: 'This is a thoughtful comment about the bills.',
        bill_id: 123,
        commentType: 'general'
       };

      const result = validateApiInput(commentSchema, validComment);
      expect(result.isValid).toBe(true);
    });
  });

  describe('File Upload Validation', () => {
    const createMockFile = (options: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer?: Buffer;
    }): Express.Multer.File => ({
      fieldname: 'file',
      originalname: options.originalname,
      encoding: '7bit',
      mimetype: options.mimetype,
      size: options.size,
      buffer: options.buffer || Buffer.from('mock file content'),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any
    });

    const validateFileUpload = (file: any, options: {
      maxSize: number;
      allowedTypes: string[];
      allowedExtensions: string[];
    }) => {
      const errors: any[] = [];

      if (!file) {
        errors.push({ field: 'file', message: 'No file provided' });
        return { isValid: false, errors };
      }

      // Check file size
      if (file.size > options.maxSize) {
        errors.push({
          field: 'file.size',
          message: `File size exceeds maximum allowed size of ${options.maxSize} bytes`
        });
      }

      // Check MIME type
      if (!options.allowedTypes.includes(file.mimetype)) {
        errors.push({
          field: 'file.type',
          message: `File type ${file.mimetype} is not allowed`
        });
      }

      // Check file extension
      const fileExtension = file.originalname?.split('.').pop()?.toLowerCase();
      if (!fileExtension || !options.allowedExtensions.includes(fileExtension)) {
        errors.push({
          field: 'file.extension',
          message: `File extension .${fileExtension} is not allowed`
        });
      }

      // Check for malicious filename patterns
      if (file.originalname?.includes('../') || file.originalname?.includes('..\\')) {
        errors.push({
          field: 'file.name',
          message: 'Filename contains path traversal attempt'
        });
      }

      if (file.originalname?.includes('\0')) {
        errors.push({
          field: 'file.name',
          message: 'Filename contains null bytes'
        });
      }

      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.php', '.js'];
      if (suspiciousExtensions.some(ext => file.originalname?.toLowerCase().endsWith(ext))) {
        errors.push({
          field: 'file.extension',
          message: 'Suspicious file extension detected'
        });
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    };

    it('should validate valid image uploads', () => {
      const validImageFile = createMockFile({
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024 // 1MB
      });

      const imageOptions = {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
        allowedExtensions: ['jpg', 'jpeg', 'png', 'gif']
      };

      const result = validateFileUpload(validImageFile, imageOptions);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files that are too large', () => {
      const largeFile = createMockFile({
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 10 * 1024 * 1024 // 10MB
      });

      const imageOptions = {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png'],
        allowedExtensions: ['jpg', 'jpeg', 'png']
      };

      const result = validateFileUpload(largeFile, imageOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('file.size');
    });

    it('should reject invalid file types', () => {
      const invalidFile = createMockFile({
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024
      });

      const imageOptions = {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png'],
        allowedExtensions: ['jpg', 'jpeg', 'png']
      };

      const result = validateFileUpload(invalidFile, imageOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'file.type')).toBe(true);
    });

    it('should detect malicious filenames', () => {
      const maliciousFiles = [
        createMockFile({
          originalname: '../../../etc/passwd',
          mimetype: 'text/plain',
          size: 100
        }),
        createMockFile({
          originalname: 'virus.exe',
          mimetype: 'application/octet-stream',
          size: 100
        }),
        createMockFile({
          originalname: 'file\0.jpg',
          mimetype: 'image/jpeg',
          size: 100
        })
      ];

      const options = {
        maxSize: 1024 * 1024,
        allowedTypes: ['text/plain', 'application/octet-stream', 'image/jpeg'],
        allowedExtensions: ['txt', 'exe', 'jpg']
      };

      maliciousFiles.forEach(file => {
        const result = validateFileUpload(file, options);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('HTML Sanitization', () => {
    const sanitizeHtml = (input: string): string => {
      if (typeof input !== 'string') return String(input);

      // Remove script tags
      let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      // Remove dangerous event handlers
      sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
      
      // Remove javascript: URLs
      sanitized = sanitized.replace(/javascript:/gi, '');
      
      // Remove data: URLs
      sanitized = sanitized.replace(/data:/gi, '');
      
      // Escape HTML entities
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

      return sanitized.trim();
    };

    it('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizeHtml(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('Safe content');
    });

    it('should remove event handlers', () => {
      const maliciousInput = '<div onclick="alert()" onmouseover="steal()">Content</div>';
      const sanitized = sanitizeHtml(maliciousInput);
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('onmouseover');
    });

    it('should remove dangerous URLs', () => {
      const maliciousInput = '<a href="javascript:alert()">Link</a><img src="data:text/html,<script>alert()</script>">';
      const sanitized = sanitizeHtml(maliciousInput);
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('data:');
    });

    it('should escape HTML entities', () => {
      const input = '<p>Hello & "World"</p>';
      const sanitized = sanitizeHtml(input);
      
      expect(sanitized).toContain('&lt;p&gt;');
      expect(sanitized).toContain('&amp;');
      expect(sanitized).toContain('&quot;');
    });
  });

  describe('Search Query Validation', () => {
    const validateSearchQuery = (query: string) => {
      if (!query || typeof query !== 'string') {
        return {
          isValid: false,
          errors: [{ field: 'query', message: 'Search query is required' }]
        };
      }

      // Sanitize the query
      let sanitized = query.trim();
      
      // Remove potentially dangerous characters
      sanitized = sanitized.replace(/[<>'"&]/g, '');
      
      // Limit length
      if (sanitized.length > 200) {
        sanitized = sanitized.substring(0, 200);
      }

      // Ensure minimum length
      if (sanitized.length < 1) {
        return {
          isValid: false,
          errors: [{ field: 'query', message: 'Search query must be at least 1 character long' }]
        };
      }

      return {
        isValid: true,
        data: sanitized,
        errors: []
      };
    };

    it('should validate and sanitize search queries', () => {
      const query = 'search term with <script>alert()</script>';
      const result = validateSearchQuery(query);

      expect(result.isValid).toBe(true);
      expect(result.data).not.toContain('<script>');
      expect(result.data).toContain('search term');
    });

    it('should reject empty queries', () => {
      const result = validateSearchQuery('');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('required');
    });

    it('should truncate long queries', () => {
      const longQuery = 'a'.repeat(250);
      const result = validateSearchQuery(longQuery);
      
      expect(result.isValid).toBe(true);
      expect(result.data?.length).toBe(200);
    });
  });

  describe('Pagination Validation', () => {
    const validatePagination = (page?: string, limit?: string) => {
      const pageNum = Math.max(1, parseInt(page || '1') || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20') || 20));
      const offset = (pageNum - 1) * limitNum;

      return {
        isValid: true,
        data: { page: pageNum, limit: limitNum, offset },
        errors: []
      };
    };

    it('should validate and sanitize pagination parameters', () => {
      const result = validatePagination('2', '50');
      
      expect(result.isValid).toBe(true);
      expect(result.data?.page).toBe(2);
      expect(result.data?.limit).toBe(50);
      expect(result.data?.offset).toBe(50);
    });

    it('should enforce minimum and maximum limits', () => {
      const result1 = validatePagination('0', '200');
      expect(result1.data?.page).toBe(1); // Minimum page is 1
      expect(result1.data?.limit).toBe(100); // Maximum limit is 100

      const result2 = validatePagination('-5', '-10');
      expect(result2.data?.page).toBe(1);
      expect(result2.data?.limit).toBe(1); // Minimum limit is 1, not default
    });

    it('should handle invalid input gracefully', () => {
      const result = validatePagination('invalid', 'invalid');
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(20);
    });
  });
});
