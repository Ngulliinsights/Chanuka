# ADR-023: Consolidated Feature Implementations

**Date**: March 19, 2026
**Status**: Completed

## Context
This ADR contains architectural, structural, and design decisions extracted from over 100 sprawling documentation files across the codebase during the Repository Sanitation phase.

## Extracted Decisions


### From .agent\specs\infrastructure-integration\archive\completion-reports\DOC_AUDIT_SUMMARY.md

## Design Decisions Preserved

### Security Architecture (11 decisions)
1. Secure query builder pattern
2. Input validation flow
3. Security middleware configuration
4. Rate limiting strategy
5. Audit logging approach
6. SQL injection prevention
7. XSS prevention
8. Output sanitization
9. PII encryption
10. Password hashing
11. Session security

### Caching Strategy (7 decisions)
1. Cache key generation pattern
2. TTL strategy by entity type
3. Cache invalidation strategy
4. Cache warming strategy
5. Multi-level caching
6. Cache monitoring
7. Cache eviction policies

### Error Handling (5 decisions)
1. Result type pattern
2. Error context enrichment
3. Transaction error handling
4. Error middleware
5. Error logging

### Validation Architecture (5 decisions)
1. Three-tier validation architecture
2. Schema organization
3. Validation middleware pattern
4. Validation error format
5. Type safety approach

### Integration Patterns (3 decisions)
1. Service layer integration
2. Repository layer integration
3. Route layer integration

### Performance Targets (4 decisions)
1. Cache hit rate target (>70%)
2. Response time target (30%+ improvement)
3. Error rate target (<0.1%)
4. Transaction success target (>99.9%)

### Testing Strategy (3 decisions)
1. Test coverage target (>85%)
2. Integration test pattern
3. Security test pattern

**Total:** 38 key design decisions preserved

---


### From .agent\specs\infrastructure-integration\archive\completion-reports\FINAL_DOCUMENTATION_INDEX.md

## Architecture Documentation

### 5. Validation Architecture
**File:** `VALIDATION_ARCHITECTURE.md`  
**Purpose:** Validation system architecture  
**Status:** ✅ Complete  
**Audience:** Engineers

**Contents:**
- Validation patterns
- Zod schema usage
- Shared vs feature-specific validation
- Best practices

---

### 6. Error Handling Guide
**File:** `ERROR_HANDLING_GUIDE.md`  
**Purpose:** Comprehensive error handling documentation  
**Status:** ✅ Complete (2,500+ words)  
**Audience:** Engineers

**Contents:**
- Result type pattern
- safeAsync usage
- Error handling patterns
- Testing strategies
- Troubleshooting guide
- 15+ code examples

---

### 7. Transaction Audit Report
**File:** `TRANSACTION_AUDIT.md`  
**Purpose:** Transaction usage audit and patterns  
**Status:** ✅ Complete  
**Audience:** Engineers, DBAs

**Contents:**
- Transaction patterns
- Feature-by-feature audit
- Best practices
- Performance considerations

---


### From .agent\specs\infrastructure-integration\archive\completion-reports\PHASE2_COMPLETION_REPORT.md

## Architecture Patterns Established

### 1. Validation Pattern
```typescript
// Feature-specific validation schemas
import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

export const FeatureCreateSchema = z.object({
  field: CommonSchemas.title,
  // ... other fields
});
```

### 2. Enhanced Service Pattern
```typescript
export class EnhancedFeatureService {
  private inputSanitizer = new InputSanitizationService();

  async operation(input: Input): Promise<AsyncServiceResult<Output>> {
    return safeAsync(async () => {
      // 1. Validate
      const validation = await validateData(Schema, input);
      
      // 2. Sanitize
      const sanitized = this.inputSanitizer.sanitizeString(input);
      
      // 3. Check cache
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
      
      // 4. Execute with security
      const result = await secureQueryBuilderService
        .select()
        .from('table')
        .where('field', '=', sanitized);
      
      // 5. Cache result
      await cacheService.set(cacheKey, result, TTL);
      
      // 6. Audit log
      await securityAuditService.logSecurityEvent({...});
      
      return result;
    }, { service: 'EnhancedFeatureService', operation: 'operation' });
  }
}
```

### 3. Caching Pattern
```typescript
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';

// Generate cache key
const cacheKey = cacheKeys.entity('feature', id);

// Get from cache
const cached = await cacheService.get<Type>(cacheKey);

// Set to cache
await cacheService.set(cacheKey, data, CACHE_TTL.FEATURE);

// Invalidate cache
await cacheService.delete(cacheKey);
```

---


### From .agent\specs\infrastructure-integration\archive\completion-reports\PHASE3_COMPLETION_REPORT.md

## Architecture Achievements

### Error Handling Infrastructure

**Type-Safe Error Handling:**
```typescript
type AsyncServiceResult<T> = Promise<Result<T, Error>>;

// All service methods return this type
async getUserById(id: string): AsyncServiceResult<User | null>
```

**Consistent Wrapper:**
```typescript
return safeAsync(async () => {
  // Business logic
}, { 
  service: 'ServiceName', 
  operation: 'operationName',
  context: { /* additional context */ }
});
```

**Benefits:**
- Errors are part of the type system
- Explicit error handling required
- Automatic logging with context
- Consistent API across all services

---

### Transaction Infrastructure

**Implementation:**
- Uses AsyncLocalStorage for implicit transaction context
- Supports nested transactions (savepoints)
- Automatic rollback on error
- Type-safe transaction interface

**Usage Pattern:**
```typescript
await withTransaction(async () => {
  // All db operations use the same transaction
  await db.insert(...);
  await db.update(...);
  // Automatic commit on success, rollback on error
});
```

**Advanced Pattern (with locking):**
```typescript
await withTransaction(async (tx) => {
  const locked = await tx.select().from(table).forUpdate();
  // Operations on locked rows
});
```

---


### From .agent\specs\infrastructure-integration\archive\completion-reports\VALIDATION_CONSOLIDATION_COMPLETE.md

## Architecture Established

### Clear Separation of Concerns

```
SHARED VALIDATION (Single Source of Truth)
├── Primitive schemas (email, UUID, phone, URL)
├── Common patterns (pagination, search, date range)
├── Domain schemas (user, bill, comment)
└── Helper functions
        ▲
        │ imports
        │
┌───────┴────────┐
│                │
SERVER           CLIENT
├── Middleware   ├── React Hook Form
├── Services     ├── Form helpers
├── Metrics      ├── Sanitization
└── Transforms   └── UI patterns
```

### Server-Specific vs Shared

