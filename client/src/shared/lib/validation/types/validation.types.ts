/**
 * Validation Type Definitions
 *
 * Type-safe definitions for validation schemas and utilities
 */

import { z } from 'zod';

/**
 * Common validation patterns
 */
export const validationPatterns = {
  email: z.string().min(1, 'Email is required').email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),

  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),

  url: z.string().url('Invalid URL'),

  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),

  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),

  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),

  uuid: z.string().uuid('Invalid UUID'),

  date: z.date().refine(date => date < new Date(), 'Date cannot be in the future'),

  futureDate: z.date().refine(date => date > new Date(), 'Date must be in the future'),

  positiveNumber: z.number().positive('Number must be positive'),

  percentage: z
    .number()
    .min(0, 'Percentage must be between 0 and 100')
    .max(100, 'Percentage must be between 0 and 100'),
};

/**
 * Validation context for form fields
 */
export interface ValidationContext {
  fieldName: string;
  value: any;
  schema: z.ZodSchema;
  isRequired: boolean;
  isValid: boolean;
  errors: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Field validation configuration
 */
export interface FieldValidationConfig {
  schema: z.ZodSchema;
  required?: boolean;
  customMessages?: Partial<Record<string, string>>;
  asyncValidation?: (value: any) => Promise<string | undefined>;
}

/**
 * Form validation configuration
 */
export interface FormValidationConfig {
  fields: Record<string, FieldValidationConfig>;
  customValidation?: (data: any) => Promise<string[]>;
  crossFieldValidation?: (data: any) => Promise<Record<string, string[]>>;
}

/**
 * Validation service interface
 */
export interface ValidationService {
  validateField(fieldName: string, value: any, config: FieldValidationConfig): Promise<ValidationResult>;
  validateForm(data: any, config: FormValidationConfig): Promise<ValidationResult>;
  validateSchema(data: any, schema: z.ZodSchema): Promise<ValidationResult>;
  getValidationErrors(data: any, schema: z.ZodSchema): string[];
  formatValidationErrors(errors: z.ZodError): Record<string, string>;
}

/**
 * Validation factory configuration
 */
export interface ValidationFactoryConfig {
  customMessages?: Partial<Record<string, string>>;
  asyncValidation?: boolean;
  strictMode?: boolean;
}

/**
 * Validation middleware
 */
export interface ValidationMiddleware {
  beforeValidation?: (data: any) => any;
  afterValidation?: (result: ValidationResult, data: any) => ValidationResult;
  onError?: (error: Error, context: ValidationContext) => void;
}

/**
 * Validation cache interface
 */
export interface ValidationCache {
  set(key: string, value: ValidationResult, ttl?: number): void;
  get(key: string): ValidationResult | undefined;
  clear(): void;
  clearExpired(): void;
}

/**
 * Validation rule
 */
export interface ValidationRule {
  name: string;
  schema: z.ZodSchema;
  message?: string;
  condition?: (value: any, data: any) => boolean;
}

/**
 * Validation group
 */
export interface ValidationGroup {
  name: string;
  rules: ValidationRule[];
  condition?: (data: any) => boolean;
}
