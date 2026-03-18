# API Contracts Developer Guide

## Overview

The API Contracts layer provides type-safe, self-documenting specifications for all backend endpoints. This guide explains how to use them effectively.

## File Structure

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
└── index.ts                       # Central exports
```

## Following Naming Conventions (ADR-016)

These contracts follow **ADR-016: Naming Convention Standardization**:

✅ **Correct**
- File: `feature-flags.contracts.ts` (kebab-case acceptable for file names)
- Types: `FeatureFlag`, `CreateFlagRequest`, `ListFlagsResponse` (PascalCase)
- Schemas: `ValidationSchemas` (PascalCase with Schema suffix)
- Naming: No "Enhanced" or "Detailed" prefixes

❌ **Incorrect** (Old Pattern - Deprecated)
- `feature-flags-detailed.ts`
- `EnhancedNotificationsService`
- `validation-schemas.ts` (without proper Schema suffix)

## Usage Patterns

### Pattern 1: Backend Endpoint Implementation

```typescript
import { 
  CreateBillRequest, 
  BillDetails,
  CreateBillResponse 
} from '@shared/types/api/contracts';
import { validateSchema } from '@shared/types/api/contracts/validation.schemas';

export async function createBill(req: express.Request): Promise<CreateBillResponse> {
  // Validate request
  const billData = validateSchema(req.body, CreateBillRequestSchema);
  
  // Process
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
    return res.status(400).json(createErrorResponse(
      'Invalid request',
      400,
      'VALIDATION_ERROR',
      validation.error.flatten()
    ));
  }
  
  const comment = await commentService.create(validation.data);
  return res.json(createSuccessResponse(comment));
});
```

### Pattern 4: Error Handling

```typescript
import { 
  createErrorResponse,
  StandardApiResponseType
} from '@shared/types/api/contracts';

// Typed error response
const response: StandardApiResponseType<never> = createErrorResponse(
  'Bill not found',
  404,
  'NOT_FOUND',
  { billId: '123' }
);

res.status(404).json(response);
```

## Available Contracts

### Feature Flags
- `FeatureFlag` - Flag definition
- `CreateFlagRequest` - Create flag
- `UpdateFlagRequest` - Update flag
- `FlagAnalytics` - Flag metrics

Schemas: `FeatureFlagSchema`, `CreateFlagRequestSchema`, `UpdateFlagRequestSchema`

### Bills
- `Bill` - Bill summary
- `BillDetails` - Full bill info
- `SearchBillsRequest` - Search filters
- `CreateBillRequest` - New bill

Schemas: `BillSchema`, `SearchBillsRequestSchema`, `CreateBillRequestSchema`

### Monitoring
- `HealthCheckResponse` - System health
- `Metric` - Metric data point
- `Alert` - Alert notification
- `MonitoringDashboard` - Dashboard view

Schemas: `HealthCheckResponseSchema`, `MetricSchema`, `AlertSchema`

### Community
- `Comment` - Comment on bill
- `DiscussionThread` - Discussion topic
- `Vote` - Up/down vote

Schemas: `CommentSchema`, `DiscussionThreadSchema`, `VoteSchema`

## Validation Rules

### Zod Schema Functions

```typescript
// Throws on validation failure
const data = validateSchema(req.body, CreateBillRequestSchema);

// Safe validation (recommended)
const result = safeValidateSchema(req.body, CreateBillRequestSchema);
if (!result.success) {
  // handle error.flatten()
}
```

### Common Validations

```typescript
// UUIDs
z.string().uuid()  // ✅ Must be valid UUID

// Email addresses
z.string().email()  // ✅ Must be valid email

// Enumeration
z.enum(['active', 'inactive', 'pending'])  // ✅ Must match value

// String length
z.string().min(1).max(500)  // ✅ 1-500 chars

// Numbers
z.number().int().positive()  // ✅ Positive integer
z.number().min(0).max(100)   // ✅ 0-100 range
```

## Response Wrapper Format

All API responses follow this format:

```typescript
interface StandardApiResponseType<T> {
  success: boolean;           // true = success, false = error
  data?: T;                   // Response data (if success)
  error?: {                   // Error details (if failure)
    code?: string;            // e.g., 'NOT_FOUND', 'VALIDATION_ERROR'
    message: string;          // Human-readable message
    details?: unknown;        // Additional context
    statusCode?: number;      // HTTP status code
  };
  message?: string;           // Optional message
  timestamp: string;          // ISO 8601 timestamp
  metadata?: {                // Optional metadata
    requestId?: string;
    cacheHit?: boolean;
    duration?: number;
  };
}
```

## Pagination

```typescript
// Create paginated response
const result = createPaginatedResponse(
  billsData,        // items: T[]
  totalCount,       // total number of items
  currentPage,      // page number (1-indexed)
  itemsPerPage      // items per page
);

