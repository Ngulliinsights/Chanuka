# Core Consolidation Migration Plan

## Overview
This document outlines the migration plan to consolidate redundant systems in shared/core and implement the unified architecture described in the requirements documents.

## Current Redundancies Identified

### 1. Cache System Duplication
- `src/caching/` - New unified cache system
- `src/cache/` - Legacy cache implementation  
- Multiple cache adapters scattered across the codebase
- AI-specific cache implementations as parallel systems

### 2. Validation System Fragmentation
- `src/validation/` - New adapter-based validation
- Legacy validation services in multiple locations
- Scattered schema definitions
- Inconsistent validation patterns

### 3. Error Handling Partial Migration
- `src/observability/error-management/` - New consolidated system (✅ Complete)
- `src/error-handling/` - Legacy system (deprecated)
- `src/errors/` - Legacy system (deprecated)
- Legacy adapters providing backward compatibility

### 4. Utility Sprawl
- `src/utils/` - Mixed utilities
- `src/services/` - Service utilities
- Scattered helper functions
- Inconsistent patterns

## Migration Strategy

### Phase 1: Cache System Consolidation ⚠️ IN PROGRESS
**Objective**: Consolidate all cache implementations into unified caching system

**Tasks**:
1. ✅ Audit existing cache implementations
2. 🔄 Create unified cache interface
3. 🔄 Implement cache adapters (Memory, Redis, Multi-tier)
4. 🔄 Create legacy adapters for backward compatibility
5. 🔄 Migrate existing cache usage
6. 🔄 Remove duplicate implementations

### Phase 2: Validation System Unification ⚠️ IN PROGRESS  
**Objective**: Consolidate validation logic into adapter-based system

**Tasks**:
1. ✅ Audit existing validation implementations
2. 🔄 Create unified validation interface
3. 🔄 Implement validation adapters (Zod, Joi, Custom)
4. 🔄 Create legacy adapters
5. 🔄 Migrate existing validation usage
6. 🔄 Remove duplicate implementations

### Phase 3: Utility Consolidation 🔄 NEXT
**Objective**: Organize utilities into logical modules

**Tasks**:
1. Audit all utility functions
2. Categorize by functionality
3. Create organized utility modules
4. Implement cross-cutting utilities
5. Remove duplicates and inconsistencies

### Phase 4: Final Cleanup 📋 PLANNED
**Objective**: Remove legacy code and finalize migration

**Tasks**:
1. Remove deprecated directories
2. Update all import paths
3. Remove legacy adapters
4. Update documentation
5. Validate zero redundancy

## Implementation Details

### Cache Consolidation
```typescript
// Target structure:
shared/core/src/caching/
├── core/
│   ├── interfaces.ts      // CacheService interface
│   └── types.ts          // Cache types
├── adapters/
│   ├── memory-adapter.ts  // Memory cache implementation
│   ├── redis-adapter.ts   // Redis cache implementation
│   └── multi-tier-adapter.ts // Multi-tier cache
├── patterns/
│   ├── single-flight-cache.ts // Request deduplication
│   └── circuit-breaker.ts     // Circuit breaker pattern
├── legacy-adapters/
│   └── cache-service-adapter.ts // Backward compatibility
└── index.ts              // Main exports
```

### Validation Consolidation
```typescript
// Target structure:
shared/core/src/validation/
├── core/
│   ├── interfaces.ts      // ValidationService interface
│   └── types.ts          // Validation types
├── adapters/
│   ├── zod-adapter.ts     // Zod validation adapter
│   ├── joi-adapter.ts     // Joi validation adapter
│   └── custom-adapter.ts  // Custom validation adapter
├── schemas/
│   ├── common.ts         // Common validation schemas
│   └── auth.ts           // Authentication schemas
├── middleware/
│   └── express-middleware.ts // Express integration
├── legacy-adapters/
│   └── validation-service-adapter.ts // Backward compatibility
└── index.ts              // Main exports
```

## Migration Commands

### 1. Cache Migration
```bash
# Run cache consolidation
npm run migrate:cache

# Validate cache migration
npm run validate:cache-migration

# Test cache functionality
npm run test:cache
```

### 2. Validation Migration
```bash
# Run validation consolidation
npm run migrate:validation

# Validate validation migration
npm run validate:validation-migration

# Test validation functionality
npm run test:validation
```

### 3. Utility Consolidation
```bash
# Run utility consolidation
npm run migrate:utilities

# Validate utility migration
npm run validate:utility-migration
```

## Feature Flags

Migration will be controlled by feature flags to enable gradual rollout:

```typescript
// Environment variables
USE_UNIFIED_CACHING=true|false
USE_UNIFIED_VALIDATION=true|false
USE_CONSOLIDATED_UTILITIES=true|false

// Runtime flags
process.env.ENABLE_CACHE_MIGRATION
process.env.ENABLE_VALIDATION_MIGRATION
process.env.ENABLE_UTILITY_MIGRATION
```

## Rollback Strategy

Each phase includes rollback capabilities:

1. **Feature Flags**: Instant rollback by toggling flags
2. **Legacy Adapters**: Maintain old functionality during migration
3. **Gradual Migration**: Migrate services one by one
4. **Monitoring**: Track migration health and performance

## Success Criteria

### Cache Consolidation Success
- ✅ Single CacheService interface
- ✅ All cache implementations use unified interface
- ✅ Zero cache-related duplication
- ✅ Performance parity or improvement
- ✅ 100% test coverage maintained

### Validation Consolidation Success
- ✅ Single ValidationService interface
- ✅ All validation uses unified interface
- ✅ Zero validation-related duplication
- ✅ Schema reusability improved
- ✅ 100% test coverage maintained

### Utility Consolidation Success
- ✅ Organized utility modules
- ✅ Zero utility duplication
- ✅ Clear separation of concerns
- ✅ Improved discoverability
- ✅ Consistent patterns

## Timeline

- **Week 1**: Cache consolidation
- **Week 2**: Validation consolidation  
- **Week 3**: Utility consolidation
- **Week 4**: Final cleanup and validation

## Risk Mitigation

1. **Backward Compatibility**: Legacy adapters ensure no breaking changes
2. **Gradual Migration**: Feature flags enable incremental rollout
3. **Comprehensive Testing**: Maintain 100% test coverage throughout
4. **Performance Monitoring**: Track performance metrics during migration
5. **Rollback Plan**: Instant rollback capability at each phase