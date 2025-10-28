/**
 * Shared utilities and infrastructure
 * Barrel exports for standardized client architecture
 */

// Validation utilities
export * from './validation';

// Testing infrastructure
export * from './testing';

// Component templates
export * from './templates';

// Re-export commonly used types and utilities
export type { ZodSchema, ZodError } from 'zod';
export { z } from 'zod';

