# Playwright Migration Guide

## Overview

This guide outlines the strategic migration from Jest to Playwright for comprehensive testing coverage.

## Migration Strategy

### Current Testing Stack
- **Backend API Tests**: Jest + Supertest
- **Performance Tests**: Jest (memory profiling)
- **Integration Tests**: Jest
- **Frontend Tests**: Vitest (keeping this)

### New Testing Stack
- **End-to-End Tests**: Playwright
- **API Tests**: Playwright (replacing Supertest)
- **Performance Tests**: Playwright (browser + API performance)
- **Visual Regression**: Playwright
- **Cross-browser Testing**: Playwright
- **Backend Unit Tests**: Keep Jest for now
- **Frontend Tests**: Keep Vitest

## Benefits of Playwright

1. **Unified Testing**: Single tool for E2E, API, and performance testing
2. **Better Performance Metrics**: Real browser performance data
3. **Visual Testing**: Screenshot comparison and visual regression
4. **Cross-browser Support**: Chrome, Firefox, Safari, Edge
5. **Better Debugging**: UI mode, trace viewer, video recording
6. **Parallel Execution**: Faster test runs
7. **Modern API**: Better async/await support, auto-waiting

## Migration Steps

### Phase 1: Setup (Completed)
- [x] Install Playwright
- [x] Create playwright.config.ts
- [x] Setup test directories
- [x] Add npm scripts

### Phase 2: API Test Migration
- [x] Migrate auth tests from Jest+Supertest to Playwright
- [ ] Migrate remaining API tests
- [ ] Update CI/CD pipeline

### Phase 3: E2E Test Creation
- [x] Create end-to-end user flows
- [ ] Add visual regression tests
- [ ] Cross-browser testing

### Phase 4: Performance Test Migration
- [x] Migrate memory profiling tests
- [ ] Add browser performance metrics
- [ ] API performance testing

## Key Differences

### Jest + Supertest vs Playwright API Testing

**Before (Jest + Supertest):**
```typescript
import request from 'supertest';
import app from '../app';

it('should register user', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send(userData);
  
  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
});
```

**After (Playwright):**
```typescript
import { test, expect } from '@playwright/test';

test('should register user', async ({ request }) => {
  const response = await request.post('/auth/register', {
    data: userData
  });
  
  expect(response.status()).toBe(201);
  const data = await response.json();
  expect(data.success).toBe(true);
});
```

### Memory Testing Migration

**Before (Jest):**
```typescript
it('should not leak memory', () => {
  const before = process.memoryUsage();
  // ... operations
  const after = process.memoryUsage();
  const increase = after.heapUsed - before.heapUsed;
  expect(increase).toBeLessThan(threshold);
});
```

**After (Playwright):**
```typescript
test('should not leak memory', async ({ page }) => {
  const before = await page.evaluate(() => 
    (performance as any).memory?.usedJSHeapSize
  );
  // ... operations
  const after = await page.evaluate(() => 
    (performance as any).memory?.usedJSHeapSize
  );
  expect(after - before).toBeLessThan(threshold);
});
```

## Test Organization

```
tests/
├── api/                 # API tests (replacing Jest+Supertest)
│   ├── auth.spec.ts
│   ├── users.spec.ts
│   └── data.spec.ts
├── e2e/                 # End-to-end user flows
│   ├── auth-flow.spec.ts
│   ├── dashboard.spec.ts
│   └── user-management.spec.ts
├── performance/         # Performance and memory tests
│   ├── memory-profiling.spec.ts
│   ├── api-performance.spec.ts
│   └── page-load.spec.ts
├── visual/              # Visual regression tests
│   ├── components.spec.ts
│   └── pages.spec.ts
├── global-setup.ts      # Global test setup
└── global-teardown.ts   # Global test cleanup
```

## Running Tests

```bash
# All Playwright tests
npm run test:e2e

# API tests only
npm run test:api

# Performance tests
npm run test:performance

# With UI (great for debugging)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Headed mode (see browser)
npm run test:e2e:headed

# Visual tests
npm run test:visual
```

## Best Practices

### 1. Use Data Test IDs
```html
<button data-testid="login-button">Login</button>
```

```typescript
await page.click('[data-testid="login-button"]');
```

### 2. Page Object Model
```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
  }
}
```

### 3. Test Fixtures
```typescript
// fixtures.ts
export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

### 4. Visual Testing
```typescript
test('should match visual snapshot', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png');
});
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run Playwright tests
  run: npm run test:e2e

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Next Steps

1. **Install Playwright**: `npm install`
2. **Install browsers**: `npx playwright install`
3. **Run example tests**: `npm run test:e2e`
4. **Migrate existing tests**: Start with critical user flows
5. **Add visual tests**: For UI components
6. **Update CI/CD**: Include Playwright in your pipeline

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Testing Guide](https://playwright.dev/docs/api-testing)
- [Visual Comparisons](https://playwright.dev/docs/test-screenshots)