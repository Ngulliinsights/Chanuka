# Level 2: Implementation Patterns

**Overview:** Patterns and standards for building consistent, maintainable features across all layers

---

## Feature Implementation Blueprint

Every feature follows this layered pattern:

```
Database Layer (Shared)
    ↓
Server Logic Layer
    ↓
Client Logic Layer
    ↓
UI Layer (React)
```

---

## 1. Shared Database Types & Schemas

### Drizzle Schema Definition

```typescript
// shared/db/schema.ts
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const bills = pgTable('bills', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
```

### Type Extraction

```typescript
// shared/types/bill.types.ts
import { typeof bills } from '@shared/db/schema';
import { createSelectSchema } from 'drizzle-zod';

// Automatically derived from schema
export type Bill = typeof bills.$inferSelect;
export type BillInsert = typeof bills.$inferInsert;

// With validation
export const BillSelectSchema = createSelectSchema(bills);
export const BillInsertSchema = createSelectSchema(bills).omit({ id: true, created_at: true });
```

**Pattern:** Schema = source of truth. Types and validation follow from schema.

---

## 2. Server Implementation Layer

### Service Architecture

```typescript
// server/services/bill.service.ts
import { db } from '@server/db';
import { bills } from '@shared/db/schema';
import { BillInsertSchema, BillSelectSchema } from '@shared/types';

export class BillService {
  async createBill(input: unknown) {
    // 1. Validate input
    const validated = BillInsertSchema.parse(input);
    
    // 2. Business logic
    if (validated.status !== 'draft') {
      throw new Error('New bills must start as draft');
    }
    
    // 3. Database operation
    const result = await db.insert(bills).values(validated).returning();
    
    // 4. Return typed result
    return result[0];
  }
  
  async getBill(id: number) {
    const result = await db.query.bills.findFirst({
      where: (bills, { eq }) => eq(bills.id, id),
    });
    
    if (!result) {
      throw new NotFoundError('Bill', id);
    }
    
    return BillSelectSchema.parse(result);
  }
}
```

### Controller (Express Route Handler)

```typescript
// server/routes/bills.ts
import { Router } from 'express';
import { BillService } from '../services/bill.service';
import { authenticate } from '@server/middleware';
import { catchAsync, validateRequest } from '@server/utils';
import { BillInsertSchema } from '@shared/types';

const router = Router();
const billService = new BillService();

// POST /api/bills
router.post(
  '/',
  authenticate,
  validateRequest({ body: BillInsertSchema }),
  catchAsync(async (req, res) => {
    const bill = await billService.createBill(req.body);
    res.status(201).json({ data: bill });
  })
);

// GET /api/bills/:id
router.get('/:id', catchAsync(async (req, res) => {
  const bill = await billService.getBill(Number(req.params.id));
  res.json({ data: bill });
}));

export default router;
```

**Pattern:** 
- Services contain business logic and database access
- Controllers handle HTTP concerns (validation, response format, status codes)
- All I/O errors caught and handled by middleware

---

## 3. Client API Query Layer

### React Query Setup

```typescript
// client/src/features/bills/api/queries.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bill, BillInsert } from '@shared/types';
import { api } from '@client/lib/api-client';

const keys = {
  all: ['bills'] as const,
  detail: (id: number) => [...keys.all, id] as const,
};

export function useBill(id: number) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/bills/${id}`);
      return res.data as Bill;
    },
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: BillInsert) => {
      const res = await api.post('/bills', input);
      return res.data as Bill;
    },
    onSuccess: (newBill) => {
      // Update query cache
      queryClient.setQueryData(keys.detail(newBill.id), newBill);
    },
  });
}
```

**Pattern:**
- Query keys define cache structure
- Mutations update cache after success
- Types come from shared types, not duplicated

---

## 4. Client UI Layer (React Components)

### Model Component Pattern

```typescript
// client/src/features/bills/pages/BillDetail.tsx
import { useBill, useUpdateBill } from '../api/queries';
import { BillMeta } from '../components/BillMeta';
import { BillContent } from '../components/BillContent';
import { LoadingSpinner, ErrorMessage } from '@client/components';

interface BillDetailProps {
  billId: number;
}

export function BillDetail({ billId }: BillDetailProps) {
  const { data: bill, isLoading, error } = useBill(billId);
  const updateMutation = useUpdateBill();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!bill) return null;
  
  return (
    <div className="bill-detail">
      <BillMeta bill={bill} />
      <BillContent 
        bill={bill} 
        onUpdate={(updated) => updateMutation.mutate(updated)}
      />
    </div>
  );
}
```

### Presenter Component Pattern

```typescript
// client/src/features/bills/components/BillCard.tsx
import { Bill } from '@shared/types';

interface BillCardProps {
  bill: Bill;
  onSelect: (bill: Bill) => void;
  isSelected?: boolean;
}

