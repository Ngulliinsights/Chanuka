# Design Document: Full-Stack Integration

## Overview

This design establishes a comprehensive integration architecture for the Chanuka Platform that ensures consistency across client, shared, server, and database layers. The design focuses on preventing regressions during migrations by creating strong type alignment, enforced contracts, and automated verification at all integration points.

### Key Design Principles

1. **Single Source of Truth**: Each entity, type, and validation rule is defined exactly once
2. **Type-Driven Development**: TypeScript types drive database schemas, API contracts, and validation
3. **Fail-Fast Validation**: Errors are caught at compile time whenever possible, runtime otherwise
4. **Migration Safety**: Schema changes automatically verify type alignment and contract compatibility
5. **Layer Separation**: Clear boundaries between layers with explicit integration points

### Architecture Goals

- Eliminate schema drift between database and application types
- Prevent API contract mismatches between client and server
- Ensure validation rules are consistent across all layers
- Make breaking changes impossible to deploy without fixing all affected code
- Provide automated verification of integration integrity

## Architecture

### Layer Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │  State Mgmt  │  │  API Client  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ API Contract (HTTP/JSON)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │   Services   │  │ Repositories │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ ORM (Drizzle)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Tables     │  │  Migrations  │  │  Constraints │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │  Shared Layer   │
                    │  ┌───────────┐  │
                    │  │   Types   │  │
                    │  ├───────────┤  │
                    │  │Validation │  │
                    │  ├───────────┤  │
                    │  │ Utilities │  │
                    │  └───────────┘  │
                    └─────────────────┘
```

### Integration Points

1. **Database → Server**: Drizzle ORM with generated types
2. **Server → Client**: REST API with typed contracts
3. **Shared → All Layers**: Type definitions, validation schemas, utilities
4. **Migrations → Types**: Automated type generation from schema changes

### Data Flow Pipeline

```
Database Schema (Drizzle)
    ↓ (type generation)
Database Types (shared/types/database)
    ↓ (transformation)
Domain Types (shared/types/domains)
    ↓ (API contract)
API Types (shared/types/api)
    ↓ (serialization)
Client Types (same as API types)
```

## Components and Interfaces

### 1. Type System Foundation

**Location**: `shared/types/`

**Purpose**: Centralized type definitions that serve as the single source of truth for all layers.

**Structure**:
```typescript
shared/types/
├── core/              # Base types and utilities
│   ├── branded.ts     # Branded type definitions (UserId, BillId, etc.)
│   ├── common.ts      # Common types used everywhere
│   └── result.ts      # Result type for error handling
├── domains/           # Domain entity types
│   ├── user.ts        # User domain types
│   ├── bill.ts        # Bill domain types
│   └── ...
├── api/               # API contract types
│   ├── requests/      # Request payload types
│   ├── responses/     # Response payload types
│   └── endpoints.ts   # Endpoint definitions
├── database/          # Database-specific types
│   ├── tables.ts      # Generated from Drizzle schema
│   └── relations.ts   # Relationship types
├── validation/        # Validation schema types
│   └── schemas.ts     # Zod schema type exports
└── index.ts           # Main export file
```

**Key Interfaces**:

```typescript
// Branded types for type safety
export type UserId = string & { readonly __brand: 'UserId' };
export type BillId = string & { readonly __brand: 'BillId' };

// Domain entity
export interface User {
  id: UserId;
  email: string;
  username: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// API request/response
export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
}

export interface CreateUserResponse {
  user: User;
  token: string;
}

// Database type (generated from Drizzle)
export interface UserTable {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}
```

### 2. Schema Definition System

**Location**: `server/infrastructure/schema/`

**Purpose**: Define database schemas using Drizzle ORM with automatic type generation.

**Key Components**:

```typescript
// Schema definition with type generation
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Inferred types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bills: many(bills),
  comments: many(comments),
}));
```

**Type Generation Pipeline**:
1. Define schema in Drizzle
2. Run `drizzle-kit generate` to create migration
3. Automatically generate TypeScript types
4. Export types to `shared/types/database/`
5. Transform to domain types in `shared/types/domains/`

### 3. Validation System

**Location**: `shared/validation/`

**Purpose**: Runtime validation using Zod schemas that align with TypeScript types.

**Structure**:
```typescript
shared/validation/
├── schemas/
│   ├── user.schema.ts
│   ├── bill.schema.ts
│   └── ...
├── rules/
│   ├── common.rules.ts    # Reusable validation rules
│   └── custom.rules.ts    # Custom validators
└── index.ts
```

**Key Interfaces**:

```typescript
import { z } from 'zod';

