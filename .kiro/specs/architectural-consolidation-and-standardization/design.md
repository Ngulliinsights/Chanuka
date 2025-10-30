# Design Document

## Overview

This design addresses the infrastructure and configuration issues preventing the application from starting while preserving the strategic `@shared/core` architectural design. The solution focuses on fixing database migrations, build configuration, and module resolution without compromising the established architectural patterns.

## Architecture

### Core Design Principles

1. **Preserve Strategic Architecture**: Maintain `@shared/core` as the single source of truth for cross-cutting concerns
2. **Fix Infrastructure, Not Architecture**: Address build configuration and database issues without changing the design
3. **Type Safety First**: Ensure TypeScript path mapping works correctly for the intended architecture
4. **Database-First Resolution**: Ensure database tables exist before fixing import issues
5. **Configuration Over Convention**: Fix build system configuration to support the architectural intent

### Architectural Hierarchy (Preserved)

```
@shared/core          # Single source of truth for cross-cutting concerns (PRESERVE)
shared/schema         # Database tables, types, validation
shared/types          # Pure type definitions only
server/               # Server-specific modules using @shared/core imports
client/               # Client-specific modules using @shared/core imports
```

## Components and Interfaces

### 1. Database Schema Consolidation

**Component**: `shared/schema/index.ts`
**Purpose**: Single export point for all database tables and types

```typescript
// Consolidated exports
export * from "./schema";
export * from "./enum";
export * from "./validation";
export * from "./types";

// Explicit table exports for database pool
export {
  user, userProfile, session, bill, stakeholder,
  // ... all strategic tables
} from "./schema";
```

**Interface**: Database connection uses schema directly
```typescript
import * as schema from '../schema';  // Not '../types'
export const db = drizzle(pool, { schema });
```

### 2. Validation Error Consolidation

**Component**: `shared/core/src/observability/error-management/errors/specialized-errors.ts`
**Purpose**: Leverage existing comprehensive ValidationError class for all validation operations

```typescript
export class ValidationError extends BaseError {
  public readonly errors: Array<{
    field?: string;
    code: string;
    message: string;
    value?: unknown;
  }>;
  // Includes: statusCode, correlationId, timestamp, error domains, severity levels
}
```

**Interface**: All validation adapters use specialized error infrastructure
```typescript
export interface ValidationAdapter {
  validate<T>(data: unknown, schema: T): Promise<T>;
  formatError(error: unknown): ValidationError; // Uses specialized class
}
```

### 3. Build Configuration Resolution

**Component**: TypeScript and build system configuration
**Purpose**: Ensure `@shared/core` path mapping works correctly

```typescript
// tsconfig.json paths (CORRECT)
{
  "paths": {
    "@shared/core": ["./shared/core/src/index.ts"],
    "@shared/core/*": ["./shared/core/src/*"]
  }
}
```

**Interface**: Strategic import pattern (PRESERVE)
```typescript
import { logger } from '@shared/core';  // Architectural intent - DO NOT CHANGE
```

### 4. Strategic Table Implementation

**Component**: Database schema with strategic tables
**Purpose**: Complete data model for core functionality

Strategic tables to implement:
- `user_progress` - User achievements and gamification
- `content_analysis` - Automated content analysis
- `verification` - User verification system
- `stakeholder` - Stakeholder management
- `social_share` - Social sharing analytics

### 5. Import Path Validation

**Component**: Build-time validation scripts
**Purpose**: Prevent architectural drift

```typescript
// scripts/validate-architecture.ts
export const validateImportPaths = () => {
  // Check for ../utils/logger imports
  // Validate schema imports
  // Ensure consistent error types
};
```

## Data Models

### Database Schema Structure

```typescript
// Core user tables
user, userProfile, session, refreshToken, passwordReset

// Legislative content
bill, billComment, billEngagement, sponsor, stakeholder

// Analysis and verification
analysis, contentAnalysis, verification

// Strategic tables (missing)
userProgress, socialShare
```

### Error Handling Model

```typescript
// Leverage existing comprehensive error infrastructure
class BaseError extends Error {
  statusCode: number;
  code: string;
  correlationId: string;
  timestamp: string;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  isOperational: boolean;
  retryable?: boolean;
}

class ValidationError extends BaseError {
  errors: Array<{
    field?: string;
    code: string;
    message: string;
    value?: unknown;
  }>;
}

class DatabaseError extends BaseError {
  operation?: string;
  query?: string;
  table?: string;
}
```

## Error Handling

### Specialized Error Classes

All errors use existing comprehensive error infrastructure from `shared/core/src/observability/error-management/errors/specialized-errors.ts`:

1. **ValidationError**: Form and data validation failures with error domains and severity
2. **DatabaseError**: Database operation failures with retry logic and operation context
3. **AuthenticationError**: Auth-related failures with proper HTTP status codes
4. **AuthorizationError**: Permission failures with required permissions context
5. **NotFoundError**: Resource not found with resource identification
6. **ConflictError**: Resource conflicts with conflicting field information
7. **NetworkError**: Network-related issues with retry capabilities
8. **ExternalServiceError**: Third-party service failures with service identification