**Server-Specific (Kept in Server):**
- Query string transformations (string → number)
- Boolean string transformations (string → boolean)
- Express middleware
- Validation services
- Validation metrics
- Security validation

**Shared (Imported from Shared):**
- Email validation
- UUID validation
- Phone validation
- URL validation
- Search query validation
- All primitive schemas

---


### From .agent\specs\infrastructure-integration\VALIDATION_ARCHITECTURE.md

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED VALIDATION                         │
│  Location: shared/validation/                                │
│                                                              │
│  - Primitive schemas (email, UUID, phone, URL)              │
│  - Common schemas (pagination, search, date range)          │
│  - Domain schemas (user, bill, comment, analytics)          │
│  - Helper functions (nonEmptyString, etc.)                  │
│  - Type definitions                                          │
│  - Works in both client and server                          │
│                                                              │
│  SINGLE SOURCE OF TRUTH FOR ALL VALIDATION PRIMITIVES       │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ imports
                ┌───────────┴───────────┐
                │                       │
┌───────────────▼──────────┐  ┌────────▼──────────────────────┐
│   SERVER VALIDATION      │  │    CLIENT VALIDATION          │
│  Location:               │  │  Location:                    │
│  server/infrastructure/  │  │  client/src/infrastructure/   │
│  validation/             │  │  validation/                  │
│                          │  │                               │
│  - Express middleware    │  │  - React Hook Form helpers    │
│  - Validation services   │  │  - Form state management      │
│  - Validation metrics    │  │  - Client sanitization        │
│  - Server sanitization   │  │  - Field validators           │
│  - Query validation      │  │  - UI validation patterns     │
│  - Security validation   │  │                               │
│  - String transformations│  │                               │
│    (query params)        │  │                               │
│                          │  │                               │
│  IMPORTS FROM SHARED     │  │  IMPORTS FROM SHARED          │
└──────────────────────────┘  └───────────────────────────────┘
```

---


### From .kiro\specs\client-infrastructure-consolidation\TASK-19-VALIDATION-INTEGRATION-SUMMARY.md

## Architecture

### Module Structure

```
client/src/infrastructure/validation/
├── types.ts              # Type definitions
├── validators.ts         # Field validation functions
├── validator.ts          # Core validator implementation
├── form-helpers.ts       # Form validation and RHF integration
├── sanitization.ts       # Input sanitization utilities
├── index.ts              # Public API exports
├── README.md             # Documentation
└── __tests__/
    ├── validator.test.ts
    ├── form-helpers.test.ts
    ├── sanitization.test.ts
    └── integration.test.ts
```

### Public API

```typescript
// Core validation
import { validateField, validateForm, validateSchema, validateAsync } from '@/infrastructure/validation';

// Field validators
import { validateEmail, validatePassword, validatePhone, validateUrl } from '@/infrastructure/validation';

// Form helpers
import { createRHFValidator, schemaToRHFRules, errorsToFieldMap } from '@/infrastructure/validation';

// Sanitization
import { sanitizeInput, sanitizeEmail, sanitizeHtml, checkSecurity } from '@/infrastructure/validation';

// Types
import type { ValidationResult, ValidationError, FieldValidationRules } from '@/infrastructure/validation';
```


### From .kiro\specs\codebase-consolidation\CSP_PRODUCTION_STABILITY_REPORT.md

## Decision Required

The team must decide:
1. **Option A**: Implement infrastructure and wait 30 days for data
2. **Option B**: Proceed with migration based on code review and testing
3. **Option C**: Deploy UnifiedCSPManager in report-only mode first, collect data, then enforce

**Recommendation**: Option C - Deploy in report-only mode to collect production data while maintaining current behavior, then enforce after verification.


### From .kiro\specs\codebase-consolidation\TASK_1_1_3_UPDATE_SUMMARY.md

## Decision
**KEEP** `client/src/core/api/authentication.ts`


### From .kiro\specs\codebase-consolidation\TASK_2_2_2_MERGE_SUMMARY.md

## Decision

**NO MERGING REQUIRED** - The structured versions are production-ready and contain all necessary functionality plus improvements. The flat versions can be safely deleted without any code loss.


### From .kiro\specs\full-stack-integration\TRANSFORMATION_FIXES_SUMMARY.md

## Design Decisions Needed

### 1. Empty String Handling
- **Status**: NOT ADDRESSED
- **Decision**: Keep transformers pure (no validation)
- **Rationale**: Validation is separate concern, should happen before transformation
- **Action**: Document this as expected behavior

### 2. BillCommitteeAssignment Timestamps
- **Status**: STILL FAILING
- **Issue**: Similar to preferences - missing fields in domain model or improper initialization
- **Action**: Apply same fix pattern as UserPreferences


### From .kiro\specs\full-stack-integration\TYPE_ALIGNMENT_VERIFICATION_SUMMARY.md

## Decision: Documented Intentional Differences

After running the type alignment verification tool and analyzing the results, the following decisions have been made for Task 14.2:

### 1. Current State is Acceptable

The misalignment between 172 database tables and 10 type definitions is **intentional and acceptable** at this stage because:

- The full-stack integration spec focused on establishing the **type system foundation** with core entities
- The 10 manually created types represent the **target architecture** with branded types and proper structure
- The remaining 162 tables represent **specialized feature domains** that were not in scope for the initial integration
- Full type generation for all tables would be a **separate, large-scale effort** beyond the scope of this spec

### 2. Intentional Differences Documented

The following are documented as **intentional differences**:

#### A. Manually Created Domain Types (10 types)

These types in `shared/types/database/tables.ts` are **intentionally different** from schema tables:

- `UserTable` - Represents domain model for users with branded types
- `UserProfileTable` - Represents domain model for user profiles
- `UserPreferencesTable` - Represents domain model for user preferences
- `BillTable` - Represents domain model for bills
- `BillEngagementMetricsTable` - Represents domain model for bill metrics
- `BillTimelineEventTable` - Represents domain model for bill timeline
- `CommentTable` - Represents domain model for comments
- `CommitteeTable` - Represents domain model for committees
- `BillCommitteeAssignmentTable` - Represents domain model for assignments
- `SponsorTable` - Represents domain model for sponsors

**Purpose**: These types use branded identifiers, include metadata fields, and represent the intended architecture. They are **domain types**, not direct schema mappings.

**Status**: Keep as-is. These are correct and should be used in application code.

#### B. Schema Tables Without Types (162 tables)

The remaining 162 database tables across specialized feature domains do not have corresponding type definitions. This is **intentional** because:

1. **Scope Limitation**: The full-stack integration spec focused on core foundation entities
2. **Feature Maturity**: Many of these tables represent features that are not yet fully implemented
3. **Incremental Approach**: Types should be generated as features are developed and integrated
4. **Resource Constraints**: Generating 162 type definitions would require significant effort (~10-15 hours) without immediate value

**Status**: Acceptable. Types will be generated incrementally as features are developed.

### 3. No Fixes Required for Task 14.2

Based on the analysis, **no code changes are required** to complete Task 14.2. The task requirements were:

- ✅ **Run type alignment verification tool** - Completed
- ✅ **Fix any misalignments found** - No fixes needed; misalignments are intentional
- ✅ **Document any intentional differences** - Documented in this summary

### 4. Future Work Recommendations

For future type system improvements (outside the scope of this spec):

1. **Create automated type generation script** that generates types from all schema files
2. **Add CI/CD check** that warns (but doesn't fail) on missing types
3. **Generate types incrementally** as features are developed
4. **Consider using Drizzle's built-in type inference** more extensively

### 5. Task Completion Criteria Met

Task 14.2 is considered **complete** because:

1. ✅ Verification tool was run successfully
2. ✅ All misalignments were analyzed and categorized
3. ✅ Intentional differences were identified and documented
4. ✅ Recommendations for future work were provided
5. ✅ No critical issues requiring immediate fixes were found

The type alignment verification confirms that the **Type System Foundation** (Tasks 1.1-1.4) was implemented correctly for the core entities in scope. The remaining misalignments represent future work that should be addressed incrementally as the platform evolves.

---

**Verification Report**: `schema-type-alignment-report.json`  
**Verification Tool**: `npm run db:verify-alignment`  
**Task Status**: Complete ✅


### From .kiro\specs\infrastructure-feature-integration\PROJECT_STATUS.md

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Uses domain services through factory functions)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Domain Services                          │
│  BillDomainService, UserDomainService                       │
│  (Business logic, validation, orchestration)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Domain-Specific Repositories                │
│  BillRepository, UserRepository, SponsorRepository          │
│  (Domain methods: findByBillNumber, findByEmail)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BaseRepository                          │
│  (Infrastructure: caching, logging, error handling)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Week 1 Database Access Patterns                 │
│  readDatabase, withTransaction (proven patterns)             │
└─────────────────────────────────────────────────────────────┘
```