// Validation schema that matches domain type
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(100),
  role: z.enum(['user', 'admin', 'moderator']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Request validation
export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
});

// Type inference from schema
export type ValidatedUser = z.infer<typeof UserSchema>;
export type ValidatedCreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
```

### 4. API Contract System

**Location**: `shared/types/api/`

**Purpose**: Define typed contracts between client and server with runtime validation.

**Structure**:
```typescript
shared/types/api/
├── contracts/
│   ├── user.contract.ts
│   ├── bill.contract.ts
│   └── ...
├── endpoints.ts       # Endpoint definitions
└── index.ts
```

**Key Interfaces**:

```typescript
// Endpoint definition with types
export interface ApiEndpoint<TRequest, TResponse> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  requestSchema: z.ZodSchema<TRequest>;
  responseSchema: z.ZodSchema<TResponse>;
}

// User endpoints
export const UserEndpoints = {
  create: {
    method: 'POST',
    path: '/api/users',
    requestSchema: CreateUserRequestSchema,
    responseSchema: CreateUserResponseSchema,
  },
  getById: {
    method: 'GET',
    path: '/api/users/:id',
    requestSchema: z.object({ id: z.string().uuid() }),
    responseSchema: UserSchema,
  },
} as const;

// Type-safe endpoint caller
export async function callEndpoint<TRequest, TResponse>(
  endpoint: ApiEndpoint<TRequest, TResponse>,
  request: TRequest
): Promise<TResponse> {
  // Validate request
  const validatedRequest = endpoint.requestSchema.parse(request);
  
  // Make HTTP call
  const response = await fetch(endpoint.path, {
    method: endpoint.method,
    body: JSON.stringify(validatedRequest),
  });
  
  // Validate response
  const data = await response.json();
  return endpoint.responseSchema.parse(data);
}
```

### 5. Data Transformation Layer

**Location**: `shared/utils/transformers/`

**Purpose**: Convert between database types, domain types, and API types consistently.

**Key Interfaces**:

```typescript
// Transformer interface
export interface Transformer<TSource, TTarget> {
  transform(source: TSource): TTarget;
  reverse(target: TTarget): TSource;
}

// Database to Domain transformer
export const UserDbToDomain: Transformer<UserTable, User> = {
  transform(dbUser: UserTable): User {
    return {
      id: dbUser.id as UserId,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role as UserRole,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  },
  reverse(user: User): UserTable {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  },
};

// Domain to API transformer
export const UserDomainToApi: Transformer<User, ApiUser> = {
  transform(user: User): ApiUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  },
  reverse(apiUser: ApiUser): User {
    return {
      id: apiUser.id as UserId,
      email: apiUser.email,
      username: apiUser.username,
      role: apiUser.role,
      createdAt: new Date(apiUser.createdAt),
      updatedAt: new Date(apiUser.updatedAt),
    };
  },
};
```

### 6. Migration Verification System

**Location**: `scripts/database/verify-integration.ts`

**Purpose**: Automated verification that migrations preserve type alignment and integration integrity.

**Key Components**:

```typescript
// Migration verification interface
export interface MigrationVerification {
  verifyTypeAlignment(): Promise<VerificationResult>;
  verifyApiContracts(): Promise<VerificationResult>;
  verifyValidationSchemas(): Promise<VerificationResult>;
  verifyTransformers(): Promise<VerificationResult>;
}

// Verification result
export interface VerificationResult {
  passed: boolean;
  errors: VerificationError[];
  warnings: VerificationWarning[];
}

