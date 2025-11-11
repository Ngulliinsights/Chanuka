# Error Handling Redundancy Cleanup Plan

## Identified Redundancies

### 1. **Duplicate ErrorBoundary Components**
- `client/src/components/error/ErrorBoundary.tsx` - Legacy enhanced version
- `client/src/components/error-handling/ErrorBoundary.tsx` - Full-featured version

**Resolution**: Deprecate the legacy version and consolidate into the full-featured version.

### 2. **Duplicate Error Type Systems**
- `core/error/index.ts`: Uses `ErrorSeverity` + `ErrorDomain`
- `unified-error-handler.ts`: Uses `ErrorSeverity` + `ErrorType`

**Resolution**: Unify type systems by making unified-error-handler use shared types.

### 3. **Conflicting Error Classes**
- `core/error/BaseError` - Legacy error class
- `unified-error-handler/AppError` - New unified error interface

**Resolution**: Extend BaseError to implement AppError interface.

### 4. **Multiple Export Points**
- Components exported from multiple locations
- Type definitions duplicated across files

**Resolution**: Create single source of truth for exports.

## Cleanup Actions

### Phase 1: Type System Unification
1. Update unified-error-handler to use shared error types
2. Create type aliases for backward compatibility
3. Update all imports to use unified types

### Phase 2: Component Consolidation
1. Deprecate legacy ErrorBoundary
2. Update all imports to use enhanced ErrorBoundary
3. Remove duplicate component files

### Phase 3: Export Cleanup
1. Consolidate all exports in single index file
2. Remove duplicate exports
3. Update import paths throughout codebase

### Phase 4: Testing and Validation
1. Update tests to use consolidated components
2. Verify backward compatibility
3. Update documentation