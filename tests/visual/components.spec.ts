import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Visual Regression Tests', () => {
  test.describe('Authentication Components', () => {
    test('login form should match visual snapshot', async ({ page }) => {
      await page.goto('/login');
      
      // Wait for form to be fully loaded
      await page.waitForSelector('[data-testid="login-form"]');
      
      // Take screenshot of the login form
      await expect(page.locator('[data-testid="login-form"]')).toHaveScreenshot('login-form.png');
    });

    test('registration form should match visual snapshot', async ({ page }) => {
      await page.goto('/register');
      
      await page.waitForSelector('[data-testid="register-form"]');
      await expect(page.locator('[data-testid="register-form"]')).toHaveScreenshot('register-form.png');
    });

    test('login form with validation errors', async ({ page }) => {
      await page.goto('/login');
      
      // Trigger validation errors
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="email-error"]');
      
      await expect(page.locator('[data-testid="login-form"]')).toHaveScreenshot('login-form-errors.png');
    });
  });

  test.describe('Dashboard Components', () => {
    let testUser: any;

    test.beforeEach(async ({ page, request }) => {
      testUser = TestHelpers.generateTestUser('visual');
      await TestHelpers.registerUser(request, testUser);
      await TestHelpers.loginViaUI(page, testUser.email, testUser.password);
    });

    test('dashboard header should match visual snapshot', async ({ page }) => {
      await page.waitForSelector('[data-testid="dashboard-header"]');
      await expect(page.locator('[data-testid="dashboard-header"]')).toHaveScreenshot('dashboard-header.png');
    });

    test('user profile card should match visual snapshot', async ({ page }) => {
      await page.waitForSelector('[data-testid="user-profile-card"]');
      await expect(page.locator('[data-testid="user-profile-card"]')).toHaveScreenshot('user-profile-card.png');
    });

    test('navigation menu should match visual snapshot', async ({ page }) => {
      await page.waitForSelector('[data-testid="navigation-menu"]');
      await expect(page.locator('[data-testid="navigation-menu"]')).toHaveScreenshot('navigation-menu.png');
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    viewports.forEach(({ name, width, height }) => {
      test(`login page should look correct on ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/login');
        
        await page.waitForSelector('[data-testid="login-form"]');
        await expect(page).toHaveScreenshot(`login-${name}.png`);
      });

      test(`dashboard should look correct on ${name}`, async ({ page, request }) => {
        const testUser = TestHelpers.generateTestUser(`visual-${name}`);
        await TestHelpers.registerUser(request, testUser);
        
        await page.setViewportSize({ width, height });
        await TestHelpers.loginViaUI(page, testUser.email, testUser.password);
        
        await page.waitForSelector('[data-testid="dashboard"]');
        await expect(page).toHaveScreenshot(`dashboard-${name}.png`);
      });
    });
  });

  test.describe('Dark Mode', () => {
    test('login form in dark mode', async ({ page }) => {
      // Enable dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/login');
      
      await page.waitForSelector('[data-testid="login-form"]');
      await expect(page.locator('[data-testid="login-form"]')).toHaveScreenshot('login-form-dark.png');
    });

    test('dashboard in dark mode', async ({ page, request }) => {
      const testUser = TestHelpers.generateTestUser('visual-dark');
      await TestHelpers.registerUser(request, testUser);
      
      await page.emulateMedia({ colorScheme: 'dark' });
      await TestHelpers.loginViaUI(page, testUser.email, testUser.password);
      
      await page.waitForSelector('[data-testid="dashboard"]');
      await expect(page).toHaveScreenshot('dashboard-dark.png');
    });
  });

  test.describe('Loading States', () => {
    test('login form loading state', async ({ page }) => {
      await page.goto('/login');
      
      // Mock slow API response
      await TestHelpers.mockAPIResponse(page, '**/auth/login', { success: true });
      await page.route('**/auth/login', route => {
        setTimeout(() => route.continue(), 2000); // 2 second delay
      });
      
      const testUser = TestHelpers.generateTestUser('loading');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      
      // Capture loading state
      await page.waitForSelector('[data-testid="login-loading"]');
      await expect(page.locator('[data-testid="login-form"]')).toHaveScreenshot('login-form-loading.png');
    });
  });

  test.describe('Error States', () => {
    test('login form with server error', async ({ page }) => {
      await page.goto('/login');
      
      // Mock server error
      await page.route('**/auth/login', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      const testUser = TestHelpers.generateTestUser('error');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.waitForSelector('[data-testid="server-error"]');
      await expect(page.locator('[data-testid="login-form"]')).toHaveScreenshot('login-form-server-error.png');
    });
  });
});




