// Type alignment verification
export async function verifyTypeAlignment(): Promise<VerificationResult> {
  const errors: VerificationError[] = [];
  
  // 1. Check that database types match domain types
  const dbTypes = await getDatabaseTypes();
  const domainTypes = getDomainTypes();
  
  for (const [entityName, dbType] of Object.entries(dbTypes)) {
    const domainType = domainTypes[entityName];
    if (!domainType) {
      errors.push({
        type: 'MISSING_DOMAIN_TYPE',
        entity: entityName,
        message: `Database type ${entityName} has no corresponding domain type`,
      });
      continue;
    }
    
    // Verify field alignment
    const misalignedFields = compareTypes(dbType, domainType);
    if (misalignedFields.length > 0) {
      errors.push({
        type: 'TYPE_MISALIGNMENT',
        entity: entityName,
        fields: misalignedFields,
        message: `Type misalignment detected in ${entityName}`,
      });
    }
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings: [],
  };
}
```

### 7. Integration Testing Framework

**Location**: `tests/integration/`

**Purpose**: Automated tests that verify full-stack integration from client to database.

**Key Components**:

```typescript
// Integration test suite
export class FullStackIntegrationTest {
  async testCreateUser() {
    // 1. Create user via API (client perspective)
    const request: CreateUserRequest = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    };
    
    const response = await callEndpoint(UserEndpoints.create, request);
    
    // 2. Verify response matches expected type
    expect(response).toMatchSchema(CreateUserResponseSchema);
    
    // 3. Verify data in database
    const dbUser = await db.select().from(users).where(eq(users.id, response.user.id));
    expect(dbUser).toBeDefined();
    
    // 4. Verify transformations are correct
    const domainUser = UserDbToDomain.transform(dbUser[0]);
    expect(domainUser).toEqual(response.user);
  }
  
  async testTypeAlignment() {
    // Verify all domain types align with database types
    const result = await verifyTypeAlignment();
    expect(result.passed).toBe(true);
  }
  
  async testApiContractEnforcement() {
    // Verify API contracts are enforced
    const invalidRequest = { email: 'invalid' }; // Missing required fields
    
    await expect(
      callEndpoint(UserEndpoints.create, invalidRequest as any)
    ).rejects.toThrow(ValidationError);
  }
}
```

## Data Models

### Core Domain Models

#### User Domain
```typescript
// shared/types/domains/user.ts
export interface User {
  id: UserId;
  email: string;
  username: string;
  role: UserRole;
  profile: UserProfile | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  userId: UserId;
  firstName: string;
  lastName: string;
  bio: string | null;
  avatarUrl: string | null;
}

export enum UserRole {
  User = 'user',
  Admin = 'admin',
  Moderator = 'moderator',
}
```

#### Bill Domain
```typescript
// shared/types/domains/bill.ts
export interface Bill {
  id: BillId;
  title: string;
  description: string;
  status: BillStatus;
  sponsorId: UserId;
  committeeId: CommitteeId | null;
  introducedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum BillStatus {
  Draft = 'draft',
  Introduced = 'introduced',
  InCommittee = 'in_committee',
  Passed = 'passed',
  Rejected = 'rejected',
}
```

### Database Schema Models

```typescript
// server/infrastructure/schema/foundation.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const user_profiles = pgTable('user_profiles', {
  user_id: uuid('user_id').notNull().references(() => users.id),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  bio: text('bio'),
  avatar_url: varchar('avatar_url', { length: 500 }),
});

export const bills = pgTable('bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  sponsor_id: uuid('sponsor_id').notNull().references(() => users.id),
  committee_id: uuid('committee_id').references(() => committees.id),
  introduced_at: timestamp('introduced_at').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});
```

### API Contract Models

```typescript
// shared/types/api/user.ts
export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
}

export interface CreateUserResponse {
  user: User;
  token: string;
}

export interface GetUserResponse {
  user: User;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
}

export interface UpdateUserResponse {
  user: User;
}
```

### Transformation Models

```typescript
// Transformation pipeline
Database Type (UserTable)
    ↓ UserDbToDomain.transform()
Domain Type (User)
    ↓ UserDomainToApi.transform()
API Type (ApiUser)
    ↓ JSON.stringify()
Wire Format (JSON string)
    ↓ JSON.parse()
API Type (ApiUser)
    ↓ UserDomainToApi.reverse()
Domain Type (User)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified several areas where properties can be consolidated:

**Type Definition Uniqueness (1.1, 1.6, 3.1, 5.1, 7.2, 8.1)**: These all relate to ensuring single definitions in the shared layer. Can be consolidated into one comprehensive property about shared layer being the single source of truth.

