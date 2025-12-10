/**
 * Shared Validation Module - Consolidated
 * 
 * Base validation utilities and schemas following navigation component patterns.
 * This module provides standardized validation patterns for all client components.
 */

export * from './consolidated';

// Re-export commonly used Zod utilities
export { z } from 'zod';

// Type exports
export type { ZodSchema, ZodError } from 'zod';

