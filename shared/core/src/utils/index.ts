/**
 * Core Utilities Index
 * Centralized export of all core utilities
 */

// ==================== Consolidated Utility Modules ====================

// API utilities - response handling, error formatting, status codes
export * from './api-utils';

// Cache utilities - caching decorators, metrics, management
export * from './cache-utils';

// Async utilities - debouncing, throttling, retry logic, concurrency control
export * from './async-utils';

// Data utilities - validation, transformation, filtering, pagination
export * from './data-utils';

// HTTP utilities - request/response handling, client, status codes
export * from './http-utils';

// Security utilities - sanitization, validation, encryption, authentication
export * from './security-utils';

// Performance utilities - monitoring, benchmarking, memory tracking
export * from './performance-utils';

// String utilities - manipulation, validation, formatting
export * from './string-utils';

// Type guards - runtime type checking and validation
export * from './type-guards';

// Browser logger - client-side logging utility
export * from './browser-logger';

// ==================== Legacy/Existing Utilities ====================

// Formatting utilities
export * from './formatting';

// Image utilities
export * from './images/image-utils';

// Form testing utilities (only in test environment)
export * as FormTesting from '../testing/form/form-testing-utils';

// ==================== Backward Compatibility ====================

// Re-export existing utilities for backward compatibility
// Note: Some utilities have been consolidated into the new modules above
// These exports maintain backward compatibility while encouraging migration

// Legacy utilities (consider migrating to consolidated modules)
// Note: HTTP_STATUS from constants conflicts with http-utils, use explicit imports
// export * from './constants';
export * from './correlation-id';
// Migration utilities removed by design during development
export * from './number-utils';
export * from './regex-patterns';

// Response helpers (consider migrating to http-utils)
export * from './response-helpers';

// Race condition prevention (consider migrating to async-utils)
// Note: These may conflict with async-utils exports, so use explicit imports if needed
// export * from '@shared/core/src/utils/async-utils'';













































