# API Contracts Reference Guide

Comprehensive guide to type-safe, self-documenting API specifications for all backend endpoints.

---

## 📋 Quick Reference

### Imports

```typescript
// All contracts
import * from '@shared/types/api/contracts';

// Specific domains
import { FeatureFlag, CreateFlagRequest } from '@shared/types/api/contracts';
import { Bill, SearchBillsRequest } from '@shared/types/api/contracts';
import { MonitoringDashboard } from '@shared/types/api/contracts';

// Validation only
import { validateSchema, safeValidateSchema, CreateBillRequestSchema } from '@shared/types/api/contracts';
```

### Common Patterns

#### POST Request Handler
```typescript
import { CreateBillRequest, CreateBillResponse } from '@shared/types/api/contracts';
import { safeValidateSchema, CreateBillRequestSchema, createSuccessResponse } from '@shared/types/api/contracts/validation.schemas';

app.post('/api/bills', async (req, res) => {
  const result = safeValidateSchema(req.body, CreateBillRequestSchema);
  if (!result.success) {
    return res.status(400).json(createErrorResponse('Invalid request', 400, 'VALIDATION_ERROR'));
  }
  
  const bill = await billService.create(result.data);
  return res.json(createSuccessResponse(bill));
});
```

#### GET List with Pagination
```typescript
import { ListBillsResponse } from '@shared/types/api/contracts';
import { createPaginatedResponse } from '@shared/types/api/contracts/validation.schemas';

app.get('/api/bills', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const {items, total} = await billService.list(page, limit);
  return res.json(createPaginatedResponse(items, total, page, limit));
});
```

#### Frontend API Call
```typescript
import { SearchBillsRequest, ListBillsResponse } from '@shared/types/api/contracts';

async function searchBills(query: string): Promise<ListBillsResponse> {
  const req: SearchBillsRequest = { query, page: 1, limit: 20 };
  return fetch('/api/bills/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  }).then(r => r.json());
}
```

### Response Types Cheat Sheet

```typescript
// Single item (success)
{ success: true, data: Item, timestamp: '...' }

// Single item (error)
{ success: false, error: { code, message }, timestamp: '...' }

// List (success)
{ success: true, data: Item[], pagination: {...}, timestamp: '...' }

// List (error)
{ success: false, error: { code, message }, timestamp: '...' }
```

### Validation Helpers

```typescript
// Throws on failure
const data = validateSchema(req.body, Schema);

// Safe (recommended)
const { success, data, error } = safeValidateSchema(req.body, Schema);

// Create responses
createSuccessResponse(item)
createErrorResponse(message, 400, 'CODE', details)
createPaginatedResponse(items, total, page, limit)
```

---

## 📁 Complete Directory Structure

```
shared/types/api/contracts/
├── core.contracts.ts              # Base types, response wrappers
├── feature-flags.contracts.ts     # Feature flag endpoints
├── bills.contracts.ts             # Bill search & management
├── monitoring-community.contracts.ts # Monitoring & health checks  
├── community.contracts.ts         # Discussion & comments
├── government-data.contracts.ts   # Government data sync
├── analytics.contracts.ts         # Analytics events
├── validation.schemas.ts          # Zod runtime validation
├── helpers.ts                     # Response creation helpers
└── index.ts                       # Central exports
```

---

## 🎯 Naming Conventions (ADR-016)

All contracts follow **ADR-016: Naming Convention Standardization**:

✅ **Correct**
- Files: `feature-flags.contracts.ts` (kebab-case)
- Types: `FeatureFlag`, `CreateFlagRequest`, `ListFlagsResponse` (PascalCase)
- Schemas: `CreateFlagRequestSchema` (PascalCase with Schema suffix)
- No special prefixes (no "Enhanced", "Detailed", etc.)

❌ **Incorrect** (Deprecated)
- `feature-flags-detailed.ts`
- `EnhancedNotificationsService`
- `validation-schemas.ts` (without proper naming)

---

## 🔍 Complete Developer Guide

### Pattern 1: Backend Endpoint Implementation

```typescript
import { 
  CreateBillRequest, 
  BillDetails,
  CreateBillResponse 
} from '@shared/types/api/contracts';
import { validateSchema } from '@shared/types/api/contracts/validation.schemas';

export async function createBill(req: express.Request): Promise<CreateBillResponse> {
  // Validate request against schema
  const billData = validateSchema(req.body, CreateBillRequestSchema);
  
  // Process the request
  const bill = await billService.create(billData);
  
  // Return typed response
  return {
    success: true,
    data: bill,
    message: 'Bill created successfully',
    timestamp: new Date().toISOString(),
  };
}
```

### Pattern 2: Frontend API Client

```typescript
import { 
  SearchBillsRequest, 
  ListBillsResponse 
} from '@shared/types/api/contracts';

async function searchBills(params: SearchBillsRequest): Promise<ListBillsResponse> {
  const response = await fetch('/api/bills/search', {
    method: 'POST',
    body: JSON.stringify(params),
    headers: { 'Content-Type': 'application/json' },
  });
  
  return response.json() as Promise<ListBillsResponse>;
}
```

