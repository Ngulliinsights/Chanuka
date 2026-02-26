/**
 * Core Utilities Index
 * Centralized export of all core utilities
 * 
 * Phase 2A Cleanup: Removed unused utilities
 * - browser-logger (0 imports)
 * - dashboard-utils (0 imports)
 * - loading-utils (0 imports, client has its own)
 * - navigation-utils (0 imports, client has its own)
 * - performance-utils (0 imports)
 * - race-condition-prevention (0 imports)
 * - concurrency-adapter (0 imports)
 * - http-utils (0 imports)
 */

// ==================== Core Utilities (Truly Shared) ====================

// Async utilities - debouncing, throttling, retry logic, concurrency control
export * from './async-utils';

// Data utilities - validation, transformation, filtering, pagination
export * from './data-utils';

// Security utilities - sanitization, validation, encryption, authentication
export * from './security-utils';

// String utilities - manipulation, validation, formatting
export * from './string-utils';

// Number utilities - formatting, validation, calculations
export * from './number-utils';

// Regex patterns - common validation patterns
export * from './regex-patterns';

// Type guards - runtime type checking and validation
export { TypeGuards } from './type-guards';
export type { TypeValidationResult, SchemaValidationOptions } from './type-guards';

// Formatting utilities - date, currency, number formatting
export * from './formatting';

// Image utilities - image processing and optimization
export * from './images/image-utils';

// Common utilities - general purpose helpers
export * from './common-utils';

















































