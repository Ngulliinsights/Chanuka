# Template: New Domain Entity

## Overview

Use this template when adding a new domain entity to the Chanuka Platform. This template ensures full-stack integration following established patterns.

**Replace placeholders:**
- `{Entity}` - Entity name in PascalCase (e.g., `Vote`, `Comment`, `Committee`)
- `{entity}` - Entity name in camelCase (e.g., `vote`, `comment`, `committee`)
- `{ENTITY}` - Entity name in UPPER_CASE (e.g., `VOTE`, `COMMENT`, `COMMITTEE`)
- `{entities}` - Plural form in camelCase (e.g., `votes`, `comments`, `committees`)
- `{description}` - Brief description of the entity

## Checklist

- [ ] Step 1: Define branded ID type
- [ ] Step 2: Define domain type
- [ ] Step 3: Create database schema
- [ ] Step 4: Create validation schemas
- [ ] Step 5: Create transformation utilities
- [ ] Step 6: Define API contracts
- [ ] Step 7: Create repository layer
- [ ] Step 8: Create service layer
- [ ] Step 9: Create API routes
- [ ] Step 10: Create client API layer
- [ ] Step 11: Create client components (optional)
- [ ] Step 12: Write tests

---

## Step 1: Define Branded ID Type

**File**: `shared/types/core/branded.ts`

```typescript
// Add to existing branded types
export type {Entity}Id = string & { readonly __brand: '{Entity}Id' };
```

---

## Step 2: Define Domain Type

**File**: `shared/types/domains/{entity}.ts`

```typescript
import type { {Entity}Id } from '../core/branded';
// Import other related IDs as needed
// import type { UserId } from './user';

// Define enums if needed
export enum {Entity}Status {
  Active = 'active',
  Inactive = 'inactive',
  // Add other statuses as needed
}

// Define the main entity interface
export interface {Entity} {
  id: {Entity}Id;
  // Add entity fields here
  // Example: name: string;
  // Example: userId: UserId;
  // Example: status: {Entity}Status;
  createdAt: Date;
  updatedAt: Date;
}
```

**Export from domain types index**:

**File**: `shared/types/domains/index.ts`

```typescript
export * from './{entity}';
```

---

## Step 3: Create Database Schema

**File**: `server/infrastructure/schema/{entities}.ts`

```typescript
import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
// Import related tables as needed
// import { users } from './foundation';

export const {entities} = pgTable('{entities}', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Add columns here
  // Example: name: varchar('name', { length: 255 }).notNull(),
  // Example: user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Example: status: varchar('status', { length: 50 }).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Inferred types
export type {Entity}Table = typeof {entities}.$inferSelect;
export type New{Entity} = typeof {entities}.$inferInsert;

// Define relations if needed
// export const {entities}Relations = relations({entities}, ({ one, many }) => ({
//   user: one(users, { fields: [{entities}.user_id], references: [users.id] }),
// }));
```

**Export from schema index**:

**File**: `server/infrastructure/schema/index.ts`

```typescript
export * from './{entities}';
```

**Generate migration**:

```bash
npm run db:generate
# Enter migration name: add_{entity}_table
```

---

## Step 4: Create Validation Schemas

**File**: `shared/validation/schemas/{entity}.schema.ts`

```typescript
import { z } from 'zod';

// Define enum schemas if needed
export const {Entity}StatusSchema = z.enum(['active', 'inactive']);

// Create entity request schema
export const Create{Entity}RequestSchema = z.object({
  // Add required fields for creation
  // Example: name: z.string().min(1).max(255),
  // Example: userId: z.string().uuid(),
});

// Update entity request schema
export const Update{Entity}RequestSchema = z.object({
  // Add optional fields for updates
  // Example: name: z.string().min(1).max(255).optional(),
  // Example: status: {Entity}StatusSchema.optional(),
});

// Full entity schema
export const {Entity}Schema = z.object({
  id: z.string().uuid(),
  // Add all entity fields
  // Example: name: z.string(),
  // Example: userId: z.string().uuid(),
  // Example: status: {Entity}StatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

**Export from validation index**:

**File**: `shared/validation/schemas/index.ts`

```typescript
export * from './{entity}.schema';
```

---

## Step 5: Create Transformation Utilities

**File**: `shared/utils/transformers/{entity}.transformer.ts`

```typescript
import type { {Entity} } from '@shared/types/domains/{entity}';
import type { {Entity}Id } from '@shared/types/core/branded';
import type { {Entity}Table } from '../../../server/infrastructure/schema/{entities}';

