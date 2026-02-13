# Integration Test Framework

This directory contains the full-stack integration test framework for the Chanuka Platform.

## Structure

```
tests/integration/
├── setup/              # Test environment setup
│   ├── test-database.ts    # Database lifecycle management
│   └── test-server.ts      # Server lifecycle management
├── fixtures/           # Test data factories
│   ├── user.fixtures.ts    # User test data
│   ├── bill.fixtures.ts    # Bill test data
│   └── index.ts            # Fixture exports
├── client/             # API client for tests
│   └── api-client.ts       # HTTP client wrapper
├── helpers/            # Test utilities
│   └── test-context.ts     # Test context management
└── tests/              # Actual test files
    ├── user-flow.integration.test.ts
    ├── bill-flow.integration.test.ts
    └── error-scenarios.integration.test.ts
```

## Usage

### Basic Test Setup

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupIntegrationTest, cleanIntegrationTest, teardownIntegrationTest, getTestContext } from '../helpers/test-context';

describe('User Integration Tests', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  beforeEach(async () => {
    await cleanIntegrationTest();
  });

  it('should create a user', async () => {
    const { apiClient } = getTestContext();
    
    const response = await apiClient.post('/api/users', {
      email: 'test@example.com',
      password: 'password123',
    });
    
    expect(response.status).toBe(201);
    expect(response.data.user.email).toBe('test@example.com');
  });
});
```

### Using Fixtures

```typescript
import { createTestUser, createTestBill } from '../fixtures';

it('should create a bill with sponsor', async () => {
  const { db, apiClient } = getTestContext();
  
  // Create test user in database
  const user = createTestUser();
  const [insertedUser] = await db.insert(users).values(user).returning();
  
  // Create bill via API
  const bill = createTestBill({ sponsor_id: insertedUser.id });
  const response = await apiClient.createBill(bill);
  
  expect(response.bill.sponsor_id).toBe(insertedUser.id);
});
```

### Using API Client

```typescript
it('should authenticate and access protected route', async () => {
  const { apiClient } = getTestContext();
  
  // Register user
  await apiClient.register({
    email: 'test@example.com',
    password: 'password123',
  });
  
  // Login
  await apiClient.login('test@example.com', 'password123');
  
  // Access protected route
  const user = await apiClient.getCurrentUser();
  expect(user.email).toBe('test@example.com');
});
```

## Environment Variables

Required environment variables for integration tests:

- `TEST_DATABASE_URL` - PostgreSQL connection string for test database
- `TEST_PORT` - Port for test server (optional, defaults to random)
- `NODE_ENV` - Should be set to 'test'

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- user-flow.integration.test.ts

# Run with coverage
npm run test:integration -- --coverage
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean test data between tests using `cleanIntegrationTest()`
3. **Fixtures**: Use fixtures for consistent test data
4. **Assertions**: Test both success and error scenarios
5. **Performance**: Keep tests fast by minimizing database operations
6. **Readability**: Use descriptive test names and clear assertions

## Test Categories

### User Flow Tests
- User registration
- User authentication
- Profile management
- User permissions

### Bill Flow Tests
- Bill creation
- Bill updates
- Bill status transitions
- Bill retrieval

### Comment Flow Tests
- Comment creation
- Comment retrieval
- Comment moderation

### Error Scenario Tests
- Validation errors
- Authorization errors
- Database errors
- Network errors
