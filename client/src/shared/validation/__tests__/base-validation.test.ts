import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  BaseValidationError,
  CommonSchemas,
  UserRoleSchema,
  ComponentConfigSchema,
  FormFieldSchema,
  ApiResponseSchema,
  createValidationError,
  validateWithSchema,
  safeValidateWithSchema,
  validateUserRole,
  validateEmail,
  validateId,
  validateUrl,
  safeValidateUserRole,
  safeValidateEmail,
  safeValidateId,
  safeValidateUrl,
  validateFormField,
  validateApiResponse,
  validateComponentConfig,
  validateBatch,
  validateWithWarnings,
} from '../base-validation';

describe('BaseValidationError', () => {
  it('should create error with correct properties', () => {
    const error = new BaseValidationError(
      'Test error',
      'testField',
      'testValue',
      'TEST_ERROR',
      { extra: 'data' }
    );

    expect(error.message).toBe('Test error');
    expect(error.field).toBe('testField');
    expect(error.value).toBe('testValue');
    expect(error.type).toBe('TEST_ERROR');
    expect(error.details).toEqual({ extra: 'data' });
    expect(error.isOperational).toBe(true);
    expect(error.name).toBe('BaseValidationError');
  });

  it('should use default type when not provided', () => {
    const error = new BaseValidationError('Test error', 'field', 'value');
    expect(error.type).toBe('VALIDATION_ERROR');
  });
});

describe('CommonSchemas', () => {
  describe('nonEmptyString', () => {
    it('should validate non-empty strings', () => {
      expect(CommonSchemas.nonEmptyString.parse('test')).toBe('test');
    });

    it('should reject empty strings', () => {
      expect(() => CommonSchemas.nonEmptyString.parse('')).toThrow();
    });
  });

  describe('email', () => {
    it('should validate correct email format', () => {
      expect(CommonSchemas.email.parse('test@example.com')).toBe('test@example.com');
    });

    it('should reject invalid email format', () => {
      expect(() => CommonSchemas.email.parse('invalid-email')).toThrow();
    });
  });

  describe('url', () => {
    it('should validate correct URL format', () => {
      expect(CommonSchemas.url.parse('https://example.com')).toBe('https://example.com');
    });

    it('should reject invalid URL format', () => {
      expect(() => CommonSchemas.url.parse('not-a-url')).toThrow();
    });
  });

  describe('positiveNumber', () => {
    it('should validate positive numbers', () => {
      expect(CommonSchemas.positiveNumber.parse(5)).toBe(5);
    });

    it('should reject zero and negative numbers', () => {
      expect(() => CommonSchemas.positiveNumber.parse(0)).toThrow();
      expect(() => CommonSchemas.positiveNumber.parse(-1)).toThrow();
    });
  });

  describe('percentage', () => {
    it('should validate percentages between 0 and 100', () => {
      expect(CommonSchemas.percentage.parse(50)).toBe(50);
      expect(CommonSchemas.percentage.parse(0)).toBe(0);
      expect(CommonSchemas.percentage.parse(100)).toBe(100);
    });

    it('should reject values outside 0-100 range', () => {
      expect(() => CommonSchemas.percentage.parse(-1)).toThrow();
      expect(() => CommonSchemas.percentage.parse(101)).toThrow();
    });
  });
});

describe('UserRoleSchema', () => {
  it('should validate valid user roles', () => {
    const validRoles = ['public', 'citizen', 'expert', 'admin', 'journalist', 'advocate'];
    validRoles.forEach(role => {
      expect(UserRoleSchema.parse(role)).toBe(role);
    });
  });

  it('should reject invalid user roles', () => {
    expect(() => UserRoleSchema.parse('invalid-role')).toThrow();
  });
});

describe('ComponentConfigSchema', () => {
  it('should validate component config with defaults', () => {
    const config = ComponentConfigSchema.parse({});
    expect(config.enabled).toBe(true);
    expect(config.debug).toBe(false);
    expect(config.maxRetries).toBe(3);
    expect(config.timeout).toBe(5000);
  });

  it('should validate component config with custom values', () => {
    const input = {
      enabled: false,
      debug: true,
      maxRetries: 5,
      timeout: 10000,
    };
    const config = ComponentConfigSchema.parse(input);
    expect(config).toEqual(input);
  });

  it('should reject invalid maxRetries values', () => {
    expect(() => ComponentConfigSchema.parse({ maxRetries: -1 })).toThrow();
    expect(() => ComponentConfigSchema.parse({ maxRetries: 11 })).toThrow();
  });
});

describe('FormFieldSchema', () => {
  it('should validate complete form field', () => {
    const field = {
      name: 'email',
      label: 'Email Address',
      type: 'email' as const,
      required: true,
      placeholder: 'Enter your email',
      validation: {
        pattern: '^[^@]+@[^@]+\\.[^@]+$',
      },
    };
    expect(validateFormField(field)).toEqual(field);
  });

  it('should validate minimal form field', () => {
    const field = {
      name: 'username',
      label: 'Username',
      type: 'text' as const,
    };
    const result = validateFormField(field);
    expect(result.required).toBe(false); // default value
  });

  it('should reject invalid field type', () => {
    const field = {
      name: 'test',
      label: 'Test',
      type: 'invalid-type',
    };
    expect(() => validateFormField(field)).toThrow();
  });
});

