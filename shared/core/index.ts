/**
 * Shared Core - Main Export File
 *
 * ⚠️ ARCHITECTURE NOTE:
 *
 * IMPORTANT: Despite the "shared" name, this module is 80% SERVER INFRASTRUCTURE.
 * This is a legacy organizational pattern. Ideally, server-only modules should be
 * in server/core/, but that refactoring would require updating 30+ import statements.
 *
 * SERVER-ONLY MODULES (in this directory):
 * - observability/  - Server logging, error management, tracing, metrics
 * - caching/        - Server-side cache implementation
 * - validation/     - Server validation schemas
 * - middleware/     - Express middleware
 * - performance/    - Server performance monitoring
 * - config/         - Server configuration
 *
 * TRULY SHARED ITEMS (in this directory):
 * - primitives/     - Constants, enums, basic types
 * - types/          - Core type definitions (auth, feature-flags)
 * - utils/          - Generic utilities (string, number, type-guards, security, regex, formatting)
 *
 * RECOMMENDATION:
 * - Client code should NOT import from observability/, caching/, validation/,
 *   middleware/, performance/, or config/ - these are server-only
 * - Client code CAN import from primitives/, types/, and utils/
 * - For server-only utilities, prefer server/infrastructure/ for clarity
 *
 * FUTURE REFACTORING:
 * See docs/ARCHITECTURE.md for planned reorganization to move server modules
 * to server/core/ for proper architectural separation.
 */

// Primitives - Core type utilities (SHARED)
export * from './primitives';

// Types - Core type definitions (SHARED)
export * from './types';

// Utilities - Shared utilities (SHARED)
export * from './utils';
export * from './utils/correlation-id';
export * from './utils/common-utils';
export * from './utils/string-utils';
export * from './utils/number-utils';
export * from './utils/type-guards';
export * from './utils/security-utils';
export * from './utils/regex-patterns';
export * from './utils/formatting';

// ============================================================================
// SERVER-ONLY INFRASTRUCTURE MODULES
// ============================================================================
// NOTE: The following are server-only and should ideally be in server/core/
// but are kept here for now due to existing import patterns.
// See docs/ARCHITECTURE.md for more information.

// Error management (SERVER ONLY)
export * from './observability/error-management/errors/base-error';
export * from './observability/error-management/errors/specialized-errors';
export * from './observability/error-management/types';

// Logging (SERVER ONLY)
export * from './observability/logging';

// Caching (SERVER ONLY) - Re-exported from server/infrastructure/cache
// MIGRATED: Actual implementation moved to server/infrastructure/cache/
export * from './cache'; // Compatibility layer

// Observability (SERVER ONLY) - Re-exported from server/infrastructure/observability
// MIGRATED: Actual implementation moved to server/infrastructure/observability/
export * from './observability'; // Compatibility layer

// Performance (SERVER ONLY) - Re-exported from server/infrastructure/performance
// MIGRATED: Actual implementation moved to server/infrastructure/performance/
export * from './performance'; // Compatibility layer

// Validation (SERVER ONLY) - Re-exported from server/infrastructure/validation
// MIGRATED: Actual implementation moved to server/infrastructure/validation/
export * from './validation'; // Compatibility layer

// Error severity and domain enums
export enum ErrorDomain {
  SYSTEM = 'system',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  CACHE = 'cache',
  NETWORK = 'network',
  EXTERNAL_SERVICE = 'external_service',
  BUSINESS_LOGIC = 'business_logic',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  DATA = 'data',
  INTEGRATION = 'integration'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
