/**
 * Tests for Error Message Formatter
 */

import { ErrorMessageFormatter } from '../../src/formatters/error-message-formatter';

describe('ErrorMessageFormatter', () => {
  let formatter: ErrorMessageFormatter;

  beforeEach(() => {
    formatter = new ErrorMessageFormatter();
  });

  describe('formatApiErrorMessage', () => {
    it('should accept well-formatted error messages', () => {
      const result = formatter.formatApiErrorMessage('User not found', 'NOT_FOUND');

      expect(result.isValid).toBe(true);
      expect(result.correctedMessage).toBe('User not found');
      expect(result.issues).toHaveLength(0);
    });

    it('should fix capitalization issues', () => {
      const result = formatter.formatApiErrorMessage('user not found');

      expect(result.isValid).toBe(false);
      expect(result.correctedMessage).toBe('User not found');
      expect(result.issues).toContain('Improper capitalization');
      expect(result.suggestions).toContain('Use sentence case for error messages');
    });

    it('should remove trailing periods', () => {
      const result = formatter.formatApiErrorMessage('User not found.');

      expect(result.isValid).toBe(false);
      expect(result.correctedMessage).toBe('User not found');
      expect(result.issues).toContain('Error message should not end with period');
    });

    it('should detect generic error messages', () => {
      const genericMessages = ['error', 'something went wrong', 'failed'];

      genericMessages.forEach(message => {
        const result = formatter.formatApiErrorMessage(message);
        
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Error message is too generic');
        expect(result.suggestions).toContain('Provide more specific error details');
      });
    });

    it('should suggest standard messages for known error codes', () => {
      const result = formatter.formatApiErrorMessage('Auth failed', 'UNAUTHORIZED');

      expect(result.suggestions.some(s => s.includes('Authentication required'))).toBe(true);
    });

    it('should handle all caps messages', () => {
      const result = formatter.formatApiErrorMessage('USER NOT FOUND');

      expect(result.isValid).toBe(false);
      expect(result.correctedMessage).toBe('User not found');
    });
  });

  describe('formatValidationErrorMessage', () => {
    it('should accept well-formatted validation error arrays', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ];

      const result = formatter.formatValidationErrorMessage(errors);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should accept well-formatted single validation error object', () => {
      const error = { field: 'email', message: 'Invalid email format' };

      const result = formatter.formatValidationErrorMessage(error);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect string validation errors', () => {
      const result = formatter.formatValidationErrorMessage('Validation failed');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Validation error should be an object or array');
      expect(result.suggestions).toContain('Use { field: "fieldName", message: "error message" } format');
    });

    it('should validate error object structure', () => {
      const invalidError = { message: 'Invalid email' }; // Missing field

      const result = formatter.formatValidationErrorMessage(invalidError);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing field property');
      expect(result.suggestions).toContain('Add field property to identify which field has the error');
    });

    it('should validate error array elements', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { message: 'Missing field' } // Invalid - no field property
      ];

      const result = formatter.formatValidationErrorMessage(errors);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('Error at index 1'))).toBe(true);
    });
  });

  describe('formatErrorObject', () => {
    it('should accept well-formatted error objects', () => {
      const errorObj = {
        code: 'NOT_FOUND',
        message: 'User not found',
        details: {}
      };

      const result = formatter.formatErrorObject(errorObj);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should convert string errors to proper objects', () => {
      const result = formatter.formatErrorObject('User not found');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Error should be an object with code and message');
      expect(result.suggestions).toContain('Use { code: "ERROR_CODE", message: "error message" } format');
      
      const correctedObj = JSON.parse(result.correctedMessage);
      expect(correctedObj.code).toBeDefined();
      expect(correctedObj.message).toBe('User not found');
    });

    it('should infer appropriate error codes from messages', () => {
      const testCases = [
        { message: 'Validation failed', expectedCode: 'VALIDATION_ERROR' },
        { message: 'Unauthorized access', expectedCode: 'UNAUTHORIZED' },
        { message: 'User not found', expectedCode: 'NOT_FOUND' },
        { message: 'Database connection failed', expectedCode: 'DATABASE_ERROR' },
        { message: 'Something went wrong', expectedCode: 'INTERNAL_ERROR' }
      ];

      testCases.forEach(({ message, expectedCode }) => {
        const result = formatter.formatErrorObject(message);
        const correctedObj = JSON.parse(result.correctedMessage);
        expect(correctedObj.code).toBe(expectedCode);
      });
    });

    it('should validate and fix error object structure', () => {
      const invalidErrorObj = {
        message: 'user not found.' // Missing code, bad capitalization, trailing period
      };

      const result = formatter.formatErrorObject(invalidErrorObj);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing code property');
      
      const correctedObj = JSON.parse(result.correctedMessage);
      expect(correctedObj.code).toBeDefined();
      expect(correctedObj.message).toBe('User not found'); // Fixed capitalization and period
    });
  });

  describe('error code inference', () => {
    it('should correctly infer error codes from message content', () => {
      const testCases = [
        'Invalid email format',
        'Email validation failed',
        'Required field missing'
      ];

      testCases.forEach(message => {
        const result = formatter.formatErrorObject(message);
        const correctedObj = JSON.parse(result.correctedMessage);
        expect(correctedObj.code).toBe('VALIDATION_ERROR');
      });
    });

    it('should handle authentication-related messages', () => {
      const authMessages = [
        'Authentication required',
        'Unauthorized access',
        'Invalid token'
      ];

      authMessages.forEach(message => {
        const result = formatter.formatErrorObject(message);
        const correctedObj = JSON.parse(result.correctedMessage);
        expect(correctedObj.code).toBe('UNAUTHORIZED');
      });
    });

    it('should handle permission-related messages', () => {
      const permissionMessages = [
        'Access forbidden',
        'Insufficient permissions',
        'Permission denied'
      ];

      permissionMessages.forEach(message => {
        const result = formatter.formatErrorObject(message);
        const correctedObj = JSON.parse(result.correctedMessage);
        expect(correctedObj.code).toBe('FORBIDDEN');
      });
    });
  });

  describe('real-world Chanuka patterns', () => {
    it('should handle typical validation error from verification.ts', () => {
      const error = { field: 'bill_id', message: 'Invalid bill ID' };

      const result = formatter.formatValidationErrorMessage(error);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle typical error object from API routes', () => {
      const errorObj = {
        code: 'VALIDATION_ERROR',
        message: 'bill_id, expertId, and verification_status are required',
        details: { missing: ['bill_id', 'expertId'] }
      };

      const result = formatter.formatErrorObject(errorObj);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fix common string error pattern', () => {
      const result = formatter.formatErrorObject('Internal server error');

      expect(result.isValid).toBe(false);
      
      const correctedObj = JSON.parse(result.correctedMessage);
      expect(correctedObj.code).toBe('INTERNAL_ERROR');
      expect(correctedObj.message).toBe('Internal server error');
    });

    it('should handle database error patterns', () => {
      const result = formatter.formatErrorObject('Database operation failed');

      const correctedObj = JSON.parse(result.correctedMessage);
      expect(correctedObj.code).toBe('DATABASE_ERROR');
    });
  });
});