export function BillCard({ bill, onSelect, isSelected }: BillCardProps) {
  return (
    <button
      onClick={() => onSelect(bill)}
      className={cn(
        'bill-card',
        isSelected && 'is-selected'
      )}
    >
      <h3>{bill.title}</h3>
      <p className="text-muted">{bill.status}</p>
    </button>
  );
}
```

**Pattern:**
- Container/Model components: manage data and state
- Presenter components: pure, data-in-props-out
- Separation allows easy testing and reuse

---

## 5. Error Handling Pattern

### Custom Error Hierarchy

```typescript
// server/utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details: Record<string, string> = {}) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string | number) {
    super(`${resource} not found: ${id}`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

### Global Error Handler Middleware

```typescript
// server/middleware/error-handler.ts
import { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Known app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        details: 'details' in err ? err.details : undefined,
      },
    });
  }
  
  // Unknown errors
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
};
```

**Pattern:** Errors are typed, handled consistently, and contain enough context for debugging

---

## 6. Validation Pattern

### Multi-Layer Validation

```
Database Schema (source of truth)
    ↓
Zod Schemas (runtime validation)
    ↓
TypeScript Types (compile-time validation)
    ↓
Form Validation (client-side UX)
```

### Example: Bill Title

```typescript
// 1. Schema definition
export const bills = pgTable('bills', {
  title: varchar('title', { length: 255 })
    .notNull()
    .notIn([''])  // custom validation
});

// 2. Zod validation (runtime)
export const BillInsertSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title must be at most 255 characters'),
});

// 3. TypeScript type (compile-time)
export type Bill = typeof bills.$inferSelect;

// 4. Client-side form validation
<Input
  {...register('title', {
    required: 'Title is required',
    minLength: { value: 5, message: 'Min 5 characters' },
    maxLength: { value: 255, message: 'Max 255 characters' },
  })}
/>
```

**Pattern:** Single source of truth (schema) with validation at multiple layers

---

## 7. Testing Patterns

### Unit Tests (Service/Utility)

```typescript
// __tests__/services/bill.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { BillService } from '../bill.service';

describe('BillService', () => {
  let service: BillService;
  
  beforeEach(() => {
    service = new BillService();
  });
  
  describe('createBill', () => {
    it('should validate input', () => {
      expect(() => {
        service.createBill({ title: '' }); // too short
      }).toThrow('validation');
    });
    
    it('should create with valid data', async () => {
      const bill = await service.createBill({
        title: 'Test Bill',
        status: 'draft',
      });
      expect(bill.id).toBeDefined();
    });
  });
});
```

### Integration Tests (API)

```typescript
// __tests__/routes/bills.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('POST /api/bills', () => {
  it('should create a bill with valid data', async () => {
    const res = await request(app)
      .post('/api/bills')
      .send({
        title: 'Test Bill',
        status: 'draft',
      });
    
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });
  
  it('should reject invalid data', async () => {
    const res = await request(app)
      .post('/api/bills')
      .send({
        title: '', // too short
      });
    
    expect(res.status).toBe(400);
  });
});
```

### Component Tests (React)

```typescript
// __tests__/components/BillCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillCard } from '../BillCard';

describe('BillCard', () => {
  it('should render bill data', () => {
    const bill = { id: 1, title: 'Test Bill', status: 'draft' };
    render(<BillCard bill={bill} onSelect={() => {}} />);
    
    expect(screen.getByText('Test Bill')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });
  
  it('should call onSelect when clicked', async () => {
    const bill = { id: 1, title: 'Test Bill', status: 'draft' };
    const onSelect = vi.fn();
    
    render(<BillCard bill={bill} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button'));
    
    expect(onSelect).toHaveBeenCalledWith(bill);
  });
});
```

**Pattern:** Test behavior, not implementation. Validate inputs and outputs.

---

## Key Principles

1. **Schema is source of truth** - Types and validation derive from database schema
2. **Layered responsibility** - Each layer has one job (DB, business logic, HTTP, UI)
3. **Validate everywhere** - At boundaries between layers
4. **Type safety throughout** - Share types across layers, no duplication
5. **Consistent error handling** - Use typed, structured errors with codes
6. **Test behaviors, not internals** - Focus on inputs/outputs, not implementation
7. **Cache strategically** - Query keys structure cache, mutations update intelligently

---

## Checklists

### New Feature Checklist

- [ ] Database schema defined in `shared/db/schema.ts`
- [ ] Drizzle migration created
- [ ] Shared types extracted: `select`, `insert`, `update`
- [ ] Zod validation schemas created
- [ ] Service class created with business logic
- [ ] Express routes with validation middleware
- [ ] React Query hooks for API access
- [ ] Container component with query hooks
- [ ] Presenter components with pure logic
- [ ] Error handling from service through UI
- [ ] Unit tests for service
- [ ] Integration tests for API routes
- [ ] Component tests for UI
- [ ] Error cases tested

---

## Related Documentation

- **[3-data-flow-pipelines.md](./3-data-flow-pipelines.md)** - Complete flow examples
- **[../adr/ADR-022-api-integration-standardization.md](../adr/ADR-022-api-integration-standardization.md)** - API standards
- **[../guides/](../guides/)** - Specific how-to guides
