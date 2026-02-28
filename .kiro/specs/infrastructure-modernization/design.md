# Design Document: Infrastructure Modernization

## Overview

This design document defines the technical architecture and implementation strategy for modernizing infrastructure integration across all 30 features in the legislative transparency platform. The system currently has modern infrastructure components (database connection management, caching, validation, security) but adoption is inconsistent, resulting in an 18% integration score. This modernization initiative will standardize infrastructure usage, eliminate legacy patterns, clarify feature boundaries, and establish cross-feature integration patterns to achieve 90%+ integration score.

### Current State

The codebase exhibits partial modernization with significant inconsistency:

- **Infrastructure exists**: Modern database access (`readDatabase`, `writeDatabase`, `withTransaction`), caching (`cacheService`), validation (`validateData`), security primitives, and error handling (`safeAsync`, `AsyncServiceResult`) are already implemented
- **Adoption is inconsistent**: Only ~20% of features use modern patterns; ~40% still use legacy `db` pool imports
- **Patterns are scattered**: Some features have repositories, others use direct queries, creating maintenance burden
- **Redundancy exists**: Multiple implementations of caching, validation, metrics, audit logging across features
- **Boundaries are unclear**: Security, privacy, and safeguards logic split between infrastructure and features

### Target State

The modernized system will achieve:

- **100% infrastructure adoption**: All features use modern database access, caching, validation, security, and error handling
- **Consistent patterns**: Repository pattern for complex queries, direct database access for simple CRUD, standardized validation schemas
- **Clear boundaries**: Infrastructure provides primitives, features provide business logic; no feature-specific facades in infrastructure
- **Zero redundancy**: Single approved pattern for each technical concern (caching, validation, metrics, audit, notifications, ML)
- **Enforced standards**: ESLint rules prevent legacy patterns; CI/CD fails on violations
- **Cross-feature integration**: Unified metrics, audit, notifications, and ML infrastructure

### Design Principles

1. **Infrastructure vs Features Separation**: Infrastructure contains generic, reusable components with no business logic; features contain business logic that consumes infrastructure
2. **Dependency Direction**: Features → Infrastructure (allowed); Infrastructure → Features (prohibited)
3. **Single Responsibility**: One feature per domain concern; one infrastructure component per technical concern
4. **Pattern Consistency**: Same pattern for same problem across all features
5. **Pragmatic Modernization**: Build what we need when we need it; validate patterns with real features before scaling

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Features Layer                           │
│  (Business Logic, Domain Models, Feature-Specific Services)     │
├─────────────────────────────────────────────────────────────────┤
│  Bills  │ Users │ Search │ Notifications │ ... (30 features)    │
│  - Repositories (complex queries)                                │
│  - Services (business logic)                                     │
│  - Validation Schemas (input validation)                         │
│  - Domain Models (entities, value objects)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │ Consumes
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                          │
│     (Generic, Reusable Components, Technical Concerns)          │
├─────────────────────────────────────────────────────────────────┤
│  Database  │ Cache │ Validation │ Security │ Error Handling     │
│  - readDatabase / writeDatabase                                  │
│  - withTransaction (retry logic)                                 │
│  - BaseRepository (CRUD operations)                              │
│  - cacheService + cacheKeys                                      │
│  - validateData (Zod execution)                                  │
│  - InputSanitizationService                                      │
│  - safeAsync / AsyncServiceResult                                │
├─────────────────────────────────────────────────────────────────┤
│  Cross-Feature Infrastructure (New)                              │
│  - Metrics (unified metrics collection)                          │
│  - Audit (unified audit trail)                                   │
│  - Messaging (notification hub)                                  │
│  - ML (shared ML infrastructure)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Database Access Architecture

The system uses a three-tier database access strategy:

**Tier 1: Modern Database Access (All Features)**
- `readDatabase`: Read-only connection for queries
- `writeDatabase`: Write connection for mutations
- `withTransaction`: Transaction wrapper with retry logic and exponential backoff
- **Usage**: All features must use these primitives; direct pool access is prohibited

**Tier 2: Repository Pattern (Complex Queries)**
- `BaseRepository`: Shared repository infrastructure with common CRUD operations
- Feature-specific repositories extend `BaseRepository` for domain-specific queries
- **Usage**: Features with complex queries (joins, aggregations, domain logic)
- **Examples**: BillRepository, UserRepository, SearchRepository

**Tier 3: Direct Database Access (Simple CRUD)**
- Direct use of `readDatabase`/`writeDatabase` without repository layer
- **Usage**: Features with simple CRUD operations only
- **Examples**: Feature flags, alert preferences, simple lookup tables