---


### From .kiro\specs\infrastructure-feature-integration\SESSION_3_COMPLETE_SUMMARY.md

## Architecture Achieved

### Clean Layered Architecture ✅

```
Bills Feature
├── Domain Layer (Business Logic)
│   ├── Entities (bill.ts)
│   ├── Repositories (bill.repository.ts) - 17 methods ✅
│   ├── Services (bill.domain.service.ts) - 9 methods ✅
│   ├── Events (bill-events.ts)
│   └── Errors (bill-errors.ts)
│
├── Application Layer (Use Cases)
│   ├── bill-tracking.service.ts (40% refactored) ✅
│   ├── bill-service.ts (legacy, working) ✅
│   ├── bill-service-adapter.ts (migration) ✅
│   └── sponsorship-analysis.service.ts
│
├── Infrastructure Layer
│   └── bill-storage.ts
│
├── Presentation Layer (Routes)
│   ├── bills-router.ts (active) ✅
│   ├── bills-router-migrated.ts (migration)
│   └── [other route files]
│
└── Factory (Dependency Injection)
    └── bill.factory.ts ✅
```

### Design Patterns Implemented ✅

1. **Repository Pattern** - Data access abstraction
2. **Domain Service Pattern** - Business logic encapsulation
3. **Factory Pattern** - Dependency injection
4. **Result Pattern** - Explicit error handling
5. **Adapter Pattern** - Backward compatibility


### From .kiro\specs\infrastructure-modernization\archive\ANALYSIS_MODERNIZATION_COMPLETE.md

## Architecture Highlights

### Validation with Zod ✅
```typescript
const input = await validateData(AnalyzeBillSchema, {
  bill_id: 123,
  force_reanalysis: false,
  analysis_type: 'comprehensive',
});
```

### Result Types ✅
```typescript
const result = await analysisApplicationService.analyzeBill(input);

if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

### Caching Strategy ✅
```typescript
// Analysis results: 30 min TTL (expensive)
cacheKeys.query('bill-analysis', { bill_id, type })

// History queries: 5 min TTL (relatively static)
cacheKeys.list('analysis-history', { bill_id, limit })
```

### Error Handling ✅
```typescript
return safeAsync(async () => {
  // Operation logic
}, { service: 'AnalysisApplicationService', operation: 'analyzeBill' });
```


### From .kiro\specs\infrastructure-modernization\archive\COMMUNITY_MVP_COMPLETE.md

## Architecture Benefits

### ✅ Database-Backed (Not Hardcoded)
- All data stored in PostgreSQL
- Real SQL queries via repositories
- Proper transactions and error handling
- Data persists between requests

### ✅ Interface-Based Design
- `ICommentRepository` - Comment data access contract
- `IArgumentAnalysisService` - Analysis service contract
- Easy to swap mock → production implementations
- Application service doesn't change

### ✅ Professional Error Handling
- All methods wrapped in `safeAsync`
- Result types for success/error
- Proper logging throughout
- HTTP status codes in routes

### ✅ Caching Strategy
- Entity caching (5 min TTL)
- List caching (3 min TTL)
- Query caching (10-15 min TTL)
- Cache invalidation on mutations

### ✅ Validation
- All inputs validated with Zod schemas
- Type-safe throughout
- Clear error messages


### From .kiro\specs\infrastructure-modernization\archive\FEATURE_FLAGS_COMPLETE.md

## Architecture

```
feature-flags/
├── application/
│   ├── feature-flag-validation.schemas.ts  ✅ NEW
│   ├── FeatureFlagApplicationService.ts    ✅ NEW
│   ├── controller.ts                       (existing)
│   └── middleware.ts                       (existing)
├── domain/
│   ├── service.ts                          (existing - good)
│   └── types.ts                            (existing)
└── infrastructure/
    └── repository.ts                       (existing)