### Error Response Standardization

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
  timestamp: string;
  correlationId: string;
}
```

## Testing Strategy

### 1. Import Path Validation Tests

```typescript
describe('Import Path Consistency', () => {
  it('should not import from ../utils/logger', () => {
    // Scan all files for old logger imports
  });
  
  it('should import schema from shared/schema', () => {
    // Validate database imports
  });
});
```

### 2. Schema Export Tests

```typescript
describe('Database Schema Exports', () => {
  it('should export all strategic tables', () => {
    // Verify table exports exist
  });
  
  it('should have consistent table definitions', () => {
    // Validate table structure
  });
});
```

### 3. Error Handling Tests

```typescript
describe('Error Handling Consistency', () => {
  it('should use unified ValidationError type', () => {
    // Test error type consistency
  });
  
  it('should have consistent error response format', () => {
    // Test API error responses
  });
});
```

### 4. Integration Tests

```typescript
describe('Architectural Integration', () => {
  it('should initialize all services without errors', () => {
    // Test service initialization
  });
  
  it('should perform database operations successfully', () => {
    // Test database connectivity
  });
});
```

## Implementation Phases

### Phase 1: Critical Path Fixes (Immediate)
1. Fix database schema import in `shared/database/connection.ts`
2. Resolve variable shadowing in notification scheduler
3. Add missing strategic table exports
4. Create unified ValidationError type

### Phase 2: Import Path Standardization (Week 1)
1. Create import path validation script
2. Fix all logger import paths
3. Standardize schema imports across codebase
4. Update TypeScript path mappings

### Phase 3: Error Handling Consolidation (Week 2)
1. Implement centralized error types
2. Update all validation adapters
3. Standardize API error responses
4. Add error handling tests

### Phase 4: Strategic Table Implementation (Week 2-3)
1. Create migration for missing strategic tables
2. Update schema exports
3. Implement table-specific services
4. Add comprehensive tests

### Phase 5: Automated Validation (Week 3)
1. Implement pre-commit hooks
2. Add CI/CD validation steps
3. Create architectural documentation
4. Establish maintenance procedures

## Migration Strategy

### Backward Compatibility

- Maintain existing APIs during transition
- Use deprecation warnings for old import paths
- Provide migration scripts for major changes
- Gradual rollout with feature flags

### Risk Mitigation

- Comprehensive test coverage before changes
- Database backup before schema changes
- Rollback procedures for each phase
- Monitoring and alerting for issues

### Success Metrics

- Zero "relation does not exist" errors
- Zero import path resolution failures
- Zero validation type conflicts
- 100% test coverage for critical paths
- Sub-100ms application startup time

## Security Considerations

### Import Path Security

- Prevent relative path traversal attacks
- Validate all import paths at build time
- Use TypeScript strict mode for type safety
- Implement content security policies

### Database Security

- Validate all schema changes
- Use parameterized queries only
- Implement proper access controls
- Audit database operations

### Error Information Disclosure

- Sanitize error messages in production
- Log detailed errors server-side only
- Use correlation IDs for debugging
- Implement rate limiting on error endpoints

## Performance Implications

### Import Resolution

- Optimize TypeScript compilation with path mapping
- Use barrel exports efficiently
- Minimize circular dependencies
- Implement lazy loading where appropriate

### Database Operations

- Ensure proper indexing on strategic tables
- Optimize query patterns
- Use connection pooling effectively
- Monitor query performance

### Error Handling

- Minimize error object creation overhead
- Use efficient error serialization
- Implement error caching where appropriate
- Optimize logging performance

### 6. Redundant Type Directory Elimination

**Component**: `shared/types/` directory removal
**Purpose**: Eliminate duplicate type definitions and import confusion

**Analysis**: The `shared/types/` directory contains:
- **Redundant error types**: Simple interfaces superseded by comprehensive specialized error classes
- **Duplicate auth types**: Better organized in `shared/core/src/types/auth.types.ts`
- **Domain-specific types**: Should be moved to appropriate module boundaries
- **Import conflicts**: Multiple ValidationError definitions causing confusion

**Migration Strategy**:
```typescript
// Before: Conflicting imports
import { ValidationError } from 'shared/types/errors';
import { ValidationError } from 'shared/core/src/observability/error-management/errors/specialized-errors';

// After: Single source of truth
import { ValidationError } from 'shared/core/src/observability/error-management/errors/specialized-errors';
```

**Domain Type Relocation**:
- `bill.ts`, `expert.ts`, `legal-analysis.ts` → Move to respective feature modules
- `auth.ts` → Already available in `shared/core/src/types/auth.types.ts`
- `common.ts` → Utility types available in `shared/core/src/types/`
- `errors.ts` → Delete (superseded by specialized error classes)

## Monitoring and Observability

### Metrics to Track

- Import path resolution time
- Database connection health
- Error rate by type using specialized error classes
- Service initialization time
- Memory usage patterns
- Type conflict resolution success rate

### Alerting

- Database connection failures
- High error rates with error domain classification
- Import path failures
- Service initialization failures
- Performance degradation
- Type import conflicts

### Logging Strategy

- Structured logging with correlation IDs from specialized error classes
- Error context preservation using error domains and severity levels
- Performance metrics logging
- Security event logging
- Audit trail maintenance
- Type migration tracking