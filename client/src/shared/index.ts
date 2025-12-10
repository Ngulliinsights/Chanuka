/**
 * Shared Module - UI Components, Design System, and Infrastructure
 *
 * Centralized export for shared UI components, design system primitives,
 * reusable interface elements, and technical infrastructure.
 * 
 * This module now consolidates both UI concerns and infrastructure
 * following the architectural principle from SHARED_VS_CORE_ANALYSIS.md:
 * "shared/ handles UI concerns and infrastructure, core/ handles business logic"
 */

// ============================================================================
// Design System and UI Components
// ============================================================================

// Design System
export * from './design-system';

// Shared UI Components
export * from './ui';

// ============================================================================
// Technical Infrastructure
// ============================================================================

// Infrastructure services (performance, error handling, browser compatibility, etc.)
export * from './infrastructure';

// Shared Hooks - utility and UI hooks
export * from './hooks';

// Shared Libraries - form utilities, route protection, query configuration
export * from './lib';

// Cross-cutting services (notification, etc.)
export * from './services';

// Testing infrastructure
export * from './testing';

// ============================================================================
// Shared Utilities and Validation
// ============================================================================

// Validation utilities
export * from './validation';

// Interface definitions
export * from './interfaces';

// Component templates
export * from './templates';

// Shared types
export * from './types';