export const {Entity}DbToDomain = {
  transform(db{Entity}: {Entity}Table): {Entity} {
    return {
      id: db{Entity}.id as {Entity}Id,
      // Transform fields from database format to domain format
      // Example: name: db{Entity}.name,
      // Example: userId: db{Entity}.user_id as UserId,
      // Example: status: db{Entity}.status as {Entity}Status,
      createdAt: db{Entity}.created_at,
      updatedAt: db{Entity}.updated_at,
    };
  },
  
  reverse({entity}: {Entity}): Omit<{Entity}Table, 'created_at' | 'updated_at'> {
    return {
      id: {entity}.id,
      // Transform fields from domain format to database format
      // Example: name: {entity}.name,
      // Example: user_id: {entity}.userId,
      // Example: status: {entity}.status,
    };
  },
};
```

**Export from transformers index**:

**File**: `shared/utils/transformers/index.ts`

```typescript
export * from './{entity}.transformer';
```

---

## Step 6: Define API Contracts

**File**: `shared/types/api/contracts/{entity}.contract.ts`

```typescript
import type { {Entity} } from '../../domains/{entity}';

export interface Create{Entity}Request {
  // Add required fields for creation
  // Example: name: string;
  // Example: userId: string;
}

export interface Create{Entity}Response {
  {entity}: {Entity};
}

export interface Update{Entity}Request {
  // Add optional fields for updates
  // Example: name?: string;
  // Example: status?: string;
}

export interface Update{Entity}Response {
  {entity}: {Entity};
}

export interface Get{Entity}Response {
  {entity}: {Entity};
}

export interface List{Entity}Response {
  {entities}: {Entity}[];
  total: number;
}
```

**Export from API contracts index**:

**File**: `shared/types/api/contracts/index.ts`

```typescript
export * from './{entity}.contract';
```

---

## Step 7: Create Repository Layer

**File**: `server/infrastructure/repositories/{entity}.repository.ts`

```typescript
import { db } from '../database';
import { {entities}, type {Entity}Table, type New{Entity} } from '../schema/{entities}';
import { eq } from 'drizzle-orm';
import type { {Entity} } from '@shared/types/domains/{entity}';
import type { {Entity}Id } from '@shared/types/core/branded';
import { {Entity}DbToDomain } from '@shared/utils/transformers/{entity}.transformer';

export class {Entity}Repository {
  async create(data: New{Entity}): Promise<{Entity}> {
    const [db{Entity}] = await db.insert({entities}).values(data).returning();
    return {Entity}DbToDomain.transform(db{Entity});
  }

  async findById(id: {Entity}Id): Promise<{Entity} | null> {
    const [db{Entity}] = await db.select().from({entities}).where(eq({entities}.id, id)).limit(1);
    return db{Entity} ? {Entity}DbToDomain.transform(db{Entity}) : null;
  }

  async findAll(): Promise<{Entity}[]> {
    const db{Entity}s = await db.select().from({entities});
    return db{Entity}s.map({Entity}DbToDomain.transform);
  }

  async update(id: {Entity}Id, data: Partial<New{Entity}>): Promise<{Entity}> {
    const [db{Entity}] = await db
      .update({entities})
      .set({ ...data, updated_at: new Date() })
      .where(eq({entities}.id, id))
      .returning();
    return {Entity}DbToDomain.transform(db{Entity});
  }

  async delete(id: {Entity}Id): Promise<void> {
    await db.delete({entities}).where(eq({entities}.id, id));
  }
}
```

---

## Step 8: Create Service Layer

**File**: `server/services/{entity}.service.ts`

```typescript
import { {Entity}Repository } from '../infrastructure/repositories/{entity}.repository';
import type { {Entity} } from '@shared/types/domains/{entity}';
import type { {Entity}Id } from '@shared/types/core/branded';
import { AppError } from '../utils/errors';

export class {Entity}Service {
  constructor(private {entity}Repository: {Entity}Repository) {}

  async create{Entity}(data: /* Define input type */): Promise<{Entity}> {
    // Add business logic validation
    // Example: Check if entity already exists
    
    return this.{entity}Repository.create({
      // Map input data to database format
    });
  }

