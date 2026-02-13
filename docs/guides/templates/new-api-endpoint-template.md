# Template: New API Endpoint

## Overview

Use this template when adding a new API endpoint to an existing entity or feature. This template ensures proper type safety, validation, and integration patterns.

**Replace placeholders:**
- `{Entity}` - Entity name in PascalCase (e.g., `Bill`, `User`, `Vote`)
- `{entity}` - Entity name in camelCase (e.g., `bill`, `user`, `vote`)
- `{entities}` - Plural form in camelCase (e.g., `bills`, `users`, `votes`)
- `{Action}` - Action name in PascalCase (e.g., `Statistics`, `Summary`, `Archive`)
- `{action}` - Action name in camelCase (e.g., `statistics`, `summary`, `archive`)
- `{METHOD}` - HTTP method (GET, POST, PUT, PATCH, DELETE)
- `{path}` - URL path (e.g., `/bills/:id/statistics`, `/users/:id/archive`)

## Checklist

- [ ] Step 1: Define API contract types
- [ ] Step 2: Create validation schemas
- [ ] Step 3: Add service method
- [ ] Step 4: Add route handler
- [ ] Step 5: Add client API method
- [ ] Step 6: Create client component (optional)
- [ ] Step 7: Write tests

---

## Step 1: Define API Contract Types

**File**: `shared/types/api/contracts/{entity}.contract.ts`

```typescript
// Add to existing {entity} contracts

// Define request type (if endpoint accepts data)
export interface {Action}{Entity}Request {
  // Add request fields
  // Example: startDate?: string;
  // Example: endDate?: string;
  // Example: includeDetails?: boolean;
}

// Define response type
export interface {Action}{Entity}Response {
  // Add response fields
  // Example: {entity}: {Entity};
  // Example: statistics: {Entity}Statistics;
  // Example: summary: string;
}

// Define any additional types needed
export interface {Entity}{Action}Data {
  // Add data structure fields
  // Example: totalCount: number;
  // Example: averageScore: number;
}
```

---

## Step 2: Create Validation Schemas

**File**: `shared/validation/schemas/{entity}.schema.ts`

```typescript
import { z } from 'zod';

// Add to existing {entity} schemas

// Request schema (if endpoint accepts data)
export const {Action}{Entity}RequestSchema = z.object({
  // Add validation rules
  // Example: startDate: z.string().datetime().optional(),
  // Example: endDate: z.string().datetime().optional(),
  // Example: includeDetails: z.boolean().optional(),
});

// Response schema (for development validation)
export const {Action}{Entity}ResponseSchema = z.object({
  // Add validation rules matching response type
  // Example: statistics: z.object({
  //   totalCount: z.number().int().min(0),
  //   averageScore: z.number().min(0).max(100),
  // }),
});
```

---

## Step 3: Add Service Method

**File**: `server/services/{entity}.service.ts`

```typescript
import type { {Action}{Entity}Request, {Action}{Entity}Response } from '@shared/types/api/contracts/{entity}.contract';
import type { {Entity}Id } from '@shared/types/core/branded';
import { AppError } from '../utils/errors';

export class {Entity}Service {
  // ... existing methods

  async {action}{Entity}(
    id: {Entity}Id,
    request?: {Action}{Entity}Request
  ): Promise</* Return type based on response */> {
    // 1. Verify entity exists (if needed)
    const {entity} = await this.{entity}Repository.findById(id);
    if (!{entity}) {
      throw new AppError('{Entity} not found', '{ENTITY}_NOT_FOUND', 404);
    }

    // 2. Add authorization checks (if needed)
    // Example: if ({entity}.userId !== currentUserId) {
    //   throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
    // }

    // 3. Implement business logic
    // Example: Fetch related data
    // Example: Perform calculations
    // Example: Call external services

    // 4. Return result
    return {
      // Map to response format
      // Example: statistics: { totalCount, averageScore },
      // Example: {entity}: transformed{Entity},
    };
  }
}
```

**Alternative: For endpoints that don't require an ID**

```typescript
async {action}{Entity}s(
  request?: {Action}{Entity}Request
): Promise</* Return type */> {
  // Implement logic for collection-level operations
  // Example: Get all {entities} matching criteria
  // Example: Perform bulk operations
  
  return {
    // Return result
  };
}
```

---

## Step 4: Add Route Handler

**File**: `server/routes/{entities}.ts`

