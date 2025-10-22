# Infrastructure Consolidation Plan

## Overview
This document outlines the consolidation of `server/infrastructure` with `shared/core` to eliminate redundancy and achieve architectural consistency as required by the project requirements.

## Major Overlaps Identified

### 1. **Cache Infrastructure** - MAJOR OVERLAP
- **server/infrastructure/cache/**: Complete cache service implementation
- **shared/core/src/caching/**: Comprehensive unified caching system
- **Verdict**: `server/infrastructure/cache/` is redundant - use `shared/core/src/caching/`

### 2. **Database Infrastructure** - MAJOR OVERLAP  
- **server/infrastructure/database/**: Multiple database services and connection pools
- **shared/database/**: Clean, centralized database connection with transactions
- **Verdict**: Most of `server/infrastructure/database/` is redundant

### 3. **Monitoring/Observability** - MAJOR OVERLAP
- **server/infrastructure/monitoring/**: Performance monitoring, health checks, APM
- **shared/core/src/observability/**: Unified observability system with logging, metrics, tracing
- **Verdict**: `server/infrastructure/monitoring/` is redundant - use `shared/core/src/observability/`

### 4. **Notifications** - SERVER-SPECIFIC (KEEP)
- **server/infrastructure/notifications/**: Server-specific notification delivery
- **No equivalent in shared/**: This is server-side business logic
- **Verdict**: Keep but refactor to use shared primitives

### 5. **External Data** - SERVER-SPECIFIC (KEEP)
- **server/infrastructure/external-data/**: Government API integrations
- **No equivalent in shared/**: This is server-specific integration logic
- **Verdict**: Keep but refactor to use shared utilities

## Consolidation Actions

### Phase 1: Remove Redundant Cache Infrastructure

#### Files to DELETE:
- `server/infrastructure/cache/cache-service.ts` ❌
- `server/infrastructure/cache/cache-coordinator.ts` ❌  
- `server/infrastructure/cache/advanced-caching.ts` ❌
- `server/infrastructure/cache/cache-warming.ts` ❌
- `server/infrastructure/cache/cache.ts` ❌
- `server/infrastructure/cache/migration-wrapper.ts` ❌

#### Files to UPDATE:
- `server/infrastructure/cache/index.ts` → Export from `shared/core/src/caching/`

### Phase 2: Remove Redundant Database Infrastructure

#### Files to DELETE:
- `server/infrastructure/database/database-service.ts` ❌
- `server/infrastructure/database/connection-pool.ts` ❌
- `server/infrastructure/database/db.ts` ❌

#### Files to KEEP (Server-specific):
- `server/infrastructure/database/database-fallback.ts` ✅
- `server/infrastructure/database/migration-service.ts` ✅
- `server/infrastructure/database/seed-data-service.ts` ✅
- `server/infrastructure/database/config.ts` ✅

#### Files to UPDATE:
- `server/infrastructure/database/index.ts` → Use shared database connections

### Phase 3: Remove Redundant Monitoring Infrastructure

#### Files to DELETE:
- `server/infrastructure/monitoring/performance-monitor.ts` ❌
- `server/infrastructure/monitoring/monitoring.ts` ❌
- `server/infrastructure/monitoring/apm-service.ts` ❌
- `server/infrastructure/monitoring/audit-log.ts` ❌
- `server/infrastructure/monitoring/db-tracer.ts` ❌
- `server/infrastructure/monitoring/health.ts` ❌
- `server/infrastructure/monitoring/system-health.ts` ❌

#### Files to UPDATE:
- `server/infrastructure/monitoring/index.ts` → Export from `shared/core/src/observability/`

### Phase 4: Refactor Server-Specific Services

#### Notifications (KEEP but refactor):
- Update to use `shared/core/src/observability/logging/`
- Update to use `shared/database/connection`
- Update to use `shared/core/src/primitives/errors/`

#### External Data (KEEP but refactor):
- Update to use `shared/core/src/observability/logging/`
- Update to use `shared/core/src/utils/http-utils`
- Update to use `shared/core/src/primitives/types/`

## Expected Benefits

1. **Reduced Code Duplication**: ~60% reduction in infrastructure code
2. **Consistent Error Handling**: All services use shared error types
3. **Unified Logging**: All services use shared observability stack
4. **Simplified Maintenance**: Single source of truth for core functionality
5. **Better Testing**: Shared test utilities and patterns
6. **Architectural Consistency**: Aligns with requirements for cross-layer consistency

## Migration Strategy

1. **Backup Current State**: Create backup of current infrastructure
2. **Update Imports**: Change all imports to use shared modules
3. **Remove Redundant Files**: Delete duplicate implementations
4. **Update Index Files**: Consolidate exports
5. **Test Integration**: Ensure all functionality works
6. **Update Documentation**: Reflect new architecture

## Risk Mitigation

- **Gradual Migration**: Implement changes incrementally
- **Feature Flags**: Use flags to switch between old/new implementations
- **Comprehensive Testing**: Test each phase thoroughly
- **Rollback Plan**: Keep ability to revert changes if needed