  async get{Entity}ById(id: {Entity}Id): Promise<{Entity}> {
    const {entity} = await this.{entity}Repository.findById(id);
    if (!{entity}) {
      throw new AppError('{Entity} not found', '{ENTITY}_NOT_FOUND', 404);
    }
    return {entity};
  }

  async getAll{Entity}s(): Promise<{ {entities}: {Entity}[]; total: number }> {
    const {entities} = await this.{entity}Repository.findAll();
    return { {entities}, total: {entities}.length };
  }

  async update{Entity}(id: {Entity}Id, data: /* Define input type */): Promise<{Entity}> {
    // Verify entity exists
    await this.get{Entity}ById(id);
    
    // Add business logic validation
    
    return this.{entity}Repository.update(id, {
      // Map input data to database format
    });
  }

  async delete{Entity}(id: {Entity}Id): Promise<void> {
    // Verify entity exists
    await this.get{Entity}ById(id);
    
    // Add business logic checks (e.g., prevent deletion if referenced)
    
    await this.{entity}Repository.delete(id);
  }
}
```

---

## Step 9: Create API Routes

**File**: `server/routes/{entities}.ts`

```typescript
import { Router } from 'express';
import { {Entity}Service } from '../services/{entity}.service';
import { {Entity}Repository } from '../infrastructure/repositories/{entity}.repository';
import { Create{Entity}RequestSchema, Update{Entity}RequestSchema } from '@shared/validation/schemas/{entity}.schema';
import { authenticate } from '../middleware/auth'; // If authentication needed
import type {
  Create{Entity}Request,
  Create{Entity}Response,
  Update{Entity}Request,
  Update{Entity}Response,
  Get{Entity}Response,
  List{Entity}Response,
} from '@shared/types/api/contracts/{entity}.contract';
import type { {Entity}Id } from '@shared/types/core/branded';

const router = Router();
const {entity}Repository = new {Entity}Repository();
const {entity}Service = new {Entity}Service({entity}Repository);