```typescript
import type {
  {Action}{Entity}Request,
  {Action}{Entity}Response,
} from '@shared/types/api/contracts/{entity}.contract';
import { {Action}{Entity}RequestSchema } from '@shared/validation/schemas/{entity}.schema';
import type { {Entity}Id } from '@shared/types/core/branded';

// Add to existing routes

// For endpoints with ID parameter
router.{METHOD}('{path}', /* authenticate if needed */, async (req, res, next) => {
  try {
    const id = req.params.id as {Entity}Id;
    
    // Parse and validate request (if endpoint accepts data)
    const validatedData = {Action}{Entity}RequestSchema.parse(
      req.method === 'GET' ? req.query : req.body
    ) as {Action}{Entity}Request;

    // Call service method
    const result = await {entity}Service.{action}{Entity}(id, validatedData);

    // Send response
    const response: {Action}{Entity}Response = result;
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// For collection-level endpoints (no ID)
router.{METHOD}('{path}', /* authenticate if needed */, async (req, res, next) => {
  try {
    // Parse and validate request
    const validatedData = {Action}{Entity}RequestSchema.parse(
      req.method === 'GET' ? req.query : req.body
    ) as {Action}{Entity}Request;

    // Call service method
    const result = await {entity}Service.{action}{Entity}s(validatedData);

    // Send response
    const response: {Action}{Entity}Response = result;
    res.json(response);
  } catch (error) {
    next(error);
  }
});
```

**Common HTTP Methods:**
- `GET` - Retrieve data (use `req.query` for parameters)
- `POST` - Create or trigger action (use `req.body` for data)
- `PATCH` - Partial update (use `req.body` for data)
- `PUT` - Full update (use `req.body` for data)
- `DELETE` - Remove resource (usually no body)

---

## Step 5: Add Client API Method

**File**: `client/src/api/{entities}.api.ts`

```typescript
import type {
  {Action}{Entity}Request,
  {Action}{Entity}Response,
} from '@shared/types/api/contracts/{entity}.contract';

export const {entities}Api = {
  // ... existing methods

  // For endpoints with ID parameter
  async {action}{Entity}(id: string, request?: {Action}{Entity}Request): Promise<{Action}{Entity}Response> {
    const response = await apiClient.{METHOD}(`{path}`, request);
    return response.data;
  },

  // For collection-level endpoints
  async {action}{Entity}s(request?: {Action}{Entity}Request): Promise<{Action}{Entity}Response> {
    const response = await apiClient.{METHOD}(`{path}`, request);
    return response.data;
  },
};
```

**Method mapping:**
- `GET` - `apiClient.get(url, { params: request })`
- `POST` - `apiClient.post(url, request)`
- `PATCH` - `apiClient.patch(url, request)`
- `PUT` - `apiClient.put(url, request)`
- `DELETE` - `apiClient.delete(url)`

---

## Step 6: Create Client Component (Optional)

**File**: `client/src/features/{entities}/{Entity}{Action}.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { {entities}Api } from '../../api/{entities}.api';
import type { {Action}{Entity}Response } from '@shared/types/api/contracts/{entity}.contract';

interface {Entity}{Action}Props {
  {entity}Id: string;
  // Add other props as needed
}

export const {Entity}{Action}: React.FC<{Entity}{Action}Props> = ({ {entity}Id }) => {
  const [data, setData] = useState</* Response data type */ | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await {entities}Api.{action}{Entity}({entity}Id);
        setData(response./* Extract data from response */);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [{entity}Id]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="{entity}-{action}">
      {/* Render data */}
    </div>
  );
};
```

**For action buttons (POST/PATCH/DELETE):**

```typescript
export const {Entity}{Action}Button: React.FC<{Entity}{Action}Props> = ({ {entity}Id }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle{Action} = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await {entities}Api.{action}{Entity}({entity}Id, /* request data if needed */);
      // Handle success (e.g., show notification, refresh data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handle{Action}} disabled={isLoading}>
        {isLoading ? 'Processing...' : '{Action}'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};
```

---

## Step 7: Write Tests

### Unit Tests

