# Code Organization Standards

## Overview

This document defines the canonical locations for types, validation, utilities, and other code artifacts in the Chanuka Platform. It provides decision trees for where to place new code and documents layer boundaries and integration points.

**Purpose**: Ensure consistency across the full-stack architecture and prevent regressions during migrations by establishing clear organizational patterns.

**Scope**: Covers client, server, shared, and database layers with explicit integration points.

## Table of Contents

1. [Layer Structure](#layer-structure)
2. [Canonical Locations](#canonical-locations)
3. [Decision Trees](#decision-trees)
4. [Layer Boundaries](#layer-boundaries)
5. [Integration Points](#integration-points)
6. [Common Patterns](#common-patterns)
7. [Anti-Patterns](#anti-patterns)

---

## Layer Structure

The Chanuka Platform consists of four primary layers:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  Location: client/                                           │
│  Purpose: React frontend, UI components, client state        │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ API Contract (HTTP/JSON)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server Layer                            │
│  Location: server/                                           │
│  Purpose: Business logic, API endpoints, services            │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ ORM (Drizzle)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  Location: server/infrastructure/schema/                     │
│  Purpose: Schema definitions, migrations, constraints        │
└─────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │  Shared Layer   │
                    │  Location:      │
                    │  shared/        │
                    │                 │
│  Purpose: Types, │
                    │  validation,    │
                    │  utilities      │
                    └─────────────────┘
```

### Layer Dependencies

**Allowed Dependencies**:
- Client → Shared
- Server → Shared
- Database → (none, generates types for Shared)
- Shared → (none, no external dependencies)

**Forbidden Dependencies**:
- Shared → Client (would break server usage)
- Shared → Server (would break client usage)
- Client → Server (must use API contracts)
- Server → Client (architectural violation)

---

## Canonical Locations

### 1. Type Definitions

**Location**: `shared/types/`

**Structure**:
```
shared/types/
├── core/                    # Base types and utilities
│   ├── branded.ts          # Branded types (UserId, BillId, etc.)
│   ├── common.ts           # Common types used everywhere
│   └── result.ts           # Result type for error handling
├── domains/                # Domain entity types
│   ├── user.ts             # User domain types
│   ├── bill.ts             # Bill domain types
│   ├── committee.ts        # Committee domain types
│   └── ...                 # Other domain entities
├── api/                    # API contract types
│   ├── requests/           # Request payload types
│   │   ├── user.ts
│   │   ├── bill.ts
│   │   └── ...
│   ├── responses/          # Response payload types
│   │   ├── user.ts
│   │   ├── bill.ts
│   │   └── ...
│   └── endpoints.ts        # Endpoint definitions
├── database/               # Database-specific types
│   ├── tables.ts           # Generated from Drizzle schema
│   └── relations.ts        # Relationship types
├── validation/             # Validation schema types
│   └── schemas.ts          # Zod schema type exports
└── index.ts                # Main export file
```

**Rules**:
- Each domain entity is defined exactly once in `shared/types/domains/`
- Use branded types for all entity identifiers (defined in `shared/types/core/branded.ts`)
- API types in `shared/types/api/` must reference domain types, not duplicate them
- Database types are generated automatically from Drizzle schemas
- Never define types inline in client or server code that could be shared

**Example**:
```typescript
// ✅ CORRECT: Define in shared/types/domains/user.ts
export interface User {
  id: UserId;
  email: string;
  username: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ CORRECT: Use branded type from shared/types/core/branded.ts
export type UserId = string & { readonly __brand: 'UserId' };

// ❌ WRONG: Defining user type in client code
// client/src/features/users/types.ts
interface User { ... } // Don't do this!
```

---

### 2. Validation Schemas

**Location**: `shared/validation/`

**Structure**:
```
shared/validation/
├── schemas/
│   ├── user.schema.ts      # User validation schemas
│   ├── bill.schema.ts      # Bill validation schemas
│   └── ...                 # Other domain schemas
├── rules/
│   ├── common.rules.ts     # Reusable validation rules
│   └── custom.rules.ts     # Custom validators
└── index.ts                # Main export file
```

**Rules**:
- All validation schemas use Zod
- Schemas align with TypeScript types from `shared/types/`
- Define schemas once in shared layer, use in both client and server
- Request/response validation schemas live in `shared/validation/schemas/`
- Reusable validation rules (email, phone, etc.) in `shared/validation/rules/`

**Example**:
```typescript
// ✅ CORRECT: Define in shared/validation/schemas/user.schema.ts
import { z } from 'zod';

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
});

// ✅ CORRECT: Use in server
// server/routes/users.ts
import { CreateUserRequestSchema } from '@shared/validation';
const validatedData = CreateUserRequestSchema.parse(req.body);

// ✅ CORRECT: Use in client
// client/src/features/users/CreateUserForm.tsx
import { CreateUserRequestSchema } from '@shared/validation';
const result = CreateUserRequestSchema.safeParse(formData);
```

---

### 3. Utilities

**Location**: `shared/utils/`

**Structure**:
```
shared/utils/
├── transformers/           # Data transformation functions
│   ├── user.transformer.ts
│   ├── bill.transformer.ts
│   └── ...
├── formatters/             # Formatting utilities
│   ├── date.ts
│   ├── currency.ts
│   └── string.ts
├── validators/             # Custom validation helpers
│   └── custom.ts
├── errors/                 # Error handling utilities
│   ├── transform.ts
│   └── types.ts
└── index.ts                # Main export file
```

**Rules**:
- Utilities in shared layer must be safe for both client and server
- No server-only infrastructure (logging, caching, middleware, database connections)
- Transformers convert between database, domain, and API types
- Formatters handle presentation logic (dates, currency, strings)
- Document which utilities are client-safe vs server-only

**Example**:
```typescript
// ✅ CORRECT: Shared utility safe for both client and server
// shared/utils/formatters/date.ts
export function formatDate(date: Date): string {
  return date.toISOString();
}

// ❌ WRONG: Server-only code in shared layer
// shared/utils/logger.ts
import { Logger } from 'pino'; // Don't do this!
export const logger = new Logger();
```

---

### 4. Database Schemas

**Location**: `server/infrastructure/schema/`

**Structure**:
```
server/infrastructure/schema/
├── foundation.ts           # Core tables (users, roles, etc.)
├── bills.ts                # Bill-related tables
├── committees.ts           # Committee-related tables
├── engagement.ts           # Engagement-related tables
└── index.ts                # Schema exports
```

**Rules**:
- All database schemas use Drizzle ORM
- Schema files are organized by domain
- Types are automatically generated from schemas
- Generated types are exported to `shared/types/database/`
- Enum values in database must match `shared/types/` enums

**Example**:
```typescript
// ✅ CORRECT: Define schema in server/infrastructure/schema/foundation.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ✅ CORRECT: Export inferred types
export type UserTable = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

---

### 5. API Contracts

**Location**: `shared/types/api/`

**Structure**:
```
shared/types/api/
├── contracts/
│   ├── user.contract.ts    # User API contracts
│   ├── bill.contract.ts    # Bill API contracts
│   └── ...
├── endpoints.ts            # Endpoint definitions
└── index.ts                # Main export file
```

**Rules**:
- API contracts define request/response types for all endpoints
- Contracts reference domain types from `shared/types/domains/`
- Include Zod schemas for runtime validation
- Both client and server must use these contracts
- Never define API types inline in routes or API client code

**Example**:
```typescript
// ✅ CORRECT: Define in shared/types/api/contracts/user.contract.ts
import { User } from '@shared/types/domains/user';
import { z } from 'zod';

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
}

export interface CreateUserResponse {
  user: User;
  token: string;
}

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
});
```

---

### 6. Error Types

**Location**: `shared/types/errors.ts`

**Structure**:
```typescript
shared/types/errors.ts      # All error types and codes
shared/utils/errors/        # Error transformation utilities
```

**Rules**:
- All error types defined in `shared/types/errors.ts`
- Error codes organized by classification (validation, authorization, server, network)
- Error transformation utilities in `shared/utils/errors/`
- Consistent error structure across all layers

**Example**:
```typescript
// ✅ CORRECT: Define in shared/types/errors.ts
export interface StandardError {
  code: ErrorCode;
  message: string;
  classification: ErrorClassification;
  correlationId: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export enum ErrorClassification {
  Validation = 'validation',
  Authorization = 'authorization',
  Server = 'server',
  Network = 'network',
}
```

---

### 7. Constants

**Location**: `shared/constants/`

**Structure**:
```
shared/constants/
├── app.ts                  # Application-wide constants
├── api.ts                  # API-related constants
├── validation.ts           # Validation constants
└── index.ts                # Main export file
```

**Rules**:
- All constants used across layers go in `shared/constants/`
- Layer-specific constants stay in their respective layers
- Use UPPER_SNAKE_CASE for constant names
- Group related constants together

**Example**:
```typescript
// ✅ CORRECT: Shared constants
// shared/constants/validation.ts
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 100;
export const MIN_PASSWORD_LENGTH = 8;

// ✅ CORRECT: Layer-specific constant
// server/config/database.ts
const DB_POOL_SIZE = 20; // Server-only, stays in server layer
```

---

## Decision Trees

### Where to Place New Code

#### Decision Tree 1: Type Definitions

```
Is this a type definition?
├─ YES → Is it used by multiple layers?
│        ├─ YES → Place in shared/types/
│        │        ├─ Domain entity? → shared/types/domains/
│        │        ├─ API contract? → shared/types/api/
│        │        ├─ Core utility? → shared/types/core/
│        │        └─ Database type? → Generated from schema
│        └─ NO → Is it client-only?
│                 ├─ YES → Place in client/src/types/
│                 └─ NO → Place in server/types/
└─ NO → Continue to next decision tree
```


#### Decision Tree 2: Validation Logic

```
Is this validation logic?
├─ YES → Is it used by both client and server?
│        ├─ YES → Place in shared/validation/schemas/
│        └─ NO → Is it client-only?
│                 ├─ YES → Place in client/src/validation/
│                 └─ NO → Place in server/validation/
└─ NO → Continue to next decision tree
```

#### Decision Tree 3: Utility Functions

```
Is this a utility function?
├─ YES → Does it depend on server-only infrastructure?
│        │  (database, logging, caching, middleware)
│        ├─ YES → Place in server/utils/
│        └─ NO → Is it used by multiple layers?
│                 ├─ YES → Place in shared/utils/
│                 │        ├─ Data transformation? → shared/utils/transformers/
│                 │        ├─ Formatting? → shared/utils/formatters/
│                 │        └─ Other? → shared/utils/
│                 └─ NO → Is it client-only?
│                          ├─ YES → Place in client/src/utils/
│                          └─ NO → Place in server/utils/
└─ NO → Continue to next decision tree
```

#### Decision Tree 4: Business Logic

```
Is this business logic?
├─ YES → Does it involve database operations?
│        ├─ YES → Place in server/services/
│        └─ NO → Is it UI-related?
│                 ├─ YES → Place in client/src/features/
│                 └─ NO → Place in server/domain/
└─ NO → Continue to next decision tree
```

#### Decision Tree 5: Database Code

```
Is this database-related code?
├─ YES → Is it a schema definition?
│        ├─ YES → Place in server/infrastructure/schema/
│        ├─ NO → Is it a migration?
│        │        ├─ YES → Generated in drizzle/
│        │        └─ NO → Is it a repository/data access?
│        │                 └─ YES → Place in server/infrastructure/repositories/
└─ NO → Continue to next decision tree
```

#### Decision Tree 6: API Code

```
Is this API-related code?
├─ YES → Is it a contract definition (types)?
│        ├─ YES → Place in shared/types/api/
│        ├─ NO → Is it a route handler?
│        │        ├─ YES → Place in server/routes/
│        │        └─ NO → Is it an API client?
│        │                 └─ YES → Place in client/src/api/
└─ NO → Review all decision trees again
```

---

## Layer Boundaries

### Client Layer Boundaries

**Location**: `client/`

**Responsibilities**:
- User interface components
- Client-side state management (Redux)
- API client calls
- Client-side routing
- Form handling and validation

**Allowed Imports**:
- ✅ `@shared/types`
- ✅ `@shared/validation`
- ✅ `@shared/utils` (client-safe utilities only)
- ✅ `@shared/constants`
- ❌ `server/*` (never import from server)

**Example**:
```typescript
// ✅ CORRECT: Client imports from shared
import { User, CreateUserRequest } from '@shared/types';
import { CreateUserRequestSchema } from '@shared/validation';
import { formatDate } from '@shared/utils/formatters';

// ❌ WRONG: Client importing from server
import { UserService } from 'server/services/user.service'; // Don't do this!
```

---

### Server Layer Boundaries

**Location**: `server/`

**Responsibilities**:
- Business logic and domain operations
- API route handlers
- Database access via repositories
- Authentication and authorization
- Server-side validation

**Allowed Imports**:
- ✅ `@shared/types`
- ✅ `@shared/validation`
- ✅ `@shared/utils`
- ✅ `@shared/constants`
- ❌ `client/*` (never import from client)

**Example**:
```typescript
// ✅ CORRECT: Server imports from shared
import { User, CreateUserRequest } from '@shared/types';
import { CreateUserRequestSchema } from '@shared/validation';
import { UserDbToDomain } from '@shared/utils/transformers';

// ❌ WRONG: Server importing from client
import { UserForm } from 'client/src/features/users'; // Don't do this!
```

---

### Shared Layer Boundaries

**Location**: `shared/`

**Responsibilities**:
- Type definitions
- Validation schemas
- Transformation utilities
- Formatting utilities
- Constants and enums

**Allowed Imports**:
- ✅ External libraries (zod, date-fns, etc.)
- ❌ `client/*` (would break server usage)
- ❌ `server/*` (would break client usage)
- ❌ Server-only libraries (pino, pg, express, etc.)

**Example**:
```typescript
// ✅ CORRECT: Shared imports only external libraries
import { z } from 'zod';
import { format } from 'date-fns';

// ❌ WRONG: Shared importing server libraries
import { Logger } from 'pino'; // Don't do this!
import { Pool } from 'pg'; // Don't do this!
```

---

### Database Layer Boundaries

**Location**: `server/infrastructure/schema/`

**Responsibilities**:
- Schema definitions using Drizzle ORM
- Table relationships
- Database constraints
- Type generation

**Allowed Imports**:
- ✅ `drizzle-orm`
- ✅ `@shared/types` (for enum alignment)
- ❌ Business logic
- ❌ API handlers

**Example**:
```typescript
// ✅ CORRECT: Schema imports Drizzle and shared enums
import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { UserRole } from '@shared/types/domains/user';

// ❌ WRONG: Schema importing business logic
import { UserService } from 'server/services/user.service'; // Don't do this!
```

---

## Integration Points

### 1. Database → Server Integration

**Integration Point**: Drizzle ORM

**Data Flow**:
```
Database Schema (Drizzle)
    ↓ (type generation)
Database Types (shared/types/database)
    ↓ (transformation)
Domain Types (shared/types/domains)
```

**Implementation**:
```typescript
// 1. Define schema
// server/infrastructure/schema/foundation.ts
export const users = pgTable('users', { ... });
export type UserTable = typeof users.$inferSelect;

// 2. Transform to domain type
// shared/utils/transformers/user.transformer.ts
export const UserDbToDomain = {
  transform(dbUser: UserTable): User {
    return {
      id: dbUser.id as UserId,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role as UserRole,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  }
};

// 3. Use in repository
// server/infrastructure/repositories/user.repository.ts
const dbUsers = await db.select().from(users);
const domainUsers = dbUsers.map(UserDbToDomain.transform);
```

---

### 2. Server → Client Integration

**Integration Point**: REST API with typed contracts

**Data Flow**:
```
Domain Types (server)
    ↓ (API transformation)
API Response Types (shared/types/api)
    ↓ (HTTP/JSON)
Client Types (same as API types)
```

**Implementation**:
```typescript
// 1. Define API contract
// shared/types/api/contracts/user.contract.ts
export interface GetUserResponse {
  user: User;
}

// 2. Server endpoint
// server/routes/users.ts
router.get('/users/:id', async (req, res) => {
  const user = await userService.getById(req.params.id);
  const response: GetUserResponse = { user };
  res.json(response);
});

// 3. Client API call
// client/src/api/users.api.ts
export async function getUser(id: string): Promise<GetUserResponse> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

---

### 3. Validation Integration

**Integration Point**: Shared Zod schemas

**Data Flow**:
```
Validation Schema (shared/validation)
    ↓ (client-side)
Form Validation (client)
    ↓ (HTTP request)
Server Validation (server)
    ↓ (database)
Database Constraints
```

**Implementation**:
```typescript
// 1. Define schema
// shared/validation/schemas/user.schema.ts
export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
});

// 2. Client validation
// client/src/features/users/CreateUserForm.tsx
const result = CreateUserRequestSchema.safeParse(formData);
if (!result.success) {
  // Show validation errors
}

// 3. Server validation
// server/routes/users.ts
const validatedData = CreateUserRequestSchema.parse(req.body);
```

---

### 4. Error Handling Integration

**Integration Point**: Standard error structure

**Data Flow**:
```
Error Occurs (any layer)
    ↓ (transformation)
Standard Error (shared/types/errors)
    ↓ (propagation)
Error Response (API)
    ↓ (handling)
Client Error Display
```

**Implementation**:
```typescript
// 1. Transform error
// server/middleware/error-handler.ts
import { transformDatabaseError } from '@shared/utils/errors';

export function errorHandler(err: unknown, req, res, next) {
  const standardError = transformDatabaseError(err);
  res.status(getHttpStatus(standardError.classification)).json(standardError);
}

// 2. Handle in client
// client/src/api/error-handler.ts
import { StandardError } from '@shared/types/errors';

export function handleApiError(error: unknown): StandardError {
  if (isStandardError(error)) {
    return error;
  }
  // Transform to standard error
}
```

---

## Common Patterns

### Pattern 1: Creating a New Domain Entity

**Steps**:
1. Define domain type in `shared/types/domains/{entity}.ts`
2. Create branded ID type in `shared/types/core/branded.ts`
3. Define validation schema in `shared/validation/schemas/{entity}.schema.ts`
4. Create database schema in `server/infrastructure/schema/{entity}.ts`
5. Create transformation utilities in `shared/utils/transformers/{entity}.transformer.ts`
6. Define API contracts in `shared/types/api/contracts/{entity}.contract.ts`

**Example**:
```typescript
// Step 1: Domain type
// shared/types/domains/comment.ts
export interface Comment {
  id: CommentId;
  content: string;
  authorId: UserId;
  billId: BillId;
  createdAt: Date;
}

// Step 2: Branded ID
// shared/types/core/branded.ts
export type CommentId = string & { readonly __brand: 'CommentId' };

// Step 3: Validation schema
// shared/validation/schemas/comment.schema.ts
export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  billId: z.string().uuid(),
});

// Step 4: Database schema
// server/infrastructure/schema/comments.ts
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  author_id: uuid('author_id').notNull().references(() => users.id),
  bill_id: uuid('bill_id').notNull().references(() => bills.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// Step 5: Transformer
// shared/utils/transformers/comment.transformer.ts
export const CommentDbToDomain = {
  transform(dbComment: CommentTable): Comment {
    return {
      id: dbComment.id as CommentId,
      content: dbComment.content,
      authorId: dbComment.author_id as UserId,
      billId: dbComment.bill_id as BillId,
      createdAt: dbComment.created_at,
    };
  }
};

// Step 6: API contract
// shared/types/api/contracts/comment.contract.ts
export interface CreateCommentRequest {
  content: string;
  billId: string;
}

export interface CreateCommentResponse {
  comment: Comment;
}
```

---

### Pattern 2: Adding a New API Endpoint

**Steps**:
1. Define request/response types in `shared/types/api/contracts/`
2. Create validation schemas in `shared/validation/schemas/`
3. Implement route handler in `server/routes/`
4. Create API client function in `client/src/api/`

**Example**:
```typescript
// Step 1: API contract
// shared/types/api/contracts/bill.contract.ts
export interface UpdateBillStatusRequest {
  status: BillStatus;
}

export interface UpdateBillStatusResponse {
  bill: Bill;
}

// Step 2: Validation schema
// shared/validation/schemas/bill.schema.ts
export const UpdateBillStatusSchema = z.object({
  status: z.enum(['draft', 'introduced', 'in_committee', 'passed', 'rejected']),
});

// Step 3: Route handler
// server/routes/bills.ts
router.patch('/bills/:id/status', async (req, res) => {
  const validatedData = UpdateBillStatusSchema.parse(req.body);
  const bill = await billService.updateStatus(req.params.id, validatedData.status);
  const response: UpdateBillStatusResponse = { bill };
  res.json(response);
});

// Step 4: API client
// client/src/api/bills.api.ts
export async function updateBillStatus(
  id: string,
  request: UpdateBillStatusRequest
): Promise<UpdateBillStatusResponse> {
  const response = await fetch(`/api/bills/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
}
```

---

### Pattern 3: Creating Shared Utilities

**Steps**:
1. Determine if utility is client-safe (no server dependencies)
2. Place in appropriate `shared/utils/` subdirectory
3. Export from `shared/utils/index.ts`
4. Document client-safety in JSDoc

**Example**:
```typescript
// shared/utils/formatters/currency.ts
/**
 * Formats a number as Kenyan Shillings currency
 * @client-safe This utility is safe for use in both client and server
 */
export function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
}

// Export from index
// shared/utils/index.ts
export { formatKES } from './formatters/currency';
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Duplicating Types

**Problem**: Defining the same entity type in multiple places

**Wrong**:
```typescript
// client/src/types/user.ts
interface User {
  id: string;
  email: string;
  username: string;
}

// server/types/user.ts
interface User {
  id: string;
  email: string;
  username: string;
}
```

**Correct**:
```typescript
// shared/types/domains/user.ts
export interface User {
  id: UserId;
  email: string;
  username: string;
}

// Both client and server import from shared
import { User } from '@shared/types';
```

---

### ❌ Anti-Pattern 2: Server Code in Shared Layer

**Problem**: Including server-only dependencies in shared code

**Wrong**:
```typescript
// shared/utils/logger.ts
import { Logger } from 'pino'; // Server-only library!

export const logger = new Logger();
```

**Correct**:
```typescript
// server/utils/logger.ts
import { Logger } from 'pino';

export const logger = new Logger();

// Shared layer has no logging utilities
```

---

### ❌ Anti-Pattern 3: Inline API Types

**Problem**: Defining API types inline in route handlers or API clients

**Wrong**:
```typescript
// server/routes/users.ts
router.post('/users', async (req, res) => {
  // Inline type definition
  const data: { email: string; username: string } = req.body;
  // ...
});
```

**Correct**:
```typescript
// shared/types/api/contracts/user.contract.ts
export interface CreateUserRequest {
  email: string;
  username: string;
}

// server/routes/users.ts
import { CreateUserRequest } from '@shared/types/api';

router.post('/users', async (req, res) => {
  const data: CreateUserRequest = req.body;
  // ...
});
```

---

### ❌ Anti-Pattern 4: Circular Dependencies

**Problem**: Creating import cycles between layers

**Wrong**:
```typescript
// shared/types/user.ts
import { UserService } from 'server/services/user.service'; // Circular!

// server/services/user.service.ts
import { User } from '@shared/types/user'; // Circular!
```

**Correct**:
```typescript
// shared/types/domains/user.ts
export interface User {
  id: UserId;
  email: string;
}
// No imports from server

// server/services/user.service.ts
import { User } from '@shared/types';
// One-way dependency: server → shared
```

---

### ❌ Anti-Pattern 5: Skipping Validation

**Problem**: Not validating data at layer boundaries

**Wrong**:
```typescript
// server/routes/users.ts
router.post('/users', async (req, res) => {
  // No validation!
  const user = await userService.create(req.body);
  res.json(user);
});
```

**Correct**:
```typescript
// server/routes/users.ts
import { CreateUserRequestSchema } from '@shared/validation';

router.post('/users', async (req, res) => {
  // Validate at boundary
  const validatedData = CreateUserRequestSchema.parse(req.body);
  const user = await userService.create(validatedData);
  res.json(user);
});
```

---

### ❌ Anti-Pattern 6: Mixed Concerns in Transformers

**Problem**: Including business logic in transformation functions

**Wrong**:
```typescript
// shared/utils/transformers/user.transformer.ts
export const UserDbToDomain = {
  transform(dbUser: UserTable): User {
    // Business logic doesn't belong here!
    if (dbUser.email.includes('admin')) {
      dbUser.role = 'admin';
    }
    
    return {
      id: dbUser.id as UserId,
      email: dbUser.email,
      role: dbUser.role as UserRole,
    };
  }
};
```

**Correct**:
```typescript
// shared/utils/transformers/user.transformer.ts
export const UserDbToDomain = {
  transform(dbUser: UserTable): User {
    // Pure transformation only
    return {
      id: dbUser.id as UserId,
      email: dbUser.email,
      role: dbUser.role as UserRole,
    };
  }
};

// Business logic belongs in service layer
// server/services/user.service.ts
export class UserService {
  async promoteToAdmin(userId: UserId): Promise<User> {
    // Business logic here
  }
}
```

---

## Quick Reference

### File Placement Cheat Sheet

| Code Type | Location | Example |
|-----------|----------|---------|
| Domain Types | `shared/types/domains/` | `user.ts`, `bill.ts` |
| API Contracts | `shared/types/api/contracts/` | `user.contract.ts` |
| Validation Schemas | `shared/validation/schemas/` | `user.schema.ts` |
| Transformers | `shared/utils/transformers/` | `user.transformer.ts` |
| Formatters | `shared/utils/formatters/` | `date.ts`, `currency.ts` |
| Database Schemas | `server/infrastructure/schema/` | `foundation.ts` |
| Route Handlers | `server/routes/` | `users.ts`, `bills.ts` |
| Services | `server/services/` | `user.service.ts` |
| Repositories | `server/infrastructure/repositories/` | `user.repository.ts` |
| React Components | `client/src/features/` | `UserList.tsx` |
| API Clients | `client/src/api/` | `users.api.ts` |
| Error Types | `shared/types/errors.ts` | Single file |
| Constants | `shared/constants/` | `app.ts`, `api.ts` |

### Import Path Reference

```typescript
// Shared layer imports
import { User } from '@shared/types';
import { CreateUserRequestSchema } from '@shared/validation';
import { formatDate } from '@shared/utils';
import { API_BASE_URL } from '@shared/constants';

// Server layer imports (server code only)
import { UserService } from 'server/services/user.service';
import { users } from 'server/infrastructure/schema/foundation';

// Client layer imports (client code only)
import { UserList } from 'client/src/features/users/UserList';
import { useAuth } from 'client/src/hooks/useAuth';
```

---

## Validation Checklist

Before committing code, verify:

- [ ] Types are defined once in shared layer (no duplicates)
- [ ] Validation schemas exist for all API endpoints
- [ ] Transformers exist for database ↔ domain conversions
- [ ] API contracts are defined in shared layer
- [ ] No circular dependencies between layers
- [ ] Shared layer has no server-only dependencies
- [ ] Client never imports from server
- [ ] Server never imports from client
- [ ] Branded types used for all entity IDs
- [ ] Error types use standard error structure
- [ ] Constants are in appropriate location
- [ ] Documentation updated for new patterns

---

## Related Documentation

- [Architecture Overview](../technical/architecture.md)
- [API Consumer Guide](./api-consumer-guide.md)
- [Developer Onboarding](./developer-onboarding.md)
- [Migration Process](../technical/MIGRATION_LOG.md)
- [Boundary Definitions](../technical/BOUNDARY_DEFINITIONS.md)

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: Chanuka Platform Team  
**Related Spec**: `.kiro/specs/full-stack-integration/`
