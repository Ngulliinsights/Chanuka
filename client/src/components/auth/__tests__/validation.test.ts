/**
 * Auth validation tests
 */

import {
  validateEmail,
  validatePassword,
  validateName,
  validateLoginData,
  validateRegisterData,
  validateAuthMode,
  safeValidateEmail,
  safeValidatePassword,
  validateField
} from '../validation';
import { AuthValidationError } from '../errors';
import { TEST_DATA_SETS } from '../utils/test-utils';

describe('Auth Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      TEST_DATA_SETS.validEmails.forEach(email => {
        expect(() => validateEmail(email)).not.toThrow();
        expect(validateEmail(email)).toBe(email.toLowerCase());
      });
    });

    it('should reject invalid email addresses', () => {
      TEST_DATA_SETS.invalidEmails.forEach(email => {
        expect(() => validateEmail(email)).toThrow(AuthValidationError);
      });
    });

    it('should trim and lowercase email addresses', () => {
      const email = '  TEST@EXAMPLE.COM  ';
      const result = validateEmail(email);
      expect(result).toBe('test@example.com');
    });

    it('should reject empty email', () => {
      expect(() => validateEmail('')).toThrow(AuthValidationError);
      expect(() => validateEmail('   ')).toThrow(AuthValidationError);
    });

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(() => validateEmail(longEmail)).toThrow(AuthValidationError);
    });
  });

  describe('validatePassword', () => {
    it('should validate basic passwords in non-strict mode', () => {
      const validPasswords = ['password123', 'mypassword', 'test1234'];
      validPasswords.forEach(password => {
        expect(() => validatePassword(password, false)).not.toThrow();
      });
    });

    it('should validate strong passwords in strict mode', () => {
      TEST_DATA_SETS.validPasswords.forEach(password => {
        expect(() => validatePassword(password, true)).not.toThrow();
      });
    });

    it('should reject weak passwords in strict mode', () => {
      TEST_DATA_SETS.invalidPasswords.forEach(password => {
        expect(() => validatePassword(password, true)).toThrow(AuthValidationError);
      });
    });

    it('should reject passwords that are too short', () => {
      expect(() => validatePassword('short')).toThrow(AuthValidationError);
    });

    it('should reject passwords that are too long', () => {
      const longPassword = 'a'.repeat(101);
      expect(() => validatePassword(longPassword)).toThrow(AuthValidationError);
    });

    it('should reject empty password', () => {
      expect(() => validatePassword('')).toThrow(AuthValidationError);
    });
  });

  describe('validateName', () => {
    it('should validate correct names', () => {
      TEST_DATA_SETS.validNames.forEach(name => {
        expect(() => validateName(name)).not.toThrow();
        expect(validateName(name)).toBe(name.trim());
      });
    });

    it('should reject invalid names', () => {
      TEST_DATA_SETS.invalidNames.forEach(name => {
        expect(() => validateName(name)).toThrow(AuthValidationError);
      });
    });

    it('should trim names', () => {
      const name = '  John  ';
      const result = validateName(name);
      expect(result).toBe('John');
    });

    it('should include field name in error', () => {
      try {
        validateName('J', 'firstName');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthValidationError);
        expect((error as AuthValidationError).details?.field).toBe('firstName');
      }
    });
  });

  describe('validateLoginData', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      expect(() => validateLoginData(validData)).not.toThrow();
      const result = validateLoginData(validData);
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('password123');
    });

    it('should reject login data with missing fields', () => {
      expect(() => validateLoginData({ email: 'test@example.com' })).toThrow();
      expect(() => validateLoginData({ password: 'password123' })).toThrow();
      expect(() => validateLoginData({})).toThrow();
    });

    it('should reject login data with invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      };
      
      expect(() => validateLoginData(invalidData)).toThrow(AuthValidationError);
    });
  });

  describe('validateRegisterData', () => {
    it('should validate correct registration data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!'
      };
      
      expect(() => validateRegisterData(validData)).not.toThrow();
      const result = validateRegisterData(validData);
      expect(result.firstName).toBe('John');
      expect(result.email).toBe('john@example.com');
    });

    it('should reject registration data with mismatched passwords', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!'
      };
      
      expect(() => validateRegisterData(invalidData)).toThrow(AuthValidationError);
    });

    it('should reject registration data with weak password', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'weak',
        confirmPassword: 'weak'
      };
      
      expect(() => validateRegisterData(invalidData)).toThrow(AuthValidationError);
    });

    it('should reject registration data with missing fields', () => {
      const incompleteData = {
        firstName: 'John',
        email: 'john@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!'
      };
      
      expect(() => validateRegisterData(incompleteData)).toThrow();
    });
  });

  describe('validateAuthMode', () => {
    it('should validate correct auth modes', () => {
      expect(() => validateAuthMode('login')).not.toThrow();
      expect(() => validateAuthMode('register')).not.toThrow();
    });

    it('should reject invalid auth modes', () => {
      expect(() => validateAuthMode('invalid')).toThrow(AuthValidationError);
      expect(() => validateAuthMode('')).toThrow(AuthValidationError);
    });
  });

  describe('safeValidateEmail', () => {
    it('should return success for valid email', () => {
      const result = safeValidateEmail('test@example.com');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test@example.com');
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid email', () => {
      const result = safeValidateEmail('invalid-email');
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(AuthValidationError);
    });
  });

  describe('safeValidatePassword', () => {
    it('should return success for valid password', () => {
      const result = safeValidatePassword('SecurePass123!', true);
      expect(result.success).toBe(true);
      expect(result.data).toBe('SecurePass123!');
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid password', () => {
      const result = safeValidatePassword('weak', true);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(AuthValidationError);
    });
  });

  describe('validateField', () => {
    it('should validate email field', () => {
      expect(validateField('email', 'test@example.com', 'login')).toBeNull();
      expect(validateField('email', 'invalid-email', 'login')).toBeTruthy();
    });

    it('should validate password field with different strictness', () => {
      expect(validateField('password', 'password123', 'login')).toBeNull();
      expect(validateField('password', 'password123', 'register')).toBeTruthy();
      expect(validateField('password', 'SecurePass123!', 'register')).toBeNull();
    });

    it('should validate name fields', () => {
      expect(validateField('firstName', 'John', 'register')).toBeNull();
      expect(validateField('lastName', 'Doe', 'register')).toBeNull();
      expect(validateField('firstName', 'J', 'register')).toBeTruthy();
    });

    it('should validate confirm password field', () => {
      expect(validateField('confirmPassword', '', 'register')).toBeTruthy();
      expect(validateField('confirmPassword', 'password', 'register')).toBeNull();
    });

    it('should handle unknown fields', () => {
      expect(validateField('unknownField', 'value', 'login')).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined inputs', () => {
      expect(() => validateEmail(null as any)).toThrow();
      expect(() => validateEmail(undefined as any)).toThrow();
      expect(() => validatePassword(null as any)).toThrow();
      expect(() => validateName(null as any)).toThrow();
    });

    it('should handle non-string inputs', () => {
      expect(() => validateEmail(123 as any)).toThrow();
      expect(() => validatePassword([] as any)).toThrow();
      expect(() => validateName({} as any)).toThrow();
    });

    it('should handle special characters in names', () => {
      expect(() => validateName("O'Connor")).not.toThrow();
      expect(() => validateName("Mary-Jane")).not.toThrow();
      expect(() => validateName("Jean-Pierre")).not.toThrow();
    });

    it('should handle international characters in emails', () => {
      // Note: Basic email validation may not support all international characters
      // This test documents current behavior
      expect(() => validateEmail('test@münchen.de')).toThrow();
    });
  });
});