**Schema-Type Alignment (1.2, 2.2, 2.3, 2.4)**: These all verify that database schemas match type definitions. Can be consolidated into one property about schema-type synchronization.

**Validation Enforcement (3.2, 3.4, 4.4, 5.2, 5.3, 5.4)**: These all relate to validation being performed at boundaries. Can be consolidated into one property about validation at integration points.

**Transformation Consistency (4.1, 4.2, 4.3)**: These all relate to data transformation. Can be consolidated into one property about transformation pipeline correctness.

**Migration Safety (6.1, 6.2, 6.3, 6.4, 6.5)**: These all relate to migration verification. Can be consolidated into one property about migration preserving integration integrity.

**Error Handling Consistency (8.2, 8.3, 8.4, 8.5)**: These all relate to error structure and propagation. Can be consolidated into one property about error handling uniformity.

### Correctness Properties

Property 1: **Shared Layer Single Source of Truth**

*For any* domain entity, enum, validation schema, or error type, there should exist exactly one canonical definition in the shared layer, and all other layers should reference this definition rather than creating duplicates.

**Validates: Requirements 1.1, 1.6, 3.1, 5.1, 8.1**

Property 2: **Schema-Type Synchronization**

*For any* database table, the corresponding TypeScript type definition should have matching fields with compatible types, and enum values in database constraints should match enum definitions in shared types.

**Validates: Requirements 1.2, 2.2, 2.3, 2.4**

Property 3: **Branded Type Safety for Identifiers**

*For any* entity identifier type (UserId, BillId, etc.), it should be a branded type, and functions accepting identifiers should use the branded type rather than raw strings or numbers.

**Validates: Requirements 1.4**

Property 4: **Acyclic Layer Dependencies**

*For any* import path in the codebase, following the import chain should never create a cycle between layers (client, server, shared, database).

**Validates: Requirements 1.5**

Property 5: **API Contract Type Usage**

*For any* API endpoint definition, both request and response types should be imported from the shared layer rather than defined inline or in layer-specific code.

**Validates: Requirements 1.3, 3.3**

Property 6: **Migration Type Generation**

*For any* database migration that modifies a table, running the migration should automatically generate or update corresponding TypeScript type definitions.

**Validates: Requirements 2.1**

Property 7: **Validation at Integration Points**

*For any* data crossing a layer boundary (database→server, server→client), validation should be performed using shared validation schemas, and invalid data should be rejected before crossing the boundary.

**Validates: Requirements 3.2, 3.4, 4.4, 5.2, 5.3, 5.4**

Property 8: **Transformation Pipeline Correctness**

*For any* entity, transformation functions should exist for database→domain and domain→API conversions, and applying transformations in sequence (db→domain→api→domain→db) should preserve data equivalence.

**Validates: Requirements 4.1, 4.2, 4.3**

Property 9: **Migration Integration Preservation**

*For any* migration, applying the migration should preserve type alignment, API contract compatibility, and validation rule consistency, and the migration should fail if any of these would be violated.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

Property 10: **Shared Layer Purity**

*For any* code in the shared layer, it should not contain server-only infrastructure (logging, caching, middleware, database connections), and should be safe for use in both client and server contexts.

**Validates: Requirements 7.3**

Property 11: **Error Structure Consistency**

*For any* error that occurs in any layer, it should be transformed to a standard error structure with consistent classification (validation, authorization, server, network), include correlation IDs, and maintain this structure as it propagates through layers.

**Validates: Requirements 8.2, 8.3, 8.4, 8.5**

## Error Handling

### Error Classification

All errors in the system are classified into four categories:

1. **Validation Errors**: Data fails validation rules (400 Bad Request)
2. **Authorization Errors**: User lacks permission (401 Unauthorized, 403 Forbidden)
3. **Server Errors**: Internal server failures (500 Internal Server Error)
4. **Network Errors**: Communication failures (503 Service Unavailable, timeout)

### Error Structure

