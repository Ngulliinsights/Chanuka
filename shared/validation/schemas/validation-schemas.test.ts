/**
 * Unit Tests for Validation Schemas
 * 
 * Tests validation schemas for:
 * - Valid inputs are accepted
 * - Invalid inputs are rejected
 * - Edge cases and boundary conditions
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { describe, it, expect } from 'vitest';
import {
  UserSchema,
  UserRegistrationSchema,
  validateUser,
  validateUserRegistration,
  USER_VALIDATION_RULES,
} from './user.schema';
import {
  BillSchema,
  validateBill,
  BILL_VALIDATION_RULES,
} from './bill.schema';
import {
  CommentSchema,
  validateComment,
  COMMENT_VALIDATION_RULES,
} from './comment.schema;

// ============================================================================
// USER SCHEMA TESTS
// ============================================================================

describe('UserSchema', () => {
  describe('Valid inputs', () => {
    it('should accept valid user with all required fields', () => {
      const validUser = {
        email: 'test@example.com',
        username: 'testuser123',
        role: 'citizen',
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should accept valid user with optional fields', () => {
      const validUser = {
        email: 'user@domain.com',
        username: 'john_doe',
        first_name: 'John',
        last_name: 'Doe',
        bio: 'Software developer',
        phone: '+1-555-123-4567',
        role: 'representative',
        is_active: true,
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should accept user with nullable fields as null', () => {
      const validUser = {
        email: 'test@example.com',
        username: 'testuser',
        bio: null,
        phone: null,
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    it('should reject invalid email format', () => {
      const invalidUser = {
        email: 'not-an-email',
        username: 'testuser',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.path.includes('email'))).toBe(true);
      }
    });

    it('should reject username with invalid characters', () => {
      const invalidUser = {
        email: 'test@example.com',
        username: 'test user!',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.path.includes('username'))).toBe(true);
      }
    });

    it('should reject invalid role', () => {
      const invalidUser = {
        email: 'test@example.com',
        username: 'testuser',
        role: 'superuser',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject invalid phone format', () => {
      const invalidUser = {
        email: 'test@example.com',
        username: 'testuser',
        phone: 'abc-def-ghij',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should reject username shorter than 3 characters', () => {
      const invalidUser = {
        email: 'test@example.com',
        username: 'ab',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject username longer than 20 characters', () => {
      const invalidUser = {
        email: 'test@example.com',
        username: 'a'.repeat(21),
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should accept username exactly 3 characters', () => {
      const validUser = {
        email: 'test@example.com',
        username: 'abc',
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should accept username exactly 20 characters', () => {
      const validUser = {
        email: 'test@example.com',
        username: 'a'.repeat(20),
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject bio longer than 500 characters', () => {
      const invalidUser = {
        email: 'test@example.com',
        username: 'testuser',
        bio: 'a'.repeat(501),
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should accept bio exactly 500 characters', () => {
      const validUser = {
        email: 'test@example.com',
        username: 'testuser',
        bio: 'a'.repeat(500),
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject first_name longer than 50 characters', () => {
      const invalidUser = {
        email: 'test@example.com',
        username: 'testuser',
        first_name: 'a'.repeat(51),
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject empty first_name', () => {
      const invalidUser = {
        email: 'test@example.com',
        username: 'testuser',
        first_name: '',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('validateUser helper function', () => {
    it('should return valid: true for valid user', () => {
      const validUser = {
        email: 'test@example.com',
        username: 'testuser',
      };

      const result = validateUser(validUser);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return errors for invalid user', () => {
      const invalidUser = {
        email: 'invalid-email',
        username: 'ab',
      };

      const result = validateUser(invalidUser);
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });
  });
});

describe('UserRegistrationSchema', () => {
  describe('Valid inputs', () => {
    it('should accept valid registration with matching passwords', () => {
      const validRegistration = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        password_confirm: 'Password123!',
      };

      const result = UserRegistrationSchema.safeParse(validRegistration);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    it('should reject password shorter than 8 characters', () => {
      const invalidRegistration = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Pass1!',
        password_confirm: 'Pass1!',
      };

      const result = UserRegistrationSchema.safeParse(invalidRegistration);
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase letter', () => {
      const invalidRegistration = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123!',
        password_confirm: 'password123!',
      };

      const result = UserRegistrationSchema.safeParse(invalidRegistration);
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase letter', () => {
      const invalidRegistration = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'PASSWORD123!',
        password_confirm: 'PASSWORD123!',
      };

      const result = UserRegistrationSchema.safeParse(invalidRegistration);
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const invalidRegistration = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password!',
        password_confirm: 'Password!',
      };

      const result = UserRegistrationSchema.safeParse(invalidRegistration);
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const invalidRegistration = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
        password_confirm: 'Password123',
      };

      const result = UserRegistrationSchema.safeParse(invalidRegistration);
      expect(result.success).toBe(false);
    });

    it('should reject mismatched passwords', () => {
      const invalidRegistration = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        password_confirm: 'DifferentPass123!',
      };

      const result = UserRegistrationSchema.safeParse(invalidRegistration);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.path.includes('password_confirm'))).toBe(true);
      }
    });
  });

  describe('Edge cases', () => {
    it('should accept password exactly 8 characters with all requirements', () => {
      const validRegistration = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Pass123!',
        password_confirm: 'Pass123!',
      };

      const result = UserRegistrationSchema.safeParse(validRegistration);
      expect(result.success).toBe(true);
    });
  });

  describe('validateUserRegistration helper function', () => {
    it('should return valid: true for valid registration', () => {
      const validRegistration = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        password_confirm: 'Password123!',
      };

      const result = validateUserRegistration(validRegistration);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return errors for invalid registration', () => {
      const invalidRegistration = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
        password_confirm: 'different',
      };

      const result = validateUserRegistration(invalidRegistration);
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// BILL SCHEMA TESTS
// ============================================================================

describe('BillSchema', () => {
  describe('Valid inputs', () => {
    it('should accept valid bill with all required fields', () => {
      const validBill = {
        title: 'Infrastructure Investment Act',
        summary: 'This bill provides funding for infrastructure improvements.',
        content: 'Section 1: This act shall be known as the Infrastructure Investment Act. Section 2: Funding provisions...',
      };

      const result = BillSchema.safeParse(validBill);
      expect(result.success).toBe(true);
    });

    it('should accept valid bill with optional fields', () => {
      const validBill = {
        title: 'Healthcare Reform Bill',
        short_title: 'Healthcare Act',
        summary: 'Comprehensive healthcare reform legislation.',
        content: 'Section 1: Purpose and scope of healthcare reform. Section 2: Implementation details...',
        bill_number: 'H.1234',
        status: 'introduced',
        chamber: 'house',
        type: 'bill',
        priority: 'high',
      };

      const result = BillSchema.safeParse(validBill);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    it('should reject title shorter than 10 characters', () => {
      const invalidBill = {
        title: 'Short',
        summary: 'This is a valid summary.',
        content: 'This is valid content that meets the minimum length requirement.',
      };

      const result = BillSchema.safeParse(invalidBill);
      expect(result.success).toBe(false);
    });

    it('should reject title longer than 200 characters', () => {
      const invalidBill = {
        title: 'a'.repeat(201),
        summary: 'This is a valid summary.',
        content: 'This is valid content that meets the minimum length requirement.',
      };

      const result = BillSchema.safeParse(invalidBill);
      expect(result.success).toBe(false);
    });

    it('should reject summary shorter than 20 characters', () => {
      const invalidBill = {
        title: 'Valid Bill Title',
        summary: 'Too short',
        content: 'This is valid content that meets the minimum length requirement.',
      };

      const result = BillSchema.safeParse(invalidBill);
      expect(result.success).toBe(false);
    });

    it('should reject content shorter than 50 characters', () => {
      const invalidBill = {
        title: 'Valid Bill Title',
        summary: 'This is a valid summary.',
        content: 'Too short',
      };

      const result = BillSchema.safeParse(invalidBill);
      expect(result.success).toBe(false);
    });

    it('should reject invalid bill number format', () => {
      const invalidBill = {
        title: 'Valid Bill Title',
        summary: 'This is a valid summary.',
        content: 'This is valid content that meets the minimum length requirement.',
        bill_number: 'INVALID123',
      };

      const result = BillSchema.safeParse(invalidBill);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const invalidBill = {
        title: 'Valid Bill Title',
        summary: 'This is a valid summary.',
        content: 'This is valid content that meets the minimum length requirement.',
        status: 'invalid_status',
      };

      const result = BillSchema.safeParse(invalidBill);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should accept title exactly 10 characters', () => {
      const validBill = {
        title: 'a'.repeat(10),
        summary: 'This is a valid summary.',
        content: 'This is valid content that meets the minimum length requirement.',
      };

      const result = BillSchema.safeParse(validBill);
      expect(result.success).toBe(true);
    });

    it('should accept title exactly 200 characters', () => {
      const validBill = {
        title: 'a'.repeat(200),
        summary: 'This is a valid summary.',
        content: 'This is valid content that meets the minimum length requirement.',
      };

      const result = BillSchema.safeParse(validBill);
      expect(result.success).toBe(true);
    });

    it('should accept summary exactly 20 characters', () => {
      const validBill = {
        title: 'Valid Bill Title',
        summary: 'a'.repeat(20),
        content: 'This is valid content that meets the minimum length requirement.',
      };

      const result = BillSchema.safeParse(validBill);
      expect(result.success).toBe(true);
    });

    it('should accept summary exactly 1000 characters', () => {
      const validBill = {
        title: 'Valid Bill Title',
        summary: 'a'.repeat(1000),
        content: 'This is valid content that meets the minimum length requirement.',
      };

      const result = BillSchema.safeParse(validBill);
      expect(result.success).toBe(true);
    });

    it('should reject summary longer than 1000 characters', () => {
      const invalidBill = {
        title: 'Valid Bill Title',
        summary: 'a'.repeat(1001),
        content: 'This is valid content that meets the minimum length requirement.',
      };

      const result = BillSchema.safeParse(invalidBill);
      expect(result.success).toBe(false);
    });

    it('should accept content exactly 50 characters', () => {
      const validBill = {
        title: 'Valid Bill Title',
        summary: 'This is a valid summary.',
        content: 'a'.repeat(50),
      };

      const result = BillSchema.safeParse(validBill);
      expect(result.success).toBe(true);
    });

    it('should accept bill number with H prefix', () => {
      const validBill = {
        title: 'Valid Bill Title',
        summary: 'This is a valid summary.',
        content: 'This is valid content that meets the minimum length requirement.',
        bill_number: 'H.123',
      };

      const result = BillSchema.safeParse(validBill);
      expect(result.success).toBe(true);
    });

    it('should accept bill number with S prefix', () => {
      const validBill = {
        title: 'Valid Bill Title',
        summary: 'This is a valid summary.',
        content: 'This is valid content that meets the minimum length requirement.',
        bill_number: 'S456',
      };

      const result = BillSchema.safeParse(validBill);
      expect(result.success).toBe(true);
    });

    it('should accept all valid status values', () => {
      const statuses = [
        'draft', 'introduced', 'committee_review', 'floor_debate',
        'amendment', 'vote_scheduled', 'passed_chamber', 'conference',
        'passed_both_chambers', 'presidential_action', 'enacted', 'vetoed',
        'failed', 'withdrawn', 'archived'
      ];

      statuses.forEach(status => {
        const validBill = {
          title: 'Valid Bill Title',
          summary: 'This is a valid summary.',
          content: 'This is valid content that meets the minimum length requirement.',
          status,
        };

        const result = BillSchema.safeParse(validBill);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('validateBill helper function', () => {
    it('should return valid: true for valid bill', () => {
      const validBill = {
        title: 'Valid Bill Title',
        summary: 'This is a valid summary.',
        content: 'This is valid content that meets the minimum length requirement.',
      };

      const result = validateBill(validBill);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return errors for invalid bill', () => {
      const invalidBill = {
        title: 'Short',
        summary: 'Too short',
        content: 'Too short',
      };

      const result = validateBill(invalidBill);
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });
  });
});


// ============================================================================
// COMMENT SCHEMA TESTS
// ============================================================================

describe('CommentSchema', () => {
  describe('Valid inputs', () => {
    it('should accept valid comment with all required fields', () => {
      const validComment = {
        content: 'This is a valid comment.',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CommentSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });

    it('should accept valid comment with optional fields', () => {
      const validComment = {
        content: 'This is a valid comment with all fields.',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
        bill_id: '223e4567-e89b-12d3-a456-426614174000',
        argument_id: '323e4567-e89b-12d3-a456-426614174000',
        parent_id: '423e4567-e89b-12d3-a456-426614174000',
        is_edited: true,
      };

      const result = CommentSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });

    it('should accept comment with parent_id as null', () => {
      const validComment = {
        content: 'This is a valid comment.',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
        parent_id: null,
      };

      const result = CommentSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    it('should reject content shorter than 5 characters', () => {
      const invalidComment = {
        content: 'Hi',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CommentSchema.safeParse(invalidComment);
      expect(result.success).toBe(false);
    });

    it('should reject content longer than 5000 characters', () => {
      const invalidComment = {
        content: 'a'.repeat(5001),
        author_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CommentSchema.safeParse(invalidComment);
      expect(result.success).toBe(false);
    });

    it('should reject content with less than 2 words', () => {
      const invalidComment = {
        content: 'Hello',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CommentSchema.safeParse(invalidComment);
      expect(result.success).toBe(false);
    });

    it('should reject invalid author_id format', () => {
      const invalidComment = {
        content: 'This is a valid comment.',
        author_id: 'not-a-uuid',
      };

      const result = CommentSchema.safeParse(invalidComment);
      expect(result.success).toBe(false);
    });

    it('should reject invalid bill_id format', () => {
      const invalidComment = {
        content: 'This is a valid comment.',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
        bill_id: 'invalid-uuid',
      };

      const result = CommentSchema.safeParse(invalidComment);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should accept content exactly 5 characters with 2 words', () => {
      const validComment = {
        content: 'Hi yo',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CommentSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });

    it('should accept content exactly 5000 characters', () => {
      const validComment = {
        content: 'word '.repeat(1000), // Creates 5000 characters with many words
        author_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CommentSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });

    it('should accept content with exactly 2 words', () => {
      const validComment = {
        content: 'Hello world',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CommentSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });

    it('should handle content with extra whitespace', () => {
      const validComment = {
        content: '  Hello   world  ',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CommentSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });

    it('should reject content with only whitespace', () => {
      const invalidComment = {
        content: '     ',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CommentSchema.safeParse(invalidComment);
      expect(result.success).toBe(false);
    });
  });

  describe('validateComment helper function', () => {
    it('should return valid: true for valid comment', () => {
      const validComment = {
        content: 'This is a valid comment.',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateComment(validComment);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return errors for invalid comment', () => {
      const invalidComment = {
        content: 'Hi',
        author_id: 'not-a-uuid',
      };

      const result = validateComment(invalidComment);
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });
  });
});