### Caching Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Feature Services                            │
│  (Use cacheService + cacheKeys for all expensive operations)    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cache Infrastructure                          │
├─────────────────────────────────────────────────────────────────┤
│  cacheService                                                    │
│  - get<T>(key): Promise<T | null>                               │
│  - set<T>(key, value, ttl): Promise<void>                       │
│  - delete(key): Promise<void>                                    │
│  - deletePattern(pattern): Promise<void>                         │
├─────────────────────────────────────────────────────────────────┤
│  cacheKeys (CacheKeyGenerator)                                   │
│  - entity(type, id): string                                      │
│  - list(type, filters): string                                   │
│  - query(queryId, params): string                                │
│  - user(userId, dataType): string                                │
│  - search(query, filters): string                                │
│  - analytics(metric, params): string                             │
├─────────────────────────────────────────────────────────────────┤
│  CacheInvalidationService                                        │
│  - invalidateEntity(type, id): Promise<void>                     │
│  - invalidateList(type): Promise<void>                           │
│  - onEntityUpdate(type, id): Promise<void>                       │
└─────────────────────────────────────────────────────────────────┘
```

**Caching Strategy**:
- All expensive operations (queries >100ms) must use caching
- TTL values based on data volatility:
  - High volatility (community, search): 3-5 minutes
  - Medium volatility (bills, analytics): 5-15 minutes
  - Low volatility (users, sponsors, government data): 30-60 minutes
- Cache invalidation on write operations (create, update, delete)
- Pattern-based invalidation for related caches

### Validation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Feature Services                            │
│  (Define Zod schemas, use validateData for execution)           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Feature Validation Schemas                          │
│  (Zod schemas in features/*/application/*-validation.schemas.ts)│
├─────────────────────────────────────────────────────────────────┤
│  CreateBillSchema, UpdateBillSchema, SearchBillsSchema, etc.    │
│  - Uses CommonSchemas from infrastructure/validation            │
│  - Feature-specific validation rules                             │
│  - Type inference for TypeScript                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│            Infrastructure Validation Helpers                     │
├─────────────────────────────────────────────────────────────────┤
│  validateData<T>(schema, data): Promise<ValidationResult<T>>    │
│  - Executes Zod schema validation                                │
│  - Returns success/failure with field-level errors               │
│  - Type-safe result                                              │
├─────────────────────────────────────────────────────────────────┤
│  CommonSchemas                                                   │
│  - id (UUID), email, phone, url, searchQuery                    │
│  - title, description, content                                   │
│  - page, limit, sortOrder                                        │
│  - Reusable primitive schemas                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Error Handling Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Feature Services                            │
│  (Wrap all operations in safeAsync)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Error Handling Infrastructure                       │
├─────────────────────────────────────────────────────────────────┤
│  safeAsync<T>(fn, context): Promise<AsyncServiceResult<T>>      │
│  - Wraps async operations                                        │
│  - Catches errors and returns Result type                        │
│  - Logs errors with context                                      │
├─────────────────────────────────────────────────────────────────┤
│  AsyncServiceResult<T>                                           │
│  - success: boolean                                              │
│  - data?: T                                                      │
│  - error?: Error                                                 │
│  - Type-safe error handling                                      │
├─────────────────────────────────────────────────────────────────┤
│  Error Type Hierarchy (New)                                      │
│  - ValidationError (input validation failures)                   │
│  - DatabaseError (database operation failures)                   │
│  - NotFoundError (entity not found)                              │
│  - AuthorizationError (permission denied)                        │
│  - CacheError (cache operation failures)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Features/Security                             │
│  (Business Logic: Policies, Rules, Monitoring)                  │
├─────────────────────────────────────────────────────────────────┤
│  - SecurityAuditService (audit logging)                          │
│  - IntrusionDetectionService (threat detection)                  │
│  - SecurityMonitoringService (monitoring)                        │
│  - Policy enforcement                                            │
│  - Access control rules                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ Uses
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Infrastructure/Security                             │
│  (Primitives: How to Secure)                                    │
├─────────────────────────────────────────────────────────────────┤
│  - InputSanitizationService (sanitize inputs)                    │
│  - QueryValidationService (prevent SQL injection)                │
│  - Encryption utilities (encrypt/decrypt)                        │
│  - Password hashing (hash/verify)                                │
│  - Token generation/validation                                   │
│  - SQL injection prevention                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Key Principle**: Infrastructure provides "how to secure" (primitives), features provide "what to secure" (policies).

---

## Components and Interfaces

### BaseRepository

The `BaseRepository` class provides common CRUD operations and query patterns for all feature repositories.

**Location**: `server/infrastructure/database/repository/base-repository.ts`

**Interface**:
```typescript
export abstract class BaseRepository<T, TInsert = T> {
  constructor(
    protected table: any,
    protected tableName: string
  );

  // Core CRUD operations
  async findById(id: string): Promise<AsyncServiceResult<T | null>>;
  async findMany(filters?: Record<string, any>): Promise<AsyncServiceResult<T[]>>;
  async create(data: TInsert): Promise<AsyncServiceResult<T>>;
  async update(id: string, data: Partial<TInsert>): Promise<AsyncServiceResult<T | null>>;
  async delete(id: string): Promise<AsyncServiceResult<boolean>>;

  // Pagination support
  async findPaginated(
    filters: Record<string, any>,
    pagination: PaginationOptions
  ): Promise<AsyncServiceResult<PaginatedResult<T>>>;

  // Batch operations
  async findByIds(ids: string[]): Promise<AsyncServiceResult<T[]>>;
  async createMany(data: TInsert[]): Promise<AsyncServiceResult<T[]>>;

  // Cache integration
  protected getCacheKey(operation: string, params?: any): string;
  protected invalidateCache(id?: string): Promise<void>;

  // Transaction support
  protected async withTransaction<R>(
    callback: () => Promise<R>
  ): Promise<R>;
}
```

**Features**:
- Generic CRUD operations for all entity types
- Integrated caching with automatic invalidation
- Transaction support through `withTransaction`
- Pagination support with filters
- Batch operations for performance
- Type-safe with TypeScript generics
- Returns `AsyncServiceResult` for consistent error handling

**Usage Example**:
```typescript
// Feature-specific repository
export class BillRepository extends BaseRepository<Bill, InsertBill> {
  constructor() {
    super(bills, 'bill');
  }

  // Domain-specific methods
  async findByStatus(status: string): Promise<AsyncServiceResult<Bill[]>> {
    return this.findMany({ status });
  }