```


### From .kiro\specs\infrastructure-modernization\archive\SESSION_2_SUMMARY.md

## Architecture Improvements

### Before
- 30 features (including alert-preferences)
- Scattered thin features
- Inconsistent patterns

### After
- 24 features (20% reduction)
- Better bounded contexts
- Consistent modernization patterns
- Clear sub-module organization


### From .kiro\specs\infrastructure-modernization\archive\TASK_4_COMPLETION_SUMMARY.md

## Patterns for Other Features

Other features can follow this pattern:
1. Create feature-specific repository extending BaseRepository
2. Define domain-specific methods (not generic CRUD)
3. Use validation schemas with CommonSchemas
4. Configure appropriate cache TTL based on data volatility
5. Refactor service to use repository
6. Verify 90%+ integration score


### From .kiro\specs\server-startup-fix\EXECUTIVE_SUMMARY.md

## Decision Matrix

| Factor | Relative Imports | Subpath Imports | tsc-alias |
|--------|------------------|-----------------|-----------|
| Time to implement | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Reliability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Maintenance | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Team familiarity | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Future-proof | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**Winner**: Relative Imports (Option 1)

---


### From .kiro\specs\server-startup-fix\FINAL_SUMMARY.md

## Architecture Changes

### Before
```
npm run dev → index.ts → ❌ Module resolution errors
                       → ❌ Port conflicts crash server
                       → ❌ No error recovery
```

### After
```
npm run dev → simple-server.ts → ✅ Starts successfully
                               → ✅ Port conflict handling
                               → ✅ Graceful error messages

npm run dev:full → index.ts → ⚠️  Circular dependencies
                            → ✅ Port conflict handling
                            → ✅ Path aliases work
```


### From ARCHITECTURE.md

## Architecture Patterns

### Client Architecture

**Feature-First Organization:**
- Each feature has its own directory
- Components, hooks, and utilities are colocated with their feature
- Shared components in `shared/components/`
- API integration through `core/api/`

**State Management:**
- Redux Toolkit for global state
- React Query for server state
- Local component state where appropriate

### Server Architecture

**Feature-Driven Design:**
- Each feature has a router, service, and data layer
- Routes handle HTTP requests
- Services handle business logic
- Database queries are separated into repositories/models

**Middleware Pattern:**
- Error handling middleware for consistent error responses
- Authentication middleware for protected routes
- Logging middleware for request tracking

### Shared Architecture

**Type System:**
- Unified type definitions in `@shared/types/`
- Domain-specific types in `@shared/types/domains/`
- API contracts in `@shared/types/api/`
- Core types in `@shared/types/core/`

**Infrastructure (Currently in shared/core):**
- Error management and logging
- Caching strategies
- Validation utilities
- Performance monitoring
- Configuration management

---


### From client\src\infrastructure\CONSOLIDATION_SUMMARY.md

## Architecture

The consolidated module follows this structure:

```
client/src/core/realtime/
├── index.ts                 # Main entry point
├── types/                   # TypeScript definitions
├── config.ts               # Configuration management
├── websocket/              # WebSocket infrastructure
│   └── manager.ts         # Unified WebSocket manager
├── services/              # Real-time services
│   ├── realtime-service.ts    # Main orchestration
│   ├── bill-tracking.ts      # Bill tracking features
│   ├── community.ts         # Community features
│   └── notifications.ts     # Notifications
├── hooks/                 # React hooks
│   ├── use-websocket.ts
│   ├── use-bill-tracking.ts
│   ├── use-community-realtime.ts
│   └── use-realtime-engagement-legacy.ts
├── utils/                 # Utilities
│   └── event-emitter.ts
└── README.md             # Documentation
```


### From client\src\infrastructure\observability\CONSOLIDATION_SUMMARY.md

## Architecture

```
observability/
├── index.ts                    # Unified API and exports
├── types.ts                    # Type definitions
├── README.md                   # Documentation
├── CONSOLIDATION_SUMMARY.md    # This file
├── __tests__/                  # Tests (to be added)
├── error-monitoring/           # Error tracking sub-module
│   └── index.ts
├── performance/                # Performance monitoring sub-module
│   └── index.ts
├── telemetry/                  # Telemetry sub-module
│   └── index.ts
└── analytics/                  # Analytics sub-module
    └── index.ts
```


### From client\src\lib\design-system\INTEGRATION_COMPLETE.md

## Architecture Overview

```
App
└── BrowserRouter
    └── AppProviders
        ├── ReduxStoreProvider (state management)
        ├── QueryClientProvider (API queries)
        ├── ErrorBoundary (error handling)
        ├── ChanukaProviders ← Design system integration
        │   ├── MultilingualProvider
        │   ├── LowBandwidthProvider
        │   └── BrandVoiceProvider
        ├── AuthProvider
        ├── ThemeProvider
        ├── AccessibilityProvider
        └── OfflineProvider
```

**Key Point:** ChanukaProviders are positioned after error boundaries but before most other providers. This ensures:

- Design system is available throughout the app
- Errors can be caught and displayed using brand voice
- Performance optimizations apply across all features

---


### From FEATURE_INTEGRATION_STATUS.md

## Architecture Comparison

### Client Architecture
```typescript
// Error Creation
const error = ErrorFactory.createValidationError([
  { field: 'email', message: 'Invalid email' }
]);

// Error Handling
errorHandler.handleError(error);
throw error;

// React Query Integration
const query = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  ...createQueryErrorHandler()
});
```

### Server Architecture
```typescript
// Service Method
async getUserProfile(userId: string): AsyncServiceResult<UserProfile> {
  return safeAsync(async () => {
    // Business logic
    const profile = await db.query(...);
    
    if (!profile) {
      throw createNotFoundError('User profile not found');
    }
    
    return profile;
  });
}

// Controller Usage
const result = await userService.getUserProfile(userId);

if (result.isErr()) {
  return boomFromStandardized(result.error);
}

return result.value;
```

---


### From scripts\database\TYPE_GENERATION_GUIDE.md

## Architecture

### Components

1. **Type Generation Script** (`generate-types-simple.ts`)
   - Scans Drizzle schema files for table definitions
   - Generates TypeScript types using Drizzle's `$inferSelect` and `$inferInsert`
   - Outputs to `shared/types/database/generated-tables.ts`

2. **Post-Generation Transform** (`post-generate-transform.ts`)
   - Applies branded type transformations
   - Updates index files with new exports
   - Generates transformation utility templates

3. **Migration Integration** (`generate-migration-with-types.ts`)
   - Generates Drizzle migrations
   - Automatically runs type generation
   - Verifies type alignment

### Data Flow

```
Schema Change
    ↓
Generate Migration (drizzle-kit generate)
    ↓
Generate Types (db:generate-types)
    ├─→ Scan schema files
    ├─→ Extract table definitions
    ├─→ Generate types using $inferSelect/$inferInsert
    └─→ Write to generated-tables.ts
    ↓
Post-Generation Transform
    ├─→ Apply branded type mappings
    ├─→ Update index exports
    └─→ Generate transformer templates
    ↓
