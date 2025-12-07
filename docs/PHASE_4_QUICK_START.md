# Phase 4 Quick Start Guide

## 5-Minute Overview

Phase 4 transforms the design system into a production-ready application through testing, optimization, and deployment.

### What We're Testing
- ✅ 13 UI components
- ✅ 16 validation schemas
- ✅ 8 custom hooks
- ✅ Form submission workflows
- ✅ Dark mode functionality
- ✅ Mobile responsiveness
- ✅ Accessibility compliance

### Success Criteria
- 80%+ unit test coverage
- 70%+ E2E test coverage
- WCAG AA accessibility
- < 250KB bundle size
- < 2.5s LCP time

---

## Step 1: Setup & Configuration (30 minutes)

### 1.1 Install Test Dependencies

```bash
cd client

# Already installed:
# - vitest (unit testing)
# - @testing-library/react (component testing)
# - @playwright/test (E2E testing)
# - jest-axe (accessibility testing)

# Just verify:
pnpm list | grep -E "vitest|playwright|testing-library|jest-axe"
```

### 1.2 Create Test Configuration Files

**vitest.config.ts** (if not exists):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
      ],
    },
  },
  resolve: {
    alias: {
      '@client': path.resolve(__dirname, './src'),
    },
  },
});
```

**src/__tests__/setup.ts**:
```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // Deprecated
    removeListener: () => {}, // Deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

### 1.3 Update package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:a11y": "jest --config=jest.a11y.config.js",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

## Step 2: Write Component Unit Tests (2 hours)

### 2.1 Test Template

**components/ui/button.test.tsx**:
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';
import { ThemeProvider } from '@client/shared/design-system/theme/theme-provider';

describe('Button', () => {
  // Test 1: Renders with text
  it('renders with text content', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  // Test 2: Handles click events
  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledOnce();
  });

  // Test 3: Disabled state
  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button disabled onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  // Test 4: Variant styles
  it('applies variant className', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    expect(container.querySelector('button')).toHaveClass('destructive');
  });

  // Test 5: Dark mode support
  it('renders correctly in dark mode', () => {
    const { container } = render(
      <ThemeProvider initialTheme="dark">
        <Button>Dark Mode</Button>
      </ThemeProvider>
    );
    
    const html = container.ownerDocument.documentElement;
    expect(html.classList.contains('dark')).toBe(true);
  });

  // Test 6: Accessibility
  it('has proper accessibility attributes', () => {
    render(<Button disabled>Disabled Button</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 2.2 Component Tests to Write (13 components)

Each component should have 5-6 tests covering:
1. Basic rendering
2. Props handling
3. Event handling
4. Disabled/error states
5. Dark mode support
6. Accessibility features

**Priority Order**:
1. Button (5 tests)
2. Input (6 tests)
3. Card (5 tests)
4. Badge (5 tests)
5. Label (4 tests)
6. Avatar (5 tests)
7. Alert (5 tests)
8. Dialog (5 tests)
9. Tabs (4 tests)
10. Progress (4 tests)
11. Switch (5 tests)
12. Checkbox (5 tests)
13. Tooltip (4 tests)

**Total**: ~65 component tests

### 2.3 Run Tests

```bash
# Watch mode (recommended for development)
pnpm test

# Run all tests once
pnpm test:run

# With UI dashboard
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

---

## Step 3: Validation Schema Tests (1 hour)

### 3.1 Schema Test Template

**lib/validation-schemas.test.ts**:
```typescript
import { describe, it, expect } from 'vitest';
import { billValidationSchemas, userValidationSchemas } from './validation-schemas';

describe('Bill Validation Schemas', () => {
  // Test 1: Valid bill creation
  it('validates correct bill data', async () => {
    const validBill = {
      title: 'Healthcare Reform Act 2025',
      description: 'A comprehensive bill addressing healthcare costs and access for all citizens.',
      policyArea: 'Healthcare',
      urgency: 'high' as const,
    };
    
    const result = await billValidationSchemas.billCreate.parseAsync(validBill);
    expect(result).toEqual(validBill);
  });

  // Test 2: Reject invalid data
  it('rejects bill with short title', async () => {
    const invalidBill = {
      title: 'Short',
      description: 'This is a valid long description',
      policyArea: 'Health',
      urgency: 'high' as const,
    };
    
    await expect(
      billValidationSchemas.billCreate.parseAsync(invalidBill)
    ).rejects.toThrow();
  });

  // Test 3: Transform data
  it('coerces invalid urgency to valid', async () => {
    const result = await billValidationSchemas.billCreate.parseAsync({
      title: 'Valid Title Here',
      description: 'This is a valid long description',
      policyArea: 'Health',
      urgency: 'high' as const,
    });
    
    expect(result.urgency).toBe('high');
  });

  // Test 4: Optional fields
  it('handles optional fields', async () => {
    const result = await billValidationSchemas.billCreate.parseAsync({
      title: 'Valid Title Here',
      description: 'This is a valid long description',
      policyArea: 'Health',
      urgency: 'high' as const,
      tags: ['environment', 'economy'],
    });
    
    expect(result.tags).toEqual(['environment', 'economy']);
  });
});

describe('User Validation Schemas', () => {
  // Test password validation
  it('validates strong password', async () => {
    const data = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      username: 'johndoe',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      agreeToTerms: true,
    };
    
    const result = await userValidationSchemas.register.parseAsync(data);
    expect(result.password).toBe('SecurePass123');
  });

  // Test password mismatch
  it('rejects mismatched passwords', async () => {
    const data = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      username: 'johndoe',
      password: 'SecurePass123',
      confirmPassword: 'DifferentPass456',
      agreeToTerms: true,
    };
    
    await expect(
      userValidationSchemas.register.parseAsync(data)
    ).rejects.toThrow();
  });
});
```

**Total Validation Tests**: ~48 tests (16 schemas × 3 tests each)

---

## Step 4: Accessibility Testing (1 hour)

### 4.1 A11y Test Template

**components/ui/__tests__/accessibility.test.tsx**:
```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '../button';
import { Input } from '../input';

expect.extend(toHaveNoViolations);

describe('Accessibility - Button', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<Button>Click Me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible name', () => {
    const { getByRole } = render(<Button>Submit Form</Button>);
    expect(getByRole('button')).toHaveAccessibleName('Submit Form');
  });

  it('should indicate disabled state', () => {
    const { getByRole } = render(<Button disabled>Disabled</Button>);
    expect(getByRole('button')).toBeDisabled();
  });
});

