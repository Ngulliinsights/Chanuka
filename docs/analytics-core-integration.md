# Analytics Core Infrastructure Integration

This document outlines how the analytics feature integrates with existing core infrastructure components.

## Core Components Overview

### Error Tracking (`server/core/errors/error-tracker.ts`)
- **Purpose**: Centralized error tracking with pattern recognition, alerting, and monitoring
- **Key Features**:
  - Error fingerprinting for grouping similar errors
  - Configurable alert rules based on error rate/severity
  - Request context integration (traceId, userId, etc.)
  - Automatic cleanup of old errors
- **Integration Points**:
  - `trackError()` - Track errors with context
  - `trackRequestError()` - Track errors from Express requests
  - Error context includes traceId, userId, endpoint, etc.
- **Usage Pattern**: Replace `console.error()` with `errorTracker.trackError()` or `errorTracker.trackRequestError()`

### Types System (`server/core/types.ts`)
- **Purpose**: Centralized type definitions for domain entities
- **Key Types Available**:
  - User, InsertUser
  - Bill, InsertBill
  - Stakeholder, InsertStakeholder
  - BillComment, InsertBillComment
  - UserProgress, InsertUserProgress
  - SocialShare, InsertSocialShare
- **Integration Points**: Analytics should reuse these types instead of defining duplicates
- **Usage Pattern**: Import from `server/core/types.ts`

### Validation System (`server/core/validation/`)
- **Purpose**: Schema validation, input validation, and data integrity checks
- **Components**:
  - `schema-validation-service.ts` - Database schema validation
  - `data-validation-service.ts` - Data completeness validation
  - `input-validation-service.ts` - Request input validation
- **Integration Points**:
  - Schema validation for analytics-related tables
  - Input validation for analytics endpoints
  - Data validation for analytics data integrity
- **Usage Pattern**: Use validation services for domain-level rules

### Logger (`server/utils/logger.ts`)
- **Purpose**: Structured logging with correlation tracking and performance monitoring
- **Key Features**:
  - Log levels: debug, info, warn, error, critical
  - Automatic trace ID injection from request context
  - Performance logging with duration tracking
  - Log aggregation and querying capabilities
- **Integration Points**:
  - Replace `console.log()` with structured logging
  - Include component and operation context
  - Use appropriate log levels
- **Usage Pattern**: Use `logger.info()`, `logger.error()`, etc. instead of console methods

### Cache System (`server/utils/cache.ts`)
- **Purpose**: In-memory caching with TTL support
- **Key Features**:
  - Decorator-based caching
  - TTL (time-to-live) support
  - Cache invalidation
- **Integration Points**: Analytics services should use this for performance optimization
- **Usage Pattern**: Apply `@cache({ ttl: 300 })` decorator or use cache utility functions

## Integration Guidelines

### When to Create Feature-Local Utilities
- **Create local**: When analytics has unique requirements not met by core utilities
- **Use core**: When core utilities provide the needed functionality
- **Extend core**: Propose extensions to core utilities when they would benefit the broader system

### Import Conventions
- Core utilities: `import { errorTracker } from 'server/core/errors/error-tracker'`
- Types: `import { User, Bill } from 'server/core/types'`
- Logger: `import { logger } from 'server/utils/logger'`
- Cache: `import { cache } from 'server/utils/cache'`

### Error Handling Patterns
- Use `errorTracker.trackError()` for all errors
- Include relevant context (userId, operation, etc.)
- Categorize errors appropriately (database, validation, system, etc.)
- Set appropriate severity levels

### Logging Patterns
- Use structured logging with context objects
- Include component name ('analytics') in all logs
- Use appropriate log levels (debug for development, info for operations, error for issues)
- Include trace IDs for request correlation

### Type Usage
- Always import types from core instead of defining locally
- Extend core types if analytics needs additional fields
- Use Insert* types for creation operations
- Validate data against core type definitions

## Migration Strategy

### Phase 1: Assessment
- [ ] Audit current analytics code for core utility usage
- [ ] Identify areas needing integration
- [ ] Plan migration order (least disruptive first)

### Phase 2: Integration
- [ ] Replace console.error with errorTracker
- [ ] Update imports to use core types
- [ ] Replace console.log with structured logging
- [ ] Integrate cache utilities where beneficial

### Phase 3: Validation
- [ ] Verify all integrations work correctly
- [ ] Test error tracking and monitoring
- [ ] Validate logging output
- [ ] Confirm performance improvements

## Benefits

- **Consistency**: Uniform error handling and logging across the application
- **Monitoring**: Centralized error tracking and alerting
- **Performance**: Shared caching infrastructure
- **Maintainability**: Single source of truth for types and utilities
- **Observability**: Better tracing and debugging capabilities