```typescript
// shared/types/errors.ts
export interface StandardError {
  code: ErrorCode;
  message: string;
  classification: ErrorClassification;
  correlationId: string;
  timestamp: Date;
  details?: Record<string, unknown>;
  stack?: string; // Only in development
}

export enum ErrorClassification {
  Validation = 'validation',
  Authorization = 'authorization',
  Server = 'server',
  Network = 'network',
}

export enum ErrorCode {
  // Validation errors (1000-1999)
  VALIDATION_FAILED = 1000,
  INVALID_INPUT = 1001,
  MISSING_REQUIRED_FIELD = 1002,
  
  // Authorization errors (2000-2999)
  UNAUTHORIZED = 2000,
  FORBIDDEN = 2001,
  TOKEN_EXPIRED = 2002,
  
  // Server errors (3000-3999)
  INTERNAL_ERROR = 3000,
  DATABASE_ERROR = 3001,
  EXTERNAL_SERVICE_ERROR = 3002,
  
  // Network errors (4000-4999)
  NETWORK_ERROR = 4000,
  TIMEOUT = 4001,
  SERVICE_UNAVAILABLE = 4002,
}
```

### Error Transformation

```typescript
// shared/utils/errors/transform.ts
export function transformDatabaseError(dbError: unknown): StandardError {
  const correlationId = getCurrentCorrelationId();
  
  if (dbError instanceof PostgresError) {
    return {
      code: ErrorCode.DATABASE_ERROR,
      message: 'Database operation failed',
      classification: ErrorClassification.Server,
      correlationId,
      timestamp: new Date(),
      details: {
        constraint: dbError.constraint,
        table: dbError.table,
      },
    };
  }
  
  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
    classification: ErrorClassification.Server,
    correlationId,
    timestamp: new Date(),
  };
}

export function transformValidationError(zodError: z.ZodError): StandardError {
  const correlationId = getCurrentCorrelationId();
  
  return {
    code: ErrorCode.VALIDATION_FAILED,
    message: 'Validation failed',
    classification: ErrorClassification.Validation,
    correlationId,
    timestamp: new Date(),
    details: {
      errors: zodError.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    },
  };
}
```

### Error Propagation

```typescript
// Server error handler middleware
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const standardError = toStandardError(err);
  
  // Log error with correlation ID
  logger.error('Request failed', {
    correlationId: standardError.correlationId,
    error: standardError,
    path: req.path,
    method: req.method,
  });
  
  // Send error response
  res.status(getHttpStatus(standardError.classification)).json(standardError);
}

// Client error handler
export function handleApiError(error: unknown): StandardError {
  if (isStandardError(error)) {
    return error;
  }
  
  // Transform network errors
  if (error instanceof NetworkError) {
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: 'Network request failed',
      classification: ErrorClassification.Network,
      correlationId: generateCorrelationId(),
      timestamp: new Date(),
    };
  }
  
  // Unknown error
  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
    classification: ErrorClassification.Server,
    correlationId: generateCorrelationId(),
    timestamp: new Date(),
  };
}
```

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Specific transformation examples (User database record → domain object)
- Edge cases (empty strings, null values, boundary conditions)
- Integration between specific components
- Error handling for known failure scenarios

**Property-Based Tests**: Verify universal properties across all inputs
- Type alignment holds for all entities
- Transformations preserve data for all valid inputs
- Validation catches all invalid inputs
- Error structures are consistent for all error types

### Property-Based Testing Configuration

**Library**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: full-stack-integration, Property {N}: {property description}`

**Example Property Test**:

```typescript
import fc from 'fast-check';