describe('Accessibility - Input', () => {
  it('should have associated label', () => {
    const { getByLabelText } = render(
      <>
        <label htmlFor="email">Email</label>
        <Input id="email" type="email" />
      </>
    );
    
    expect(getByLabelText('Email')).toBeInTheDocument();
  });

  it('should announce errors to screen readers', () => {
    const { getByRole } = render(
      <Input
        aria-invalid="true"
        aria-describedby="error-message"
      />
    );
    
    expect(getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
```

### 4.2 Manual A11y Checklist

- [ ] **Keyboard Navigation**: Tab through entire page
  - [ ] All interactive elements reachable
  - [ ] Focus visible on all elements
  - [ ] Logical tab order
  - [ ] Can activate buttons with Enter
  - [ ] Can toggle with Space

- [ ] **Screen Reader** (NVDA/JAWS):
  - [ ] Page title announced
  - [ ] Headings properly nested (h1-h6)
  - [ ] Links have descriptive text
  - [ ] Images have alt text
  - [ ] Form labels associated
  - [ ] Error messages announced
  - [ ] Button purposes clear

- [ ] **Visual**:
  - [ ] Color contrast ≥ 4.5:1
  - [ ] Text resizable (zoom 200%)
  - [ ] No text in images
  - [ ] Color not only information
  - [ ] Focus indicator visible

---

## Step 5: E2E Tests with Playwright (1.5 hours)

### 5.1 E2E Test Template

**tests/e2e/bill-search.spec.ts**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Bill Search and Filter', () => {
  test('should search for bills', async ({ page }) => {
    await page.goto('/');
    
    // Find search input
    const searchInput = page.locator('[placeholder="Search bills..."]');
    await expect(searchInput).toBeVisible();
    
    // Type search query
    await searchInput.fill('healthcare');
    
    // Click search button
    await page.click('button:has-text("Search")');
    
    // Wait for results
    await page.waitForLoadState('networkidle');
    
    // Verify results
    const results = page.locator('.bill-card');
    expect(await results.count()).toBeGreaterThan(0);
  });

  test('should filter by urgency', async ({ page }) => {
    await page.goto('/bills?search=healthcare');
    
    // Open filter panel
    await page.click('[aria-label="Filter by urgency"]');
    
    // Select high urgency
    await page.click('text=High Priority');
    
    // Wait for filtered results
    await page.waitForLoadState('networkidle');
    
    // Verify urgency filter applied
    const filter = page.locator('[data-urgency="high"]');
    expect(filter).toBeTruthy();
  });

  test('should persist filters on navigation', async ({ page }) => {
    await page.goto('/bills?urgency=high');
    
    // Click a bill
    await page.click('.bill-card >> nth=0');
    await page.waitForLoadState('networkidle');
    
    // Go back
    await page.goBack();
    
    // Verify filter still applied
    expect(page.url()).toContain('urgency=high');
  });
});

test.describe('Form Validation', () => {
  test('should show validation errors', async ({ page }) => {
    await page.goto('/create-bill');
    
    // Click submit without filling form
    await page.click('button:has-text("Create")');
    
    // Wait for errors
    await page.waitForSelector('[role="alert"]');
    
    // Verify error messages
    const errors = page.locator('[role="alert"]');
    expect(await errors.count()).toBeGreaterThan(0);
  });

  test('should submit valid form', async ({ page }) => {
    await page.goto('/create-bill');
    
    // Fill form
    await page.fill('[name="title"]', 'Healthcare Reform Act 2025');
    await page.fill('[name="description"]', 
      'A comprehensive bill addressing healthcare costs and access.');
    await page.selectOption('[name="urgency"]', 'high');
    
    // Submit
    await page.click('button:has-text("Create")');
    
    // Verify success navigation
    await expect(page).toHaveURL(/\/bills\/\d+/);
  });
});

test.describe('Dark Mode', () => {
  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Toggle dark mode
    await page.click('[aria-label="Toggle dark mode"]');
    
    // Verify dark class applied
    const html = page.locator('html');
    expect(html).toHaveClass('dark');
  });

  test('should persist dark mode preference', async ({ page }) => {
    await page.goto('/');
    
    // Enable dark mode
    await page.click('[aria-label="Toggle dark mode"]');
    
    // Reload page
    await page.reload();
    
    // Verify dark mode persisted
    const html = page.locator('html');
    expect(html).toHaveClass('dark');
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should show mobile navigation on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Desktop nav should be hidden
    const desktopNav = page.locator('[data-testid="desktop-nav"]');
    await expect(desktopNav).toBeHidden();
    
    // Mobile menu should be visible
    const mobileMenu = page.locator('[aria-label="Open menu"]');
    await expect(mobileMenu).toBeVisible();
  });

  test('should have touch-friendly interaction areas', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Buttons should be at least 44x44px
    const button = page.locator('button').first();
    const box = await button.boundingBox();
    
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    
    // Should focus on an interactive element
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
    });
    
    expect(focused).toBe(true);
  });

  test('should announce focus with visible indicator', async ({ page }) => {
    await page.goto('/');
    
    // Tab to element
    await page.keyboard.press('Tab');
    
    // Check focus is visible
    const focused = await page.locator(':focus-visible');
    await expect(focused).toHaveCSS('outline-width', /[1-9]/);
  });
});
```

### 5.2 Run E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI (headed browser)
pnpm test:e2e:ui

# Debug mode (step through)
pnpm test:e2e:debug

# Run single test file
pnpm test:e2e tests/e2e/bill-search.spec.ts

# Generate HTML report
pnpm test:e2e
open playwright-report/index.html
```

---

## Step 6: Performance Testing (30 minutes)

### 6.1 Lighthouse Testing

```bash
# Manual testing
npm run analyze:bundle
npm run check:performance-budget

# Command line (if Lighthouse installed)
lighthouse https://localhost:3000 --view
```

### 6.2 Check Performance Budgets

**performance-budgets.json**:
```json
{
  "bundles": [
    {
      "name": "main",
      "budget": "250kb"
    },
    {
      "name": "vendor",
      "budget": "150kb"
    }
  ],
  "metrics": [
    {
      "name": "LCP",
      "budget": "2500ms"
    },
    {
      "name": "FID",
      "budget": "100ms"
    },
    {
      "name": "CLS",
      "budget": "0.1"
    }
  ]
}
```

```bash
npm run test:performance-budget
```

---

## Step 7: Full Coverage Report

### 7.1 Generate Coverage

```bash
pnpm test:coverage

# View HTML report
open coverage/index.html
```

### 7.2 Coverage Goals

| Area | Target | Current |
|------|--------|---------|
| Statements | 80%+ | - |
| Branches | 75%+ | - |
| Functions | 80%+ | - |
| Lines | 80%+ | - |

---

## Running Everything

### All Tests Together

```bash
# Run all checks (30-40 minutes total)
pnpm test:run --coverage && \
pnpm test:a11y && \
pnpm test:e2e && \
npm run check:performance-budget
```

### Before Deployment

```bash
#!/bin/bash
echo "Running pre-deployment checks..."

# Type check
pnpm typecheck || exit 1

# Lint
pnpm lint || exit 1

# Test
pnpm test:run || exit 1

# Coverage
pnpm test:coverage || exit 1

# Accessibility
pnpm test:a11y || exit 1

# Build
pnpm build || exit 1

# E2E (on production build)
pnpm test:e2e || exit 1

# Performance
npm run check:performance-budget || exit 1

echo "✅ All checks passed!"
```

---

## Troubleshooting

### Tests Failing

1. **Clear cache**: `pnpm test:run --clearCache`
2. **Reinstall**: `rm -rf node_modules && pnpm install`
3. **Check Node version**: `node --version` (should be 18+)

### E2E Tests Timing Out

1. Increase timeout: `test.setTimeout(30000)` in spec file
2. Check network: Run `pnpm test:e2e:debug` to see what's happening
3. Add delays: `await page.waitForLoadState('networkidle')`

### Coverage Not Accurate

1. **Clear coverage**: `rm -rf coverage`
2. **Reinstall vitest**: `pnpm add -D vitest@latest`
3. **Check config**: Verify `vitest.config.ts` has correct include/exclude

---

## Next Phase

After tests passing:
1. ✅ Code review
2. ✅ Staging deployment
3. ✅ Production deployment
4. ✅ Monitor metrics

**Target**: Week of Dec 13, 2025

---

**Last Updated**: December 6, 2025  
**Ready to Begin**: ✅ Yes  
**Estimated Duration**: 6-8 hours  
**Difficulty**: Medium
