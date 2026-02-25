/**
 * Playwright Test Fixtures
 * Reusable test utilities and helpers
 */

import { test as base, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

type TestFixtures = {
  authenticatedPage: any;
  a11yPage: any;
};

export const test = base.extend<TestFixtures>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Perform login (adjust selectors based on your app)
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    await use(page);
  },

  // Accessibility testing page fixture
  a11yPage: async ({ page }, use) => {
    await injectAxe(page);
    await use(page);
  },
});

export { expect };
