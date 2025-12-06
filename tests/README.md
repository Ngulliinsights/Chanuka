# Testing Infrastructure - Phase 1

## Overview

This directory contains the **single source of truth** for all testing infrastructure in the project.

- ✅ All unit test setup (Vitest)
- ✅ All E2E setup (Playwright)
- ✅ Global test utilities (factories, helpers, patterns)
- ✅ Shared mocks (Redis, Performance API, etc.)
- ✅ Test helpers (API interactions, user generation, etc.)

## Directory Structure

```
tests/
├── setup/
│   ├── vitest.ts                  ← Global utilities + factories (auto-loaded)
│   ├── test-environment.ts        ← Redis mocks, Performance API, etc.
│   └── index.ts                   ← Barrel export
│
├── mocks/
│   ├── redis.mock.ts              ← Redis mocking for integration tests
│   └── performance.mock.ts        ← Performance API mocking
│
├── utils/
│   └── test-helpers.ts            ← Playwright/API test helpers
│
├── factories/
│   ├── user-factory.ts            ← (Future Phase 2) Complex user scenarios
│   ├── bill-factory.ts            ← (Future Phase 2) Bill scenarios
│   └── analysis-factory.ts        ← (Future Phase 2) Analysis scenarios
│
├── helpers/
│   ├── render-with-providers.tsx  ← (Future Phase 3) React testing wrapper
│   └── component-helpers.ts       ← (Future Phase 3) Component test utilities
│
├── global-setup.ts                ← Playwright global setup (E2E health check)
├── global-teardown.ts             ← Playwright cleanup
├── playwright.config.ts           ← Playwright configuration
└── README.md                       ← This file
```

## Usage

### Global Test Utilities (No Imports!)

All test files automatically have access to `global.testUtils` without any imports:

```typescript
// Any .test.ts or .test.tsx file
describe('Component', () => {
  it('renders', () => {
    // Create mock data
    const user = global.testUtils.createMockUser({ name: 'John' });
    const bill = global.testUtils.createMockBill({ status: 'passed' });

    // Utilities available
    const id = global.testUtils.generateUniqueId('user');
    const error = global.testUtils.mockApiError('Not found', 404);
    await global.testUtils.delay(100);

    // Test patterns for security/validation testing
    const invalidIds = global.testUtils.testPatterns.invalidIds;
    const xssPayloads = global.testUtils.testPatterns.xssPayloads;

    // Your test code...
  });
});
```

### Global Test Utilities Reference

#### Mock Data Factories

```typescript
// Users
global.testUtils.createMockUser({
  id: 'custom-id',
  email: 'user@example.com',
  name: 'Custom Name',
  role: 'expert',
  // ... any other User properties
});

// Bills
global.testUtils.createMockBill({
  billNumber: 'SB-2024',
  title: 'Custom Bill',
  status: 'passed',
  // ... any other Bill properties
});

// Sponsors
global.testUtils.createMockSponsor({
  name: 'Senator Smith',
  chamber: 'senate',
  party: 'democrat',
  // ... any other Sponsor properties
});

// Analyses
global.testUtils.createMockAnalysis({
  type: 'financial-impact',
  summary: 'Custom analysis',
  // ... any other Analysis properties
});
```

#### Helper Functions

```typescript
// Delay execution (for async testing)
await global.testUtils.delay(1000);

// Generate unique IDs (for test isolation)
const userId = global.testUtils.generateUniqueId('user');
// → 'user-1703000000000-abc123xyz'

// Create API errors (for error handling tests)
const error = global.testUtils.mockApiError('Not found', 404);
throw error;
// → { message: 'Not found', status: 404, statusCode: 404 }
```

#### Test Patterns (For Validation & Security)

```typescript
// Invalid IDs (test error handling)
global.testUtils.testPatterns.invalidIds
// → ['', '0', '-1', 'invalid', 'null', 'undefined']

// XSS attack payloads (test security)
global.testUtils.testPatterns.xssPayloads
// → ['<script>alert("xss")</script>', ...]

// SQL injection payloads (test security)
global.testUtils.testPatterns.sqlInjectionPayloads
// → ["'; DROP TABLE users; --", ...]

// Edge case boundaries (test limits)
global.testUtils.testPatterns.edgeCaseBoundaries
// → [0, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]
```

### Feature Factories (Phase 2+)

When Phase 2 adds feature-specific factories, import them when needed:

```typescript
import { createComplexBillScenario } from '@tests/factories/bill-factory';

describe('Bill Analysis', () => {
  it('handles complex scenarios', () => {
    const scenario = createComplexBillScenario({
      type: 'constitutional-challenge',
      sponsors: 3,
      amendments: 5,
    });
    
    // scenario includes: bill, sponsors, amendments, analysis
    // Use it...
  });
});
```

### Component Testing Helpers (Phase 3+)

When Phase 3 adds component helpers:

```typescript
import { renderWithProviders } from '@tests/helpers/render-with-providers';
import { mockNavigation } from '@tests/helpers/mock-navigation';

describe('BillCard', () => {
  it('renders with all providers', () => {
    const { getByText } = renderWithProviders(<BillCard bill={bill} />, {
      initialState: { auth: { user } },
    });

    expect(getByText(bill.title)).toBeInTheDocument();
  });
});
```

## How Tests Are Set Up

### 1. Entry Point: `vitest.config.ts`
```typescript
setupFiles: ['./vitest.setup.ts']
```