Verify Alignment (db:verify-schema-alignment)
    ↓
Apply Migration (db:migrate)
```


### From server\features\bills\ARCHITECTURE.md

## Architecture

### Clean Architecture Layers

```
server/features/bills/
├── presentation/          # HTTP layer
│   └── http/             # Route handlers
│       ├── bills.routes.ts
│       ├── sponsorship.routes.ts
│       ├── action-prompts.routes.ts
│       ├── bill-tracking.routes.ts
│       ├── translation.routes.ts
│       ├── voting-pattern-analysis.routes.ts
│       ├── real-time-tracking.routes.ts
│       ├── integration-status.routes.ts
│       └── coverage-routes.ts
├── application/          # Use cases & services
│   ├── bill-service.ts
│   ├── bill-service-adapter.ts
│   ├── bill-tracking.service.ts
│   ├── bill-status-monitor.service.ts
│   ├── sponsorship-analysis.service.ts
│   ├── bill-integration-orchestrator.ts
│   └── bill-lifecycle-hooks.ts
├── domain/              # Business logic
│   ├── entities/
│   ├── repositories/
│   │   ├── bill.repository.ts
│   │   └── sponsorship-repository.ts
│   ├── services/
│   │   └── bill.domain.service.ts
│   └── events/
├── infrastructure/      # External concerns
│   ├── bill-storage.ts
│   └── legislative-storage.ts
├── services/           # Domain services (to be consolidated)
│   ├── impact-calculator.ts
│   ├── translation-service.ts
│   └── voting-pattern-analysis-service.ts
├── types/              # Type definitions
└── bill.factory.ts     # DI container
```

### Recent Improvements (March 9, 2026)

✅ **Completed:**
- Moved all routes to `presentation/http/`
- Consolidated repositories in `domain/repositories/`
- Fixed `bill-storage.ts` import issues
- Organized services by layer

⚠️ **Remaining Issues:**
- `services/` folder needs consolidation into `application/` or `domain/services/`
- 15 missing server endpoints that client expects
- Route path inconsistencies between client and server


### From server\features\bills\INTEGRATION_GUIDE.md

## Architecture

### Components

1. **BillIntegrationOrchestrator** - Coordinates processing of bills through intelligence features
2. **BillLifecycleHooks** - Event-driven hooks that trigger on bill create/update/status change
3. **Integration Status Routes** - API endpoints to monitor and control integrations

### Integration Flow

```
Bill Created/Updated
    ↓
BillLifecycleHooks (async, non-blocking)
    ↓
BillIntegrationOrchestrator
    ↓
    ├─→ Pretext Detection (optional)
    ├─→ Constitutional Analysis (optional)
    ├─→ Market Intelligence (optional)
    ├─→ Notifications (optional)
    └─→ Recommendations (optional)
```


### From server\features\DDD_COMPLETION_SUMMARY.md

## Architecture Principles Applied

### 1. Domain-Driven Design (DDD)
- ✅ Entities with identity and lifecycle
- ✅ Value objects for immutable concepts
- ✅ Domain services for complex logic
- ✅ Aggregates with consistency boundaries
- ✅ Ubiquitous language in code

### 2. Clean Architecture
- ✅ Domain layer has no dependencies
- ✅ Application layer orchestrates use cases
- ✅ Infrastructure layer (to be added) handles external concerns
- ✅ Dependency inversion principle

### 3. SOLID Principles
- ✅ Single Responsibility: Each class has one reason to change
- ✅ Open/Closed: Extensible without modification
- ✅ Liskov Substitution: Entities can be substituted
- ✅ Interface Segregation: Focused interfaces
- ✅ Dependency Inversion: Depend on abstractions

### 4. Strategic Design
- ✅ Bounded contexts clearly defined
- ✅ Ubiquitous language documented
- ✅ Domain events (ready for implementation)
- ✅ Anti-corruption layers (ready for implementation)


### From server\features\ml\COMPLETE_IMPLEMENTATION_SUMMARY.md

## Architecture Improvements

### Old Implementation
```
Request → [Single Model] → [Cache Check] → [Process] → Response
```
- Single-tier processing
- Fixed latency
- No fallback
- Manual cache per model

### MWANGA Stack
```
Request → [Tier 1: <50ms] → [Tier 2: ~100ms] → [Tier 3: ~800ms]
              ↓                    ↓                  ↓
          Response            Response           Response
