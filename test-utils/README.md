# ⚠️ ARCHIVED: Testing Infrastructure Moved to `tests/`

**This directory is deprecated.** All testing infrastructure has been consolidated into the `tests/` directory following best practices for single source of truth.

## Where Things Moved

| Old Location | New Location | Purpose |
|---|---|---|
| `test-utils/setup.ts` | `tests/setup/vitest.ts` | Global test utilities (factories, helpers, patterns) |
| `test-utils/factories/` | `tests/factories/` | Feature-specific mock factories (planned Phase 2) |
| `test-utils/helpers/` | `tests/helpers/` | Component testing helpers (planned Phase 3) |

## Current Testing Infrastructure

All testing setup is now centralized in:
- **`vitest.setup.ts`** (root orchestrator)
- **`tests/setup/vitest.ts`** (global utilities, factories)
- **`tests/setup/test-environment.ts`** (Redis, Performance API mocks)
- **`tests/mocks/`** (shared mocks)
- **`tests/utils/`** (test helpers)
- **`tests/factories/`** (future: feature-specific factories)

## How Tests Access Utilities

### Global Utilities (No Imports)
```typescript
// Any test file
describe('Feature', () => {
  it('works', () => {
    const user = global.testUtils.createMockUser();
    // testUtils auto-injected by vitest.setup.ts
  });
});
```

### Feature Factories (When Needed, Phase 2+)
```typescript
import { createComplexUserScenario } from '@tests/factories/user-factory';
// Available when tests/factories/ is populated in Phase 2
```

## For Developers

- Write tests anywhere in `src/` (collocated with source)
- Global utilities are automatically available
- Import feature factories from `@tests/factories/` as needed
- Mocks are auto-loaded by `vitest.setup.ts`

## For Maintainers

- **Don't** add anything to this directory
- **Do** update `tests/setup/vitest.ts` for global utilities
- **Do** create factories in `tests/factories/` as needed
- **Don't** maintain duplicate test setup

---

**Status**: Consolidated into `tests/` (December 6, 2025)
**Recommendation**: Delete this directory after confirming all tests work

## Overview

This is a **clean reset** of the testing infrastructure after removing 487 outdated tests that no longer aligned with the project structure. This Phase 1 establishes a modern, maintainable testing foundation.

## Current Status

✅ **Phase 1 Starting**: Fresh infrastructure ready
- All outdated tests deleted (58,622 LOC removed)
- Global test utilities setup (no imports needed)
- Vitest configuration ready
- Integration strategy designed

## Architecture

### Testing Utils Integration Strategy

The testing utilities are strategically integrated at **3 layers**:

#### Layer 1: Global Utilities (Available Everywhere)
```typescript
// test-utils/setup.ts
global.testUtils = {
  createMockUser(overrides),
  createMockBill(overrides),
  createMockSponsor(overrides),
  createMockAnalysis(overrides),
  delay(ms),
  generateUniqueId(prefix),
  mockApiError(message, status),
  testPatterns: { invalidIds, xssPayloads, sqlInjectionPayloads, ... }
}
```

**Usage in any test** (no imports required):
```typescript
describe('Feature', () => {
  it('works', () => {
    const user = global.testUtils.createMockUser({ name: 'John' });
    // test...
  });
});
```

#### Layer 2: Feature-Specific Utilities (Domain Logic Tests)
When testing domain logic (services, hooks, business logic):
```typescript
// test-utils/factories/
// - user-factory.ts      (create complex user scenarios)
// - bill-factory.ts      (bill analysis workflows)
// - analysis-factory.ts  (multi-step analysis scenarios)
// - etc.
```

#### Layer 3: Component Testing Helpers (UI Tests)
When testing React components:
```typescript
// test-utils/component-helpers/
// - render-with-providers.tsx  (Redux, Router, Contexts)
// - mock-navigation.ts         (Navigation mocking)
// - user-interactions.ts       (Common click/type patterns)
```

### Directory Structure

```
test-utils/
├── setup.ts                  ← Loaded automatically by Vitest
├── factories/                ← Feature-specific mock factories (TODO)
│   ├── user-factory.ts
│   ├── bill-factory.ts
│   ├── analysis-factory.ts
│   └── sponsor-factory.ts
├── helpers/                  ← Component testing helpers (TODO)
│   ├── render-with-providers.tsx
│   ├── mock-navigation.ts
│   └── user-interactions.ts
└── README.md                 ← This file
```

