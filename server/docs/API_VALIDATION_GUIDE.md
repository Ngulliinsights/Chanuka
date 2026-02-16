# API Validation Guide

## Overview

This guide documents the process of updating all API endpoints to use Zod schema validation before processing requests. This ensures data integrity, consistent error handling, and type safety across the API.

## Requirements

**Requirement 5.6**: All API endpoints must validate using Zod schemas before any processing occurs.

## Validation Middleware

The validation middleware is located at `server/middleware/validation-middleware.ts` and provides:

- `validateBody(schema)` - Validates request body
- `validateQuery(schema)` - Validates query parameters
- `validateParams(schema)` - Validates path parameters
- `validateMultiple({ body, query, params })` - Validates multiple targets

## Migration Pattern

### Before (Manual Validation)

```typescript
router.post('/', asyncHandler(async (req, res: Response) => {
  const { name, party, role } = req.body;

  // Manual validation
  if (!name || !party) {
    throw new ValidationError('Missing required fields', {
      field: 'body',
      message: 'Name and party are required'
    });
  }

  const sponsor = await sponsorService.create({ name, party, role });
  res.status(201).json({ data: sponsor });
}));
```

### After (Zod Schema Validation)

```typescript
import { validateBody } from '../../middleware/validation-middleware';
import { CreateSponsorSchema } from '@shared/validation/schemas/sponsor.schema';

router.post('/', validateBody(CreateSponsorSchema), asyncHandler(async (req, res: Response) => {
  // req.body is now validated and typed
  const sponsor = await sponsorService.create(req.body);
  res.status(201).json({ data: sponsor });
}));
```

## Implementation Steps

### Step 1: Create Zod Schemas

For each API endpoint, create corresponding Zod schemas in `shared/validation/schemas/`:

```typescript
// shared/validation/schemas/sponsor.schema.ts
import { z } from 'zod';
import { nonEmptyString, optionalNonEmptyString } from './common';

export const CreateSponsorSchema = z.object({
  name: nonEmptyString('name', 1, 200),
  party: nonEmptyString('party', 1, 100),
  role: optionalNonEmptyString('role', 1, 100),
  constituency: optionalNonEmptyString('constituency', 1, 100),
  is_active: z.boolean().default(true),
});

export const UpdateSponsorSchema = CreateSponsorSchema.partial();

export const ListSponsorsQuerySchema = z.object({
  party: z.string().optional(),
  role: z.string().optional(),
  constituency: z.string().optional(),
  conflict_level: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.string().default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const GetSponsorParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
```

### Step 2: Update Routes to Use Validation Middleware

```typescript
import { validateBody, validateQuery, validateParams } from '../../middleware/validation-middleware';
import {
  CreateSponsorSchema,
  UpdateSponsorSchema,
  ListSponsorsQuerySchema,
  GetSponsorParamsSchema,
} from '@shared/validation/schemas/sponsor.schema';

// List sponsors with query validation
router.get('/', validateQuery(ListSponsorsQuerySchema), asyncHandler(async (req, res: Response) => {
  // req.query is now validated and typed
  const sponsors = req.query.search
    ? await sponsorService.search(req.query.search, req.query)
    : await sponsorService.list(req.query);
  
  res.json({ data: sponsors });
}));

// Get sponsor by ID with params validation
router.get('/:id', validateParams(GetSponsorParamsSchema), asyncHandler(async (req, res: Response) => {
  // req.params.id is now validated and typed as number
  const sponsor = await sponsorService.findByIdWithRelations(req.params.id);
  
  if (!sponsor) {
    throw new BaseError('Sponsor not found', {
      statusCode: 404,
      code: ErrorCode.RESOURCE_NOT_FOUND,
    });
  }
  
  res.json({ data: sponsor });
}));

// Create sponsor with body validation
router.post('/', validateBody(CreateSponsorSchema), asyncHandler(async (req, res: Response) => {
  // req.body is now validated and typed
  const sponsor = await sponsorService.create(req.body);
  res.status(201).json({ data: sponsor });
}));

// Update sponsor with params and body validation
router.put('/:id', validateParams(GetSponsorParamsSchema), validateBody(UpdateSponsorSchema), asyncHandler(async (req, res: Response) => {
  // Both req.params and req.body are validated
  const sponsor = await sponsorService.update(req.params.id, req.body);
  res.json({ data: sponsor });
}));
```