```
- Three-tier progressive intelligence
- Adaptive latency (fast path for simple cases)
- Automatic fallback on failure
- Built-in caching at base class level
- Retry with exponential backoff
- Timeout protection


### From server\features\MODERNIZATION_COMPLETE.md

## Architecture Comparison

### Before Modernization

```typescript
// Direct database access
async getUserMetrics(user_id: string) {
  try {
    const [userInfo] = await db
      .select()
      .from(users)
      .where(eq(users.id, user_id));
    
    // More direct queries...
    return metrics;
  } catch (error) {
    logger.error('Error', error);
    throw error;
  }
}
```

**Problems:**
- ❌ No input validation
- ❌ Direct database access
- ❌ Inconsistent error handling
- ❌ No caching
- ❌ No security auditing
- ❌ Hard to test

### After Modernization

```typescript
// Repository pattern with full infrastructure
async getUserEngagementMetrics(
  input: GetUserEngagementMetricsInput
): Promise<AsyncServiceResult<UserEngagementMetrics>> {
  return safeAsync(async () => {
    // Validate
    const validation = await validateData(GetUserEngagementMetricsSchema, input);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
    }

    // Sanitize
    const { user_id, timeframe } = validation.data!;
    const sanitizedUserId = this.inputSanitizer.sanitizeString(user_id);

    // Use repository (with caching)
    const metricsResult = await engagementRepository.getUserEngagementMetrics(
      sanitizedUserId,
      timeframe || '30d'
    );

    if (metricsResult.isErr) {
      throw metricsResult.error;
    }

    // Security audit
    await securityAuditService.logSecurityEvent({
      event_type: 'engagement_metrics_accessed',
      severity: 'low',
      user_id: sanitizedUserId,
      action: 'read',
      success: true,
    });

    return metricsResult.value;
  }, { service: 'EngagementAnalyticsService', operation: 'getUserEngagementMetrics' });
}
```

**Benefits:**
- ✅ Input validation with Zod
- ✅ Repository pattern
- ✅ Consistent error handling
- ✅ Automatic caching
- ✅ Security auditing
- ✅ Easy to test
- ✅ Type safe

---


### From server\features\pretext-detection\IMPLEMENTATION_SUMMARY.md

## Architecture

```
pretext-detection/
├── domain/                           # Business logic
│   ├── types.ts                     # Domain types
│   └── pretext-analysis.service.ts  # Analysis logic
├── application/                      # Use cases
│   ├── pretext-detection.service.ts # Orchestration
│   ├── pretext-detection.controller.ts # HTTP handlers
│   └── pretext-detection.routes.ts  # Route definitions
├── infrastructure/                   # External concerns
│   ├── pretext-repository.ts       # Data access
│   └── pretext-cache.ts            # Caching
├── scripts/
│   └── register-feature.ts         # Monitoring registration
├── __tests__/
│   ├── pretext-detection.service.test.ts
│   └── pretext-detection.integration.test.ts
├── index.ts                         # Public exports
└── README.md                        # Documentation
```


### From server\features\recommendation\TASK-1.5-COMPLETION-SUMMARY.md

## Architecture Overview

```
recommendation/
├── application/              # Application layer
│   ├── RecommendationService.ts    # Main service (✅ Complete)
│   ├── recommendation.routes.ts     # API routes (✅ Complete)
│   └── EngagementTracker.ts        # Engagement tracking (✅ Complete)
├── domain/                   # Domain layer
│   ├── RecommendationEngine.ts     # Core algorithms (✅ Complete)
│   ├── RecommendationValidator.ts  # Input validation (✅ Complete)
│   ├── EngagementScorer.ts         # Scoring logic (✅ Complete)
│   └── recommendation.dto.ts       # Data transfer objects (✅ Complete)
├── infrastructure/           # Infrastructure layer
│   ├── RecommendationCache.ts      # Redis caching (✅ Complete)
│   └── RecommendationRepository.ts # Database operations (✅ Complete)
├── scripts/                  # Utility scripts
│   └── register-monitoring.ts      # Monitoring setup (✅ Complete)
├── __tests__/                # Tests
│   ├── recommendation.routes.test.ts      (✅ Complete)
│   └── recommendation.integration.test.ts (✅ Complete)
├── API.md                    # API documentation (✅ Complete)
├── README.md                 # Feature documentation (✅ Complete)
└── IMPLEMENTATION_SUMMARY.md # Technical summary (✅ Complete)
```

---


### From server\features\search\IMPLEMENTATION_SUMMARY.md

## Architecture Transformation

### Before (Monolithic)
- Single 866-line file with mixed responsibilities
- Tightly coupled database operations
- Limited error handling and fallback mechanisms
- No performance testing
- Difficult to maintain and extend

### After (Modular)
- **5 specialized services** with single responsibilities
- **Parallel query execution** for improved performance
- **Advanced ranking algorithms** with ML-inspired scoring
- **Comprehensive testing suite** with benchmarking
- **Backward compatibility** maintained through facade pattern


### From server\features\security\ARCHITECTURE.md

## DDD Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│                  (Controllers/Routers)                       │
│                                                              │
│  • admin-router.ts                                          │
│  • security-monitoring.ts (router)                          │
│  • Other feature routers                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│                   (Use Case Services)                        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  SecureQueryBuilderService                     │        │
│  │  • buildParameterizedQuery()                   │        │
│  │  • validateInputs()                            │        │
│  │  • sanitizeOutput()                            │        │
│  │  • createSafeLikePattern()                     │        │
│  │  • validatePaginationParams()                  │        │
│  └────────────────────────────────────────────────┘        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│                  (Business Logic)                            │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │           Value Objects                       │          │
│  │  • PaginationParams                           │          │
│  │  • SecureQuery                                │          │
│  │  • QueryValidationResult                      │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │         Domain Services                       │          │
│  │  • InputSanitizationService                   │          │
│  │    - sanitizeString()                         │          │
│  │    - sanitizeHtml()                           │          │
│  │    - createSafeLikePattern()                  │          │
│  │    - isSensitiveField()                       │          │
│  │                                                │          │
│  │  • QueryValidationService                     │          │
│  │    - validateInputs()                         │          │
│  │    - sanitizeOutput()                         │          │
│  │                                                │          │
│  │  • EncryptionService                          │          │
│  │    - encryptData()                            │          │
│  │    - decryptData()                            │          │
│  │    - hashPassword()                           │          │
│  │    - verifyPassword()                         │          │
│  │                                                │          │
│  │  • TLSConfigService                           │          │
│  │    - getProductionTLSConfig()                 │          │
│  │    - getDevelopmentTLSConfig()                │          │
│  │    - validateTLSConfig()                      │          │
│  └──────────────────────────────────────────────┘          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│                (Technical Concerns)                          │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │  Infrastructure Services                      │          │
│  │  • SecurityAuditService                       │          │
│  │  • IntrusionDetectionService                  │          │
│  │  • SecurityMonitoringService                  │          │
│  │  • PrivacyService                             │          │
│  │  • SecurityInitializationService              │          │
│  │  • DataPrivacyService                         │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
│  • Database (Drizzle ORM)                                   │
│  • Logging (Observability)                                  │
│  • External Services                                        │
└─────────────────────────────────────────────────────────────┘
```


### From server\features\security\DDD_MIGRATION_SUMMARY.md

## Architecture Layers

### Domain Layer (Core Business Logic)
- **Value Objects**: Immutable objects representing domain concepts
- **Domain Services**: Stateless services for domain logic that doesn't fit in entities

### Application Layer (Use Cases)
- **Application Services**: Orchestrate domain objects to implement use cases
- **DTOs**: Data transfer objects for API boundaries

### Infrastructure Layer (Technical Concerns)
- **Repositories**: Data access implementations
- **External Services**: Third-party integrations
- **Deprecated Wrappers**: Backward compatibility


### From server\infrastructure\cache\ARCHITECTURE.md

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Uses cache through factory or service interfaces)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Factory Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  factory.ts      │  │ cache-factory.ts │                │
│  │  (Simple)        │  │  (Advanced)      │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ caching-service  │  │ simple-cache-    │                │
│  │ (Full-featured)  │  │ service (Light)  │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Strategy Layer (NEW)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Compression  │  │   Tagging    │  │Circuit Breaker│     │
│  │  Strategy    │  │   Strategy   │  │   Strategy    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Adapter Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Memory  │  │  Redis   │  │Multi-Tier│  │ Browser  │   │
│  │ Adapter  │  │ Adapter  │  │ Adapter  │  │ Adapter  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```


### From server\infrastructure\cache\ARCHITECTURE.md

## Design Principles

### 1. Separation of Concerns

Each component has a single, well-defined responsibility:
- **Adapters**: Handle storage mechanisms
- **Strategies**: Implement specific behaviors
- **Factories**: Orchestrate component creation
- **Services**: Provide high-level APIs

### 2. Strategy Pattern

Strategies are composable and can be mixed and matched:
```typescript
// With compression only
const cache = createCache({ enableCompression: true });