### 2. Root Orchestrator: `vitest.setup.ts`
```typescript
import './tests/setup/vitest';           // Global utilities
import './tests/setup/test-environment'; // Mocks (Redis, Performance)
```

### 3. Global Utilities: `tests/setup/vitest.ts`
- Creates `global.testUtils` with factories and helpers
- Sets environment variables
- Configures Vitest hooks (beforeAll, afterEach)

### 4. Test Environment: `tests/setup/test-environment.ts`
- Loads shared mocks (Redis, Performance API)
- Configures jsdom polyfills
- Sets up WebSocket mocking

## Writing Tests

### 1. Basic Unit Test (Colocated)
```typescript
// client/src/components/BillCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillCard } from './BillCard';

describe('BillCard', () => {
  it('renders bill title', () => {
    const bill = global.testUtils.createMockBill({
      title: 'Healthcare Reform'
    });

    render(<BillCard bill={bill} />);

    expect(screen.getByText('Healthcare Reform')).toBeInTheDocument();
  });
});
```

### 2. Service Test (Colocated)
```typescript
// server/src/features/bills/bills.service.test.ts
import { describe, it, expect } from 'vitest';
import { BillService } from './bills.service';

describe('BillService', () => {
  it('calculates bill impact', () => {
    const bill = global.testUtils.createMockBill({
      title: 'Education Reform'
    });

    const impact = BillService.calculateImpact(bill);

    expect(impact).toBeGreaterThan(0);
  });
});
```

### 3. Integration Test
```typescript
// Feature workflow test (can be colocated or in tests/integration/)
describe('Bill Management Flow', () => {
  it('creates and analyzes bill', async () => {
    const bill = global.testUtils.createMockBill();
    const sponsor = global.testUtils.createMockSponsor();

    // Test multi-step workflow
    const created = await billService.create(bill);
    const analysis = await analysisService.analyze(created.id);

    expect(analysis).toBeDefined();
  });
});
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific file
pnpm test BillCard

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch

# UI mode
pnpm test --ui

# Debug
pnpm test --inspect-brk
```

## Test Organization Strategy

### Colocation Pattern
```
Source and tests live together:

client/src/components/
├── BillCard.tsx
└── BillCard.test.tsx         ← imports from @tests/factories
└── BillCard.a11y.test.tsx    ← (accessibility)

server/src/features/bills/
├── bills.service.ts
└── bills.service.test.ts     ← imports from @tests/factories

shared/core/src/validation/
├── validators.ts
└── validators.test.ts        ← uses global.testUtils
```

### Infrastructure Location
```
tests/                         ← Central infrastructure
├── setup/                     ← Global utilities
├── mocks/                     ← Shared mocks
├── utils/                     ← Helper functions
├── factories/                 ← Feature factories (Phase 2+)
└── helpers/                   ← Component helpers (Phase 3+)
```

## Best Practices

1. **Colocation**: Keep tests next to source files
   - ✅ `BillCard.tsx` + `BillCard.test.tsx`
   - ❌ Scattered `__tests__/` directories

2. **Global Utilities**: No imports needed
   - ✅ `const user = global.testUtils.createMockUser();`
   - ❌ `import { createMockUser } from '@tests/setup'`

3. **Clear Names**: Descriptive test names
   - ✅ `it('renders bill title when provided')`
   - ❌ `it('works')`

4. **One Assertion**: Tests focused on one behavior
   - ✅ Multiple `it()` blocks for different scenarios
   - ❌ Multiple assertions in one test

5. **Test Behavior**: Focus on what, not how
   - ✅ `expect(screen.getByText('Submit')).toBeEnabled()`
   - ❌ `expect(component.state.buttonDisabled).toBe(false)`

## Common Issues

### "testUtils is not defined"
→ Make sure `vitest.setup.ts` exists in root
→ Check `vitest.config.ts` references it: `setupFiles: ['./vitest.setup.ts']`
→ Verify `tests/setup/vitest.ts` exports `global.testUtils`

### Tests not running
→ Check file matches pattern: `*.test.ts` or `*.test.tsx`
→ Verify in `vitest.config.ts`: `include: ['**/*.test.{ts,tsx}']`

### Import errors
→ Check path aliases in `vitest.config.ts`
→ For `@tests/factories`: Create file in `tests/factories/`
→ For `@tests/`: Alias points to `./tests` in vitest.config.ts

## Future Phases

### Phase 2: Feature Factories
- Create `tests/factories/user-factory.ts` (complex scenarios)
- Create `tests/factories/bill-factory.ts` (bill workflows)
- Add domain-specific mock builders

### Phase 3: Component Helpers
- Create `render-with-providers.tsx` (Redux, Router, Contexts)
- Add `mock-navigation.ts` (navigation helpers)
- Add `user-interactions.ts` (common patterns)

### Phase 4: Advanced Testing
- E2E visual regression
- Performance testing
- Flaky test detection
- Test sharding in CI/CD

## Resources

- **Vitest Docs**: https://vitest.dev
- **Testing Library**: https://testing-library.com
- **Setup Details**: `tests/setup/vitest.ts` (well-commented)
- **Test Patterns**: `tests/setup/vitest.ts` → `testPatterns`

---

**Status**: Phase 1 ✅ Complete - Ready for test writing
**Updated**: December 6, 2025
**Location**: Single source of truth in `tests/`