### Step 3: Remove Manual Validation Code

Remove all manual validation logic:
- Remove `if (!field)` checks
- Remove `parseIntParam` and `parseOptionalIntParam` helper functions
- Remove manual type coercion (parseInt, parseFloat, etc.)
- Remove manual error throwing for validation failures

The validation middleware handles all of this automatically.

## Benefits

1. **Consistent Error Format**: All validation errors follow the same structure
2. **Type Safety**: Validated data is properly typed
3. **Reusable Schemas**: Schemas can be shared between client and server
4. **Less Boilerplate**: No need for manual validation code
5. **Better Error Messages**: Zod provides detailed field-level errors
6. **Empty String Validation**: Automatically rejects empty/whitespace-only strings

## Validation Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "statusCode": 400,
    "correlationId": "req-1234567890-abc123",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "validationErrors": [
      {
        "field": "name",
        "message": "name cannot be empty or contain only whitespace",
        "code": "custom"
      },
      {
        "field": "party",
        "message": "party must be at least 1 character",
        "code": "too_small"
      }
    ]
  }
}
```

## Priority Endpoints for Migration

### High Priority (Data Modification)
1. POST /api/sponsors - Create sponsor
2. PUT /api/sponsors/:id - Update sponsor
3. POST /api/users/verification - Create verification
4. PUT /api/users/verification/:id - Update verification
5. PATCH /api/users/me - Update user profile
6. POST /api/bills - Create bill
7. PUT /api/bills/:id - Update bill

### Medium Priority (Query Parameters)
1. GET /api/sponsors - List sponsors with filters
2. GET /api/bills - List bills with filters
3. GET /api/users - List users with filters
4. GET /api/search - Search with parameters

### Low Priority (Simple GET by ID)
1. GET /api/sponsors/:id
2. GET /api/bills/:id
3. GET /api/users/:id

## Testing Validation

After updating an endpoint, test with:

1. **Valid data**: Should succeed
2. **Missing required fields**: Should return 400 with field-level errors
3. **Empty strings**: Should return 400 with "cannot be empty" error
4. **Whitespace-only strings**: Should return 400 with "cannot be empty" error
5. **Invalid types**: Should return 400 with type error
6. **Out of range values**: Should return 400 with range error

## Common Patterns

### Pattern 1: Simple Body Validation

```typescript
router.post('/endpoint', validateBody(MySchema), asyncHandler(async (req, res) => {
  const result = await service.create(req.body);
  res.status(201).json({ data: result });
}));
```

### Pattern 2: Params + Body Validation

```typescript
router.put('/:id', validateParams(IdParamsSchema), validateBody(UpdateSchema), asyncHandler(async (req, res) => {
  const result = await service.update(req.params.id, req.body);
  res.json({ data: result });
}));
```

### Pattern 3: Query Validation

```typescript
router.get('/list', validateQuery(ListQuerySchema), asyncHandler(async (req, res) => {
  const results = await service.list(req.query);
  res.json({ data: results });
}));
```

### Pattern 4: Multiple Validations

```typescript
import { validateMultiple } from '../../middleware/validation-middleware';

router.put('/:id', validateMultiple({
  params: IdParamsSchema,
  body: UpdateSchema,
  query: OptionsQuerySchema,
}), asyncHandler(async (req, res) => {
  const result = await service.update(req.params.id, req.body, req.query);
  res.json({ data: result });
}));
```

## Checklist for Each Endpoint

- [ ] Create Zod schema(s) for the endpoint
- [ ] Add validation middleware to route
- [ ] Remove manual validation code
- [ ] Remove helper functions (parseIntParam, etc.)
- [ ] Update TypeScript types to use inferred schema types
- [ ] Test with valid data
- [ ] Test with invalid data
- [ ] Test with empty strings
- [ ] Test with whitespace-only strings
- [ ] Verify error response format

## Status Tracking

Track migration progress in `.kiro/specs/comprehensive-bug-fixes/API_VALIDATION_STATUS.md`

## Notes

- All string fields now automatically reject empty and whitespace-only values
- Use `nonEmptyString()` helper from `shared/validation/schemas/common.ts`
- Validation happens BEFORE any business logic
- Validated data is typed and safe to use
- No need to check for undefined/null after validation
