# Shared Types - Single Source of Truth

This directory contains the consolidated type system for the Chanuka Platform. All type definitions are centralized here to ensure consistency across client, server, and database layers.

## Documentation

- **[README.md](./README.md)** - This file, overview of the type system
- **[IMPORT_PATTERNS.md](./IMPORT_PATTERNS.md)** - Comprehensive guide on how to import types across all layers
- **[verify-dependencies.ts](./verify-dependencies.ts)** - Script to verify no circular dependencies exist

## Quick Start

### Importing Types

```typescript
// ✅ Import from the main module (recommended)
import { User, Bill, UserRole, BillStatus, UserId } from '@shared/types';

// ✅ Import specific types when needed
import type { CreateUserRequest, CreateUserResponse } from '@shared/types';
```

### Layer-Specific Import Patterns

For detailed import patterns for each layer, see **[IMPORT_PATTERNS.md](./IMPORT_PATTERNS.md)**.

**Quick Reference:**

- **Client Layer**: Import from `@shared/types` for all type needs
- **Server Layer**: Import from `@shared/types` for domain, API, and database types
- **Shared Layer**: Use relative imports, follow dependency hierarchy
- **Database Layer**: Import branded types and enums from `@shared/types`

## Directory Structure

```
shared/types/
├── core/              # Core types and utilities
│   ├── base.ts        # Base entity types
│   ├── branded.ts     # Branded types for IDs
│   ├── common.ts      # Common utility types
│   ├── enums.ts       # All shared enums (SINGLE SOURCE OF TRUTH)
│   ├── errors.ts      # Error types
│   ├── validation.ts  # Validation types
│   └── index.ts       # Core exports
│
├── domains/           # Domain entity types
│   ├── authentication/
│   │   ├── user.ts    # User entity types
│   │   └── index.ts
│   ├── legislative/
│   │   ├── bill.ts    # Bill entity types
│   │   ├── comment.ts # Comment entity types
│   │   └── index.ts
│   └── ...
│
├── api/               # API contract types
│   ├── contracts/
│   │   ├── user.contract.ts    # User API contracts
│   │   ├── bill.contract.ts    # Bill API contracts
│   │   ├── comment.contract.ts # Comment API contracts
│   │   └── index.ts
│   ├── request-types.ts
│   ├── response-types.ts
│   ├── error-types.ts
│   └── index.ts
│
├── database/          # Database table types
│   ├── tables.ts      # Database table definitions
│   └── index.ts
│
├── validation/        # Validation schema types
│   ├── schemas.ts     # Validation type definitions
│   └── index.ts
│
├── index.ts           # Main type system export
└── README.md          # This file
```

## Key Principles

### 1. Single Source of Truth

Each entity, type, and enum is defined **exactly once** in this directory. All other layers import from here.

**✅ Correct:**
```typescript
// In any file
import { UserRole, BillStatus } from '@shared/types';
```

**❌ Incorrect:**
```typescript
// Don't redefine enums elsewhere
export enum UserRole {
  Admin = 'admin',
  User = 'user'
}
```

### 2. Branded Types for IDs

All entity identifiers use branded types to prevent ID mixing:

```typescript
import { UserId, BillId } from '@shared/types';

const userId: UserId = '123' as UserId;
const billId: BillId = '456' as BillId;

function getUser(id: UserId) { ... }
getUser(billId); // TypeScript error!
```

### 3. Layer Separation

Types are organized by their purpose:

- **Core**: Base types, branded types, enums used everywhere
- **Domains**: Business entity types (User, Bill, Comment)
- **API**: Request/response contracts between client and server
- **Database**: Table definitions that mirror database schema
- **Validation**: Runtime validation type definitions

### 4. No Circular Dependencies

The type system is designed to prevent circular dependencies:

```
Core Types (base, branded, enums)
    ↓
Domain Types (user, bill, comment)
    ↓
API Contracts (requests, responses)
    ↓
Database Types (tables)
```

## Usage Examples

### Importing Types

