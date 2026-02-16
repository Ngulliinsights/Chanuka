# Cache Consolidation Backup Manifest

## Backup Information
- **Date**: 2026-02-16
- **Tasks**: Infrastructure Consolidation - Tasks 4.1 and 5.1
- **Purpose**: Create backup of all cache factory and service files before consolidation

## Backed Up Files

### Factory Files (Task 4.1 - Pre-Consolidation)

### 1. cache.ts
- **Location**: `server/infrastructure/cache/cache.ts`
- **Backup**: `.backups/cache-consolidation/pre-consolidation/cache.ts`
- **Size**: 2 lines (empty stub)
- **Purpose**: Generated exports stub
- **Status**: To be removed during consolidation

### 2. simple-factory.ts
- **Location**: `server/infrastructure/cache/simple-factory.ts`
- **Backup**: `.backups/cache-consolidation/pre-consolidation/simple-factory.ts`
- **Size**: ~100 lines
- **Purpose**: Simple cache factory for basic use cases
- **Status**: To be merged into unified factory.ts

### 3. factory.ts
- **Location**: `server/infrastructure/cache/factory.ts`
- **Backup**: `.backups/cache-consolidation/pre-consolidation/factory.ts`
- **Size**: ~150 lines
- **Purpose**: Intermediate cache factory with CacheManager
- **Status**: To be enhanced and used as base for unified factory

### 4. cache-factory.ts
- **Location**: `server/infrastructure/cache/cache-factory.ts`
- **Backup**: `.backups/cache-consolidation/pre-consolidation/cache-factory.ts`
- **Size**: ~1048 lines
- **Purpose**: Advanced unified cache factory with clustering, compression, etc.
- **Status**: To be kept for advanced features

### Service Files (Task 5.1 - Pre-Service-Consolidation)

### 5. icaching-service.ts
- **Location**: `server/infrastructure/cache/icaching-service.ts`
- **Backup**: `.backups/cache-consolidation/pre-service-consolidation/icaching-service.ts`
- **Size**: ~150 lines
- **Purpose**: Caching service interface definition
- **Status**: To be merged into caching-service.ts

### 6. caching-service.ts
- **Location**: `server/infrastructure/cache/caching-service.ts`
- **Backup**: `.backups/cache-consolidation/pre-service-consolidation/caching-service.ts`
- **Size**: ~350 lines
- **Purpose**: Caching service implementation
- **Status**: To be enhanced with interface from icaching-service.ts

## Consolidation Plan

### Phase 2: Cache Module Consolidation
- **Task 4**: Cache Factory Consolidation
  - Merge simple-factory.ts and factory.ts into unified factory.ts
  - Keep cache-factory.ts for advanced features
  
- **Task 5**: Cache Service Consolidation
  - Merge icaching-service.ts interface into caching-service.ts
  - Create unified service with factory function

### Expected Outcome
- Reduce from 6 files to 4 files
- Eliminate duplicate factory logic
- Maintain all existing functionality
- Improve code discoverability

## Rollback Instructions

If consolidation needs to be rolled back:

1. Stop all services using the cache module
2. For factory rollback: Copy files from `.backups/cache-consolidation/pre-consolidation/` back to `server/infrastructure/cache/`
3. For service rollback: Copy files from `.backups/cache-consolidation/pre-service-consolidation/` back to `server/infrastructure/cache/`
4. Restart services
5. Verify all tests pass

## Notes

- All files are backed up in their original state before any modifications
- Git history also contains these files for additional rollback options
- Feature flag `infrastructure_consolidation_enabled` can be used for gradual rollout
- Backup created as part of Phase 2 preparation

## Verification

To verify backup integrity:
```bash
# Check factory backup file count
ls -la .backups/cache-consolidation/pre-consolidation/ | wc -l

# Check service backup file count
ls -la .backups/cache-consolidation/pre-service-consolidation/ | wc -l

# Compare factory files with originals (before consolidation)
diff server/infrastructure/cache/cache.ts .backups/cache-consolidation/pre-consolidation/cache.ts
diff server/infrastructure/cache/simple-factory.ts .backups/cache-consolidation/pre-consolidation/simple-factory.ts
diff server/infrastructure/cache/factory.ts .backups/cache-consolidation/pre-consolidation/factory.ts
diff server/infrastructure/cache/cache-factory.ts .backups/cache-consolidation/pre-consolidation/cache-factory.ts

# Compare service files with originals (before consolidation)
diff server/infrastructure/cache/icaching-service.ts .backups/cache-consolidation/pre-service-consolidation/icaching-service.ts
diff server/infrastructure/cache/caching-service.ts .backups/cache-consolidation/pre-service-consolidation/caching-service.ts
```

## Related Documentation

- Requirements: `.kiro/specs/infrastructure-consolidation/requirements.md`
- Design: `.kiro/specs/infrastructure-consolidation/design.md`
- Tasks: `.kiro/specs/infrastructure-consolidation/tasks.md`