  async searchBills(query: string): Promise<AsyncServiceResult<Bill[]>> {
    // Complex search logic
    return safeAsync(async () => {
      const cacheKey = this.getCacheKey('search', { query });
      const cached = await cacheService.get<Bill[]>(cacheKey);
      if (cached) return cached;

      const results = await readDatabase
        .select()
        .from(bills)
        .where(/* complex search conditions */);

      await cacheService.set(cacheKey, results, CACHE_TTL.SEARCH);
      return results;
    });
  }
}
```

### Validation Schema Pattern

All features must define Zod validation schemas for input validation.

**Location**: `server/features/*/application/*-validation.schemas.ts`

**Pattern**:
```typescript
import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// Define feature-specific schemas
export const CreateEntitySchema = z.object({
  title: CommonSchemas.title,
  description: CommonSchemas.description,
  // Feature-specific fields
  customField: z.string().min(1).max(100),
});

export const UpdateEntitySchema = CreateEntitySchema.partial();

export const SearchEntitySchema = z.object({
  query: CommonSchemas.searchQuery,
  filters: z.object({
    status: z.enum(['active', 'inactive']).optional(),
  }).optional(),
});

// Export types
export type CreateEntityInput = z.infer<typeof CreateEntitySchema>;
export type UpdateEntityInput = z.infer<typeof UpdateEntitySchema>;
export type SearchEntityInput = z.infer<typeof SearchEntitySchema>;
```

**Usage in Services**:
```typescript
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { CreateEntitySchema } from './entity-validation.schemas';

async createEntity(data: unknown): Promise<AsyncServiceResult<Entity>> {
  return safeAsync(async () => {
    // Validate input
    const validation = await validateData(CreateEntitySchema, data);
    if (!validation.success) {
      throw new ValidationError(validation.errors);
    }

    // Use validated data
    const validatedData = validation.data!;
    // ... create entity
  });
}
```

### Cache Service Interface

The cache service provides a consistent interface for all caching operations.

**Location**: `server/infrastructure/cache/cache-service.ts`

**Interface**:
```typescript
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
  clear(): Promise<void>;
}
```

**Usage with CacheKeyGenerator**:
```typescript
import { cacheService } from '@server/infrastructure/cache';
import { cacheKeys, CACHE_TTL } from '@server/infrastructure/cache/cache-keys';

// Get from cache
const cacheKey = cacheKeys.entity('bill', billId);
const cached = await cacheService.get<Bill>(cacheKey);

// Set cache
await cacheService.set(cacheKey, bill, CACHE_TTL.BILLS);

// Invalidate cache
await cacheService.delete(cacheKey);

// Invalidate pattern
await cacheService.deletePattern(`bill:${billId}:*`);
```

### Cross-Feature Infrastructure Interfaces

#### Metrics Service

**Location**: `server/infrastructure/metrics/metrics-service.ts` (new)

**Interface**:
```typescript
export interface MetricsService {
  // Counter: Increment-only metric
  incrementCounter(name: string, labels?: Record<string, string>): void;

  // Gauge: Value that can go up or down
  setGauge(name: string, value: number, labels?: Record<string, string>): void;

  // Histogram: Distribution of values
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;

  // Timer: Measure duration
  startTimer(name: string, labels?: Record<string, string>): () => void;

  // Query metrics
  getMetrics(filters?: MetricFilters): Promise<Metric[]>;
}
```

#### Audit Service

**Location**: `server/infrastructure/audit/audit-service.ts` (new)

**Interface**:
```typescript
export interface AuditService {
  // Log audit event
  logEvent(event: AuditEvent): Promise<void>;

  // Query audit trail
  queryEvents(filters: AuditFilters): Promise<AuditEvent[]>;

  // Export audit trail
  exportEvents(filters: AuditFilters, format: 'json' | 'csv'): Promise<string>;
}

export interface AuditEvent {
  timestamp: Date;
  user_id?: string;
  action: 'create' | 'update' | 'delete' | 'access' | 'export';
  entity_type: string;
  entity_id: string;
  context: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}
```

#### Notification Service

**Location**: `server/infrastructure/messaging/notification-service.ts` (enhanced)

**Interface**:
```typescript
export interface NotificationService {
  // Send notification
  send(notification: Notification): Promise<void>;

  // Send batch notifications
  sendBatch(notifications: Notification[]): Promise<void>;

  // Subscribe to notification events
  subscribe(userId: string, preferences: NotificationPreferences): Promise<void>;

  // Unsubscribe from notifications
  unsubscribe(userId: string, channel: NotificationChannel): Promise<void>;
}

export interface Notification {
  user_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
}

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';
export type NotificationType = 'bill_update' | 'comment_reply' | 'system_alert' | 'custom';
```

#### ML Service

**Location**: `server/infrastructure/ml/ml-service.ts` (new)

**Interface**:
```typescript
export interface MLService {
  // Get prediction
  predict(modelId: string, input: any): Promise<Prediction>;

  // Batch predictions
  predictBatch(modelId: string, inputs: any[]): Promise<Prediction[]>;

  // Feature engineering
  extractFeatures(data: any, featureSet: string): Promise<Features>;

  // Model management
  loadModel(modelId: string): Promise<void>;
  unloadModel(modelId: string): Promise<void>;
}

export interface Prediction {
  model_id: string;
  input: any;
  output: any;
  confidence: number;
  timestamp: Date;
}
```

---

## Data Models

### Error Type Hierarchy

```typescript
// Base error class
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(
    public errors: Array<{ field: string; message: string }>,
    context?: Record<string, any>
  ) {
    super('Validation failed', 'VALIDATION_ERROR', 400, context);
  }
}

// Database errors
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, context);
  }
}

// Not found errors
export class NotFoundError extends AppError {
  constructor(entity: string, id: string, context?: Record<string, any>) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', 404, context);
  }
}

// Authorization errors
export class AuthorizationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
  }
}

// Cache errors
export class CacheError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CACHE_ERROR', 500, context);
  }
}
```

### Repository Pattern Decision Matrix

| Scenario | Pattern | Rationale |
|----------|---------|-----------|
| Simple CRUD (single table, no joins) | Direct `readDatabase`/`writeDatabase` | Minimal overhead, no abstraction needed |
| Complex queries (joins, aggregations) | Repository Pattern | Encapsulates complexity, testable, cacheable |
| Domain logic in queries | Repository Pattern | Domain logic belongs in repository methods |
| Multiple related entities | Repository Pattern | Manages relationships, ensures consistency |
| High-frequency queries | Repository Pattern + Caching | Cache at repository level for performance |
| Write-heavy operations | Direct `writeDatabase` + `withTransaction` | Transaction support, retry logic |
| Read-heavy operations | Repository Pattern + Caching | Maximize cache hits |

### Feature Maturity Levels

| Level | Description | Integration Score | Characteristics |
|-------|-------------|-------------------|-----------------|
| Level 0: Legacy | No infrastructure integration | 0-25% | Direct pool access, manual validation, no caching, try-catch error handling |
| Level 1: Basic | Minimal infrastructure | 26-50% | Uses `readDatabase`/`writeDatabase`, basic logging, some validation |
| Level 2: Intermediate | Partial infrastructure | 51-75% | Adds caching, validation schemas, `AsyncServiceResult`, some repository pattern |
| Level 3: Advanced | Full infrastructure | 76-100% | Repository pattern, comprehensive caching, validation schemas, error handling, security integration, observability |

### Integration Score Calculation

```typescript
interface IntegrationScore {
  overall: number;  // 0-100%
  components: {
    database: number;      // Modern database access adoption
    cache: number;         // Cache service usage
    validation: number;    // Validation schema coverage
    security: number;      // Security integration
    errorHandling: number; // AsyncServiceResult adoption
    observability: number; // Structured logging coverage
  };
}

function calculateIntegrationScore(feature: Feature): IntegrationScore {
  const components = {
    database: calculateDatabaseScore(feature),      // 100% if no legacy pool, uses transactions
    cache: calculateCacheScore(feature),            // 100% if all expensive ops cached
    validation: calculateValidationScore(feature),  // 100% if all inputs validated
    security: calculateSecurityScore(feature),      // 100% if security primitives used
    errorHandling: calculateErrorScore(feature),    // 100% if all ops use AsyncServiceResult
    observability: calculateObservabilityScore(feature), // 100% if structured logging
  };

  const overall = Object.values(components).reduce((sum, score) => sum + score, 0) / 6;

  return { overall, components };
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies and consolidations:

**Redundancy Analysis**:
1. **Database access properties (1.2, 1.3, 1.5)** can be consolidated into a single property about connection routing
2. **Repository CRUD properties (2.10, 8.7)** overlap - both test data integrity invariants
3. **Validation properties (3.2, 3.4)** can be combined - validation behavior and error format are related
4. **Cache invalidation properties (4.3, 4.6)** test different aspects and should remain separate
5. **Error handling properties (5.3, 5.5, 5.6)** test different aspects and should remain separate
6. **Feature modernization properties (9.2, 9.5, 9.6)** can be consolidated into integration score property
7. **Cross-feature infrastructure properties (13.3, 14.3, 15.3, 16.4, 18.5)** follow same pattern but test different systems

**Consolidation Decisions**:
- Combine 1.2, 1.3, 1.5 → Single property for database connection routing
- Combine 2.10, 8.7 → Single property for repository data integrity
- Combine 3.2, 3.4 → Single property for validation behavior
- Keep cache, error, and cross-feature properties separate (test different concerns)

### Property 1: Database Connection Routing

*For any* database operation, read operations SHALL use `readDatabase` connection and write operations SHALL use `writeDatabase` connection, ensuring proper read/write separation.

**Validates: Requirements 1.2, 1.3, 1.5**

### Property 2: Transaction Retry Logic

*For any* database operation wrapped in `withTransaction`, transient failures SHALL trigger automatic retry with exponential backoff, reducing failure impact.

**Validates: Requirements 1.4, 20.3**

### Property 3: Migration Equivalence

*For any* database operation, executing the operation using Modern_Database_Access SHALL produce equivalent results to executing the same operation using Legacy_Pool_Access.

**Validates: Requirements 1.6, 21.6**

### Property 4: Repository Data Integrity

*For any* repository operation (create, update, delete), the operation SHALL maintain data integrity invariants such that created records have valid IDs, updated records preserve required fields, and the system remains in a consistent state.

**Validates: Requirements 2.10, 8.7**

### Property 5: Validation Behavior

*For any* feature input, the system SHALL validate using Validation_Schema before processing, and when validation fails, SHALL return descriptive error messages with field-level details.

**Validates: Requirements 3.2, 3.4**

### Property 6: Validation Round-Trip

*For any* valid input, validating then processing then serializing then parsing SHALL produce equivalent data, ensuring validation preserves data integrity.

**Validates: Requirements 3.6**

### Property 7: Cache Invalidation

*For any* data modification operation (create, update, delete), the system SHALL invalidate all related cache entries, ensuring cache consistency.

**Validates: Requirements 4.3**

### Property 8: Cache Idempotence

*For any* cache key, performing multiple get operations with the same key SHALL return the same cached value until expiration, demonstrating cache idempotence.

**Validates: Requirements 4.6**

### Property 9: Error Wrapping

*For any* error that occurs in a service operation, the system SHALL wrap the error in an appropriate error type (ValidationError, DatabaseError, NotFoundError, AuthorizationError) with context.

**Validates: Requirements 5.3**

### Property 10: Error Logging

*For any* error that occurs, the system SHALL log the error with structured logging including error type, context, and stack trace.

**Validates: Requirements 5.5**

### Property 11: Transaction Rollback

*For any* error that occurs within a transaction, the system SHALL rollback the transaction and return error state, maintaining database consistency.

**Validates: Requirements 5.6**

### Property 12: Feature Integration Score

*For any* modernized feature, the feature SHALL achieve minimum 90% Integration_Score, have Validation_Schema for all inputs, and use caching for all expensive operations.

**Validates: Requirements 9.2, 9.5, 9.6**

### Property 13: Metrics Infrastructure Usage

*For any* feature that emits metrics, the feature SHALL use infrastructure/metrics interface rather than custom implementations.

**Validates: Requirements 13.3**

### Property 14: Audit Event Structure

*For any* auditable action, the system SHALL emit audit event through infrastructure/audit with required fields: timestamp, user, action, entity, and context.

**Validates: Requirements 14.3, 14.4**

### Property 15: Notification Infrastructure Usage

*For any* feature that sends notifications, the feature SHALL publish events to infrastructure/messaging rather than implementing custom notification logic.

**Validates: Requirements 15.3**

### Property 16: Notification Delivery Retry

*For any* notification that fails delivery, the system SHALL retry delivery with exponential backoff and track failure status.

**Validates: Requirements 15.4**

### Property 17: ML Infrastructure Usage

*For any* feature that needs ML predictions, the feature SHALL use infrastructure/ml interface rather than implementing custom ML logic.

**Validates: Requirements 16.4**

### Property 18: Security Primitives Usage

*For any* feature that needs security primitives (sanitization, encryption, hashing), the feature SHALL use infrastructure/security rather than implementing custom security logic.

**Validates: Requirements 18.5**

---

## Error Handling

### Error Type Hierarchy

The system implements a comprehensive error type hierarchy for consistent error handling:

```typescript
AppError (base)
├── ValidationError (400)
│   └── Contains field-level validation errors
├── DatabaseError (500)
│   └── Database operation failures
├── NotFoundError (404)
│   └── Entity not found errors
├── AuthorizationError (403)
│   └── Permission denied errors
└── CacheError (500)
    └── Cache operation failures
```

### Error Handling Strategy

**Service Layer**:
- All service methods wrapped in `safeAsync`
- Returns `AsyncServiceResult<T>` with success/failure state
- No try-catch blocks in service code
- Errors automatically logged with context

**Repository Layer**:
- Repository methods return `AsyncServiceResult<T>`
- Database errors wrapped in `DatabaseError`
- Transaction failures trigger automatic rollback
- Cache errors logged but don't fail operations (graceful degradation)

**Validation Layer**:
- Validation failures return `ValidationError` with field-level details
- Validation occurs before any processing
- Type-safe validation results with Zod

**Transaction Layer**:
- Automatic retry with exponential backoff (3 attempts)
- Automatic rollback on error
- Transaction timeout protection (30 seconds default)
- Deadlock detection and retry

### Error Context

All errors include structured context:
```typescript
{
  service: string;        // Service name (e.g., 'CachedBillService')
  operation: string;      // Operation name (e.g., 'getBillById')
  timestamp: Date;        // Error timestamp
  userId?: string;        // User ID if available
  entityId?: string;      // Entity ID if applicable
  additionalContext?: any; // Operation-specific context
}
```

### Error Recovery

**Transient Errors**:
- Database connection failures: Automatic retry with exponential backoff
- Cache failures: Graceful degradation (continue without cache)
- External API failures: Retry with circuit breaker pattern

**Permanent Errors**:
- Validation errors: Return immediately with field-level details
- Authorization errors: Return immediately with 403 status
- Not found errors: Return immediately with 404 status

**Transaction Errors**:
- Automatic rollback on any error
- Retry for deadlock errors (up to 3 attempts)
- Timeout errors logged and returned

---

## Testing Strategy

### Dual Testing Approach

The modernization initiative requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**:
- Specific examples demonstrating correct behavior
- Edge cases (empty inputs, boundary values, null handling)
- Error conditions (validation failures, database errors, not found)
- Integration points between components
- Mock external dependencies for isolation

**Property-Based Tests**:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Minimum 100 iterations per property test
- Each property test references design document property
- Tag format: `Feature: infrastructure-modernization, Property {number}: {property_text}`

### Property-Based Testing Configuration

**Testing Library**: Use language-appropriate PBT library
- TypeScript/JavaScript: `fast-check`
- Python: `hypothesis`
- Java: `jqwik`
- Go: `gopter`

**Test Configuration**:
```typescript
// Example property test configuration
import fc from 'fast-check';

describe('Property 3: Migration Equivalence', () => {
  it('should produce equivalent results for modern vs legacy database access', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // Generate random bill ID
        async (billId) => {
          // Feature: infrastructure-modernization, Property 3: Migration Equivalence
          const modernResult = await modernDatabaseAccess.getBill(billId);
          const legacyResult = await legacyPoolAccess.getBill(billId);
          
          expect(modernResult).toEqual(legacyResult);
        }
      ),
      { numRuns: 100 } // Minimum 100 iterations
    );
  });
});
```

### Test Coverage Requirements

**Per Feature**:
- Minimum 80% code coverage
- 100% coverage of repository methods
- 100% coverage of validation schemas
- 100% coverage of error handling paths

**Integration Tests**:
- Database access patterns (read/write separation, transactions)
- Cache integration (get, set, invalidate)
- Validation integration (schema execution, error handling)
- Security integration (sanitization, audit logging)
- Cross-feature infrastructure (metrics, audit, notifications, ML)

**Performance Tests**:
- Response time SLA validation (p95 < 500ms)
- Cache hit rate measurement (target: 40%+ query reduction)
- Load testing (2x current load support)
- Database connection pool utilization
- Memory usage under load

### Testing Phases

**Phase 1: Infrastructure Testing**
- BaseRepository unit tests
- Error type hierarchy tests
- Validation helper tests
- Cache service integration tests
- Database connection tests

**Phase 2: Feature Testing**
- Bills feature modernization tests
- Users feature modernization tests
- Repository pattern tests
- Validation schema tests
- Cache integration tests

**Phase 3: Integration Testing**
- Cross-feature infrastructure tests
- Metrics collection tests
- Audit logging tests
- Notification delivery tests
- ML infrastructure tests

**Phase 4: Property-Based Testing**
- Implement all 18 correctness properties
- Run with minimum 100 iterations each
- Validate migration equivalence
- Verify data integrity invariants
- Test error handling properties

**Phase 5: Performance Testing**
- Baseline performance measurement
- Post-modernization performance measurement
- Cache effectiveness measurement
- Load testing at 2x capacity
- Response time SLA validation

### Test Automation

**CI/CD Integration**:
- All tests run on every commit
- Property-based tests run on every PR
- Performance tests run nightly
- Integration score calculated on every build
- ESLint rules enforced (fail build on violations)

**Test Reporting**:
- Test coverage reports per feature
- Property test results with failure examples
- Performance test results with trends
- Integration score trends over time
- Regression detection alerts

---

## Implementation Strategy

### Phased Approach

The modernization follows a pragmatic, feature-first approach with pattern extraction:

**Phase 1: Foundation (Weeks 1-2)**
- Week 1: Standardize database access across all features (find-and-replace)
  - Replace legacy `db` imports with `readDatabase`/`writeDatabase`
  - Wrap writes in `withTransaction`
  - Impact: ~40% of features immediately improved
- Week 2: Modernize Bills feature as reference implementation
  - Create BillRepository with domain-specific methods
  - Add comprehensive validation schemas
  - Implement caching for expensive operations
  - Achieve 90%+ integration score

**Phase 2: Pattern Extraction (Weeks 3-4)**
- Week 3: Modernize Users feature following Bills pattern
  - Create UserRepository
  - Add validation schemas
  - Implement caching
  - Note common patterns with Bills
- Week 4: Extract BaseRepository from Bills and Users
  - Identify common CRUD operations
  - Create error type hierarchy
  - Implement cache integration
  - Refactor Bills and Users to use BaseRepository

**Phase 3: Feature Modernization (Weeks 5-10)**
- Modernize remaining 28 features in priority order:
  - **Tier 1 (Weeks 5-6)**: notifications, search, sponsors, recommendation, pretext-detection, universal_access
  - **Tier 2 (Weeks 7-8)**: analytics, security, safeguards, community
  - **Tier 3 (Weeks 9-10)**: All remaining features
- Each feature achieves 90%+ integration score
- Use BaseRepository for complex queries
- Direct database access for simple CRUD

**Phase 4: Cross-Feature Infrastructure (Weeks 11-12)**
- Week 11: Implement cross-feature infrastructure
  - Create infrastructure/metrics for unified metrics
  - Create infrastructure/audit for unified audit trail
  - Enhance infrastructure/messaging for notifications
  - Create infrastructure/ml for shared ML services
- Week 12: Migrate features to cross-feature infrastructure
  - Eliminate custom metrics implementations
  - Eliminate custom audit implementations
  - Eliminate custom notification implementations
  - Eliminate custom ML implementations

**Phase 5: Enforcement and Monitoring (Weeks 13-14)**
- Week 13: Implement ESLint rules and CI/CD enforcement
  - Prohibit legacy pool imports
  - Require modern database access
  - Require withTransaction for writes
  - Require validation schemas
  - Enforce naming conventions
- Week 14: Implement integration score monitoring
  - Calculate feature-level scores
  - Calculate component-level scores
  - Track historical trends
  - Generate reports and alerts
  - Create monitoring dashboard

### Migration Checklist Per Feature

For each feature being modernized, complete the following checklist:

**Database Access**:
- [ ] Replace all `db` imports with `readDatabase`/`writeDatabase`
- [ ] Wrap all writes in `withTransaction`
- [ ] Remove direct pool access
- [ ] Verify read/write separation

**Repository Pattern** (if complex queries):
- [ ] Create feature-specific repository extending BaseRepository
- [ ] Implement domain-specific query methods
- [ ] Integrate caching in repository methods
- [ ] Return AsyncServiceResult from all methods
- [ ] Update services to use repository

**Validation**:
- [ ] Create validation schemas file (`*-validation.schemas.ts`)
- [ ] Define schemas for all input types (create, update, search)
- [ ] Use CommonSchemas from infrastructure
- [ ] Export TypeScript types from schemas
- [ ] Use `validateData` in all service methods
- [ ] Remove manual validation logic

**Caching**:
- [ ] Identify expensive operations (queries >100ms)
- [ ] Use `cacheService` for all expensive operations
- [ ] Use `cacheKeys` for key generation
- [ ] Set appropriate TTL based on volatility
- [ ] Implement cache invalidation on writes
- [ ] Test cache hit rates

**Error Handling**:
- [ ] Wrap all service methods in `safeAsync`
- [ ] Return `AsyncServiceResult` from all methods
- [ ] Use error type hierarchy (ValidationError, DatabaseError, etc.)
- [ ] Remove try-catch blocks
- [ ] Add structured logging for errors
- [ ] Test error scenarios

**Security**:
- [ ] Use InputSanitizationService for user inputs
- [ ] Use securityAuditService for audit logging
- [ ] Use infrastructure/security primitives
- [ ] Remove custom security implementations

**Testing**:
- [ ] Achieve minimum 80% test coverage
- [ ] Add unit tests for repository methods
- [ ] Add validation schema tests
- [ ] Add integration tests
- [ ] Add property-based tests for key properties
- [ ] Verify behavioral equivalence with legacy

**Integration Score**:
- [ ] Calculate integration score
- [ ] Verify 90%+ overall score
- [ ] Verify 100% component scores
- [ ] Document any exceptions

### Rollback Strategy

Each feature modernization is deployed behind feature flags for safe rollback:

**Feature Flag Structure**:
```typescript
{
  "feature_modernization": {
    "bills": true,        // Bills modernization enabled
    "users": true,        // Users modernization enabled
    "search": false,      // Search still using legacy
    // ... other features
  }
}
```

**Rollback Procedure**:
1. Detect issue (error rate spike, performance degradation)
2. Disable feature flag for affected feature
3. Traffic routes to legacy implementation
4. Investigate and fix issue
5. Re-enable feature flag after validation

**Monitoring During Rollout**:
- Error rate per feature (alert if >1% increase)
- Response time per feature (alert if p95 >500ms)
- Database query count (alert if unexpected increase)
- Cache hit rate (alert if <30%)
- Integration score (alert if drops below 85%)

### Success Metrics

**Week 2 (Bills Modernized)**:
- ✅ Bills integration score: 90%+
- ✅ BillRepository implemented and tested
- ✅ Validation schemas complete
- ✅ Caching implemented for expensive queries
- ✅ Zero legacy pool imports in Bills feature

**Week 4 (BaseRepository Extracted)**:
- ✅ BaseRepository implemented with CRUD operations
- ✅ Error type hierarchy defined
- ✅ Bills and Users refactored to use BaseRepository
- ✅ Pattern validated and documented

**Week 10 (All Features Modernized)**:
- ✅ All 30 features achieve 90%+ integration score
- ✅ Zero legacy pool imports across codebase
- ✅ All features use validation schemas
- ✅ All expensive operations cached
- ✅ All services use AsyncServiceResult

**Week 12 (Cross-Feature Infrastructure)**:
- ✅ infrastructure/metrics implemented and adopted
- ✅ infrastructure/audit implemented and adopted
- ✅ infrastructure/messaging enhanced and adopted
- ✅ infrastructure/ml implemented and adopted
- ✅ Zero custom implementations of cross-feature concerns

**Week 14 (Enforcement and Monitoring)**:
- ✅ ESLint rules prevent legacy patterns
- ✅ CI/CD fails on violations
- ✅ Integration score monitoring operational
- ✅ Monitoring dashboard deployed
- ✅ System-wide integration score: 90%+

### Risk Mitigation

**Technical Risks**:
- **Risk**: BaseRepository doesn't fit all use cases
  - **Mitigation**: Allow direct database access for simple CRUD; repository for complex queries
- **Risk**: Performance degradation during migration
  - **Mitigation**: Feature flags for rollback; performance testing before rollout
- **Risk**: Breaking changes in modernized features
  - **Mitigation**: Property-based tests verify behavioral equivalence; comprehensive integration tests

**Process Risks**:
- **Risk**: Team resistance to new patterns
  - **Mitigation**: Bills and Users as reference implementations; comprehensive documentation
- **Risk**: Timeline slippage
  - **Mitigation**: Phased approach with clear milestones; can stop at any phase
- **Risk**: Incomplete modernization
  - **Mitigation**: ESLint rules prevent regression; integration score tracking

**Operational Risks**:
- **Risk**: Production issues during rollout
  - **Mitigation**: Feature flags for rollback; canary deployment; monitoring and alerts
- **Risk**: Data inconsistency during migration
  - **Mitigation**: Transaction support; rollback on error; data integrity tests

---

## Deployment and Operations

### Deployment Strategy

**Incremental Rollout**:
1. Deploy infrastructure changes (BaseRepository, error types, cross-feature infrastructure)
2. Deploy feature modernizations one at a time
3. Enable feature flags gradually (10% → 50% → 100% traffic)
4. Monitor for 24 hours before proceeding to next feature
5. Rollback immediately if issues detected

**Canary Deployment** (for high-traffic features):
- Bills, Users, Search use canary deployment
- 10% traffic to modernized version for 24 hours
- Monitor error rates, response times, database load
- Increase to 50% if metrics are healthy
- Increase to 100% after 48 hours of stability

**Feature Flag Management**:
- Feature flags stored in database
- Real-time flag updates without deployment
- Per-feature granularity
- Automatic rollback on error threshold

### Monitoring and Alerting

**Integration Score Monitoring**:
- Calculate scores on every build
- Track historical trends
- Alert if overall score drops below 85%
- Alert if component score drops below 80%
- Weekly reports to stakeholders

**Performance Monitoring**:
- Response time per feature (p50, p95, p99)
- Database query count per feature
- Cache hit rate per feature
- Error rate per feature
- Alert thresholds:
  - p95 response time >500ms
  - Error rate >1%
  - Cache hit rate <30%
  - Database query increase >20%

**Infrastructure Monitoring**:
- Database connection pool utilization
- Cache memory usage
- Transaction retry rate
- Error type distribution
- Security audit event volume

**Dashboard Metrics**:
- System-wide integration score gauge
- Per-component score breakdown
- Per-feature score heatmap
- Historical trend charts
- Feature maturity level distribution
- Top 5 features needing attention

### Operational Procedures

**Daily Operations**:
- Review integration score trends
- Review error logs for new error types
- Review performance metrics for degradation
- Review cache hit rates for optimization opportunities

**Weekly Operations**:
- Generate integration score reports
- Review feature modernization progress
- Identify features needing attention
- Plan next week's modernization targets

**Monthly Operations**:
- Comprehensive performance review
- Cache strategy optimization
- Database query optimization
- Security audit review
- Architecture compliance review

**Incident Response**:
1. Detect issue (monitoring alert)
2. Assess impact (affected features, user impact)
3. Decide: rollback or fix forward
4. Execute rollback (disable feature flag) or deploy fix
5. Verify resolution (metrics return to normal)
6. Post-mortem (root cause, prevention)

---

## Appendices

### Appendix A: Repository Pattern Examples

**Simple Repository** (extends BaseRepository):
```typescript
export class SponsorRepository extends BaseRepository<Sponsor, InsertSponsor> {
  constructor() {
    super(sponsors, 'sponsor');
  }

  async findByName(name: string): Promise<AsyncServiceResult<Sponsor[]>> {
    return this.findMany({ name });
  }
}
```

**Complex Repository** (custom queries):
```typescript
export class BillRepository extends BaseRepository<Bill, InsertBill> {
  constructor() {
    super(bills, 'bill');
  }

  async searchBills(query: string, filters: BillFilters): Promise<AsyncServiceResult<Bill[]>> {
    return safeAsync(async () => {
      const cacheKey = this.getCacheKey('search', { query, filters });
      const cached = await cacheService.get<Bill[]>(cacheKey);
      if (cached) return cached;

      const conditions = this.buildSearchConditions(query, filters);
      const results = await readDatabase
        .select()
        .from(bills)
        .where(and(...conditions))
        .orderBy(desc(bills.created_at))
        .limit(50);

      await cacheService.set(cacheKey, results, CACHE_TTL.SEARCH);
      return results;
    });
  }

  private buildSearchConditions(query: string, filters: BillFilters) {
    const conditions = [];
    // Complex search logic
    return conditions;
  }
}
```

### Appendix B: Validation Schema Examples

**Basic Schema**:
```typescript
export const CreateSponsorSchema = z.object({
  name: CommonSchemas.name,
  email: CommonSchemas.email,
  phone: CommonSchemas.phone.optional(),
});
```

**Complex Schema with Custom Validation**:
```typescript
export const CreateBillSchema = z.object({
  title: CommonSchemas.title,
  summary: CommonSchemas.description,
  bill_number: z.string()
    .regex(/^[A-Z]{1,3}-\d{4}-\d{3,4}$/, 'Invalid bill number format')
    .optional(),
  status: BillStatusSchema.default('draft'),
  category: BillCategorySchema,
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
}).refine(
  (data) => data.title.length + data.summary.length < 10000,
  { message: 'Combined title and summary too long' }
);
```

### Appendix C: ESLint Rules

**Prohibit Legacy Pool Access**:
```javascript
{
  "no-restricted-imports": ["error", {
    "paths": [{
      "name": "@server/infrastructure/database/pool",
      "message": "Use readDatabase/writeDatabase from @server/infrastructure/database instead"
    }]
  }]
}
```

**Require Modern Database Access**:
```javascript
{
  "no-restricted-syntax": ["error", {
    "selector": "ImportDeclaration[source.value='@server/infrastructure/database/pool']",
    "message": "Legacy pool access is prohibited. Use readDatabase/writeDatabase."
  }]
}
```

### Appendix D: Integration Score Calculation

```typescript
function calculateDatabaseScore(feature: Feature): number {
  const totalDbOperations = countDatabaseOperations(feature);
  const modernOperations = countModernDatabaseAccess(feature);
  const legacyOperations = countLegacyPoolAccess(feature);
  
  if (legacyOperations > 0) return 0; // Any legacy access = 0%
  if (modernOperations === totalDbOperations) return 100;
  
  return (modernOperations / totalDbOperations) * 100;
}

function calculateCacheScore(feature: Feature): number {
  const expensiveOperations = identifyExpensiveOperations(feature); // >100ms
  const cachedOperations = countCachedOperations(feature);
  
  if (expensiveOperations.length === 0) return 100; // No expensive ops = N/A
  
  return (cachedOperations / expensiveOperations.length) * 100;
}

function calculateValidationScore(feature: Feature): number {
  const inputMethods = identifyInputMethods(feature);
  const validatedMethods = countValidatedMethods(feature);
  
  return (validatedMethods / inputMethods.length) * 100;
}

function calculateSecurityScore(feature: Feature): number {
  const sensitiveOperations = identifySensitiveOperations(feature);
  const securedOperations = countSecuredOperations(feature);
  
  return (securedOperations / sensitiveOperations.length) * 100;
}

function calculateErrorScore(feature: Feature): number {
  const serviceMethods = identifyServiceMethods(feature);
  const asyncResultMethods = countAsyncResultMethods(feature);
  
  return (asyncResultMethods / serviceMethods.length) * 100;
}

function calculateObservabilityScore(feature: Feature): number {
  const operations = identifyOperations(feature);
  const loggedOperations = countLoggedOperations(feature);
  
  return (loggedOperations / operations.length) * 100;
}
```

### Appendix E: Feature Modernization Priority Matrix

| Feature | Current Score | Complexity | Impact | Priority | Estimated Effort |
|---------|---------------|------------|--------|----------|------------------|
| bills | 70% | High | High | 1 | 5 days |
| users | 50% | High | High | 2 | 5 days |
| notifications | 60% | Medium | High | 3 | 3 days |
| search | 55% | High | High | 4 | 4 days |
| sponsors | 40% | Low | Medium | 5 | 2 days |
| recommendation | 45% | Medium | Medium | 6 | 3 days |
| pretext-detection | 50% | Medium | Medium | 7 | 3 days |
| universal_access | 55% | Medium | Medium | 8 | 3 days |
| analytics | 40% | Medium | Medium | 9 | 3 days |
| security | 45% | High | High | 10 | 4 days |
| safeguards | 35% | Medium | High | 11 | 3 days |
| community | 30% | Medium | Medium | 12 | 3 days |
| [Remaining 18 features] | 0-30% | Low-Medium | Low-Medium | 13-30 | 2-3 days each |

**Priority Calculation**: `Priority = (Impact * 2) + (1 / Complexity) - (Current Score / 100)`

---

## Conclusion

This design document provides a comprehensive technical architecture for modernizing infrastructure integration across all 30 features. The phased, feature-first approach with pattern extraction ensures rapid value delivery while maintaining code quality and system stability.

**Key Success Factors**:
1. **Pragmatic Approach**: Build what we need when we need it; validate patterns with real features
2. **Clear Patterns**: Repository for complex queries, direct access for simple CRUD, validation schemas for all inputs
3. **Consistent Infrastructure**: Single approved pattern for each technical concern
4. **Enforcement**: ESLint rules and CI/CD prevent regression
5. **Monitoring**: Integration score tracking ensures continuous improvement

**Expected Outcomes**:
- System-wide integration score: 18% → 90%+
- Zero legacy pool imports across codebase
- 100% validation schema coverage
- 40%+ reduction in database queries through caching
- 50%+ reduction in transient failures through retry logic
- 30%+ reduction in time to implement new features
- Clear separation between infrastructure and features
- Unified cross-feature infrastructure for metrics, audit, notifications, and ML

The modernization initiative will transform the codebase from inconsistent, partially-modernized state to a fully integrated, maintainable, and scalable system with clear patterns and enforced standards.
