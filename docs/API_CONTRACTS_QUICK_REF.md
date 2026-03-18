# API Contracts Quick Reference

## Imports

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

## Common Patterns

### POST Request Handler
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

### GET List with Pagination
```typescript
import { ListBillsResponse } from '@shared/types/api/contracts';
import { createPaginatedResponse } from '@shared/types/api/contracts/validation.schemas';

app.get('/api/bills', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const {items, total} = await billService.list(page, limit);
  return res.json(createPaginatedResponse(items, total, page, limit));
});
```

### Frontend API Call
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

## Type Checklist

For each API endpoint, ensure you have:

- [ ] Request type: `Create*Request`, `Update*Request`, `Search*Request`
- [ ] Response type: `Get*Response`, `List*Response`, `Create*Response`
- [ ] Validation schema: `Create*RequestSchema`, `Search*RequestSchema`
- [ ] Error handling with typed errors
- [ ] Documentation with JSDoc on types

## Response Types Cheat Sheet

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

## Validation Helpers

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

## File Locations

```
Types:    shared/types/api/contracts/*.contracts.ts
Schemas:  shared/types/api/contracts/validation.schemas.ts
Index:    shared/types/api/contracts/index.ts
Docs:     docs/API_CONTRACTS_GUIDE.md
```

## AD-016 Rules Review

✅ File Names:     PascalCase for types, kebab-case ok for files
✅ Class Names:    PascalCase, NO "Enhanced" prefix
✅ Exports:        camelCase for instances, PascalCase for types
✅ Routes:         kebab-case only
✅ Schemas:        PascalCase with "Schema" suffix

## Status Summary

| Area | Status |
|------|--------|
| Feature Flags | ✅ Complete |
| Bills | ✅ Complete |
| Monitoring | ✅ Complete |
| Validation | ✅ Complete |
| Documentation | ✅ Complete |
| ADR-016 Compliance | ✅ Complete |

---

See `docs/API_CONTRACTS_GUIDE.md` for complete documentation.