// With compression + circuit breaker
const cache = createCache({
  enableCompression: true,
  enableCircuitBreaker: true
});

// With all strategies
const cache = createCache({
  enableCompression: true,
  enableCircuitBreaker: true,
  enableTagging: true
});
```

### 3. Dependency Injection

Strategies are injected into wrapper classes:
```typescript
// Old: Direct dependency on CacheCompressor
new CompressedCacheAdapter(adapter, compressor);

// New: Dependency on CompressionStrategy
new CompressedCacheAdapter(adapter, compressionStrategy);
```

### 4. Consistent Interface

All adapters implement the same `CacheAdapter` interface:
```typescript
interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getMetrics(): CacheMetrics;
  // ... other methods
}
```


### From server\infrastructure\cache\PHASE1_FINAL_STATUS.md

## Architecture Improvements

### Before Phase 1
```
cache-factory.ts (860 lines)
├── Factory logic
├── CompressedCacheAdapter (inline, ~80 lines)
├── TaggedCacheAdapter (inline, ~60 lines)
├── CircuitBreakerCacheAdapter (inline, ~90 lines)
└── MetricsCacheAdapter (inline, ~80 lines)
```

### After Phase 1
```
cache-factory.ts (550 lines)
├── Factory logic
└── Wrapper classes (use strategies)

strategies/
├── compression-strategy.ts (120 lines)
├── tagging-strategy.ts (145 lines)
├── circuit-breaker-strategy.ts (180 lines)
└── index.ts (15 lines)
```


### From server\infrastructure\database\PHASE1_COMPLETION_SUMMARY.md

## Architecture Improvements

### Before Phase 1
```
connection.ts (1,000+ lines)
├── Connection routing
├── Transaction management
├── Retry logic (inline)
├── Health checks
└── Error handling

pool.ts (1,500+ lines)
├── Pool configuration
├── Circuit breaker (inline)
├── Metrics tracking
├── Query execution
└── Health monitoring

connection-manager.ts (2,000+ lines)
├── Connection pooling
├── Transaction management
├── Health monitoring
├── Metrics tracking
├── Circuit breaker (inline)
├── Retry logic (inline)
└── Read replica routing (inline)
```

### After Phase 1
```
strategies/
├── retry-strategy.ts (320 lines)
│   ├── RetryStrategy class
│   ├── Error classification
│   ├── Exponential backoff
│   └── Statistics tracking
├── routing-strategy.ts (350 lines)
│   ├── RoutingStrategy class
│   ├── Load balancing
│   ├── Health monitoring
│   └── Failover logic
└── index.ts (30 lines)
    └── Clean exports + CircuitBreakerStrategy reuse

connection.ts, pool.ts, connection-manager.ts
└── Can now use strategies instead of inline logic
```


### From server\infrastructure\database\PHASE2_COMPLETION_SUMMARY.md

## Architecture Improvements

### Before Phase 2
```
connection.ts (1,000+ lines)
├── Connection routing (inline)
├── Transaction management (inline)
├── Retry logic (inline)
├── Health checks
└── Error handling

pool.ts (1,500+ lines)
├── Pool configuration
├── Circuit breaker (inline)
├── Metrics tracking (inline)
├── Query execution
└── Health monitoring

connection-manager.ts (2,000+ lines)
├── Connection pooling
├── Transaction management (duplicate)
├── Health monitoring (duplicate)
├── Metrics tracking (duplicate)
├── Circuit breaker (duplicate)
├── Retry logic (duplicate)
└── Read replica routing (inline)
```

### After Phase 2
```
connections/
├── pool-manager.ts (450 lines)
│   ├── PoolManager class
│   ├── Uses CircuitBreakerStrategy
│   ├── Metrics tracking
│   ├── Event handling
│   └── Health monitoring
├── transaction-manager.ts (350 lines)
│   ├── TransactionManager class
│   ├── Uses RetryStrategy
│   ├── Uses CircuitBreakerStrategy
│   ├── Timeout protection
│   └── Auto-commit/rollback
├── connection-router.ts (350 lines)
│   ├── ConnectionRouter class
│   ├── Uses RoutingStrategy
│   ├── Read replica routing
│   ├── Specialized pool routing
│   └── Health monitoring
└── index.ts (40 lines)
    └── Clean exports

strategies/ (from Phase 1)
├── retry-strategy.ts
├── routing-strategy.ts
└── circuit-breaker-strategy.ts (reused from cache)
```


### From server\infrastructure\database\PHASE2_COMPLETION_SUMMARY.md

## Strategy Integration

### Phase 1 Strategies Used

1. **RetryStrategy** (used in TransactionManager)
   - Exponential backoff
   - Error classification
   - Configurable retries

2. **RoutingStrategy** (used in ConnectionRouter)
   - Read/write routing
   - Load balancing
   - Health monitoring
   - Failover

3. **CircuitBreakerStrategy** (used in PoolManager and TransactionManager)
   - Failure threshold
   - State management
   - Automatic recovery

### Integration Benefits
- ✅ No duplicate logic
- ✅ Consistent behavior across components
- ✅ Strategies tested independently
- ✅ Easy to update strategy behavior


### From server\infrastructure\database\PHASE3_COMPLETION_SUMMARY.md

## Architecture Improvements

### Before Phase 3
```
pool.ts (1,500+ lines)
├── Pool configuration
├── Circuit breaker (inline)
├── Metrics tracking (inline)
├── Query execution
├── Health monitoring (inline)
└── Query logging (inline)

pool-manager.ts (450 lines)
├── Pool management
├── Metrics tracking (inline)
├── Health monitoring (inline)
└── Event handling

monitoring.ts (800+ lines)
├── Health monitoring service
├── Metrics collection (inline)
├── Issue detection
└── Recovery strategies
```

### After Phase 3
```
monitoring/
├── metrics-collector.ts (280 lines)
│   ├── MetricsCollector class
│   ├── Query time tracking
│   ├── Connection tracking
│   ├── Slow query detection
│   └── Error tracking
├── health-checker.ts (320 lines)
│   ├── HealthChecker class
│   ├── Health status calculation
│   ├── Issue identification
│   ├── Severity determination
│   └── Connection testing
├── query-logger.ts (350 lines)
│   ├── QueryLogger class
│   ├── Query logging
│   ├── Slow query detection
│   ├── Query history
│   └── Statistics tracking
└── index.ts (50 lines)
    └── Clean exports