## How to Write Tests (Phase 1)

### 1. Unit Test - Service/Hook/Utility
```typescript
import { describe, it, expect } from 'vitest';
import { calculateBillImpact } from '@/services/analysis';

describe('calculateBillImpact', () => {
  it('returns correct impact score', () => {
    const bill = global.testUtils.createMockBill({
      title: 'Healthcare Reform'
    });
    
    const impact = calculateBillImpact(bill);
    expect(impact).toBeGreaterThan(0);
  });

  it('handles edge cases', () => {
    const bill = global.testUtils.createMockBill({
      title: '' // Edge case: empty title
    });
    
    expect(() => calculateBillImpact(bill)).not.toThrow();
  });
});
```

### 2. Component Test (Basic)
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserCard } from '@/components/UserCard';

describe('UserCard', () => {
  it('renders user information', () => {
    const user = global.testUtils.createMockUser({
      name: 'Alice',
      email: 'alice@example.com'
    });
    
    render(<UserCard user={user} />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });
});
```

### 3. Integration Test (Feature Flow)
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillDetailsPage } from '@/pages/BillDetailsPage';

describe('BillDetailsPage - User Flow', () => {
  let bill;

  beforeEach(() => {
    bill = global.testUtils.createMockBill({
      billNumber: 'HB-2024',
      status: 'passed'
    });
  });

  it('loads and displays bill analysis', async () => {
    render(<BillDetailsPage billId={bill.id} />);
    
    // Wait for analysis to load
    await waitFor(() => {
      expect(screen.getByText(/analysis/i)).toBeInTheDocument();
    });
  });

  it('handles errors gracefully', async () => {
    // Test with error scenario
    const error = global.testUtils.mockApiError('Failed to load');
    expect(error.status).toBe(400);
  });
});
```

## Global Test Utilities Reference

### Mock Data Factories

```typescript
// Create a user (all fields optional)
global.testUtils.createMockUser({
  id: 'custom-id',
  email: 'user@example.com',
  name: 'Custom Name',
  role: 'expert',
  // ... any other User properties
});

// Create a bill
global.testUtils.createMockBill({
  billNumber: 'SB-2024',
  title: 'Custom Bill',
  status: 'passed',
  // ... any other Bill properties
});

// Create a sponsor
global.testUtils.createMockSponsor({
  name: 'Senator Smith',
  chamber: 'senate',
  party: 'democrat',
  // ... any other Sponsor properties
});

// Create an analysis
global.testUtils.createMockAnalysis({
  type: 'financial-impact',
  summary: 'Custom analysis',
  // ... any other Analysis properties
});
```

### Helper Functions

```typescript
// Delay test execution (useful for async testing)
await global.testUtils.delay(1000);

// Generate unique IDs for test isolation
const userId = global.testUtils.generateUniqueId('user');  // 'user-1234567890-abc123'

// Create mock API errors
const error = global.testUtils.mockApiError('Not found', 404);
throw error; // { message: 'Not found', status: 404, statusCode: 404 }
```

### Test Patterns (For Validation Testing)

```typescript
// Invalid IDs (for testing error handling)
global.testUtils.testPatterns.invalidIds
// → ['', '0', '-1', 'invalid', 'null', 'undefined']

// XSS attack payloads (for security testing)
global.testUtils.testPatterns.xssPayloads
// → ['<script>alert("xss")</script>', ...]

// SQL injection payloads (for security testing)
global.testUtils.testPatterns.sqlInjectionPayloads
// → ["'; DROP TABLE users; --", ...]

// Boundary values (for edge case testing)
global.testUtils.testPatterns.edgeCaseBoundaries
// → [0, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific file
pnpm test BillCard

# Run with coverage
pnpm test --coverage

# Watch mode (re-run on changes)
pnpm test --watch

# Run with UI
pnpm test --ui
```

## Next Steps (Phase 2-4 Roadmap)

### Phase 2: Feature-Based Organization
- Create domain-specific factories in `test-utils/factories/`
- Organize tests by feature (colocate with source)
- Standardize test naming conventions
- **Timeline**: 1-2 weeks

### Phase 3: Component Testing Infrastructure
- Create `render-with-providers` helper
- Mock navigation, routing, global state
- Accessibility testing setup
- **Timeline**: 1 week

### Phase 4: Advanced Testing
- Performance testing setup
- E2E test framework (Playwright)
- Visual regression testing
- Flaky test detection
- **Timeline**: 1-2 weeks

## Integration Points (Where Testing Utils Connect)

### 1. **Test File** → **Global Utils**
```
*.test.ts ─→ setupFiles: test-utils/setup.ts ─→ global.testUtils
```

### 2. **Feature Test** → **Feature Factory** (Future)
```
features/bills/*.test.ts ─→ test-utils/factories/bill-factory.ts
```

### 3. **Component Test** → **Component Helpers** (Future)
```
components/**/*.test.tsx ─→ test-utils/helpers/render-with-providers.tsx
```

### 4. **Service Test** → **Mock Data**
```
services/**/*.test.ts ─→ global.testUtils.createMock*() ─→ global.testPatterns
```

## Project Structure (Updated)

```
SimpleTool/
├── vitest.config.ts              ← Main test config
├── test-utils/
│   ├── setup.ts                  ← Global utilities (auto-loaded)
│   ├── factories/                ← Feature factories (future)
│   ├── helpers/                  ← Component helpers (future)
│   └── README.md
├── client/src/
│   ├── components/
│   │   ├── BillCard.tsx
│   │   └── BillCard.test.tsx     ← New tests (colocated)
│   ├── services/
│   │   ├── billService.ts
│   │   └── billService.test.ts   ← New tests (colocated)
│   ├── hooks/
│   │   ├── useBill.ts
│   │   └── useBill.test.ts       ← New tests (colocated)
│   └── ... (other source files)
├── server/src/
│   ├── features/
│   │   ├── bills/
│   │   │   ├── bill.service.ts
│   │   │   └── bill.service.test.ts ← New tests (colocated)
│   └── ... (other source files)
└── shared/
    ├── core/src/
    │   ├── utils/
    │   │   ├── validators.ts
    │   │   └── validators.test.ts  ← New tests (colocated)
```

## Best Practices

1. **Colocation**: Keep test files next to source files
   - ✅ `BillCard.tsx` + `BillCard.test.tsx`
   - ❌ Avoid scattered `__tests__/` directories

2. **Naming**: Use clear, descriptive test names
   - ✅ `it('renders bill title when provided')`
   - ❌ `it('works')`

3. **Use Global Utils**: No imports needed
   - ✅ `const user = global.testUtils.createMockUser();`
   - ❌ `import { createMockUser } from 'test-utils';`

4. **Test Behavior**: Focus on what component does, not how
   - ✅ `expect(screen.getByText('Submit')).toBeEnabled()`
   - ❌ `expect(component.state.buttonDisabled).toBe(false)`

5. **Keep Tests Simple**: One assertion = one test
   - ✅ Multiple `it()` blocks for different scenarios
   - ❌ Multiple assertions in one test

## Troubleshooting

### "testUtils is not defined"
→ Make sure `test-utils/setup.ts` is in `setupFiles` in `vitest.config.ts`
→ Verify file exports `global.testUtils`

### Tests not running
→ Check filename matches pattern: `*.test.ts` or `*.test.tsx`
→ Verify path in `include` glob in `vitest.config.ts`

### Import errors in tests
→ Check path aliases in `vitest.config.ts` resolve section
→ Verify source files exist at imported paths

## Questions?

See these resources:
- **Setup Details**: `test-utils/setup.ts` (well-commented)
- **Vitest Config**: `vitest.config.ts`
- **Vitest Docs**: https://vitest.dev

---

**Status**: Phase 1 ✅ Complete - Ready for test writing
**Created**: December 6, 2025
pnpm test

# Run specific test suites
pnpm test --project=client-unit       # Client unit tests
pnpm test --project=client-integration # Client integration tests
pnpm test --project=client-a11y       # Accessibility tests
pnpm test --project=server-unit       # Server unit tests
pnpm test --project=server-integration # Server integration tests
pnpm test --project=shared            # Shared utilities tests
pnpm test --project=e2e               # End-to-end tests

# Run with coverage
pnpm test --coverage

# Run in watch mode
pnpm test --watch

# Run specific file
pnpm test client/src/components/BillCard.test.tsx
```

## 🏗️ Architecture

### Workspace Configuration

- **Single Source of Truth**: `vitest.workspace.unified.ts` (root)
- **Replaces**: 12+ individual config files that were causing inconsistency
- **Benefits**: Consistent behavior, predictable test runs, easier CI/CD

### Test Setup Files

All setup files are centralized in `/test-utils/setup/`:

```
test-utils/
├── setup/
│   ├── client.ts              # Client unit tests
│   ├── client-integration.ts  # Client integration with MSW
│   ├── client-a11y.ts         # Accessibility testing
│   ├── server.ts              # Server unit tests
│   ├── server-integration.ts  # Server DB integration
│   ├── shared.ts              # Shared library tests
│   └── e2e.ts                 # Playwright E2E tests
├── mocks/                     # MSW handlers, etc.
├── factories/                 # Test data factories
├── helpers/                   # Render helpers, utilities
└── index.ts                   # Barrel exports
```

## 🎯 Test Projects

### 1. **client-unit** 
- **Purpose**: Unit tests for React components and client logic
- **Environment**: jsdom
- **Timeout**: 10s
- **Setup File**: `test-utils/setup/client.ts`
- **Include Pattern**: `client/src/**/*.test.{ts,tsx}`
- **Key Globals**: `global.testUtils`

### 2. **client-integration**
- **Purpose**: Integration tests with API mocking (MSW)
- **Environment**: jsdom
- **Timeout**: 30s
- **Setup File**: `test-utils/setup/client-integration.ts`
- **Include Pattern**: `client/src/**/__tests__/**/*.test.{ts,tsx}`
- **Key Globals**: `global.integrationTestUtils`, MSW server

### 3. **client-a11y**
- **Purpose**: Accessibility compliance testing
- **Environment**: jsdom
- **Timeout**: 15s
- **Setup File**: `test-utils/setup/client-a11y.ts`
- **Include Pattern**: `client/src/**/*.a11y.test.{ts,tsx}`
- **Key Globals**: `global.a11yTestUtils`
- **Dependencies**: `jest-axe`

### 4. **server-unit**
- **Purpose**: Server-side unit tests
- **Environment**: node
- **Timeout**: 10s
- **Setup File**: `test-utils/setup/server.ts`
- **Include Pattern**: `server/**/*.test.{ts,tsx}`
- **Key Globals**: `global.testUtils` (server version)

### 5. **server-integration**
- **Purpose**: Integration tests with database and external services
- **Environment**: node
- **Timeout**: 30s
- **Setup File**: `test-utils/setup/server-integration.ts`
- **Include Pattern**: `server/**/__tests__/**/*.test.{ts,tsx}`
- **Key Globals**: `global.integrationTestUtils`

### 6. **shared**
- **Purpose**: Tests for shared utilities and validation
- **Environment**: node
- **Timeout**: 10s
- **Setup File**: `test-utils/setup/shared.ts`
- **Include Pattern**: `shared/**/*.test.{ts,tsx}`
- **Key Globals**: `global.testUtils`

### 7. **e2e**
- **Purpose**: End-to-end Playwright tests
- **Environment**: node
- **Timeout**: 60s
- **Setup File**: `test-utils/setup/e2e.ts`
- **Include Pattern**: `tests/e2e/**/*.spec.{ts,tsx}`
- **Key Globals**: `global.e2eTestUtils`, `global.e2eTestData`
- **Note**: Single-threaded execution

## 📝 Writing Tests

### Unit Test Example

```typescript
// client/src/components/BillCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BillCard } from './BillCard'

describe('BillCard', () => {
  it('renders bill title', () => {
    const bill = global.testUtils.createMockBill({
      title: 'Test Bill'
    })
    
    render(<BillCard bill={bill} />)
    expect(screen.getByText('Test Bill')).toBeInTheDocument()
  })
})
```

### Integration Test Example

```typescript
// client/src/features/bills/__tests__/bills-workflow.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BillsList } from '../BillsList'

describe('Bills Workflow', () => {
  beforeEach(() => {
    // MSW server is already set up in setup file
    global.integrationTestUtils.mockAuthenticatedUser()
  })

  it('loads and displays bills', async () => {
    render(<BillsList />)
    
    await waitFor(() => {
      expect(screen.getByText(/Test Bill 0/)).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    global.integrationTestUtils.mockApiError('/api/bills', 500, 'Server Error')
    
    render(<BillsList />)
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

### Accessibility Test Example

```typescript
// client/src/components/Form.a11y.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Form } from './Form'

describe('Form Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Form />)
    const results = await global.a11yTestUtils.checkAccessibility(container)
    expect(results).toHaveNoViolations()
  })

  it('has properly labeled inputs', () => {
    const { container } = render(<Form />)
    const { isAccessible, unlabeled } = global.a11yTestUtils.checkLabeledElements(container)
    
    expect(isAccessible).toBe(true)
    expect(unlabeled).toHaveLength(0)
  })
})
```

### Server Test Example

```typescript
// server/features/bills/__tests__/bills-service.test.ts
import { describe, it, expect } from 'vitest'
import { BillsService } from '../bills.service'

describe('BillsService', () => {
  it('creates a bill with valid data', async () => {
    const billData = global.testUtils.generateUniqueData()
    
    const bill = await BillsService.create({
      title: billData.name,
      summary: billData.description,
    })
    
    expect(bill).toHaveProperty('id')
    expect(bill.title).toBe(billData.name)
  })

  it('rejects XSS attempts', async () => {
    const xssPayload = global.testUtils.testPatterns.xssPayloads[0]
    
    expect(() => {
      BillsService.create({ title: xssPayload })
    }).toThrow()
  })
})
```

## 🔧 Global Test Utilities

### Available in ALL tests (`global.testUtils`)

```typescript
global.testUtils = {
  // Delay helper
  delay(ms: number): Promise<void>

  // Mock data factories
  mockUser: { ... }
  mockAdmin: { ... }
  mockBill: { ... }
  mockSponsor: { ... }

  // Data generation
  generateUniqueData(): Record<string, any>
  
  // Response validation
  validateApiResponse(response: any, expectedStatus?: number): void

  // Test patterns
  testPatterns: {
    invalidIds: string[]
    xssPayloads: string[]
    sqlInjectionPayloads: string[]
    edgeCases: { ... }
  }
}
```

### Available in Integration Tests (`global.integrationTestUtils`)

```typescript
global.integrationTestUtils = {
  mockApiError(endpoint: string, status?: number, message?: string): void
  mockAuthenticatedUser(user?: any): any
  mockUnauthenticatedUser(): void
  waitForApiCalls(timeout?: number): Promise<boolean>
  simulateSlowNetwork(): void
  simulateOfflineMode(): void
  resetNetworkConditions(): void
}
```

### Available in A11y Tests (`global.a11yTestUtils`)

```typescript
global.a11yTestUtils = {
  checkAccessibility(container: HTMLElement): Promise<any>
  checkLabeledElements(container: HTMLElement): { unlabeled: Element[], isAccessible: boolean }
  checkKeyboardNavigation(container: HTMLElement): Element[]
  checkColorContrast(container: HTMLElement): Element[]
}
```

### Available in E2E Tests (`global.e2eTestUtils` & `global.e2eTestData`)

```typescript
global.e2eTestUtils = {
  waitForElement(selector: string, timeout?: number): Promise<void>
  fillField(selector: string, value: string): Promise<void>
  clickElement(selector: string): Promise<void>
  submitForm(formSelector: string): Promise<void>
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
  isElementVisible(selector: string): Promise<boolean>
  getElementText(selector: string): Promise<string | null>
  waitForNavigation(timeout?: number): Promise<void>
  takeScreenshot(name: string): Promise<void>
  checkAccessibility(): Promise<any>
}

global.e2eTestData = {
  testUser: { email: 'e2e-test@example.com', password: '...', name: '...' }
  adminUser: { ... }
  testBill: { title: '...', summary: '...', ... }
  selectors: { loginForm: '...', emailInput: '...', ... }
}
```

## 📊 Test Organization

### Standard Test File Naming

```
Unit Tests:           *.test.{ts,tsx}
Integration Tests:    __tests__/**/*.test.{ts,tsx} OR *.integration.test.{ts,tsx}
Accessibility Tests:  *.a11y.test.{ts,tsx}
E2E Tests:           *.spec.{ts,tsx} (in tests/e2e/)
```

### Component Test Location

```
Feature-Sliced Structure:
src/features/bills/
├── ui/
│   ├── BillCard.tsx
│   └── BillCard.test.tsx              ✅ Unit test colocated
├── __tests__/
│   ├── bills-workflow.test.tsx        ✅ Integration test
│   └── bills-a11y.test.tsx            ✅ A11y test
└── model/
    └── types.ts
```

## 🧪 Configuration Details

### Coverage Thresholds

| Project | Lines | Functions | Branches | Statements |
|---------|-------|-----------|----------|------------|
| client-unit | 80% | 80% | 70% | 80% |
| client-integration | 70% | 70% | 60% | 70% |
| server-unit | 85% | 85% | 75% | 85% |
| server-integration | 75% | 75% | 65% | 75% |
| shared | 85% | 85% | 75% | 85% |

### Parallelization

- **Unit Tests**: Fully parallel (thread pool)
- **Integration Tests**: Parallel with isolation
- **E2E Tests**: Single-threaded (sequential)
- **Coverage**: Collected per project

### Retry Strategy

- **CI Environment**: 2 retries on failure
- **Local Development**: No retries (fail fast)
- **E2E Tests**: 1 retry (less flaky than local)

## 📈 Performance Optimization

### Run Time Targets

| Suite | Current | Target | Status |
|-------|---------|--------|--------|
| client-unit | ~5-8 min | <3 min | 🚀 Optimizing |
| server-unit | ~3-5 min | <2 min | 🚀 Optimizing |
| integration | ~8-12 min | <5 min | 🚀 Optimizing |
| e2e | ~10-15 min | <8 min | 🚀 Optimizing |

### Improvements Made

- ✅ Eliminated config duplication (12 → 1 workspace config)
- ✅ Unified setup files (8 → 7 coordinated setups)
- ✅ Parallelization enabled for unit & integration tests
- ✅ Consistent environments (no more config conflicts)
- ✅ Better CI/CD predictability

## 🐛 Troubleshooting

### "Cannot find module" errors

**Solution**: Check that setup files are properly configured in `vitest.workspace.unified.ts`

```typescript
// Look for the setupFiles property in your project:
setupFiles: ['./test-utils/setup/client.ts']
```

### Tests running with different behavior

**Solution**: Verify you're not using old config files

```bash
# Delete deprecated configs
rm client/vitest.config.ts
rm client/vitest.integration.config.ts
rm client/jest.a11y.config.js
rm server/vitest.config.ts
```

### "MSW not intercepting requests" in integration tests

**Solution**: Ensure server is started in setup file

```typescript
// This is already handled in client-integration.ts
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
```

### Console output appearing in tests

**Solution**: Set `DEBUG_TESTS=1` environment variable

```bash
DEBUG_TESTS=1 pnpm test client-unit
```

## 📚 Migration Guide

### If you have old tests using scattered configs:

1. **Update imports** in test files:

```typescript
// ❌ Old (multiple imports)
import { renderWithAuth } from '@/test-utils/auth'
import { renderWithRouter } from '@/test-utils/router'

// ✅ New (use global utilities)
import { render } from '@testing-library/react'
// testUtils and MSW are already set up globally
```

2. **Update setup references**:

```typescript
// ❌ Old
import setupTests from './setupTests'

// ✅ New (no import needed - it's global)
// Just use global.testUtils directly
```

3. **Test file naming**:

```typescript
// ❌ Old (scattered)
__tests__/components/BillCard.test.tsx
src/test.tsx
specs/bill.spec.tsx

// ✅ New (consistent)
src/components/BillCard.test.tsx
src/components/__tests__/bills-workflow.test.tsx
src/components/BillCard.a11y.test.tsx
```

## 🔗 References

- **Vitest Documentation**: https://vitest.dev/
- **Testing Library**: https://testing-library.com/
- **MSW (Mock Service Worker)**: https://mswjs.io/
- **Playwright**: https://playwright.dev/

## 💡 Best Practices

1. **Keep tests colocated** with source code
2. **Use feature-sliced structure** for organization
3. **Leverage global test utilities** instead of importing
4. **Name test files clearly** (*.test.ts, *.integration.test.ts, *.a11y.test.ts)
5. **Mock external services** with MSW in integration tests
6. **Test accessibility** alongside functionality
7. **Run specific projects** locally to save time
8. **Use `testUtils.generateUniqueData()`** for test isolation
9. **Check coverage** per project, not globally
10. **Commit snapshot tests** carefully

---

**Last Updated**: December 2024
**Workspace**: Unified (vitest.workspace.unified.ts)
**Status**: ✅ Fully Consolidated