**File**: `tests/unit/{entity}.service.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { {Entity}Service } from '../../server/services/{entity}.service';
import { {Entity}Repository } from '../../server/infrastructure/repositories/{entity}.repository';

describe('{Entity}Service.{action}{Entity}', () => {
  let {entity}Service: {Entity}Service;
  let {entity}Repository: {Entity}Repository;

  beforeEach(() => {
    {entity}Repository = new {Entity}Repository();
    {entity}Service = new {Entity}Service({entity}Repository);
  });

  it('should {action} {entity} successfully', async () => {
    // Arrange
    const {entity}Id = '123e4567-e89b-12d3-a456-426614174000';
    const mockRequest = {
      // Add test request data
    };
    
    // Mock repository methods if needed
    vi.spyOn({entity}Repository, 'findById').mockResolvedValue({
      // Mock {entity} data
    });

    // Act
    const result = await {entity}Service.{action}{Entity}({entity}Id, mockRequest);

    // Assert
    expect(result).toBeDefined();
    // Add specific assertions
  });

  it('should throw error when {entity} not found', async () => {
    // Arrange
    const {entity}Id = 'non-existent-id';
    vi.spyOn({entity}Repository, 'findById').mockResolvedValue(null);

    // Act & Assert
    await expect({entity}Service.{action}{Entity}({entity}Id)).rejects.toThrow('{Entity} not found');
  });
});
```

### Integration Tests

**File**: `tests/integration/{entity}.{action}.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { {entities}Api } from '../../client/src/api/{entities}.api';
import type { {Action}{Entity}Request } from '@shared/types/api/contracts/{entity}.contract';

describe('{Entity} {Action} Integration', () => {
  it('should {action} {entity} via API', async () => {
    // Arrange: Create test {entity} first (if needed)
    const {entity}Id = 'test-{entity}-id';
    const request: {Action}{Entity}Request = {
      // Add test request data
    };

    // Act
    const response = await {entities}Api.{action}{Entity}({entity}Id, request);

    // Assert
    expect(response).toBeDefined();
    // Add specific assertions for response data
  });

  it('should return 404 for non-existent {entity}', async () => {
    // Arrange
    const nonExistentId = 'non-existent-id';

    // Act & Assert
    await expect({entities}Api.{action}{Entity}(nonExistentId)).rejects.toThrow();
  });
});
```

### API Route Tests

**File**: `tests/api/{entities}.{action}.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/app';

describe('{METHOD} {path}', () => {
  it('should return {action} data', async () => {
    // Arrange: Create test {entity} first
    const {entity}Id = 'test-{entity}-id';

    // Act
    const response = await request(app)
      .{METHOD}(`{path}`)
      .send(/* request body if needed */);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    // Add specific assertions
  });

  it('should return 404 for non-existent {entity}', async () => {
    // Act
    const response = await request(app)
      .{METHOD}('/api/{entities}/non-existent-id/{action}');

    // Assert
    expect(response.status).toBe(404);
  });

  it('should validate request data', async () => {
    // Arrange
    const invalidRequest = {
      // Add invalid data
    };

    // Act
    const response = await request(app)
      .{METHOD}(`{path}`)
      .send(invalidRequest);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.classification).toBe('validation');
  });
});
```

---

## Summary

You've added a new API endpoint with:

✅ API contract types for request/response  
✅ Validation schemas for runtime checks  
✅ Service method implementing business logic  
✅ Route handler with proper error handling  
✅ Client API method for type-safe calls  
✅ React component consuming the endpoint (optional)  
✅ Comprehensive unit and integration tests

## Common Patterns

### Query Parameters (GET requests)
```typescript
// Server
router.get('/api/{entities}', async (req, res, next) => {
  const { page, limit, sortBy } = req.query;
  // Use query parameters
});

// Client
const response = await apiClient.get('/api/{entities}', {
  params: { page: 1, limit: 10, sortBy: 'name' }
});
```

### Path Parameters
```typescript
// Server
router.get('/api/{entities}/:id/sub-resource/:subId', async (req, res, next) => {
  const { id, subId } = req.params;
});

// Client
const response = await apiClient.get(`/api/{entities}/${id}/sub-resource/${subId}`);
```

### Authentication
```typescript
// Server
import { authenticate } from '../middleware/auth';
router.post('/api/{entities}', authenticate, async (req, res, next) => {
  const userId = req.user!.id; // Available after authentication
});
```

### Pagination
```typescript
// Response type
export interface List{Entity}Response {
  {entities}: {Entity}[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

## Next Steps

1. Run type checking: `npm run type-check`
2. Run tests: `npm test`
3. Test endpoint manually: Use Postman or curl
4. Update API documentation
5. Add endpoint to client integration tests
