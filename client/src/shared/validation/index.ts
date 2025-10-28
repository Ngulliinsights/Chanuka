/**
 * Shared validation utilities and schemas
 * Barrel exports for clean imports across the application
 */

export * from './base-validation';

// Re-export commonly used Zod utilities
export { z } from 'zod';

// Type exports
export type { ZodSchema, ZodError } from 'zod';