### Pattern 3: Request/Response Validation

```typescript
import { 
  safeValidateSchema,
  CreateCommentRequestSchema,
  createErrorResponse,
  createSuccessResponse 
} from '@shared/types/api/contracts/validation.schemas';

router.post('/comments', (req, res) => {
  // Safe validation returns { success, data, error }
  const validation = safeValidateSchema(req.body, CreateCommentRequestSchema);
  
  if (!validation.success) {
    return res.status(400).json(
      createErrorResponse(
        validation.error.message,
        400,
        'VALIDATION_ERROR',
        validation.error.details
      )
    );
  }
  
  // Use validated data
  const comment = await commentService.create(validation.data);
  return res.json(createSuccessResponse(comment));
});
```

---

## 📝 Contract Specification Examples

### Bill Contract Example

```typescript
// shared/types/api/contracts/bills.contracts.ts
import { z } from 'zod';

// Request types
export interface CreateBillRequest {
  title: string;
  description: string;
  committee?: string;
}

export interface SearchBillsRequest {
  query: string;
  status?: 'draft' | 'introduced' | 'passed' | 'failed';
  page?: number;
  limit?: number;
}

export interface UpdateBillRequest {
  title?: string;
  status?: string;
}

// Response types
export interface BillDetails {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'introduced' | 'passed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillResponse {
  success: true;
  data: BillDetails;
  message: string;
  timestamp: string;
}

export interface ListBillsResponse {
  success: true;
  data: BillDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

// Zod schemas for runtime validation
export const CreateBillRequestSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(20),
  committee: z.string().optional(),
});

export const SearchBillsRequestSchema = z.object({
  query: z.string().min(1),
  status: z.enum(['draft', 'introduced', 'passed', 'failed']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type CreateBillRequestType = z.infer<typeof CreateBillRequestSchema>;
export type SearchBillsRequestType = z.infer<typeof SearchBillsRequestSchema>;
```

---

## ✅ Type Checklist

For each API endpoint, ensure you have:

- [ ] Request type: `Create*Request`, `Update*Request`, `Search*Request`
- [ ] Response type: `Get*Response`, `List*Response`, `Create*Response`
- [ ] Error response type: `*ErrorResponse`
- [ ] Validation schema for each request type
- [ ] Error handling with typed errors
- [ ] JSDoc documentation on types and schemas
- [ ] Export in `index.ts` for central access

### New Endpoint Checklist

1. **Create types** in appropriate contract file
   ```typescript
   export interface CreateFeatureRequest { ... }
   export interface FeatureResponse { ... }
   ```

2. **Create Zod schema** for validation
   ```typescript
   export const CreateFeatureRequestSchema = z.object({ ... });
   ```

3. **Export from index.ts**
   ```typescript
   export * from './feature.contracts';
   ```

4. **Use in controller**
   ```typescript
   const validated = validateSchema(req.body, CreateFeatureRequestSchema);
   ```

5. **Add JSDoc** comments
   ```typescript
   /**
    * Request to create a new feature
    * @example { name: "New Feature", enabled: true }
    */
   export interface CreateFeatureRequest { ... }
   ```

---

## 🛠️ Response Creation Helpers

Located in `shared/types/api/contracts/helpers.ts`:

```typescript
// Success response
createSuccessResponse<T>(data: T): SuccessResponse<T>

// Error response
createErrorResponse(
  message: string,
  statusCode: number,
  code: string,
  details?: Record<string, any>
): ErrorResponse

// Paginated response
createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T>

// Not found response
createNotFoundResponse(resource: string, id: any): ErrorResponse

// Validation error response
createValidationErrorResponse(
  errors: Record<string, string>
): ValidationErrorResponse
```

---

## 🔗 Related Documentation

- **[../architecture/2-implementation-patterns.md](../architecture/2-implementation-patterns.md)** — Feature implementation patterns
- **[../adr/ADR-022-api-integration-standardization.md](../adr/ADR-022-api-integration-standardization.md)** — API standardization decision
- **[../adr/ADR-016-naming-convention-standardization.md](../adr/ADR-016-naming-convention-standardization.md)** — Naming conventions

---

## 📌 Best Practices

1. **Types are documentation** - Use clear, descriptive names
2. **Validate at boundaries** - Validate at API entry points and before database operations
3. **Share types everywhere** - Frontend and backend use same types
4. **Error codes matter** - Use consistent error codes for client handling
5. **Document examples** - Include `@example` in JSDoc for complex types
6. **Keep contracts lightweight** - Move complex logic to services, not contracts
7. **Version your contracts** - Plan for API evolution

---

## 📊 Implementation Status

**Last Updated:** March 2026
**Complete:** ✅ Core contracts for all major features
**In Progress:** Standardizing response wrappers across all endpoints
**Planned:** OpenAPI/Swagger generation from contracts