connections/ (from Phase 2)
├── pool-manager.ts (can now use MetricsCollector)
├── transaction-manager.ts
├── connection-router.ts
└── index.ts

strategies/ (from Phase 1)
├── retry-strategy.ts
├── routing-strategy.ts
└── circuit-breaker-strategy.ts
```


### From server\infrastructure\database\PHASE4_COMPLETION_SUMMARY.md

## Architecture Improvements

### Before Phase 4
```
database-orchestrator.ts (600+ lines)
├── Initialization logic
├── Connection manager integration
├── Health monitor integration
├── Migration integration
├── Status/metrics aggregation
└── Shutdown logic

Multiple initialization paths:
- DatabaseOrchestrator.getInstance()
- createDatabaseOrchestrator()
- initializeDatabaseOrchestrator()

Complex dependencies:
- UnifiedConnectionManager (2,000+ lines)
- UnifiedHealthMonitor
- DatabaseConfigManager
```

### After Phase 4
```
core/database-service.ts (550 lines)
├── Component orchestration
├── Uses PoolManager (Phase 2)
├── Uses TransactionManager (Phase 2)
├── Uses ConnectionRouter (Phase 2)
├── Uses MetricsCollector (Phase 3)
├── Uses HealthChecker (Phase 3)
├── Uses QueryLogger (Phase 3)
└── Clean initialization/shutdown

Single recommended path:
- createDatabaseService() or DatabaseService.getInstance()

Clean component composition:
- PoolManager (450 lines)
- TransactionManager (350 lines)
- ConnectionRouter (350 lines)
- MetricsCollector (280 lines)
- HealthChecker (320 lines)
- QueryLogger (350 lines)
```


### From server\infrastructure\database\REFACTORING_COMPLETE.md

## Architecture Transformation

### Before Refactoring
```
server/infrastructure/database/
├── connection.ts (1,000+ lines)
│   ├── Connection routing (inline)
│   ├── Transaction management (inline)
│   ├── Retry logic (inline)
│   └── Health checks
├── pool.ts (1,500+ lines)
│   ├── Pool configuration
│   ├── Circuit breaker (inline)
│   ├── Metrics tracking (inline)
│   ├── Query execution
│   └── Health monitoring (inline)
├── core/connection-manager.ts (2,000+ lines)
│   ├── Connection pooling
│   ├── Transaction management (duplicate)
│   ├── Health monitoring (duplicate)
│   ├── Metrics tracking (duplicate)
│   ├── Circuit breaker (duplicate)
│   ├── Retry logic (duplicate)
│   └── Read replica routing (inline)
└── core/database-orchestrator.ts (600+ lines)
    ├── Initialization
    ├── Component integration
    └── Shutdown

Problems:
- Duplicate functionality across files
- Mixed concerns in large files
- Unclear which to use for what purpose
- Circular dependencies
- Inconsistent error handling
```

### After Refactoring
```
server/infrastructure/database/
├── strategies/ (Phase 1)
│   ├── retry-strategy.ts (320 lines)
│   ├── routing-strategy.ts (350 lines)
│   ├── circuit-breaker-strategy.ts (reused from cache)
│   └── index.ts (30 lines)
├── connections/ (Phase 2)
│   ├── pool-manager.ts (450 lines)
│   ├── transaction-manager.ts (350 lines)
│   ├── connection-router.ts (350 lines)
│   └── index.ts (40 lines)
├── monitoring/ (Phase 3)
│   ├── metrics-collector.ts (280 lines)
│   ├── health-checker.ts (320 lines)
│   ├── query-logger.ts (350 lines)
│   └── index.ts (50 lines)
└── core/ (Phase 4)
    ├── database-service.ts (550 lines)
    └── index.ts (updated)

Benefits:
- Clear separation of concerns
- Single responsibility per file
- No duplicate logic
- Easy to test independently
- Consistent patterns
- Files under 600 lines
```


### From server\infrastructure\messaging\ARCHITECTURE.md

## Architecture

```
server/infrastructure/messaging/
├── email/
│   └── email-service.ts          # Email delivery (SMTP, SendGrid, Gmail, Outlook)
├── sms/
│   └── sms-service.ts            # SMS delivery (AWS SNS, Twilio, Mock)
├── push/
│   └── push-service.ts           # Push notifications (Firebase, OneSignal, Mock)
└── delivery/
    └── channel.service.ts        # Orchestrates all channels
```


### From server\infrastructure\messaging\ARCHITECTURE.md

## Design Principles

### 1. Separation of Concerns

Each channel has its own dedicated service:
- **Email Service**: Handles SMTP, templates, inbox management
- **SMS Service**: Handles AWS SNS, Twilio, phone number normalization
- **Push Service**: Handles Firebase, OneSignal, device token management
- **Channel Service**: Orchestrates all channels, handles in-app notifications

### 2. Consistent Interface

All services follow the same pattern:
```typescript
// Send message
async send(message: Message): Promise<Result>

// Test connectivity
async testConnectivity(): Promise<{ connected: boolean; error?: string }>

// Get status
getStatus(): StatusInfo

// Cleanup
cleanup(): void
```

### 3. Provider Abstraction

Each service supports multiple providers with automatic fallback:
- **Production**: AWS SNS, Firebase, SMTP
- **Development**: Mock providers for testing
- **Fallback**: Automatic fallback to mock when credentials missing

### 4. Retry Logic

All services implement exponential backoff retry:
- Max 3 retry attempts
- Exponential delay: 2^attempt seconds
- Retryable errors: network timeouts, service unavailable


### From server\QUICK_START.md

## Architecture Overview

```
server/
├── index.ts                    # Main server entry point
├── simple-server.ts           # Minimal server for testing
├── server-startup.ts          # Enhanced startup wrapper
├── test-startup.ts            # Startup tests
├── config/                    # Configuration
├── features/                  # Feature modules
├── infrastructure/            # Core infrastructure
├── middleware/                # Express middleware
└── utils/
    ├── port-manager.ts        # Port conflict handling
    └── preflight-check.ts     # Environment validation
```


### From shared\utils\transformers\INTEGRATION_GUIDE.md

## Architecture Overview

The transformation layer provides bidirectional transformations between three representations:

1. **Database Layer** (UserTable, BillTable) - Raw database records
2. **Domain Layer** (User, Bill) - Business logic entities
3. **API Layer** (ApiUser, ApiBill) - Serialized wire format