// Create {entity}
router.post('/{entities}', /* authenticate if needed */, async (req, res, next) => {
  try {
    const validatedData = Create{Entity}RequestSchema.parse(req.body) as Create{Entity}Request;
    
    const {entity} = await {entity}Service.create{Entity}(/* pass validated data */);

    const response: Create{Entity}Response = { {entity} };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// Get {entity} by ID
router.get('/{entities}/:id', async (req, res, next) => {
  try {
    const id = req.params.id as {Entity}Id;
    const {entity} = await {entity}Service.get{Entity}ById(id);

    const response: Get{Entity}Response = { {entity} };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// List all {entities}
router.get('/{entities}', async (req, res, next) => {
  try {
    const result = await {entity}Service.getAll{Entity}s();

    const response: List{Entity}Response = result;
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Update {entity}
router.patch('/{entities}/:id', /* authenticate if needed */, async (req, res, next) => {
  try {
    const id = req.params.id as {Entity}Id;
    const validatedData = Update{Entity}RequestSchema.parse(req.body) as Update{Entity}Request;

    const {entity} = await {entity}Service.update{Entity}(id, /* pass validated data */);

    const response: Update{Entity}Response = { {entity} };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Delete {entity}
router.delete('/{entities}/:id', /* authenticate if needed */, async (req, res, next) => {
  try {
    const id = req.params.id as {Entity}Id;
    await {entity}Service.delete{Entity}(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Register routes in main app**:

**File**: `server/app.ts`

```typescript
import {entity}Routes from './routes/{entities}';

// ... other routes
app.use('/api', {entity}Routes);
```

---

## Step 10: Create Client API Layer

**File**: `client/src/api/{entities}.api.ts`

```typescript
import type {
  Create{Entity}Request,
  Create{Entity}Response,
  Update{Entity}Request,
  Update{Entity}Response,
  Get{Entity}Response,
  List{Entity}Response,
} from '@shared/types/api/contracts/{entity}.contract';
import { apiClient } from './client';

export const {entities}Api = {
  async create{Entity}(request: Create{Entity}Request): Promise<Create{Entity}Response> {
    const response = await apiClient.post('/{entities}', request);
    return response.data;
  },

  async get{Entity}(id: string): Promise<Get{Entity}Response> {
    const response = await apiClient.get(`/{entities}/${id}`);
    return response.data;
  },

  async getAll{Entity}s(): Promise<List{Entity}Response> {
    const response = await apiClient.get('/{entities}');
    return response.data;
  },

  async update{Entity}(id: string, request: Update{Entity}Request): Promise<Update{Entity}Response> {
    const response = await apiClient.patch(`/{entities}/${id}`, request);
    return response.data;
  },

  async delete{Entity}(id: string): Promise<void> {
    await apiClient.delete(`/{entities}/${id}`);
  },
};
```

---

## Step 11: Create Client Components (Optional)

**File**: `client/src/features/{entities}/{Entity}List.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { {entities}Api } from '../../api/{entities}.api';
import type { {Entity} } from '@shared/types/domains/{entity}';

export const {Entity}List: React.FC = () => {
  const [{entities}, set{Entity}s] = useState<{Entity}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch{Entity}s = async () => {
      try {
        const response = await {entities}Api.getAll{Entity}s();
        set{Entity}s(response.{entities});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load {entities}');
      } finally {
        setIsLoading(false);
      }
    };

    fetch{Entity}s();
  }, []);

  if (isLoading) return <div>Loading {entities}...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="{entity}-list">
      <h2>{Entity}s</h2>
      <ul>
        {{entities}.map(({entity}) => (
          <li key={{entity}.id}>
            {/* Render {entity} details */}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

---

## Step 12: Write Tests

### Unit Tests

**File**: `tests/unit/{entity}.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { {Entity}DbToDomain } from '@shared/utils/transformers/{entity}.transformer';
import { Create{Entity}RequestSchema } from '@shared/validation/schemas/{entity}.schema';

describe('{Entity} Transformation', () => {
  it('should transform database {entity} to domain {entity}', () => {
    const db{Entity} = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      // Add test data
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    };
    
    const domain{Entity} = {Entity}DbToDomain.transform(db{Entity});
    
    expect(domain{Entity}.id).toBe(db{Entity}.id);
    // Add assertions for other fields
  });
});

describe('{Entity} Validation', () => {
  it('should accept valid create {entity} request', () => {
    const validRequest = {
      // Add valid test data
    };
    
    const result = Create{Entity}RequestSchema.parse(validRequest);
    expect(result).toEqual(validRequest);
  });

  it('should reject invalid create {entity} request', () => {
    const invalidRequest = {
      // Add invalid test data
    };
    
    expect(() => {
      Create{Entity}RequestSchema.parse(invalidRequest);
    }).toThrow();
  });
});
```

### Integration Tests

**File**: `tests/integration/{entity}.integration.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { {entities}Api } from '../../client/src/api/{entities}.api';
import type { Create{Entity}Request } from '@shared/types/api/contracts/{entity}.contract';

describe('{Entity} Integration', () => {
  it('should create, retrieve, update, and delete {entity}', async () => {
    // Create
    const createRequest: Create{Entity}Request = {
      // Add test data
    };
    
    const createResponse = await {entities}Api.create{Entity}(createRequest);
    expect(createResponse.{entity}).toBeDefined();
    const {entity}Id = createResponse.{entity}.id;
    
    // Retrieve
    const getResponse = await {entities}Api.get{Entity}({entity}Id);
    expect(getResponse.{entity}.id).toBe({entity}Id);
    
    // Update
    const updateRequest = {
      // Add update data
    };
    const updateResponse = await {entities}Api.update{Entity}({entity}Id, updateRequest);
    expect(updateResponse.{entity}.id).toBe({entity}Id);
    
    // Delete
    await {entities}Api.delete{Entity}({entity}Id);
    
    // Verify deletion
    await expect({entities}Api.get{Entity}({entity}Id)).rejects.toThrow();
  });
});
```

---

## Summary

You've now created a complete {Entity} entity with full-stack integration:

✅ Branded ID type for type safety  
✅ Domain type in shared layer  
✅ Database schema with constraints  
✅ Validation schemas for runtime checks  
✅ Transformation utilities for data conversion  
✅ API contracts for type-safe communication  
✅ Repository layer for data access  
✅ Service layer for business logic  
✅ API routes with validation  
✅ Client API layer for server communication  
✅ React components for UI (optional)  
✅ Unit and integration tests

## Next Steps

1. Run type checking: `npm run type-check`
2. Run tests: `npm test`
3. Apply migration: `npm run db:migrate`
4. Verify integration: Check that all layers work together
5. Update documentation: Add entity to architecture docs
