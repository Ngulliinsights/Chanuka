# Integration Pattern Examples

## Overview

This document provides practical, step-by-step examples for common integration scenarios in the Chanuka Platform. Each example demonstrates the complete flow from database schema through server logic to client implementation, following the established full-stack integration patterns.

**Purpose**: Provide concrete examples that developers can follow when implementing new features or extending existing functionality.

**Scope**: Covers the four most common integration scenarios with complete code examples.

## Table of Contents

1. [Example 1: Adding a New Entity with Full Integration](#example-1-adding-a-new-entity-with-full-integration)
2. [Example 2: Adding a New API Endpoint](#example-2-adding-a-new-api-endpoint)
3. [Example 3: Creating a Database Migration](#example-3-creating-a-database-migration)
4. [Example 4: Adding Validation Rules](#example-4-adding-validation-rules)

---

## Example 1: Adding a New Entity with Full Integration

**Scenario**: You need to add a "Vote" entity that allows users to vote on bills.

**Requirements**:
- Users can vote "yes", "no", or "abstain" on bills
- Each user can only vote once per bill
- Votes are timestamped
- Votes can be retrieved by bill or by user

### Step 1: Define the Branded ID Type

**File**: `shared/types/core/branded.ts`

```typescript
// Add to existing branded types
export type VoteId = string & { readonly __brand: 'VoteId' };
```

### Step 2: Define the Domain Type

**File**: `shared/types/domains/vote.ts`

```typescript
import type { VoteId } from '../core/branded';
import type { UserId } from './user';
import type { BillId } from './bill';

export enum VoteValue {
  Yes = 'yes',
  No = 'no',
  Abstain = 'abstain',
}

export interface Vote {
  id: VoteId;
  userId: UserId;
  billId: BillId;
  value: VoteValue;
  createdAt: Date;
  updatedAt: Date;
}
```


**Export from domain types index**:

**File**: `shared/types/domains/index.ts`

```typescript
export * from './vote';
```

### Step 3: Create the Database Schema

**File**: `server/infrastructure/schema/votes.ts`

```typescript
import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './foundation';
import { bills } from './bills';

export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bill_id: uuid('bill_id').notNull().references(() => bills.id, { onDelete: 'cascade' }),
  value: varchar('value', { length: 20 }).notNull(), // 'yes', 'no', 'abstain'
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure one vote per user per bill
  uniqueUserBill: unique().on(table.user_id, table.bill_id),
}));

// Inferred types
export type VoteTable = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
```

**Export from schema index**:

**File**: `server/infrastructure/schema/index.ts`

```typescript
export * from './votes';
```

### Step 4: Create Validation Schemas

**File**: `shared/validation/schemas/vote.schema.ts`

```typescript
import { z } from 'zod';

export const VoteValueSchema = z.enum(['yes', 'no', 'abstain']);

export const CreateVoteRequestSchema = z.object({
  billId: z.string().uuid(),
  value: VoteValueSchema,
});

export const UpdateVoteRequestSchema = z.object({
  value: VoteValueSchema,
});

export const VoteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  billId: z.string().uuid(),
  value: VoteValueSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

**Export from validation index**:

**File**: `shared/validation/schemas/index.ts`

```typescript
export * from './vote.schema';
```

### Step 5: Create Transformation Utilities

**File**: `shared/utils/transformers/vote.transformer.ts`

```typescript
import type { Vote, VoteValue } from '@shared/types/domains/vote';
import type { VoteId } from '@shared/types/core/branded';
import type { UserId } from '@shared/types/domains/user';
import type { BillId } from '@shared/types/domains/bill';
import type { VoteTable } from '../../../server/infrastructure/schema/votes';

export const VoteDbToDomain = {
  transform(dbVote: VoteTable): Vote {
    return {
      id: dbVote.id as VoteId,
      userId: dbVote.user_id as UserId,
      billId: dbVote.bill_id as BillId,
      value: dbVote.value as VoteValue,
      createdAt: dbVote.created_at,
      updatedAt: dbVote.updated_at,
    };
  },
  
  reverse(vote: Vote): Omit<VoteTable, 'created_at' | 'updated_at'> {
    return {
      id: vote.id,
      user_id: vote.userId,
      bill_id: vote.billId,
      value: vote.value,
    };
  },
};
```

**Export from transformers index**:

**File**: `shared/utils/transformers/index.ts`

```typescript
export * from './vote.transformer';
```

### Step 6: Define API Contracts

**File**: `shared/types/api/contracts/vote.contract.ts`

```typescript
import type { Vote, VoteValue } from '../../domains/vote';

export interface CreateVoteRequest {
  billId: string;
  value: VoteValue;
}

export interface CreateVoteResponse {
  vote: Vote;
}

export interface UpdateVoteRequest {
  value: VoteValue;
}

export interface UpdateVoteResponse {
  vote: Vote;
}

export interface GetVoteResponse {
  vote: Vote;
}

export interface ListVotesByBillResponse {
  votes: Vote[];
  total: number;
}

export interface ListVotesByUserResponse {
  votes: Vote[];
  total: number;
}
```

**Export from API contracts index**:

**File**: `shared/types/api/contracts/index.ts`

```typescript
export * from './vote.contract';
```

### Step 7: Create Repository Layer

**File**: `server/infrastructure/repositories/vote.repository.ts`

```typescript
import { db } from '../database';
import { votes, type VoteTable, type NewVote } from '../schema/votes';
import { eq, and } from 'drizzle-orm';
import type { Vote } from '@shared/types/domains/vote';
import type { VoteId } from '@shared/types/core/branded';
import type { UserId } from '@shared/types/domains/user';
import type { BillId } from '@shared/types/domains/bill';
import { VoteDbToDomain } from '@shared/utils/transformers/vote.transformer';

export class VoteRepository {
  async create(data: NewVote): Promise<Vote> {
    const [dbVote] = await db.insert(votes).values(data).returning();
    return VoteDbToDomain.transform(dbVote);
  }

  async findById(id: VoteId): Promise<Vote | null> {
    const [dbVote] = await db.select().from(votes).where(eq(votes.id, id)).limit(1);
    return dbVote ? VoteDbToDomain.transform(dbVote) : null;
  }

  async findByUserAndBill(userId: UserId, billId: BillId): Promise<Vote | null> {
    const [dbVote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.user_id, userId), eq(votes.bill_id, billId)))
      .limit(1);
    return dbVote ? VoteDbToDomain.transform(dbVote) : null;
  }

  async findByBill(billId: BillId): Promise<Vote[]> {
    const dbVotes = await db.select().from(votes).where(eq(votes.bill_id, billId));
    return dbVotes.map(VoteDbToDomain.transform);
  }

  async findByUser(userId: UserId): Promise<Vote[]> {
    const dbVotes = await db.select().from(votes).where(eq(votes.user_id, userId));
    return dbVotes.map(VoteDbToDomain.transform);
  }

  async update(id: VoteId, data: Partial<NewVote>): Promise<Vote> {
    const [dbVote] = await db
      .update(votes)
      .set({ ...data, updated_at: new Date() })
      .where(eq(votes.id, id))
      .returning();
    return VoteDbToDomain.transform(dbVote);
  }

  async delete(id: VoteId): Promise<void> {
    await db.delete(votes).where(eq(votes.id, id));
  }
}
```

### Step 8: Create Service Layer

**File**: `server/services/vote.service.ts`

```typescript
import { VoteRepository } from '../infrastructure/repositories/vote.repository';
import type { Vote, VoteValue } from '@shared/types/domains/vote';
import type { VoteId } from '@shared/types/core/branded';
import type { UserId } from '@shared/types/domains/user';
import type { BillId } from '@shared/types/domains/bill';
import { AppError } from '../utils/errors';

export class VoteService {
  constructor(private voteRepository: VoteRepository) {}

  async createVote(userId: UserId, billId: BillId, value: VoteValue): Promise<Vote> {
    // Check if user already voted on this bill
    const existingVote = await this.voteRepository.findByUserAndBill(userId, billId);
    if (existingVote) {
      throw new AppError('User has already voted on this bill', 'DUPLICATE_VOTE', 400);
    }

    return this.voteRepository.create({
      user_id: userId,
      bill_id: billId,
      value,
    });
  }

  async updateVote(voteId: VoteId, userId: UserId, value: VoteValue): Promise<Vote> {
    const vote = await this.voteRepository.findById(voteId);
    if (!vote) {
      throw new AppError('Vote not found', 'VOTE_NOT_FOUND', 404);
    }

    // Ensure user owns the vote
    if (vote.userId !== userId) {
      throw new AppError('Unauthorized to update this vote', 'UNAUTHORIZED', 403);
    }

    return this.voteRepository.update(voteId, { value });
  }

  async getVotesByBill(billId: BillId): Promise<{ votes: Vote[]; total: number }> {
    const votes = await this.voteRepository.findByBill(billId);
    return { votes, total: votes.length };
  }

  async getVotesByUser(userId: UserId): Promise<{ votes: Vote[]; total: number }> {
    const votes = await this.voteRepository.findByUser(userId);
    return { votes, total: votes.length };
  }

  async deleteVote(voteId: VoteId, userId: UserId): Promise<void> {
    const vote = await this.voteRepository.findById(voteId);
    if (!vote) {
      throw new AppError('Vote not found', 'VOTE_NOT_FOUND', 404);
    }

    // Ensure user owns the vote
    if (vote.userId !== userId) {
      throw new AppError('Unauthorized to delete this vote', 'UNAUTHORIZED', 403);
    }

    await this.voteRepository.delete(voteId);
  }
}
```

### Step 9: Create API Routes

**File**: `server/routes/votes.ts`

```typescript
import { Router } from 'express';
import { VoteService } from '../services/vote.service';
import { VoteRepository } from '../infrastructure/repositories/vote.repository';
import { CreateVoteRequestSchema, UpdateVoteRequestSchema } from '@shared/validation/schemas/vote.schema';
import { authenticate } from '../middleware/auth';
import type {
  CreateVoteRequest,
  CreateVoteResponse,
  UpdateVoteRequest,
  UpdateVoteResponse,
  ListVotesByBillResponse,
  ListVotesByUserResponse,
} from '@shared/types/api/contracts/vote.contract';
import type { VoteId } from '@shared/types/core/branded';
import type { BillId } from '@shared/types/domains/bill';

const router = Router();
const voteRepository = new VoteRepository();
const voteService = new VoteService(voteRepository);

// Create a vote
router.post('/votes', authenticate, async (req, res, next) => {
  try {
    const validatedData = CreateVoteRequestSchema.parse(req.body) as CreateVoteRequest;
    const userId = req.user!.id; // From auth middleware

    const vote = await voteService.createVote(
      userId,
      validatedData.billId as BillId,
      validatedData.value
    );

    const response: CreateVoteResponse = { vote };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// Update a vote
router.patch('/votes/:id', authenticate, async (req, res, next) => {
  try {
    const validatedData = UpdateVoteRequestSchema.parse(req.body) as UpdateVoteRequest;
    const userId = req.user!.id;
    const voteId = req.params.id as VoteId;

    const vote = await voteService.updateVote(voteId, userId, validatedData.value);

    const response: UpdateVoteResponse = { vote };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get votes by bill
router.get('/bills/:billId/votes', async (req, res, next) => {
  try {
    const billId = req.params.billId as BillId;
    const result = await voteService.getVotesByBill(billId);

    const response: ListVotesByBillResponse = result;
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get votes by user
router.get('/users/:userId/votes', async (req, res, next) => {
  try {
    const userId = req.params.userId as UserId;
    const result = await voteService.getVotesByUser(userId);

    const response: ListVotesByUserResponse = result;
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Delete a vote
router.delete('/votes/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const voteId = req.params.id as VoteId;

    await voteService.deleteVote(voteId, userId);

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
import voteRoutes from './routes/votes';

// ... other routes
app.use('/api', voteRoutes);
```

### Step 10: Create Client API Layer

**File**: `client/src/api/votes.api.ts`

```typescript
import type {
  CreateVoteRequest,
  CreateVoteResponse,
  UpdateVoteRequest,
  UpdateVoteResponse,
  ListVotesByBillResponse,
  ListVotesByUserResponse,
} from '@shared/types/api/contracts/vote.contract';
import { apiClient } from './client';

export const votesApi = {
  async createVote(request: CreateVoteRequest): Promise<CreateVoteResponse> {
    const response = await apiClient.post('/votes', request);
    return response.data;
  },

  async updateVote(voteId: string, request: UpdateVoteRequest): Promise<UpdateVoteResponse> {
    const response = await apiClient.patch(`/votes/${voteId}`, request);
    return response.data;
  },

  async getVotesByBill(billId: string): Promise<ListVotesByBillResponse> {
    const response = await apiClient.get(`/bills/${billId}/votes`);
    return response.data;
  },

  async getVotesByUser(userId: string): Promise<ListVotesByUserResponse> {
    const response = await apiClient.get(`/users/${userId}/votes`);
    return response.data;
  },

  async deleteVote(voteId: string): Promise<void> {
    await apiClient.delete(`/votes/${voteId}`);
  },
};
```

### Step 11: Create Client Component (Optional)

**File**: `client/src/features/votes/VoteButton.tsx`

```typescript
import React, { useState } from 'react';
import { votesApi } from '../../api/votes.api';
import { VoteValue } from '@shared/types/domains/vote';
import type { BillId } from '@shared/types/domains/bill';

interface VoteButtonProps {
  billId: BillId;
  currentVote?: VoteValue;
  onVoteSuccess?: () => void;
}

export const VoteButton: React.FC<VoteButtonProps> = ({ billId, currentVote, onVoteSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async (value: VoteValue) => {
    setIsLoading(true);
    setError(null);

    try {
      await votesApi.createVote({ billId, value });
      onVoteSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="vote-buttons">
      <button
        onClick={() => handleVote(VoteValue.Yes)}
        disabled={isLoading || currentVote === VoteValue.Yes}
        className={currentVote === VoteValue.Yes ? 'active' : ''}
      >
        Yes
      </button>
      <button
        onClick={() => handleVote(VoteValue.No)}
        disabled={isLoading || currentVote === VoteValue.No}
        className={currentVote === VoteValue.No ? 'active' : ''}
      >
        No
      </button>
      <button
        onClick={() => handleVote(VoteValue.Abstain)}
        disabled={isLoading || currentVote === VoteValue.Abstain}
        className={currentVote === VoteValue.Abstain ? 'active' : ''}
      >
        Abstain
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};
```

### Summary

You've now created a complete Vote entity with full-stack integration:

✅ **Branded ID type** for type safety  
✅ **Domain type** in shared layer  
✅ **Database schema** with constraints  
✅ **Validation schemas** for runtime checks  
✅ **Transformation utilities** for data conversion  
✅ **API contracts** for type-safe communication  
✅ **Repository layer** for data access  
✅ **Service layer** for business logic  
✅ **API routes** with validation  
✅ **Client API layer** for server communication  
✅ **React component** for UI (optional)

---

## Example 2: Adding a New API Endpoint

**Scenario**: You need to add an endpoint to get bill statistics (total votes, vote breakdown).

**Requirements**:
- Endpoint: `GET /api/bills/:billId/statistics`
- Returns vote counts and percentages
- No authentication required (public data)

### Step 1: Define the API Contract

**File**: `shared/types/api/contracts/bill.contract.ts`

```typescript
// Add to existing bill contracts
export interface BillStatistics {
  billId: string;
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  yesPercentage: number;
  noPercentage: number;
  abstainPercentage: number;
}

export interface GetBillStatisticsResponse {
  statistics: BillStatistics;
}
```

### Step 2: Create Validation Schema (if needed)

**File**: `shared/validation/schemas/bill.schema.ts`

```typescript
// Add to existing bill schemas
export const BillStatisticsSchema = z.object({
  billId: z.string().uuid(),
  totalVotes: z.number().int().min(0),
  yesVotes: z.number().int().min(0),
  noVotes: z.number().int().min(0),
  abstainVotes: z.number().int().min(0),
  yesPercentage: z.number().min(0).max(100),
  noPercentage: z.number().min(0).max(100),
  abstainPercentage: z.number().min(0).max(100),
});
```

### Step 3: Add Service Method

**File**: `server/services/bill.service.ts`

```typescript
import type { BillStatistics } from '@shared/types/api/contracts/bill.contract';
import type { BillId } from '@shared/types/domains/bill';
import { VoteValue } from '@shared/types/domains/vote';

export class BillService {
  // ... existing methods

  async getBillStatistics(billId: BillId): Promise<BillStatistics> {
    // Get all votes for the bill
    const votes = await this.voteRepository.findByBill(billId);

    // Calculate vote counts
    const yesVotes = votes.filter(v => v.value === VoteValue.Yes).length;
    const noVotes = votes.filter(v => v.value === VoteValue.No).length;
    const abstainVotes = votes.filter(v => v.value === VoteValue.Abstain).length;
    const totalVotes = votes.length;

    // Calculate percentages
    const yesPercentage = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
    const noPercentage = totalVotes > 0 ? (noVotes / totalVotes) * 100 : 0;
    const abstainPercentage = totalVotes > 0 ? (abstainVotes / totalVotes) * 100 : 0;

    return {
      billId,
      totalVotes,
      yesVotes,
      noVotes,
      abstainVotes,
      yesPercentage: Math.round(yesPercentage * 100) / 100, // Round to 2 decimals
      noPercentage: Math.round(noPercentage * 100) / 100,
      abstainPercentage: Math.round(abstainPercentage * 100) / 100,
    };
  }
}
```

### Step 4: Add Route Handler

**File**: `server/routes/bills.ts`

```typescript
import type { GetBillStatisticsResponse } from '@shared/types/api/contracts/bill.contract';
import type { BillId } from '@shared/types/domains/bill';

// Add to existing bill routes
router.get('/bills/:billId/statistics', async (req, res, next) => {
  try {
    const billId = req.params.billId as BillId;
    const statistics = await billService.getBillStatistics(billId);

    const response: GetBillStatisticsResponse = { statistics };
    res.json(response);
  } catch (error) {
    next(error);
  }
});
```

### Step 5: Add Client API Method

**File**: `client/src/api/bills.api.ts`

```typescript
import type { GetBillStatisticsResponse } from '@shared/types/api/contracts/bill.contract';

export const billsApi = {
  // ... existing methods

  async getBillStatistics(billId: string): Promise<GetBillStatisticsResponse> {
    const response = await apiClient.get(`/bills/${billId}/statistics`);
    return response.data;
  },
};
```

### Step 6: Use in Client Component

**File**: `client/src/features/bills/BillStatistics.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { billsApi } from '../../api/bills.api';
import type { BillStatistics } from '@shared/types/api/contracts/bill.contract';

interface BillStatisticsProps {
  billId: string;
}

export const BillStatisticsComponent: React.FC<BillStatisticsProps> = ({ billId }) => {
  const [statistics, setStatistics] = useState<BillStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await billsApi.getBillStatistics(billId);
        setStatistics(response.statistics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [billId]);

  if (isLoading) return <div>Loading statistics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!statistics) return null;

  return (
    <div className="bill-statistics">
      <h3>Vote Statistics</h3>
      <div className="stats-grid">
        <div className="stat">
          <span className="label">Total Votes:</span>
          <span className="value">{statistics.totalVotes}</span>
        </div>
        <div className="stat">
          <span className="label">Yes:</span>
          <span className="value">{statistics.yesVotes} ({statistics.yesPercentage}%)</span>
        </div>
        <div className="stat">
          <span className="label">No:</span>
          <span className="value">{statistics.noVotes} ({statistics.noPercentage}%)</span>
        </div>
        <div className="stat">
          <span className="label">Abstain:</span>
          <span className="value">{statistics.abstainVotes} ({statistics.abstainPercentage}%)</span>
        </div>
      </div>
    </div>
  );
};
```

### Summary

You've added a new API endpoint with:

✅ **API contract** defining request/response types  
✅ **Validation schema** for runtime checks  
✅ **Service method** implementing business logic  
✅ **Route handler** with proper error handling  
✅ **Client API method** for type-safe calls  
✅ **React component** consuming the endpoint

---

## Example 3: Creating a Database Migration

**Scenario**: You need to add a "reason" field to the Vote table to allow users to explain their vote.

**Requirements**:
- Add optional `reason` text field to votes table
- Update all related types and transformers
- Ensure backward compatibility

### Step 1: Create the Migration

**Command**:
```bash
npm run db:generate
```

This will prompt you for a migration name. Use: `add_vote_reason_field`

**Generated File**: `drizzle/migrations/XXXXXX_add_vote_reason_field.sql`

**Manual Edit** (if needed):

```sql
-- Add reason column to votes table
ALTER TABLE votes ADD COLUMN reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN votes.reason IS 'Optional explanation for the vote';
```

### Step 2: Update Database Schema

**File**: `server/infrastructure/schema/votes.ts`

```typescript
import { pgTable, uuid, varchar, timestamp, text, unique } from 'drizzle-orm/pg-core';
import { users } from './foundation';
import { bills } from './bills';

export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bill_id: uuid('bill_id').notNull().references(() => bills.id, { onDelete: 'cascade' }),
  value: varchar('value', { length: 20 }).notNull(),
  reason: text('reason'), // NEW FIELD
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserBill: unique().on(table.user_id, table.bill_id),
}));

// Inferred types will automatically include the new field
export type VoteTable = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
```

### Step 3: Update Domain Type

**File**: `shared/types/domains/vote.ts`

```typescript
import type { VoteId } from '../core/branded';
import type { UserId } from './user';
import type { BillId } from './bill';

export enum VoteValue {
  Yes = 'yes',
  No = 'no',
  Abstain = 'abstain',
}

export interface Vote {
  id: VoteId;
  userId: UserId;
  billId: BillId;
  value: VoteValue;
  reason: string | null; // NEW FIELD
  createdAt: Date;
  updatedAt: Date;
}
```

### Step 4: Update Validation Schema

**File**: `shared/validation/schemas/vote.schema.ts`

```typescript
import { z } from 'zod';

export const VoteValueSchema = z.enum(['yes', 'no', 'abstain']);

export const CreateVoteRequestSchema = z.object({
  billId: z.string().uuid(),
  value: VoteValueSchema,
  reason: z.string().max(1000).optional(), // NEW FIELD
});

export const UpdateVoteRequestSchema = z.object({
  value: VoteValueSchema,
  reason: z.string().max(1000).optional(), // NEW FIELD
});

export const VoteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  billId: z.string().uuid(),
  value: VoteValueSchema,
  reason: z.string().nullable(), // NEW FIELD
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

### Step 5: Update Transformer

**File**: `shared/utils/transformers/vote.transformer.ts`

```typescript
import type { Vote, VoteValue } from '@shared/types/domains/vote';
import type { VoteId } from '@shared/types/core/branded';
import type { UserId } from '@shared/types/domains/user';
import type { BillId } from '@shared/types/domains/bill';
import type { VoteTable } from '../../../server/infrastructure/schema/votes';

export const VoteDbToDomain = {
  transform(dbVote: VoteTable): Vote {
    return {
      id: dbVote.id as VoteId,
      userId: dbVote.user_id as UserId,
      billId: dbVote.bill_id as BillId,
      value: dbVote.value as VoteValue,
      reason: dbVote.reason ?? null, // NEW FIELD
      createdAt: dbVote.created_at,
      updatedAt: dbVote.updated_at,
    };
  },
  
  reverse(vote: Vote): Omit<VoteTable, 'created_at' | 'updated_at'> {
    return {
      id: vote.id,
      user_id: vote.userId,
      bill_id: vote.billId,
      value: vote.value,
      reason: vote.reason, // NEW FIELD
    };
  },
};
```

### Step 6: Update API Contracts

**File**: `shared/types/api/contracts/vote.contract.ts`

```typescript
import type { Vote, VoteValue } from '../../domains/vote';

export interface CreateVoteRequest {
  billId: string;
  value: VoteValue;
  reason?: string; // NEW FIELD
}

export interface CreateVoteResponse {
  vote: Vote;
}

export interface UpdateVoteRequest {
  value: VoteValue;
  reason?: string; // NEW FIELD
}

export interface UpdateVoteResponse {
  vote: Vote;
}

// Other interfaces remain the same
export interface GetVoteResponse {
  vote: Vote;
}

export interface ListVotesByBillResponse {
  votes: Vote[];
  total: number;
}

export interface ListVotesByUserResponse {
  votes: Vote[];
  total: number;
}
```

### Step 7: Update Service Layer (if needed)

**File**: `server/services/vote.service.ts`

```typescript
export class VoteService {
  constructor(private voteRepository: VoteRepository) {}

  async createVote(
    userId: UserId,
    billId: BillId,
    value: VoteValue,
    reason?: string // NEW PARAMETER
  ): Promise<Vote> {
    const existingVote = await this.voteRepository.findByUserAndBill(userId, billId);
    if (existingVote) {
      throw new AppError('User has already voted on this bill', 'DUPLICATE_VOTE', 400);
    }

    return this.voteRepository.create({
      user_id: userId,
      bill_id: billId,
      value,
      reason: reason ?? null, // NEW FIELD
    });
  }

  async updateVote(
    voteId: VoteId,
    userId: UserId,
    value: VoteValue,
    reason?: string // NEW PARAMETER
  ): Promise<Vote> {
    const vote = await this.voteRepository.findById(voteId);
    if (!vote) {
      throw new AppError('Vote not found', 'VOTE_NOT_FOUND', 404);
    }

    if (vote.userId !== userId) {
      throw new AppError('Unauthorized to update this vote', 'UNAUTHORIZED', 403);
    }

    return this.voteRepository.update(voteId, {
      value,
      reason: reason ?? null, // NEW FIELD
    });
  }

  // Other methods remain the same
}
```

### Step 8: Update Route Handlers

**File**: `server/routes/votes.ts`

```typescript
// Create a vote
router.post('/votes', authenticate, async (req, res, next) => {
  try {
    const validatedData = CreateVoteRequestSchema.parse(req.body) as CreateVoteRequest;
    const userId = req.user!.id;

    const vote = await voteService.createVote(
      userId,
      validatedData.billId as BillId,
      validatedData.value,
      validatedData.reason // NEW PARAMETER
    );

    const response: CreateVoteResponse = { vote };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// Update a vote
router.patch('/votes/:id', authenticate, async (req, res, next) => {
  try {
    const validatedData = UpdateVoteRequestSchema.parse(req.body) as UpdateVoteRequest;
    const userId = req.user!.id;
    const voteId = req.params.id as VoteId;

    const vote = await voteService.updateVote(
      voteId,
      userId,
      validatedData.value,
      validatedData.reason // NEW PARAMETER
    );

    const response: UpdateVoteResponse = { vote };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Other routes remain the same
```

### Step 9: Update Client API (if needed)

The client API methods don't need changes since they already accept the full request objects which now include the optional `reason` field.

### Step 10: Update Client Components

**File**: `client/src/features/votes/VoteButton.tsx`

```typescript
import React, { useState } from 'react';
import { votesApi } from '../../api/votes.api';
import { VoteValue } from '@shared/types/domains/vote';
import type { BillId } from '@shared/types/domains/bill';

interface VoteButtonProps {
  billId: BillId;
  currentVote?: VoteValue;
  onVoteSuccess?: () => void;
}

export const VoteButton: React.FC<VoteButtonProps> = ({ billId, currentVote, onVoteSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState(''); // NEW STATE
  const [showReasonInput, setShowReasonInput] = useState(false); // NEW STATE

  const handleVote = async (value: VoteValue) => {
    setIsLoading(true);
    setError(null);

    try {
      await votesApi.createVote({
        billId,
        value,
        reason: reason || undefined, // NEW FIELD
      });
      onVoteSuccess?.();
      setReason('');
      setShowReasonInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="vote-buttons">
      <button
        onClick={() => handleVote(VoteValue.Yes)}
        disabled={isLoading || currentVote === VoteValue.Yes}
        className={currentVote === VoteValue.Yes ? 'active' : ''}
      >
        Yes
      </button>
      <button
        onClick={() => handleVote(VoteValue.No)}
        disabled={isLoading || currentVote === VoteValue.No}
        className={currentVote === VoteValue.No ? 'active' : ''}
      >
        No
      </button>
      <button
        onClick={() => handleVote(VoteValue.Abstain)}
        disabled={isLoading || currentVote === VoteValue.Abstain}
        className={currentVote === VoteValue.Abstain ? 'active' : ''}
      >
        Abstain
      </button>

      {/* NEW: Optional reason input */}
      <button
        onClick={() => setShowReasonInput(!showReasonInput)}
        className="toggle-reason"
      >
        {showReasonInput ? 'Hide' : 'Add'} Reason
      </button>

      {showReasonInput && (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain your vote (optional)"
          maxLength={1000}
          rows={3}
        />
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
};
```

### Step 11: Run the Migration

**Command**:
```bash
npm run db:migrate
```

This applies the migration to your database.

### Step 12: Verify Type Alignment

**Command**:
```bash
npm run verify:types
```

This runs the type alignment verification tool to ensure all types are synchronized.

### Summary

You've successfully created and applied a database migration:

✅ **Generated migration** SQL file  
✅ **Updated database schema** with new field  
✅ **Updated domain types** to include new field  
✅ **Updated validation schemas** with new rules  
✅ **Updated transformers** to handle new field  
✅ **Updated API contracts** with new field  
✅ **Updated service layer** to accept new parameter  
✅ **Updated route handlers** to pass new parameter  
✅ **Updated client components** to collect new data  
✅ **Applied migration** to database  
✅ **Verified type alignment** across all layers

**Key Points**:
- The field is optional (`reason?: string`) for backward compatibility
- Existing votes without a reason will have `null` value
- All layers are updated atomically to maintain consistency
- Type alignment verification ensures no mismatches

---

## Example 4: Adding Validation Rules

**Scenario**: You need to add validation rules to ensure bill titles are meaningful and descriptions are comprehensive.

**Requirements**:
- Bill titles must be 10-500 characters
- Bill titles cannot be all uppercase (shouting)
- Bill descriptions must be 50-10000 characters
- Bill descriptions must contain at least 3 sentences
- Apply validation on both client and server

### Step 1: Create Custom Validation Rules

**File**: `shared/validation/rules/custom.rules.ts`

```typescript
import { z } from 'zod';

/**
 * Validates that a string is not all uppercase
 */
export const notAllUppercase = (message = 'Text cannot be all uppercase') => {
  return z.string().refine(
    (val) => {
      const letters = val.replace(/[^a-zA-Z]/g, '');
      if (letters.length === 0) return true; // No letters, skip check
      return letters !== letters.toUpperCase();
    },
    { message }
  );
};

/**
 * Validates that text contains at least a minimum number of sentences
 */
export const minSentences = (min: number, message?: string) => {
  return z.string().refine(
    (val) => {
      // Count sentences by looking for sentence-ending punctuation
      const sentences = val.split(/[.!?]+/).filter(s => s.trim().length > 0);
      return sentences.length >= min;
    },
    { message: message || `Text must contain at least ${min} sentence${min > 1 ? 's' : ''}` }
  );
};

/**
 * Validates that a string contains meaningful content (not just whitespace or repeated characters)
 */
export const meaningfulContent = (message = 'Text must contain meaningful content') => {
  return z.string().refine(
    (val) => {
      const trimmed = val.trim();
      // Check for repeated characters (e.g., "aaaaaaa")
      const hasRepeatedChars = /(.)\1{9,}/.test(trimmed);
      if (hasRepeatedChars) return false;

      // Check for meaningful words (at least 3 characters)
      const words = trimmed.split(/\s+/).filter(w => w.length >= 3);
      return words.length >= 3;
    },
    { message }
  );
};
```

**Export from rules index**:

**File**: `shared/validation/rules/index.ts`

```typescript
export * from './common.rules';
export * from './custom.rules';
```

### Step 2: Update Bill Validation Schema

**File**: `shared/validation/schemas/bill.schema.ts`

```typescript
import { z } from 'zod';
import { notAllUppercase, minSentences, meaningfulContent } from '../rules/custom.rules';

export const BillTitleSchema = z
  .string()
  .min(10, 'Title must be at least 10 characters')
  .max(500, 'Title must not exceed 500 characters')
  .pipe(notAllUppercase('Title cannot be all uppercase'))
  .pipe(meaningfulContent('Title must contain meaningful content'));

export const BillDescriptionSchema = z
  .string()
  .min(50, 'Description must be at least 50 characters')
  .max(10000, 'Description must not exceed 10,000 characters')
  .pipe(minSentences(3, 'Description must contain at least 3 sentences'))
  .pipe(meaningfulContent('Description must contain meaningful content'));

export const CreateBillRequestSchema = z.object({
  title: BillTitleSchema,
  description: BillDescriptionSchema,
  committeeId: z.string().uuid().optional(),
});

export const UpdateBillRequestSchema = z.object({
  title: BillTitleSchema.optional(),
  description: BillDescriptionSchema.optional(),
  committeeId: z.string().uuid().optional().nullable(),
});

export const BillSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['draft', 'introduced', 'in_committee', 'passed', 'rejected']),
  sponsorId: z.string().uuid(),
  committeeId: z.string().uuid().nullable(),
  introducedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

### Step 3: Server-Side Validation (Already Applied)

The validation is automatically applied in route handlers that use the schemas:

**File**: `server/routes/bills.ts`

```typescript
import { CreateBillRequestSchema, UpdateBillRequestSchema } from '@shared/validation/schemas/bill.schema';

// Create bill route
router.post('/bills', authenticate, async (req, res, next) => {
  try {
    // Validation happens here - will throw if invalid
    const validatedData = CreateBillRequestSchema.parse(req.body);
    
    const bill = await billService.createBill(
      req.user!.id,
      validatedData.title,
      validatedData.description,
      validatedData.committeeId
    );

    const response: CreateBillResponse = { bill };
    res.status(201).json(response);
  } catch (error) {
    next(error); // Error handler will format validation errors
  }
});

// Update bill route
router.patch('/bills/:id', authenticate, async (req, res, next) => {
  try {
    // Validation happens here
    const validatedData = UpdateBillRequestSchema.parse(req.body);
    
    const bill = await billService.updateBill(
      req.params.id as BillId,
      req.user!.id,
      validatedData
    );

    const response: UpdateBillResponse = { bill };
    res.json(response);
  } catch (error) {
    next(error);
  }
});
```

### Step 4: Client-Side Validation

**File**: `client/src/features/bills/CreateBillForm.tsx`

```typescript
import React, { useState } from 'react';
import { billsApi } from '../../api/bills.api';
import { CreateBillRequestSchema } from '@shared/validation/schemas/bill.schema';
import type { CreateBillRequest } from '@shared/types/api/contracts/bill.contract';
import { z } from 'zod';

export const CreateBillForm: React.FC = () => {
  const [formData, setFormData] = useState<CreateBillRequest>({
    title: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof CreateBillRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateField = (field: keyof CreateBillRequest) => {
    try {
      // Validate individual field
      if (field === 'title') {
        CreateBillRequestSchema.shape.title.parse(formData.title);
      } else if (field === 'description') {
        CreateBillRequestSchema.shape.description.parse(formData.description);
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({
          ...prev,
          [field]: error.errors[0].message,
        }));
      }
      return false;
    }
  };

  const handleBlur = (field: keyof CreateBillRequest) => {
    // Validate on blur for immediate feedback
    if (formData[field]) {
      validateField(field);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate entire form
    try {
      const validatedData = CreateBillRequestSchema.parse(formData);
      
      setIsSubmitting(true);
      await billsApi.createBill(validatedData);
      
      // Success - redirect or show success message
      alert('Bill created successfully!');
      setFormData({ title: '', description: '' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod errors to field errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        // Server error
        alert('Failed to create bill. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-bill-form">
      <div className="form-group">
        <label htmlFor="title">Bill Title *</label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          onBlur={() => handleBlur('title')}
          className={errors.title ? 'error' : ''}
          placeholder="Enter bill title (10-500 characters)"
          maxLength={500}
        />
        {errors.title && <span className="error-message">{errors.title}</span>}
        <span className="char-count">{formData.title.length}/500</span>
      </div>

      <div className="form-group">
        <label htmlFor="description">Bill Description *</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          className={errors.description ? 'error' : ''}
          placeholder="Enter bill description (50-10,000 characters, at least 3 sentences)"
          maxLength={10000}
          rows={10}
        />
        {errors.description && <span className="error-message">{errors.description}</span>}
        <span className="char-count">{formData.description.length}/10,000</span>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || Object.keys(errors).length > 0}
        className="submit-button"
      >
        {isSubmitting ? 'Creating...' : 'Create Bill'}
      </button>
    </form>
  );
};
```

### Step 5: Add Validation Tests

**File**: `shared/validation/schemas/__tests__/bill.schema.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { BillTitleSchema, BillDescriptionSchema, CreateBillRequestSchema } from '../bill.schema';

describe('BillTitleSchema', () => {
  it('should accept valid titles', () => {
    const validTitles = [
      'The Climate Action Bill 2024',
      'Healthcare Reform and Universal Coverage Act',
      'Digital Privacy Protection Legislation',
    ];

    validTitles.forEach(title => {
      expect(() => BillTitleSchema.parse(title)).not.toThrow();
    });
  });

  it('should reject titles that are too short', () => {
    expect(() => BillTitleSchema.parse('Short')).toThrow('Title must be at least 10 characters');
  });

  it('should reject titles that are too long', () => {
    const longTitle = 'A'.repeat(501);
    expect(() => BillTitleSchema.parse(longTitle)).toThrow('Title must not exceed 500 characters');
  });

  it('should reject all uppercase titles', () => {
    expect(() => BillTitleSchema.parse('THIS IS ALL UPPERCASE TITLE')).toThrow(
      'Title cannot be all uppercase'
    );
  });

  it('should reject titles without meaningful content', () => {
    expect(() => BillTitleSchema.parse('aaaaaaaaaa')).toThrow(
      'Title must contain meaningful content'
    );
  });
});

describe('BillDescriptionSchema', () => {
  it('should accept valid descriptions', () => {
    const validDescription = 
      'This bill aims to address climate change through comprehensive reforms. ' +
      'It includes provisions for renewable energy incentives. ' +
      'The legislation also establishes a carbon pricing mechanism.';

    expect(() => BillDescriptionSchema.parse(validDescription)).not.toThrow();
  });

  it('should reject descriptions that are too short', () => {
    expect(() => BillDescriptionSchema.parse('Too short')).toThrow(
      'Description must be at least 50 characters'
    );
  });

  it('should reject descriptions with fewer than 3 sentences', () => {
    const twoSentences = 'This is the first sentence. This is the second sentence.';
    expect(() => BillDescriptionSchema.parse(twoSentences)).toThrow(
      'Description must contain at least 3 sentences'
    );
  });

  it('should reject descriptions without meaningful content', () => {
    const meaningless = 'a b c d e f g h i j k l m n o p q r s t u v w x y z. ' +
                       'a b c d e f g h i j k l m n o p q r s t u v w x y z. ' +
                       'a b c d e f g h i j k l m n o p q r s t u v w x y z.';
    expect(() => BillDescriptionSchema.parse(meaningless)).toThrow(
      'Description must contain meaningful content'
    );
  });
});

describe('CreateBillRequestSchema', () => {
  it('should accept valid bill creation request', () => {
    const validRequest = {
      title: 'The Climate Action Bill 2024',
      description: 
        'This bill aims to address climate change through comprehensive reforms. ' +
        'It includes provisions for renewable energy incentives. ' +
        'The legislation also establishes a carbon pricing mechanism.',
    };

    expect(() => CreateBillRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('should reject request with invalid title', () => {
    const invalidRequest = {
      title: 'Short',
      description: 
        'This bill aims to address climate change through comprehensive reforms. ' +
        'It includes provisions for renewable energy incentives. ' +
        'The legislation also establishes a carbon pricing mechanism.',
    };

    expect(() => CreateBillRequestSchema.parse(invalidRequest)).toThrow();
  });

  it('should reject request with invalid description', () => {
    const invalidRequest = {
      title: 'The Climate Action Bill 2024',
      description: 'Too short',
    };

    expect(() => CreateBillRequestSchema.parse(invalidRequest)).toThrow();
  });
});
```

### Step 6: Run Tests

**Command**:
```bash
npm test -- bill.schema.test.ts
```

### Summary

You've successfully added comprehensive validation rules:

✅ **Custom validation rules** for reusable logic  
✅ **Enhanced bill schemas** with meaningful constraints  
✅ **Server-side validation** automatically enforced  
✅ **Client-side validation** with immediate feedback  
✅ **Field-level validation** on blur for better UX  
✅ **Form-level validation** on submit  
✅ **Error display** with helpful messages  
✅ **Character counters** for user guidance  
✅ **Comprehensive tests** for all validation rules

**Key Benefits**:
- Same validation logic on client and server (DRY principle)
- Immediate feedback to users (client-side)
- Security enforcement (server-side)
- Reusable validation rules across entities
- Type-safe validation with Zod
- Comprehensive test coverage

---

## Quick Reference

### Integration Checklist

When implementing any new feature, follow this checklist:

- [ ] **Branded ID Type** (if new entity)
- [ ] **Domain Type** in `shared/types/domains/`
- [ ] **Database Schema** in `server/infrastructure/schema/`
- [ ] **Validation Schema** in `shared/validation/schemas/`
- [ ] **Transformation Utilities** in `shared/utils/transformers/`
- [ ] **API Contracts** in `shared/types/api/contracts/`
- [ ] **Repository Layer** in `server/infrastructure/repositories/`
- [ ] **Service Layer** in `server/services/`
- [ ] **Route Handlers** in `server/routes/`
- [ ] **Client API Layer** in `client/src/api/`
- [ ] **Client Components** in `client/src/features/`
- [ ] **Tests** for all layers

### Common Commands

```bash
# Generate database migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Verify type alignment
npm run verify:types

# Run tests
npm test

# Run specific test file
npm test -- <filename>

# Type check
npm run type-check

# Lint code
npm run lint
```

---

## Related Documentation

- [Code Organization Standards](./code-organization-standards.md) - Canonical locations for all code
- [API Consumer Guide](./api-consumer-guide.md) - How to consume the API
- [Developer Onboarding](./developer-onboarding.md) - Getting started guide
- [Architecture Overview](../technical/architecture.md) - System architecture
- [Migration Log](../technical/MIGRATION_LOG.md) - Database migration history

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: Chanuka Platform Team  
**Related Spec**: `.kiro/specs/full-stack-integration/`  
**Validates**: Requirements 10.2