// Returns
{
  success: true,
  data: [...],
  pagination: {
    total: 250,
    page: 1,
    pageSize: 20,
    hasMore: true,
    totalPages: 13
  },
  timestamp: '2026-03-18T20:30:00Z'
}
```

## Common Patterns

### Create Resource
```typescript
// Request
POST /api/bills
{
  "billNumber": "S.1234",
  "title": "Healthcare Reform Act",
  "summary": "...",
  "chamber": "senate"
}

// Response
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "billNumber": "S.1234",
    "title": "Healthcare Reform Act",
    // ... all bill fields
  },
  "timestamp": "2026-03-18T20:30:00Z"
}
```

### Search/List
```typescript
// Request
POST /api/bills/search
{
  "query": "healthcare",
  "status": "passed",
  "page": 1,
  "limit": 20
}

// Response
{
  "success": true,
  "data": [{ bill1 }, { bill2 }, ...],
  "pagination": {
    "total": 245,
    "page": 1,
    "pageSize": 20,
    "hasMore": true,
    "totalPages": 13
  },
  "timestamp": "2026-03-18T20:30:00Z"
}
```

### Error Response
```typescript
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Bill not found",
    "details": { "billId": "invalid-id" },
    "statusCode": 404
  },
  "timestamp": "2026-03-18T20:30:00Z"
}
```

## Testing with Contracts

```typescript
// test.ts
import { Bill, CreateBillRequest } from '@shared/types/api/contracts';

describe('Bill API', () => {
  it('should create a bill with valid request', async () => {
    const request: CreateBillRequest = {
      billNumber: 'S.1234',
      title: 'Test Bill',
      summary: 'A test bill',
      chamber: 'senate',
      billType: 'bill',
      sponsorId: '550e8400-e29b-41d4-a716-446655440000',
    };

    const response = await createBill(request);
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('id');
  });
});
```

## Adding New Contracts

1. **Create new contract file** (e.g., `notifications.contracts.ts`)
2. **Define types** following PascalCase convention
3. **Create Zod schemas** (e.g., `CreateNotificationSchema`)
4. **Export from index.ts**
5. **Document usage** in JSDoc comments

```typescript
// notifications.contracts.ts
export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationRequest {
  userId: string;
  message: string;
}

// Add to validation.schemas.ts
export const NotificationSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  message: z.string().min(1).max(1000),
  read: z.boolean(),
  createdAt: TimestampSchema,
});
```

## Troubleshooting

### "Module has already exported a member named X"

This means two files are exporting the same type. Solution:
- Use aliased imports: `import { Comment as CommunityComment }`
- Or selectively export from index.ts

### Type mismatch between contract and validation

Ensure Zod schema matches the TypeScript interface exactly.

```typescript
// ❌ Mismatch
interface: { name: string, age: number }
schema: z.object({ name: z.string() })

// ✅ Correct
interface: { name: string, age: number }
schema: z.object({ name: z.string(), age: z.number() })
```

### Runtime validation fails

Check that incoming data matches the schema exactly:
- Required fields must be present
- String lengths must be within limits
- Enums must match exact values (case-sensitive)

## Migration Checklist

If updating existing endpoints:

- [ ] Create contract types (`.contracts.ts`)
- [ ] Add Zod schemas (in `validation.schemas.ts`)
- [ ] Update backend handlers to use contracts
- [ ] Add request validation with `safeValidateSchema()`
- [ ] Update frontend clients to use contracts
- [ ] Add TypeScript types to API calls
- [ ] Write tests using contract types
- [ ] Update API documentation
- [ ] Archive old inline type definitions

## Best Practices

1. **Always use contracts for API boundaries** - Never pass untyped data between client and server
2. **Validate all inputs** - Use `safeValidateSchema()` for untrusted data
3. **Use helper functions** - `createSuccessResponse()`, `createErrorResponse()`, `createPaginatedResponse()`
4. **Keep contracts in sync** - Update Zod schema when changing TypeScript interface
5. **Document breaking changes** - Note API contract changes in CHANGELOG
6. **Test with real contracts** - Use the actual types in your tests
7. **Avoid duplication** - Import and re-export rather than copying types
8. **Follow naming conventions** - PascalCase for types, kebab-case for files (per ADR-016)

## Related Documentation

- [ADR-016: Naming Convention Standardization](../../docs/adr/ADR-016-naming-conventions.md)
- [API Response Format](./core.contracts.ts)
- [Zod Documentation](https://zod.dev/)

## Support

For questions about API contracts:
1. Check this guide first
2. Review existing contract files for examples
3. Check test files for usage patterns
4. Open a discussion in the project

---

**Last Updated:** 2026-03-18  
**Status:** Active - All new APIs must use contracts
