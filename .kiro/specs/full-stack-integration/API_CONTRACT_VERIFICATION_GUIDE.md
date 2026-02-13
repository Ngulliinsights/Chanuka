# API Contract Verification Guide

## Quick Start

Run the verification tool:

```bash
npm run api:verify-contracts
```

This will:
1. Scan all server routes for API endpoints
2. Check which endpoints have corresponding contracts
3. Verify that contracts have validation schemas
4. Check for test coverage
5. Generate a detailed report

## Understanding the Report

### Summary Section

```
Total Endpoints: 332
Endpoints with Contracts: 162 (49%)
Total Contracts: 7
Contracts with Validation: 7 (100%)
Contracts with Tests: 3 (43%)
```

- **Total Endpoints**: All API routes found in the server code
- **Endpoints with Contracts**: Routes that have matching contract definitions
- **Total Contracts**: Number of contract files in `shared/types/api/contracts/`
- **Contracts with Validation**: Contracts that have corresponding `.schemas.ts` files
- **Contracts with Tests**: Contracts that have test files

### Endpoints Without Contracts

Lists all API routes that don't have corresponding contract definitions. Each entry shows:
- HTTP method and path
- File location and line number

### Contracts Without Validation Schemas

Lists contracts missing their `.schemas.ts` validation file.

### Contracts Without Tests

Lists contracts that don't have test coverage.

## Current Contract Coverage

### Existing Contracts

1. **user.contract.ts** ✓
   - Has validation: user.schemas.ts ✓
   - Has tests: ✓

2. **bill.contract.ts** ✓
   - Has validation: bill.schemas.ts ✓
   - Has tests: ✓

3. **comment.contract.ts** ✓
   - Has validation: comment.schemas.ts ✓
   - Has tests: ✓

4. **notification.contract.ts** ✓
   - Has validation: notification.schemas.ts ✓
   - Has tests: ✗ (needs tests)

5. **analytics.contract.ts** ✓
   - Has validation: analytics.schemas.ts ✓
   - Has tests: ✗ (needs tests)

6. **search.contract.ts** ✓
   - Has validation: search.schemas.ts ✓
   - Has tests: ✗ (needs tests)

7. **admin.contract.ts** ✓
   - Has validation: admin.schemas.ts ✓
   - Has tests: ✗ (needs tests)

## Adding a New Contract

### Step 1: Create Contract File

Create `shared/types/api/contracts/{feature}.contract.ts`:

```typescript
/**
 * {Feature} API Contracts
 */

// Request types
export interface Create{Feature}Request {
  // fields
}

// Response types
export interface Create{Feature}Response {
  // fields
}
```

### Step 2: Create Validation Schemas

Create `shared/types/api/contracts/{feature}.schemas.ts`:

```typescript
import { z } from 'zod';

export const Create{Feature}RequestSchema = z.object({
  // validation rules
});

export const Create{Feature}ResponseSchema = z.object({
  // validation rules
});
```

### Step 3: Export from Index

Add to `shared/types/api/contracts/index.ts`:

```typescript
export * from './{feature}.contract';
export * from './{feature}.schemas';
```

### Step 4: Create Tests

Create `tests/**/{feature}.contract.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Create{Feature}RequestSchema } from '@shared/types/api/contracts';

describe('{Feature} Contract Validation', () => {
  it('should validate valid request', () => {
    // test
  });
  
  it('should reject invalid request', () => {
    // test
  });
});
```

### Step 5: Verify

Run verification to confirm:

```bash
npm run api:verify-contracts
```

## Best Practices

### Contract Design

1. **Single Responsibility**: One contract per domain entity
2. **Type Safety**: Use branded types for IDs
3. **Completeness**: Include all request/response types for the entity
4. **Documentation**: Add JSDoc comments explaining each type

### Validation Schemas

1. **Strict Validation**: Validate all fields, don't allow extra properties
2. **Clear Messages**: Provide helpful error messages
3. **Reusable Rules**: Extract common validation patterns
4. **Type Inference**: Export inferred types for use in code

### Testing

1. **Positive Cases**: Test valid inputs are accepted
2. **Negative Cases**: Test invalid inputs are rejected
3. **Edge Cases**: Test boundary conditions
4. **Round-Trip**: Test serialization/deserialization

## Troubleshooting

### Endpoint Not Detected

The script looks for patterns like:
```typescript
router.get('/path', ...)
router.post('/path', ...)
```

If your endpoint isn't detected, check:
- Is it in a file excluded by the script? (examples, OLD files, etc.)
- Does it use a different pattern?

### Contract Not Matched

The script matches endpoints to contracts by:
- Resource name in path (e.g., `/users` → `user.contract.ts`)
- Feature name from file path
- Plural/singular variations

If matching fails:
- Check contract file naming
- Verify contract is in `shared/types/api/contracts/`
- Check if endpoint path matches contract name

### False Positives

Some endpoints may not need contracts:
- Internal infrastructure endpoints
- Health check endpoints
- Development/debugging endpoints

Document these exceptions in your team's guidelines.

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: API Contract Verification

on: [pull_request]

jobs:
  verify-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run api:verify-contracts
        continue-on-error: true  # Set to false to enforce
      - uses: actions/upload-artifact@v3
        with:
          name: contract-coverage-report
          path: .kiro/specs/full-stack-integration/API_CONTRACT_COVERAGE_REPORT.md
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm run api:verify-contracts || echo "Warning: API contract coverage check failed"
```

## Maintenance

### Regular Reviews

1. Run verification weekly
2. Track coverage trends
3. Prioritize high-traffic endpoints
4. Update contracts when APIs change

### Coverage Goals

- **Phase 1**: Core features (users, bills, comments) - ✓ Complete
- **Phase 2**: User-facing features (search, notifications) - In Progress
- **Phase 3**: Admin and analytics features - Planned
- **Phase 4**: Infrastructure endpoints - Optional

## Support

For questions or issues:
1. Check this guide
2. Review existing contracts for examples
3. Consult the design document: `.kiro/specs/full-stack-integration/design.md`
4. Review task completion summary: `.kiro/specs/full-stack-integration/TASK_14.3_COMPLETION_SUMMARY.md`
