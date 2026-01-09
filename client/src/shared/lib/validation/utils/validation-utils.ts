/**
 * Validation Utilities
 *
 * Utility functions for validation operations
 */

import { z } from 'zod';
import type {
  ValidationContext,
  ValidationResult,
  FieldValidationConfig,
  FormValidationConfig,
  ValidationRule,
  ValidationGroup,
  ValidationMiddleware,
  ValidationCache,
} from '../types/validation.types';

/**
 * Validates a single field against its schema
 */
export async function validateField(
  fieldName: string,
  value: any,
  config: FieldValidationConfig
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Basic schema validation
    config.schema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        const message = config.customMessages?.[err.code] || err.message;
        errors.push(message);
      });
    } else {
      errors.push('Validation failed');
    }
  }

  // Custom async validation
  if (config.asyncValidation && !errors.length) {
    const asyncError = await config.asyncValidation(value);
    if (asyncError) {
      errors.push(asyncError);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates an entire form against its configuration
 */
export async function validateForm(
  data: any,
  config: FormValidationConfig
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate each field
  for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
    const value = data[fieldName];
    const fieldResult = await validateField(fieldName, value, fieldConfig);

    if (!fieldResult.isValid) {
      fieldResult.errors.forEach((error) => {
        errors.push(`${fieldName}: ${error}`);
      });
    }

    fieldResult.warnings.forEach((warning) => {
      warnings.push(`${fieldName}: ${warning}`);
    });
  }

  // Custom form validation
  if (config.customValidation) {
    const customErrors = await config.customValidation(data);
    errors.push(...customErrors);
  }

  // Cross-field validation
  if (config.crossFieldValidation) {
    const crossFieldErrors = await config.crossFieldValidation(data);
    Object.entries(crossFieldErrors).forEach(([fieldName, fieldErrors]) => {
      fieldErrors.forEach((error) => {
        errors.push(`${fieldName}: ${error}`);
      });
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates data against a Zod schema
 */
export async function validateSchema(
  data: any,
  schema: z.ZodSchema
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        errors.push(err.message);
      });
    } else {
      errors.push('Validation failed');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets validation errors from ZodError
 */
export function getValidationErrors(data: any, schema: z.ZodSchema): string[] {
  const errors: string[] = [];

  try {
    schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        errors.push(err.message);
      });
    }
  }

  return errors;
}

/**
 * Formats ZodError into a record of field errors
 */
export function formatValidationErrors(errors: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};

  errors.errors.forEach((err) => {
    const field = err.path.join('.');
    formatted[field] = err.message;
  });

  return formatted;
}

/**
 * Creates a validation context
 */
export function createValidationContext(
  fieldName: string,
  value: any,
  schema: z.ZodSchema,
  isRequired: boolean
): ValidationContext {
  return {
    fieldName,
    value,
    schema,
    isRequired,
    isValid: false,
    errors: [],
  };
}

/**
 * Applies validation middleware
 */
export function applyValidationMiddleware(
  result: ValidationResult,
  data: any,
  middleware?: ValidationMiddleware
): ValidationResult {
  let processedResult = result;

  // Before validation
  if (middleware?.beforeValidation) {
    const processedData = middleware.beforeValidation(data);
    // Re-validate with processed data if needed
  }

  // After validation
  if (middleware?.afterValidation) {
    processedResult = middleware.afterValidation(result, data);
  }

  return processedResult;
}

/**
 * Creates a validation cache
 */
export function createValidationCache(): ValidationCache {
  const cache = new Map<string, { value: ValidationResult; expires: number }>();

  return {
    set(key: string, value: ValidationResult, ttl = 300000) { // 5 minutes default
      cache.set(key, {
        value,
        expires: Date.now() + ttl,
      });
    },

    get(key: string): ValidationResult | undefined {
      const item = cache.get(key);
      if (!item) {
        return undefined;
      }

      if (Date.now() > item.expires) {
        cache.delete(key);
        return undefined;
      }

      return item.value;
    },

    clear() {
      cache.clear();
    },

    clearExpired() {
      const now = Date.now();
      for (const [key, item] of cache.entries()) {
        if (now > item.expires) {
          cache.delete(key);
        }
      }
    },
  };
}

/**
 * Validates a set of rules
 */
export async function validateRules(
  value: any,
  rules: ValidationRule[],
  data?: any
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    // Check condition if provided
    if (rule.condition && !rule.condition(value, data)) {
      continue;
    }

    try {
      rule.schema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = rule.message || error.errors[0]?.message || 'Validation failed';
        errors.push(message);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a validation group
 */
export async function validateGroup(
  data: any,
  group: ValidationGroup
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check group condition
  if (group.condition && !group.condition(data)) {
    return { isValid: true, errors, warnings };
  }

  // Validate each rule in the group
  for (const rule of group.rules) {
    const value = data[rule.name];
    const ruleResult = await validateRules(value, [rule], data);

    if (!ruleResult.isValid) {
      errors.push(...ruleResult.errors);
    }

    warnings.push(...ruleResult.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Creates a validation service
 */
export function createValidationService(): any {
  const cache = createValidationCache();

  return {
    validateField: async (fieldName: string, value: any, config: FieldValidationConfig) => {
      const key = `${fieldName}_${JSON.stringify(value)}`;
      const cached = cache.get(key);

      if (cached) {
        return cached;
      }

      const result = await validateField(fieldName, value, config);
      cache.set(key, result);
      return result;
    },

    validateForm: async (data: any, config: FormValidationConfig) => {
      const key = `form_${JSON.stringify(data)}`;
      const cached = cache.get(key);

      if (cached) {
        return cached;
      }

      const result = await validateForm(data, config);
      cache.set(key, result);
      return result;
    },

    validateSchema: async (data: any, schema: z.ZodSchema) => {
      const key = `schema_${JSON.stringify(data)}`;
      const cached = cache.get(key);

      if (cached) {
        return cached;
      }

      const result = await validateSchema(data, schema);
      cache.set(key, result);
      return result;
    },

    getValidationErrors: (data: any, schema: z.ZodSchema) => {
      return getValidationErrors(data, schema);
    },

    formatValidationErrors: (errors: z.ZodError) => {
      return formatValidationErrors(errors);
    },

    clearCache: () => {
      cache.clear();
    },
  };
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates Kenyan phone number
 */
export function validateKenyaPhoneNumber(phone: string): boolean {
  const kenyaPhoneRegex = /^(\+254|0)[17]\d{8}$/;
  return kenyaPhoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validates password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Password must be at least 8 characters');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Password must contain a lowercase letter');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Password must contain an uppercase letter');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Password must contain a number');

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('Password must contain a special character');

  return {
    isValid: score >= 4,
    score,
    feedback,
  };
}
