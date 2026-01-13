/**
 * Shared Types - Centralized Type System
 * Main entry point for all shared type definitions
 */

export * from './core';
export * from './domains/loading';

// Domain-specific exports
export * from './domains/safeguards';
export * from './domains/authentication';
export * from './domains/legislative';
// export * from './api';

// Type testing infrastructure
export * from './testing';

/**
 * Version information for the type system
 */
export const TYPE_SYSTEM_VERSION = '1.0.0' as const;
export const TYPE_SYSTEM_DESCRIPTION = 'Unified type system foundation' as const;