describe('Feature: full-stack-integration, Property 8: Transformation Pipeline Correctness', () => {
  it('should preserve data through full transformation pipeline', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary user data
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          username: fc.string({ minLength: 3, maxLength: 100 }),
          role: fc.constantFrom('user', 'admin', 'moderator'),
          created_at: fc.date(),
          updated_at: fc.date(),
        }),
        (dbUser) => {
          // Transform: DB → Domain → API → Domain → DB
          const domainUser = UserDbToDomain.transform(dbUser);
          const apiUser = UserDomainToApi.transform(domainUser);
          const domainUser2 = UserDomainToApi.reverse(apiUser);
          const dbUser2 = UserDbToDomain.reverse(domainUser2);
          
          // Data should be equivalent after round trip
          expect(dbUser2).toEqual(dbUser);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Examples

```typescript
describe('User Transformation', () => {
  it('should transform database user to domain user', () => {
    const dbUser: UserTable = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    };
    
    const domainUser = UserDbToDomain.transform(dbUser);
    
    expect(domainUser.id).toBe(dbUser.id);
    expect(domainUser.email).toBe(dbUser.email);
    expect(domainUser.username).toBe(dbUser.username);
    expect(domainUser.role).toBe(UserRole.User);
  });
  
  it('should handle null values in transformation', () => {
    const dbUser: UserTable = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    };
    
    const domainUser = UserDbToDomain.transform(dbUser);
    
    expect(domainUser.profile).toBeNull();
  });
});

describe('API Contract Validation', () => {
  it('should reject invalid create user request', () => {
    const invalidRequest = {
      email: 'invalid-email',
      username: 'ab', // Too short
      password: '123', // Too short
    };
    
    expect(() => {
      CreateUserRequestSchema.parse(invalidRequest);
    }).toThrow(z.ZodError);
  });
  
  it('should accept valid create user request', () => {
    const validRequest = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    };
    
    const result = CreateUserRequestSchema.parse(validRequest);
    expect(result).toEqual(validRequest);
  });
});
```

### Integration Test Strategy

```typescript
describe('Full Stack Integration', () => {
  it('should maintain type alignment through full stack', async () => {
    // 1. Create user via API
    const request: CreateUserRequest = {
      email: 'integration@example.com',
      username: 'integrationtest',
      password: 'password123',
    };
    
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    const data = await response.json();
    
    // 2. Verify response matches schema
    const validatedResponse = CreateUserResponseSchema.parse(data);
    
    // 3. Verify data in database
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedResponse.user.id))
      .limit(1);
    
    expect(dbUser).toHaveLength(1);
    
    // 4. Verify transformation correctness
    const domainUser = UserDbToDomain.transform(dbUser[0]);
    expect(domainUser.email).toBe(request.email);
    expect(domainUser.username).toBe(request.username);
  });
  
  it('should enforce validation at all boundaries', async () => {
    const invalidRequest = {
      email: 'invalid',
      username: 'ab',
      password: '123',
    };
    
    // Should fail at client validation
    expect(() => {
      CreateUserRequestSchema.parse(invalidRequest);
    }).toThrow();
    
    // Should fail at server validation
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidRequest),
    });
    
    expect(response.status).toBe(400);
    
    const error = await response.json();
    expect(error.classification).toBe(ErrorClassification.Validation);
  });
});
```

### Migration Testing

```typescript
describe('Migration Durability', () => {
  it('should preserve type alignment after migration', async () => {
    // 1. Verify alignment before migration
    const beforeResult = await verifyTypeAlignment();
    expect(beforeResult.passed).toBe(true);
    
    // 2. Apply migration
    await runMigration('add_user_bio_field');
    
    // 3. Verify alignment after migration
    const afterResult = await verifyTypeAlignment();
    expect(afterResult.passed).toBe(true);
  });
  
  it('should fail migration if type alignment would break', async () => {
    // Create a migration that would break alignment
    const breakingMigration = createMigration({
      name: 'breaking_change',
      up: 'ALTER TABLE users DROP COLUMN email',
    });
    
    // Should fail verification
    await expect(runMigration(breakingMigration)).rejects.toThrow(
      'Migration would break type alignment'
    );
  });
  
  it('should restore alignment after rollback', async () => {
    // 1. Apply migration
    await runMigration('add_user_bio_field');
    
    // 2. Rollback migration
    await rollbackMigration('add_user_bio_field');
    
    // 3. Verify alignment restored
    const result = await verifyTypeAlignment();
    expect(result.passed).toBe(true);
  });
});
```

### Test Coverage Requirements

- **Type Alignment**: 100% of entities must have alignment tests
- **Transformations**: 100% of transformation functions must have round-trip tests
- **API Contracts**: 100% of endpoints must have contract validation tests
- **Validation**: 100% of validation schemas must have positive and negative tests
- **Migrations**: 100% of migrations must have durability tests
- **Error Handling**: All error classifications must have propagation tests

### Continuous Integration

All tests must pass before:
- Merging pull requests
- Deploying to staging
- Deploying to production

CI pipeline should:
1. Run unit tests
2. Run property-based tests (100 iterations minimum)
3. Run integration tests
4. Verify type alignment
5. Verify API contract compatibility
6. Generate coverage report (minimum 80% coverage)
