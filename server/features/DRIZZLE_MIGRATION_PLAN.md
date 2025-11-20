# Drizzle ORM Migration Plan

## Overview
Systematic migration from legacy repository pattern to direct Drizzle ORM usage across all features, ensuring domain-driven design consistency and maintaining architectural decoupling.

## Current State Analysis

### ✅ Completed Migrations
- **Users Feature**: Fully migrated to direct service pattern
- **Bills Feature**: Using direct Drizzle implementation
- **Constitutional Analysis**: Consolidated service created (previous session)

### 🔄 Partial Migrations
- **Sponsors Feature**: Has repository but also direct service
- **Argument Intelligence**: Mixed repository/service pattern

### ❌ Pending Migrations
- **Admin Feature**
- **Advocacy Feature** 
- **Alert Preferences Feature**
- **Analysis Feature**
- **Analytics Feature**
- **Community Feature**
- **Constitutional Intelligence Feature**
- **Coverage Feature**
- **Government Data Feature**
- **Notifications Feature**
- **Privacy Feature**
- **Recommendation Feature**
- **Search Feature**
- **Security Feature**

## Migration Strategy

### Phase 1: Repository Pattern Elimination
1. Identify remaining repository classes
2. Create consolidated service classes using direct Drizzle queries
3. Update dependency injection in factories/containers
4. Migrate application services to use new consolidated services

### Phase 2: Schema Alignment
1. Ensure all services use correct schema imports from `@shared/schema`
2. Align with domain-driven design structure
3. Update type definitions to match evolved schema

### Phase 3: Architecture Consistency
1. Standardize service patterns across features
2. Implement consistent error handling and logging
3. Ensure testability through dependency injection
4. Document domain-specific customizations

## Implementation Plan

### Priority 1: High-Impact Features
1. **Sponsors Feature** - Complete migration from repository to service
2. **Argument Intelligence** - Consolidate repository pattern
3. **Search Feature** - Align with new architecture

### Priority 2: Core Features
4. **Analytics Feature** - Direct Drizzle implementation
5. **Notifications Feature** - Service consolidation
6. **Community Feature** - Repository elimination

### Priority 3: Supporting Features
7. **Admin Feature** - Administrative service consolidation
8. **Security Feature** - Security service alignment
9. **Privacy Feature** - Privacy service implementation

## Success Criteria
- [ ] Zero repository pattern classes remain
- [ ] All services use direct Drizzle ORM queries
- [ ] Consistent schema imports across features
- [ ] Maintained architectural decoupling
- [ ] Full TypeScript compilation success
- [ ] All tests passing with new architecture
