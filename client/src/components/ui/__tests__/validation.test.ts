/**
 * UI validation utilities tests
 * Following navigation component testing patterns for consistency
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  validateInputValue,
  validateSelectValue,
  validateFormData,
  validateDate,
  validateTableData,
  safeValidateInputValue,
  safeValidateSelectValue,
  safeValidateFormData,
  safeValidateDate,
  EmailSchema,
  PasswordSchema,
  PhoneSchema,
  URLSchema,
  NumberInputSchema
} from '../validation';
import { UIInputError, UIValidationError, UIFormError, UIDateError } from '../errors';

describe('UI Validation Utilities', () => {
  describe('Input Validation', () => {
    describe('validateInputValue', () => {
      it('validates basic text input', () => {
        expect(() => validateInputValue('test')).not.toThrow();
        expect(validateInputValue('test')).toBe('test');
      });

      it('validates email input', () => {
        expect(() => validateInputValue('test@example.com', 'email')).not.toThrow();
        expect(() => validateInputValue('invalid-email', 'email')).toThrow(UIInputError);
      });

      it('validates password input', () => {
        expect(() => validateInputValue('Password123', 'password')).not.toThrow();
        expect(() => validateInputValue('weak', 'password')).toThrow(UIInputError);
      });

      it('validates phone input', () => {
        expect(() => validateInputValue('+1234567890', 'tel')).not.toThrow();
        expect(() => validateInputValue('invalid-phone', 'tel')).toThrow(UIInputError);
      });

      it('validates URL input', () => {
        expect(() => validateInputValue('https://example.com', 'url')).not.toThrow();
        expect(() => validateInputValue('invalid-url', 'url')).toThrow(UIInputError);
      });

      it('throws UIInputError with proper details', () => {
        try {
          validateInputValue('invalid-email', 'email');
        } catch (error) {
          expect(error).toBeInstanceOf(UIInputError);
          expect(error.details).toEqual(
            expect.objectContaining({
              type: 'email'
            })
          );
        }
      });
    });

    describe('safeValidateInputValue', () => {
      it('returns success result for valid input', () => {
        const result = safeValidateInputValue('test@example.com', 'email');
        expect(result.success).toBe(true);
        expect(result.data).toBe('test@example.com');
        expect(result.error).toBeUndefined();
      });

      it('returns error result for invalid input', () => {
        const result = safeValidateInputValue('invalid-email', 'email');
        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBeInstanceOf(UIInputError);
      });
    });
  });

  describe('Select Validation', () => {
    describe('validateSelectValue', () => {
      it('validates basic select value', () => {
        expect(() => validateSelectValue('option1')).not.toThrow();
        expect(validateSelectValue('option1')).toBe('option1');
      });

      it('validates against provided options', () => {
        const options = [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' }
        ];
        
        expect(() => validateSelectValue('option1', options)).not.toThrow();
        expect(() => validateSelectValue('invalid', options)).toThrow(UIValidationError);
      });

      it('throws error for empty value', () => {
        expect(() => validateSelectValue('')).toThrow(UIValidationError);
      });
    });

    describe('safeValidateSelectValue', () => {
      it('returns success result for valid selection', () => {
        const result = safeValidateSelectValue('option1');
        expect(result.success).toBe(true);
        expect(result.data).toBe('option1');
      });

      it('returns error result for invalid selection', () => {
        const result = safeValidateSelectValue('');
        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(UIValidationError);
      });
    });
  });

  describe('Form Validation', () => {
    const TestSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email'),
      age: z.number().min(18, 'Must be 18 or older')
    });

    describe('validateFormData', () => {
      it('validates valid form data', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          age: 25
        };
        
        expect(() => validateFormData(data, TestSchema)).not.toThrow();
        expect(validateFormData(data, TestSchema)).toEqual(data);
      });

      it('throws UIFormError for invalid data', () => {
        const data = {
          name: '',
          email: 'invalid-email',
          age: 15
        };
        
        try {
          validateFormData(data, TestSchema);
        } catch (error) {
          expect(error).toBeInstanceOf(UIFormError);
          expect(error.details.errors).toEqual(
            expect.objectContaining({
              name: 'Name is required',
              email: 'Invalid email',
              age: 'Must be 18 or older'
            })
          );
        }
      });
    });

    describe('safeValidateFormData', () => {
      it('returns success result for valid data', () => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          age: 25
        };
        
        const result = safeValidateFormData(data, TestSchema);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(data);
      });

      it('returns error result for invalid data', () => {
        const data = {
          name: '',
          email: 'invalid-email'
        };
        
        const result = safeValidateFormData(data, TestSchema);
        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(UIFormError);
      });
    });
  });

  describe('Date Validation', () => {
    describe('validateDate', () => {
      it('validates valid date object', () => {
        const date = new Date('2023-01-01');
        expect(() => validateDate(date)).not.toThrow();
        expect(validateDate(date)).toEqual(date);
      });

      it('validates valid date string', () => {
        const dateString = '2023-01-01';
        const result = validateDate(dateString);
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBe(2023);
      });

      it('validates date against min constraint', () => {
        const date = new Date('2023-01-01');
        const minDate = new Date('2023-06-01');
        
        expect(() => validateDate(date, minDate)).toThrow(UIDateError);
      });

      it('validates date against max constraint', () => {
        const date = new Date('2023-12-01');
        const maxDate = new Date('2023-06-01');
        
        expect(() => validateDate(date, undefined, maxDate)).toThrow(UIDateError);
      });

      it('throws UIDateError for invalid date string', () => {
        expect(() => validateDate('invalid-date')).toThrow(UIDateError);
      });
    });

    describe('safeValidateDate', () => {
      it('returns success result for valid date', () => {
        const date = new Date('2023-01-01');
        const result = safeValidateDate(date);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(date);
      });

      it('returns error result for invalid date', () => {
        const result = safeValidateDate('invalid-date');
        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(UIDateError);
      });
    });
  });

  describe('Table Data Validation', () => {
    const columns = [
      { key: 'name', validator: z.string().min(1), required: true },
      { key: 'age', validator: z.number().min(0), required: true },
      { key: 'email', validator: z.string().email(), required: false }
    ];

    describe('validateTableData', () => {
      it('validates valid table data', () => {
        const data = [
          { name: 'John', age: 25, email: 'john@example.com' },
          { name: 'Jane', age: 30, email: 'jane@example.com' }
        ];
        
        expect(() => validateTableData(data, columns)).not.toThrow();
        expect(validateTableData(data, columns)).toEqual(data);
      });

      it('throws UIValidationError for invalid data', () => {
        const data = [
          { name: '', age: -5, email: 'invalid-email' },
          { name: 'Jane', age: 30 } // missing required field
        ];
        
        try {
          validateTableData(data, columns);
        } catch (error) {
          expect(error).toBeInstanceOf(UIValidationError);
          expect(error.details.errors).toHaveLength(4); // 4 validation errors
        }
      });

      it('handles missing required fields', () => {
        const data = [
          { age: 25 } // missing required name
        ];
        
        expect(() => validateTableData(data, columns)).toThrow(UIValidationError);
      });

      it('skips validation for optional empty fields', () => {
        const data = [
          { name: 'John', age: 25 } // email is optional and missing
        ];
        
        expect(() => validateTableData(data, columns)).not.toThrow();
      });
    });
  });

  describe('Schema Validation', () => {
    describe('EmailSchema', () => {
      it('validates correct email formats', () => {
        expect(() => EmailSchema.parse('test@example.com')).not.toThrow();
        expect(() => EmailSchema.parse('user.name+tag@domain.co.uk')).not.toThrow();
      });

      it('rejects invalid email formats', () => {
        expect(() => EmailSchema.parse('invalid-email')).toThrow();
        expect(() => EmailSchema.parse('@domain.com')).toThrow();
        expect(() => EmailSchema.parse('user@')).toThrow();
      });
    });

    describe('PasswordSchema', () => {
      it('validates strong passwords', () => {
        expect(() => PasswordSchema.parse('Password123')).not.toThrow();
        expect(() => PasswordSchema.parse('MySecure1Pass')).not.toThrow();
      });

      it('rejects weak passwords', () => {
        expect(() => PasswordSchema.parse('password')).toThrow(); // no uppercase/number
        expect(() => PasswordSchema.parse('PASSWORD123')).toThrow(); // no lowercase
        expect(() => PasswordSchema.parse('Password')).toThrow(); // no number
        expect(() => PasswordSchema.parse('Pass1')).toThrow(); // too short
      });
    });

    describe('PhoneSchema', () => {
      it('validates phone number formats', () => {
        expect(() => PhoneSchema.parse('+1234567890')).not.toThrow();
        expect(() => PhoneSchema.parse('(555) 123-4567')).not.toThrow();
        expect(() => PhoneSchema.parse('555-123-4567')).not.toThrow();
      });

      it('rejects invalid phone formats', () => {
        expect(() => PhoneSchema.parse('abc123')).toThrow();
        expect(() => PhoneSchema.parse('123')).toThrow(); // too short
      });
    });

    describe('URLSchema', () => {
      it('validates URL formats', () => {
        expect(() => URLSchema.parse('https://example.com')).not.toThrow();
        expect(() => URLSchema.parse('http://subdomain.example.com/path')).not.toThrow();
        expect(() => URLSchema.parse('ftp://files.example.com')).not.toThrow();
      });

      it('rejects invalid URL formats', () => {
        expect(() => URLSchema.parse('not-a-url')).toThrow();
        expect(() => URLSchema.parse('example.com')).toThrow(); // missing protocol
      });
    });

    describe('NumberInputSchema', () => {
      it('validates and transforms number strings', () => {
        expect(NumberInputSchema.parse('123')).toBe(123);
        expect(NumberInputSchema.parse('123.45')).toBe(123.45);
        expect(NumberInputSchema.parse(456)).toBe(456);
      });

      it('handles invalid number strings', () => {
        expect(NumberInputSchema.parse('abc')).toBeUndefined();
        expect(NumberInputSchema.parse('')).toBeUndefined();
      });
    });
  });
});

