# Error Boundaries - DEPRECATED

> **⚠️ DEPRECATED**: This module has been consolidated into `@client/components/error-handling`.
> All functionality has been moved to provide better organization and enhanced error handling capabilities.

## Migration Guide

This directory contains deprecated error boundary components that have been consolidated into the unified error handling system. Please migrate to the new `@client/components/error-handling` module.

### Component Migrations

| Deprecated Component | New Location | Notes |
|---------------------|--------------|-------|
| `ErrorBoundary` | `@client/components/error-handling/ErrorBoundary` | Enhanced with better recovery strategies |
| `ErrorBoundaryProvider` | `@client/components/error-handling/ErrorRecoveryManager` | Renamed for clarity, provides application-level error management |
| `withErrorBoundary` | `@client/components/error-handling/withCommunityErrorBoundary` | Specialized for community features |
| `useErrorHandler` | Various utilities in `@client/components/error-handling` | Use appropriate error handling utilities |

### Type Migrations

| Deprecated Type | New Location |
|-----------------|--------------|
| `ErrorBoundaryProps` | `@client/components/error-handling/ErrorBoundaryProps` |
| `ErrorFallbackProps` | `@client/components/error-handling/ErrorFallbackProps` |
| `ErrorSeverity` | `@client/core/error/constants/ErrorSeverity` |
| `ErrorDomain` | `@client/core/error/constants/ErrorDomain` |
| `BrowserError` | `@client/core/error/types/AppError` |

### Migration Steps

1. **Update Imports**:
   ```typescript
   // Before
   import { ErrorBoundary } from '@client/components/error-boundaries';

   // After
   import { ErrorBoundary } from '@client/components/error-handling';
   ```

2. **Update Component Usage**:
   ```typescript
   // Before
   import { ErrorBoundaryProvider } from '@client/components/error-boundaries';

   // After
   import { ErrorRecoveryManager } from '@client/components/error-handling';
   ```

3. **Update HOCs**:
   ```typescript
   // Before
   import { withErrorBoundary } from '@client/components/error-boundaries';

   // After
   import { withCommunityErrorBoundary } from '@client/components/error-handling';
   ```

### Backward Compatibility

This deprecated module maintains backward compatibility during the transition period. Existing imports will continue to work but will show console warnings. All exports are redirected to the new error-handling module.

### Removal Timeline

- **Phase 1** (Current): Deprecation warnings added
- **Phase 2**: Console warnings become errors
- **Phase 3**: Module removal (TBD)

### Benefits of Migration

- **Unified Error Handling**: All error handling logic in one place
- **Enhanced Recovery**: Better error recovery strategies
- **Type Safety**: Improved TypeScript support
- **Performance**: Optimized error handling components
- **Maintainability**: Easier to maintain and extend

### Need Help?

If you encounter issues during migration, please refer to:
- `@client/components/error-handling/README.md` for detailed documentation
- The error handling examples in `@client/components/error-handling/examples/`
- Team documentation for error handling patterns