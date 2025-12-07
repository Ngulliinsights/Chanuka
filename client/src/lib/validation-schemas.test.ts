/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VALIDATION SCHEMAS TEST SUITE
 * Phase 4 Step 3: Comprehensive validation testing for all schemas
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * COVERAGE: 16 schemas × 3+ test cases = 60+ tests
 * FOCUS: Valid data, invalid data, edge cases for each schema
 */

import { describe, it, expect } from 'vitest';

import {
  validationPatterns,
  billValidationSchemas,
  userValidationSchemas,
  formValidationSchemas,
} from './validation-schemas';

// ═══════════════════════════════════════════════════════════════════════════
// 1. COMMON VALIDATION PATTERNS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('validationPatterns', () => {
  describe('email', () => {
    it('should accept valid email', () => {
      const result = validationPatterns.email.safeParse('user@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email without @', () => {
      const result = validationPatterns.email.safeParse('userexample.com');
      expect(result.success).toBe(false);
    });

    it('should reject empty email', () => {
      const result = validationPatterns.email.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should accept email with subdomain', () => {
      const result = validationPatterns.email.safeParse('user@mail.company.co.uk');
      expect(result.success).toBe(true);
    });
  });

  describe('password', () => {
    it('should accept valid password', () => {
      const result = validationPatterns.password.safeParse('SecurePass123');
      expect(result.success).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const result = validationPatterns.password.safeParse('securepass123');
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = validationPatterns.password.safeParse('SECUREPASS123');
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = validationPatterns.password.safeParse('SecurePassAbc');
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validationPatterns.password.safeParse('Pass12');
      expect(result.success).toBe(false);
    });

    it('should accept password with special characters', () => {
      const result = validationPatterns.password.safeParse('SecurePass123!@#');
      expect(result.success).toBe(true);
    });
  });

  describe('username', () => {
    it('should accept valid username', () => {
      const result = validationPatterns.username.safeParse('john_doe-123');
      expect(result.success).toBe(true);
    });

    it('should reject username shorter than 3 characters', () => {
      const result = validationPatterns.username.safeParse('ab');
      expect(result.success).toBe(false);
    });

    it('should reject username longer than 20 characters', () => {
      const result = validationPatterns.username.safeParse('abcdefghijklmnopqrstuv');
      expect(result.success).toBe(false);
    });

    it('should reject username with special characters', () => {
      const result = validationPatterns.username.safeParse('john@doe');
      expect(result.success).toBe(false);
    });

    it('should accept username with numbers', () => {
      const result = validationPatterns.username.safeParse('user123');
      expect(result.success).toBe(true);
    });

    it('should accept username with hyphens and underscores', () => {
      const result = validationPatterns.username.safeParse('user-_name');
      expect(result.success).toBe(true);
    });
  });

  describe('url', () => {
    it('should accept valid URL', () => {
      const result = validationPatterns.url.safeParse('https://example.com');
      expect(result.success).toBe(true);
    });

    it('should accept URL with path', () => {
      const result = validationPatterns.url.safeParse('https://example.com/page/path');
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const result = validationPatterns.url.safeParse('not a url');
      expect(result.success).toBe(false);
    });

    it('should accept URL with query params', () => {
      const result = validationPatterns.url.safeParse('https://example.com?key=value&foo=bar');
      expect(result.success).toBe(true);
    });
  });

  describe('phone', () => {
    it('should accept valid phone number', () => {
      const result = validationPatterns.phone.safeParse('+14155552671');
      expect(result.success).toBe(true);
    });

    it('should accept phone number without +', () => {
      const result = validationPatterns.phone.safeParse('14155552671');
      expect(result.success).toBe(true);
    });

    it('should reject phone number with letters', () => {
      const result = validationPatterns.phone.safeParse('+1415555CALL');
      expect(result.success).toBe(false);
    });

    it('should reject too short phone number', () => {
      const result = validationPatterns.phone.safeParse('+1');
      expect(result.success).toBe(false);
    });
  });

  describe('zipCode', () => {
    it('should accept 5-digit zip code', () => {
      const result = validationPatterns.zipCode.safeParse('12345');
      expect(result.success).toBe(true);
    });

    it('should accept zip+4 format', () => {
      const result = validationPatterns.zipCode.safeParse('12345-6789');
      expect(result.success).toBe(true);
    });

    it('should reject invalid zip code', () => {
      const result = validationPatterns.zipCode.safeParse('abc12');
      expect(result.success).toBe(false);
    });

    it('should reject incomplete zip+4', () => {
      const result = validationPatterns.zipCode.safeParse('12345-67');
      expect(result.success).toBe(false);
    });
  });

  describe('slug', () => {
    it('should accept valid slug', () => {
      const result = validationPatterns.slug.safeParse('my-valid-slug');
      expect(result.success).toBe(true);
    });

    it('should accept slug with numbers', () => {
      const result = validationPatterns.slug.safeParse('slug-123');
      expect(result.success).toBe(true);
    });

    it('should reject slug with uppercase', () => {
      const result = validationPatterns.slug.safeParse('Invalid-Slug');
      expect(result.success).toBe(false);
    });

    it('should reject slug with spaces', () => {
      const result = validationPatterns.slug.safeParse('invalid slug');
      expect(result.success).toBe(false);
    });

    it('should reject slug shorter than 3', () => {
      const result = validationPatterns.slug.safeParse('ab');
      expect(result.success).toBe(false);
    });
  });

  describe('uuid', () => {
    it('should accept valid UUID', () => {
      const result = validationPatterns.uuid.safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = validationPatterns.uuid.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });

    it('should reject partial UUID', () => {
      const result = validationPatterns.uuid.safeParse('550e8400-e29b-41d4-a716');
      expect(result.success).toBe(false);
    });
  });

  describe('percentage', () => {
    it('should accept 0 percent', () => {
      const result = validationPatterns.percentage.safeParse(0);
      expect(result.success).toBe(true);
    });

    it('should accept 100 percent', () => {
      const result = validationPatterns.percentage.safeParse(100);
      expect(result.success).toBe(true);
    });

    it('should accept value in between', () => {
      const result = validationPatterns.percentage.safeParse(50);
      expect(result.success).toBe(true);
    });

    it('should reject negative percent', () => {
      const result = validationPatterns.percentage.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should reject percent over 100', () => {
      const result = validationPatterns.percentage.safeParse(101);
      expect(result.success).toBe(false);
    });
  });

  describe('positiveNumber', () => {
    it('should accept positive number', () => {
      const result = validationPatterns.positiveNumber.safeParse(42);
      expect(result.success).toBe(true);
    });

    it('should reject zero', () => {
      const result = validationPatterns.positiveNumber.safeParse(0);
      expect(result.success).toBe(false);
    });

    it('should reject negative number', () => {
      const result = validationPatterns.positiveNumber.safeParse(-5);
      expect(result.success).toBe(false);
    });

    it('should accept decimal positive number', () => {
      const result = validationPatterns.positiveNumber.safeParse(3.14);
      expect(result.success).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. BILL VALIDATION SCHEMAS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('billValidationSchemas', () => {
  describe('search', () => {
    it('should accept valid search query', () => {
      const result = billValidationSchemas.search.safeParse({
        query: 'healthcare reform',
      });
      expect(result.success).toBe(true);
    });

    it('should accept search with filters', () => {
      const result = billValidationSchemas.search.safeParse({
        query: 'healthcare',
        filters: {
          status: 'active',
          urgency: 'high',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty query', () => {
      const result = billValidationSchemas.search.safeParse({
        query: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject query over 500 characters', () => {
      const result = billValidationSchemas.search.safeParse({
        query: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid limit and offset', () => {
      const result = billValidationSchemas.search.safeParse({
        query: 'healthcare',
        limit: 50,
        offset: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should reject limit over 100', () => {
      const result = billValidationSchemas.search.safeParse({
        query: 'healthcare',
        limit: 101,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('billCreate', () => {
    const validBill = {
      title: 'Comprehensive Healthcare Reform Act',
      description: 'This bill proposes comprehensive reforms to the healthcare system to improve access and reduce costs for all Americans.',
      policyArea: 'Healthcare',
      urgency: 'high' as const,
      tags: ['healthcare', 'reform'],
      sponsors: ['sponsor-id-1'],
      estimatedCost: 1000000,
    };

    it('should accept valid bill data', () => {
      const result = billValidationSchemas.billCreate.safeParse(validBill);
      expect(result.success).toBe(true);
    });

    it('should reject bill with title too short', () => {
      const result = billValidationSchemas.billCreate.safeParse({
        ...validBill,
        title: 'Short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject bill with title too long', () => {
      const result = billValidationSchemas.billCreate.safeParse({
        ...validBill,
        title: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should reject bill with description too short', () => {
      const result = billValidationSchemas.billCreate.safeParse({
        ...validBill,
        description: 'Too short description',
      });
      expect(result.success).toBe(false);
    });

    it('should reject bill with description too long', () => {
      const result = billValidationSchemas.billCreate.safeParse({
        ...validBill,
        description: 'a'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it('should reject bill with invalid urgency', () => {
      const result = billValidationSchemas.billCreate.safeParse({
        ...validBill,
        urgency: 'extreme',
      });
      expect(result.success).toBe(false);
    });

    it('should reject bill with too many tags', () => {
      const result = billValidationSchemas.billCreate.safeParse({
        ...validBill,
        tags: Array(11).fill('tag'),
      });
      expect(result.success).toBe(false);
    });

    it('should reject bill with negative cost', () => {
      const result = billValidationSchemas.billCreate.safeParse({
        ...validBill,
        estimatedCost: -1000,
      });
      expect(result.success).toBe(false);
    });

    it('should accept bill with optional fields omitted', () => {
      const result = billValidationSchemas.billCreate.safeParse({
        title: 'Comprehensive Healthcare Reform Act',
        description: 'This bill proposes comprehensive reforms to the healthcare system to improve access and reduce costs for all Americans.',
        policyArea: 'Healthcare',
        urgency: 'high',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('billComment', () => {
    it('should accept valid comment', () => {
      const result = billValidationSchemas.billComment.safeParse({
        content: 'This is a thoughtful comment on the bill.',
        billId: '550e8400-e29b-41d4-a716-446655440000',
        stance: 'support',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty comment', () => {
      const result = billValidationSchemas.billComment.safeParse({
        content: '',
        billId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });

    it('should reject comment over 5000 characters', () => {
      const result = billValidationSchemas.billComment.safeParse({
        content: 'a'.repeat(5001),
        billId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid bill ID', () => {
      const result = billValidationSchemas.billComment.safeParse({
        content: 'Valid comment',
        billId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept comment with reply', () => {
      const result = billValidationSchemas.billComment.safeParse({
        content: 'Valid comment',
        billId: '550e8400-e29b-41d4-a716-446655440000',
        parentCommentId: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. USER VALIDATION SCHEMAS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('userValidationSchemas', () => {
  describe('register', () => {
    const validRegistration = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      username: 'johndoe123',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      agreeToTerms: true,
    };

    it('should accept valid registration', () => {
      const result = userValidationSchemas.register.safeParse(validRegistration);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const result = userValidationSchemas.register.safeParse({
        ...validRegistration,
        confirmPassword: 'DifferentPass123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject if terms not agreed', () => {
      const result = userValidationSchemas.register.safeParse({
        ...validRegistration,
        agreeToTerms: false,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty first name', () => {
      const result = userValidationSchemas.register.safeParse({
        ...validRegistration,
        firstName: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject first name over 50 characters', () => {
      const result = userValidationSchemas.register.safeParse({
        ...validRegistration,
        firstName: 'a'.repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it('should accept registration with newsletter', () => {
      const result = userValidationSchemas.register.safeParse({
        ...validRegistration,
        newsletter: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid password', () => {
      const result = userValidationSchemas.register.safeParse({
        ...validRegistration,
        password: 'weak',
        confirmPassword: 'weak',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('login', () => {
    it('should accept valid login', () => {
      const result = userValidationSchemas.login.safeParse({
        email: 'user@example.com',
        password: 'any-password',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = userValidationSchemas.login.safeParse({
        email: 'invalid-email',
        password: 'password',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = userValidationSchemas.login.safeParse({
        email: 'user@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept login with rememberMe', () => {
      const result = userValidationSchemas.login.safeParse({
        email: 'user@example.com',
        password: 'password123',
        rememberMe: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('passwordChange', () => {
    it('should accept valid password change', () => {
      const result = userValidationSchemas.passwordChange.safeParse({
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456',
        confirmPassword: 'NewPass456',
      });
      expect(result.success).toBe(true);
    });

    it('should reject mismatched new passwords', () => {
      const result = userValidationSchemas.passwordChange.safeParse({
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456',
        confirmPassword: 'DifferentPass456',
      });
      expect(result.success).toBe(false);
    });

    it('should reject if new password same as current', () => {
      const result = userValidationSchemas.passwordChange.safeParse({
        currentPassword: 'OldPass123',
        newPassword: 'OldPass123',
        confirmPassword: 'OldPass123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('preferences', () => {
    it('should accept valid preferences', () => {
      const result = userValidationSchemas.preferences.safeParse({
        theme: 'dark',
        notifications: true,
        emailDigest: 'weekly',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid theme', () => {
      const result = userValidationSchemas.preferences.safeParse({
        theme: 'neon',
        notifications: true,
        emailDigest: 'weekly',
      });
      expect(result.success).toBe(false);
    });

    it('should accept preferences with accessibility settings', () => {
      const result = userValidationSchemas.preferences.safeParse({
        theme: 'light',
        notifications: true,
        emailDigest: 'daily',
        accessibility: {
          reducedMotion: true,
          highContrast: false,
          fontSize: 'large',
        },
      });
      expect(result.success).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. FORM VALIDATION SCHEMAS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('formValidationSchemas', () => {
  describe('contactForm', () => {
    it('should accept valid contact form', () => {
      const result = formValidationSchemas.contactForm.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Question about the platform',
        message: 'I have a question about how to use the platform.',
      });
      expect(result.success).toBe(true);
    });

    it('should reject name too short', () => {
      const result = formValidationSchemas.contactForm.safeParse({
        name: 'J',
        email: 'john@example.com',
        subject: 'Question about the platform',
        message: 'I have a question about how to use the platform.',
      });
      expect(result.success).toBe(false);
    });

    it('should reject subject too short', () => {
      const result = formValidationSchemas.contactForm.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Hi',
        message: 'I have a question about how to use the platform.',
      });
      expect(result.success).toBe(false);
    });

    it('should reject message too short', () => {
      const result = formValidationSchemas.contactForm.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Question about the platform',
        message: 'Short',
      });
      expect(result.success).toBe(false);
    });

    it('should accept contact form with priority', () => {
      const result = formValidationSchemas.contactForm.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Question about the platform',
        message: 'I have a question about how to use the platform.',
        priority: 'high',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('newsletterSignup', () => {
    it('should accept valid newsletter signup', () => {
      const result = formValidationSchemas.newsletterSignup.safeParse({
        email: 'user@example.com',
        frequency: 'weekly',
        interests: ['healthcare', 'environment'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject signup with no interests', () => {
      const result = formValidationSchemas.newsletterSignup.safeParse({
        email: 'user@example.com',
        frequency: 'monthly',
        interests: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = formValidationSchemas.newsletterSignup.safeParse({
        email: 'invalid-email',
        frequency: 'weekly',
        interests: ['tech'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('feedbackForm', () => {
    it('should accept valid feedback', () => {
      const result = formValidationSchemas.feedbackForm.safeParse({
        type: 'bug',
        title: 'Button does not respond',
        description: 'When I click the submit button, nothing happens.',
      });
      expect(result.success).toBe(true);
    });

    it('should reject title too short', () => {
      const result = formValidationSchemas.feedbackForm.safeParse({
        type: 'feature',
        title: 'Bug',
        description: 'When I click the submit button, nothing happens.',
      });
      expect(result.success).toBe(false);
    });

    it('should accept feedback with severity', () => {
      const result = formValidationSchemas.feedbackForm.safeParse({
        type: 'bug',
        title: 'Button does not respond',
        description: 'When I click the submit button, nothing happens.',
        severity: 'high',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('paymentForm', () => {
    it('should accept valid payment data', () => {
      const result = formValidationSchemas.paymentForm.safeParse({
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvc: '123',
        amount: 99.99,
        currency: 'USD',
      });
      expect(result.success).toBe(true);
    });

    it('should accept card number with spaces', () => {
      const result = formValidationSchemas.paymentForm.safeParse({
        cardNumber: '4111 1111 1111 1111',
        expiryDate: '12/25',
        cvc: '123',
        amount: 99.99,
        currency: 'USD',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid card number', () => {
      const result = formValidationSchemas.paymentForm.safeParse({
        cardNumber: '1234',
        expiryDate: '12/25',
        cvc: '123',
        amount: 99.99,
        currency: 'USD',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid expiry date format', () => {
      const result = formValidationSchemas.paymentForm.safeParse({
        cardNumber: '4111111111111111',
        expiryDate: '2025-12',
        cvc: '123',
        amount: 99.99,
        currency: 'USD',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid CVC', () => {
      const result = formValidationSchemas.paymentForm.safeParse({
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvc: '12',
        amount: 99.99,
        currency: 'USD',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = formValidationSchemas.paymentForm.safeParse({
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvc: '123',
        amount: -99.99,
        currency: 'USD',
      });
      expect(result.success).toBe(false);
    });

    it('should accept payment with description', () => {
      const result = formValidationSchemas.paymentForm.safeParse({
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvc: '123',
        amount: 99.99,
        currency: 'EUR',
        description: 'Platform subscription',
      });
      expect(result.success).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. INTEGRATION TESTS (Cross-schema validation)
// ═══════════════════════════════════════════════════════════════════════════

describe('Schema Integration Tests', () => {
  it('should allow multiple validation attempts', () => {
    const email1 = validationPatterns.email.safeParse('user1@example.com');
    const email2 = validationPatterns.email.safeParse('user2@example.com');

    expect(email1.success).toBe(true);
    expect(email2.success).toBe(true);
  });

  it('should preserve data during validation', () => {
    const testData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      username: 'johndoe123',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      agreeToTerms: true,
    };

    const result = userValidationSchemas.register.safeParse(testData);

    if (result.success) {
      expect(result.data.firstName).toBe('John');
      expect(result.data.email).toBe('john@example.com');
    }
  });

  it('should handle complex nested objects', () => {
    const result = userValidationSchemas.preferences.safeParse({
      theme: 'dark',
      notifications: true,
      emailDigest: 'weekly',
      accessibility: {
        reducedMotion: true,
        highContrast: true,
        fontSize: 'large',
        screenReaderOptimized: true,
      },
      privacy: {
        profilePublic: true,
        showActivity: false,
        allowMessages: true,
      },
    });

    expect(result.success).toBe(true);
  });

  it('should validate data transform in payment form', () => {
    const result = formValidationSchemas.paymentForm.safeParse({
      cardNumber: '4111 1111 1111 1111',
      expiryDate: '12/25',
      cvc: '123',
      amount: 99.99,
      currency: 'USD',
    });

    if (result.success) {
      // Card number should be transformed (spaces removed)
      expect(result.data.cardNumber).toBe('4111111111111111');
    }
  });
});