describe('ApiResponseSchema', () => {
  it('should validate successful API response', () => {
    const response = {
      success: true,
      data: { id: 1, name: 'Test' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: 'req-123',
      },
    };
    expect(validateApiResponse(response)).toEqual(response);
  });

  it('should validate error API response', () => {
    const response = {
      success: false,
      error: {
        message: 'Something went wrong',
        code: 'ERR_001',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    expect(validateApiResponse(response)).toEqual(response);
  });
});

describe('createValidationError', () => {
  it('should create validation error with Zod error details', () => {
    const zodError = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['field'],
        message: 'Expected string, received number',
      },
    ]);

    const error = createValidationError('Test error', 'field', 123, zodError);
    expect(error.message).toBe('Test error');
    expect(error.field).toBe('field');
    expect(error.value).toBe(123);
    expect(error.details?.zodError).toBe(zodError);
  });
});

describe('validateWithSchema', () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it('should validate correct data', () => {
    const data = { name: 'John', age: 30 };
    expect(validateWithSchema(testSchema, data)).toEqual(data);
  });

  it('should throw BaseValidationError for invalid data', () => {
    const data = { name: 'John', age: 'thirty' };
    expect(() => validateWithSchema(testSchema, data)).toThrow(BaseValidationError);
  });

  it('should include field path in error', () => {
    const data = { name: 'John', age: 'thirty' };
    try {
      validateWithSchema(testSchema, data);
    } catch (error) {
      expect(error).toBeInstanceOf(BaseValidationError);
      expect((error as BaseValidationError).field).toBe('age');
    }
  });
});

describe('safeValidateWithSchema', () => {
  const testSchema = z.string();

  it('should return success result for valid data', () => {
    const result = safeValidateWithSchema(testSchema, 'test');
    expect(result.success).toBe(true);
    expect(result.data).toBe('test');
    expect(result.error).toBeUndefined();
  });

  it('should return error result for invalid data', () => {
    const result = safeValidateWithSchema(testSchema, 123);
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(BaseValidationError);
  });
});

describe('specific validation functions', () => {
  describe('validateUserRole', () => {
    it('should validate correct user role', () => {
      expect(validateUserRole('citizen')).toBe('citizen');
    });

    it('should throw for invalid user role', () => {
      expect(() => validateUserRole('invalid')).toThrow(BaseValidationError);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe('test@example.com');
    });

    it('should throw for invalid email', () => {
      expect(() => validateEmail('invalid-email')).toThrow(BaseValidationError);
    });
  });

  describe('validateId', () => {
    it('should validate non-empty ID', () => {
      expect(validateId('123')).toBe('123');
    });

    it('should throw for empty ID', () => {
      expect(() => validateId('')).toThrow(BaseValidationError);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URL', () => {
      expect(validateUrl('https://example.com')).toBe('https://example.com');
    });

    it('should throw for invalid URL', () => {
      expect(() => validateUrl('not-a-url')).toThrow(BaseValidationError);
    });
  });
});

describe('safe validation functions', () => {
  describe('safeValidateUserRole', () => {
    it('should return success for valid role', () => {
      const result = safeValidateUserRole('admin');
      expect(result.success).toBe(true);
      expect(result.data).toBe('admin');
    });

    it('should return error for invalid role', () => {
      const result = safeValidateUserRole('invalid');
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(BaseValidationError);
    });
  });

  describe('safeValidateEmail', () => {
    it('should return success for valid email', () => {
      const result = safeValidateEmail('test@example.com');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test@example.com');
    });

    it('should return error for invalid email', () => {
      const result = safeValidateEmail('invalid');
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(BaseValidationError);
    });
  });
});

describe('validateBatch', () => {
  const schema = z.string();

  it('should separate valid and invalid items', () => {
    const items = ['valid1', 123, 'valid2', null, 'valid3'];
    const result = validateBatch(schema, items);

    expect(result.valid).toEqual(['valid1', 'valid2', 'valid3']);
    expect(result.invalid).toHaveLength(2);
    expect(result.invalid[0].item).toBe(123);
    expect(result.invalid[1].item).toBe(null);
  });

  it('should handle all valid items', () => {
    const items = ['valid1', 'valid2', 'valid3'];
    const result = validateBatch(schema, items);

    expect(result.valid).toEqual(items);
    expect(result.invalid).toHaveLength(0);
  });

  it('should handle all invalid items', () => {
    const items = [123, null, undefined];
    const result = validateBatch(schema, items);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(3);
  });
});

describe('validateWithWarnings', () => {
  const schema = z.string();
  const warningChecks = [
    (data: string) => data.length < 3 ? 'String is very short' : null,
    (data: string) => data.includes('test') ? 'Contains test data' : null,
  ];

  it('should return success with no warnings', () => {
    const result = validateWithWarnings(schema, 'production-data', 'field', warningChecks);
    expect(result.success).toBe(true);
    expect(result.data).toBe('production-data');
    expect(result.warnings).toBeUndefined();
  });

  it('should return success with warnings', () => {
    const result = validateWithWarnings(schema, 'test', 'field', warningChecks);
    expect(result.success).toBe(true);
    expect(result.data).toBe('test');
    expect(result.warnings).toEqual(['String is very short', 'Contains test data']);
  });

  it('should return error for invalid data', () => {
    const result = validateWithWarnings(schema, 123, 'field', warningChecks);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(BaseValidationError);
    expect(result.warnings).toBeUndefined();
  });

  it('should work without warning checks', () => {
    const result = validateWithWarnings(schema, 'test');
    expect(result.success).toBe(true);
    expect(result.data).toBe('test');
    expect(result.warnings).toBeUndefined();
  });
});