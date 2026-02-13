# Import Patterns Guide

This document provides comprehensive guidance on how to import types from the shared type system across all layers of the Chanuka Platform.

## Table of Contents

1. [Overview](#overview)
2. [Layer-Specific Import Patterns](#layer-specific-import-patterns)
3. [Dependency Rules](#dependency-rules)
4. [Common Import Examples](#common-import-examples)
5. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
6. [Troubleshooting](#troubleshooting)

## Overview

The shared type system is organized into layers with a strict dependency hierarchy to prevent circular dependencies and ensure maintainability.

### Layer Hierarchy

```
Core Types (branded, enums, base)
     ↓
Domain Types (user, bill, comment)
     ↓
API Types (requests, responses, contracts)
     ↓
Database Types (tables, relations)
     ↓
Validation Types (schemas)
```

### Key Principles

1. **Single Source of Truth**: Import all types from `@shared/types`
2. **No Redefinition**: Never redefine types that exist in shared
3. **Respect Dependencies**: Follow the layer hierarchy
4. **Use Index Exports**: Import through index files, not direct file paths

## Layer-Specific Import Patterns

### Client Layer Imports

The client layer (React frontend) should import types for:
- UI state management
- API calls
- Form validation
- Component props

#### Recommended Imports

```typescript
// ✅ Import from the main shared types module
import { 
  User, 
  Bill, 
  Comment,
  UserRole,
  BillStatus,
  CreateUserRequest,
  CreateBillResponse,
  UserId,
  BillId
} from '@shared/types';

// ✅ Import specific domain types when needed
import type { UserProfile, UserPreferences } from '@shared/types';

// ✅ Import API contract types for API calls
import type { 
  CreateUserRequest,
  CreateUserResponse,
  GetBillRequest,
  GetBillResponse
} from '@shared/types';
```

#### Client Usage Examples

```typescript
// Component props using domain types
interface UserCardProps {
  user: User;
  onEdit: (userId: UserId) => void;
}

// Redux state using domain types
interface AuthState {
  currentUser: User | null;
  status: LoadingState;
  error: string | null;
}

// API call using contract types
async function createUser(
  request: CreateUserRequest
): Promise<CreateUserResponse> {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.json();
}

// Form validation using enums
const roleOptions = [
  { value: UserRole.Citizen, label: 'Citizen' },
  { value: UserRole.Expert, label: 'Expert' },
  { value: UserRole.Moderator, label: 'Moderator' },
];
```

### Server Layer Imports

The server layer (Node.js/Express backend) should import types for:
- Request/response handling
- Business logic
- Data access layer
- Validation

#### Recommended Imports

```typescript
// ✅ Import from the main shared types module
import { 
  User, 
  Bill,
  UserTable,
  BillTable,
  CreateUserRequest,
  CreateUserResponse,
  UserRole,
  BillStatus,
  UserId,
  BillId
} from '@shared/types';

// ✅ Import database types for data access
import type { UserTable, BillTable } from '@shared/types/database';

// ✅ Import API types for request/response
import type { 
  CreateUserRequest,
  CreateUserResponse 
} from '@shared/types/api';

// ✅ Import validation types
import type { ValidatedUser } from '@shared/types/validation';
```

#### Server Usage Examples

```typescript
// Express route handler using API contract types
app.post('/api/users', async (
  req: Request<{}, CreateUserResponse, CreateUserRequest>,
  res: Response<CreateUserResponse>
) => {
  const request = req.body;
  const user = await userService.createUser(request);
  res.json({ user, token: generateToken(user.id) });
});

// Service layer using domain types
class UserService {
  async createUser(request: CreateUserRequest): Promise<User> {
    // Business logic using domain types
    const user: User = {
      id: generateId() as UserId,
      email: request.email,
      username: request.username,
      role: request.role || UserRole.Citizen,
      // ... other fields
    };
    
    return await this.userRepository.save(user);
  }
}

// Repository layer using database types
class UserRepository {
  async save(user: User): Promise<User> {
    // Transform domain type to database type
    const dbUser: UserTable = transformUserToDb(user);
    
    // Save to database
    const result = await db.insert(users).values(dbUser).returning();
    
    // Transform back to domain type
    return transformDbToUser(result[0]);
  }
}
```

### Shared Layer Imports

Within the shared layer itself, use relative imports and respect the dependency hierarchy.

#### Core Types (shared/types/core)

```typescript
// ✅ Core types can only import from other core files
// No imports from domains, api, database, or validation

// In branded.ts
export type UserId = Branded<string, 'UserId'>;

// In enums.ts
export enum UserRole {
  Citizen = 'citizen',
  Admin = 'admin',
}
```

#### Domain Types (shared/types/domains)

```typescript
// ✅ Domain types can import from core
import { UserId } from '../../core/branded';
import { UserRole, UserStatus } from '../../core/enums';
import { BaseEntity } from '../../core/base';

// ✅ Define domain entity
export interface User extends BaseEntity {
  id: UserId;
  email: string;
  role: UserRole;
  status: UserStatus;
}

// ❌ Domain types MUST NOT import from api, database, or validation
// import { CreateUserRequest } from '../../api'; // WRONG!
```

#### API Types (shared/types/api)

```typescript
// ✅ API types can import from core and domains
import { User } from '../../domains/authentication';
import { UserId } from '../../core/branded';

// ✅ Define API contract
export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
}

export interface CreateUserResponse {
  user: User;
  token: string;
}

// ❌ API types MUST NOT import from database or validation
// import { UserTable } from '../../database'; // WRONG!
```

#### Database Types (shared/types/database)

```typescript
// ✅ Database types can import from core and domains
import { UserId } from '../core/branded';
import { UserRole } from '../core/enums';

// ✅ Define database table type
export interface UserTable {
  id: string; // Raw string, not branded
  email: string;
  username: string;
  role: string; // Raw string, not enum
  created_at: Date;
  updated_at: Date;
}

// ❌ Database types MUST NOT import from api or validation
// import { CreateUserRequest } from '../api'; // WRONG!
```

#### Validation Types (shared/types/validation)

```typescript
// ✅ Validation types can import from core, domains, and api
import { z } from 'zod';
import { UserRole } from '../core/enums';
import { User } from '../domains/authentication';
import { CreateUserRequest } from '../api';

// ✅ Define validation schema
export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole).optional(),
});

// ✅ Infer validated type
export type ValidatedCreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// ❌ Validation types MUST NOT import from database
// import { UserTable } from '../database'; // WRONG!
```

### Database Layer Imports

The database layer (Drizzle schema definitions) should import:
- Branded types for type safety
- Enums for constraints

#### Recommended Imports

```typescript
// ✅ Import from shared types
import { UserRole, BillStatus } from '@shared/types';

// ✅ Use in schema definitions
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull(),
  // Use enum values in check constraints
  // CHECK (role IN ('citizen', 'expert', 'moderator', 'admin'))
});

// ✅ Type inference
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

## Dependency Rules

### Allowed Dependencies

| Layer      | Can Import From                    |
|------------|-----------------------------------|
| Core       | (none - foundation layer)         |
| Domains    | Core                              |
| API        | Core, Domains                     |
| Database   | Core, Domains                     |
| Validation | Core, Domains, API                |

### Forbidden Dependencies

- Core → Domains, API, Database, Validation
- Domains → API, Database, Validation
- API → Database, Validation
- Database → API, Validation
- Validation → Database

### Within-Layer Imports

When importing within the same layer:

```typescript
// ✅ Use relative imports
import { UserId } from './branded';
import { UserRole } from './enums';

// ❌ Don't use absolute imports within the same layer
import { UserId } from '@shared/types/core/branded'; // WRONG!
```

## Common Import Examples

### Example 1: Creating a New User (Full Stack)

#### Client Component

```typescript
import { useState } from 'react';
import { User, CreateUserRequest, UserRole } from '@shared/types';

function CreateUserForm() {
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    username: '',
    password: '',
    role: UserRole.Citizen,
  });

  const handleSubmit = async () => {
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    const data: CreateUserResponse = await response.json();
    console.log('Created user:', data.user);
  };

  return (/* form JSX */);
}
```

#### Server Route

```typescript
import { Request, Response } from 'express';
import { 
  CreateUserRequest, 
  CreateUserResponse,
  User,
  UserId 
} from '@shared/types';

app.post('/api/users', async (
  req: Request<{}, CreateUserResponse, CreateUserRequest>,
  res: Response<CreateUserResponse>
) => {
  const request = req.body;
  const user = await createUser(request);
  const token = generateToken(user.id);
  res.json({ user, token });
});
```

#### Server Service

```typescript
import { 
  User, 
  CreateUserRequest,
  UserRole,
  UserStatus,
  UserId 
} from '@shared/types';

async function createUser(request: CreateUserRequest): Promise<User> {
  const user: User = {
    id: generateId() as UserId,
    email: request.email,
    username: request.username,
    role: request.role || UserRole.Citizen,
    status: UserStatus.Active,
    // ... other fields
  };
  
  return await userRepository.save(user);
}
```

### Example 2: Querying Bills

#### Client Hook

```typescript
import { useEffect, useState } from 'react';
import { Bill, BillStatus, LoadingState } from '@shared/types';

function useBills(status?: BillStatus) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Idle);

  useEffect(() => {
    async function fetchBills() {
      setLoading(LoadingState.Loading);
      try {
        const response = await fetch(`/api/bills?status=${status}`);
        const data: Bill[] = await response.json();
        setBills(data);
        setLoading(LoadingState.Success);
      } catch (error) {
        setLoading(LoadingState.Error);
      }
    }
    fetchBills();
  }, [status]);

  return { bills, loading };
}
```

#### Server Route

```typescript
import { Request, Response } from 'express';
import { Bill, BillStatus } from '@shared/types';

app.get('/api/bills', async (
  req: Request<{}, Bill[], {}, { status?: BillStatus }>,
  res: Response<Bill[]>
) => {
  const { status } = req.query;
  const bills = await billService.findByStatus(status);
  res.json(bills);
});
```

### Example 3: Form Validation

#### Client Validation

```typescript
import { z } from 'zod';
import { UserRole } from '@shared/types';
import { CreateUserRequestSchema } from '@shared/validation';

function validateUserForm(data: unknown) {
  try {
    const validated = CreateUserRequestSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    throw error;
  }
}
```

#### Server Validation Middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import { CreateUserRequestSchema } from '@shared/validation';

function validateCreateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    req.body = CreateUserRequestSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Validation failed', details: error });
  }
}

app.post('/api/users', validateCreateUser, createUserHandler);
```

## Anti-Patterns to Avoid

### ❌ Redefining Types

```typescript
// WRONG: Redefining enum that exists in shared
export enum UserRole {
  Admin = 'admin',
  User = 'user'
}

// CORRECT: Import from shared
import { UserRole } from '@shared/types';
```

### ❌ Circular Dependencies

```typescript
// WRONG: API importing from database
// In shared/types/api/user.ts
import { UserTable } from '../database'; // Creates circular dependency

// CORRECT: API imports from domains only
import { User } from '../domains/authentication';
```

### ❌ Direct File Imports

```typescript
// WRONG: Importing directly from file
import { User } from '@shared/types/domains/authentication/user';

// CORRECT: Import from index
import { User } from '@shared/types';
```

### ❌ Mixing Raw and Branded Types

```typescript
// WRONG: Using raw string where branded type expected
function getUser(id: string): Promise<User> { ... }

// CORRECT: Use branded type
function getUser(id: UserId): Promise<User> { ... }
```

### ❌ Importing Validation in Database Layer

```typescript
// WRONG: Database importing validation
// In shared/types/database/tables.ts
import { CreateUserRequestSchema } from '../validation';

// CORRECT: Database only imports core and domains
import { UserId, UserRole } from '../core';
```

## Troubleshooting

### Circular Dependency Errors

**Symptom**: Build fails with "Circular dependency detected"

**Solution**:
1. Check the import chain
2. Ensure you're following the layer hierarchy
3. Move shared types to a lower layer (e.g., from API to domains)
4. Use type-only imports when possible: `import type { ... }`

### Type Not Found

**Symptom**: TypeScript error "Cannot find name 'User'"

**Solution**:
1. Ensure the type is exported from its index file
2. Check that you're importing from `@shared/types`
3. Verify the type exists in the shared layer
4. Check for typos in the import statement

### Branded Type Errors

**Symptom**: "Type 'string' is not assignable to type 'UserId'"

**Solution**:
1. Use type assertion: `'123' as UserId`
2. Use the brand utility: `brand<string, 'UserId'>('123')`
3. Ensure you're using branded types consistently

### Import Path Errors

**Symptom**: Module not found errors

**Solution**:
1. Check your tsconfig.json paths configuration
2. Ensure `@shared` alias is configured correctly
3. Use relative imports within the shared layer
4. Verify the file exists at the import path

## Best Practices

1. **Always import from `@shared/types`** in client and server layers
2. **Use type-only imports** when you only need types: `import type { ... }`
3. **Follow the layer hierarchy** to prevent circular dependencies
4. **Use branded types** for all entity identifiers
5. **Import enums from shared** - never redefine them
6. **Document your imports** when the usage is non-obvious
7. **Use index exports** - don't import from deep file paths
8. **Keep imports organized** - group by layer (core, domains, api, etc.)

## Summary

The shared type system provides a robust foundation for type safety across the entire Chanuka Platform. By following these import patterns and respecting the layer hierarchy, you ensure:

- No circular dependencies
- Single source of truth for all types
- Type safety across all layers
- Maintainable and scalable codebase
- Clear separation of concerns

For questions or issues, refer to the main [README.md](./README.md) or consult the team.