```typescript
// Import from the main index
import { 
  User, 
  Bill, 
  Comment,
  UserRole,
  BillStatus,
  UserId,
  BillId 
} from '@shared/types';

// Or import from specific modules
import { User } from '@shared/types/domains/authentication';
import { Bill } from '@shared/types/domains/legislative';
import { CreateUserRequest } from '@shared/types/api/contracts';
```

### Using Branded Types

```typescript
import { UserId, BillId, brand } from '@shared/types';

// Create branded IDs
const userId = brand<string, 'UserId'>('user-123');
const billId = brand<string, 'BillId'>('bill-456');

// Type-safe function signatures
function getUserById(id: UserId): Promise<User> {
  // Implementation
}

// This works
getUserById(userId);

// This causes a TypeScript error
getUserById(billId); // Error: BillId is not assignable to UserId
```

### Using Enums

```typescript
import { UserRole, BillStatus } from '@shared/types';

const user: User = {
  id: userId,
  email: 'user@example.com',
  username: 'testuser',
  role: UserRole.Citizen, // Use enum value
  status: UserStatus.Active,
  // ...
};

const bill: Bill = {
  id: billId,
  title: 'Test Bill',
  status: BillStatus.Introduced, // Use enum value
  // ...
};
```

### API Contracts

```typescript
import { 
  CreateUserRequest, 
  CreateUserResponse,
  GetBillRequest,
  GetBillResponse 
} from '@shared/types';

// Server endpoint
async function createUser(req: CreateUserRequest): Promise<CreateUserResponse> {
  // Implementation
}

// Client API call
async function fetchBill(id: string): Promise<GetBillResponse> {
  const request: GetBillRequest = { id };
  // Make API call
}
```

### Database Types

```typescript
import { UserTable, BillTable } from '@shared/types/database';

// Database query result
const dbUser: UserTable = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

// Transform to domain type
const domainUser: User = transformUserDbToDomain(dbUser);
```

## Adding New Types

### Adding a New Entity

1. Create domain type in `domains/{domain}/{entity}.ts`
2. Add API contracts in `api/contracts/{entity}.contract.ts`
3. Add database table type in `database/tables.ts`
4. Export from respective index files

### Adding a New Enum

1. Add enum to `core/enums.ts` (ONLY place for shared enums)
2. Export from `core/index.ts`
3. Use the enum in domain types

### Adding a New Branded Type

1. Add branded type definition to `core/branded.ts`
2. Export from `core/index.ts`
3. Use in domain types

## Type Alignment

The type system ensures alignment across layers:

```
Database Schema (PostgreSQL)
    ↓ (Drizzle generates)
Database Types (shared/types/database)
    ↓ (Transform)
Domain Types (shared/types/domains)
    ↓ (API Contract)
API Types (shared/types/api)
    ↓ (Serialize)
Client Types (same as API types)
```

## Validation

Runtime validation schemas are defined in `shared/validation/` and use types from this directory:

```typescript
import { z } from 'zod';
import { UserRole, UserStatus } from '@shared/types';

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole).optional(),
});
```

## Migration Safety

When modifying types:

1. Update the type definition in the appropriate file
2. Update all dependent types
3. Update validation schemas in `shared/validation/`
4. Update database schema if needed
5. Run type alignment verification
6. Update API contracts if needed

## Version

Current version: 2.0.0

This represents the consolidated type system with single source of truth for all entities.

## Verifying Dependencies

To ensure the type system maintains its integrity and has no circular dependencies, run the verification script:

```bash
npx tsx shared/types/verify-dependencies.ts
```

This script will:
- Check all TypeScript files in the type system
- Verify imports follow the correct layer hierarchy
- Report any dependency violations
- Generate a dependency graph

The script enforces these rules:
- Core types cannot import from any other layer
- Domain types can only import from core
- API types can import from core and domains
- Database types can import from core and domains
- Validation types can import from core, domains, and api

## Continuous Integration

Add the dependency verification to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Verify Type Dependencies
  run: npx tsx shared/types/verify-dependencies.ts
```

This ensures that all pull requests maintain the correct dependency structure.
