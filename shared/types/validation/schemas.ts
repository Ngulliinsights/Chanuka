/**
 * Validation Schema Type Exports
 * Type definitions for validation schemas
 * 
 * NOTE: Actual Zod schemas are defined in shared/validation/
 * This file provides type exports for the validation system
 */

import { z } from 'zod';

/**
 * Validation error structure
 */
export interface SchemaValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation context for custom validators
 */
export interface ValidationContext {
  path: string[];
  parent?: unknown;
  root?: unknown;
}

/**
 * Schema validator function type
 */
export type SchemaValidator<T> = (data: unknown) => { success: boolean; data?: T; errors?: string[] };

/**
 * Zod schema type helper
 */
export type ZodSchema<T> = z.ZodType<T>;

/**
 * Infer type from Zod schema
 */
export type InferSchema<T extends z.ZodType> = z.infer<T>;
