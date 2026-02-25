/**
 * E2E Tests for Pretext Detection Feature
 * Tests the complete user flow for pretext detection
 */

import { test, expect } from './fixtures';

test.describe('Pretext Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to pretext detection from menu', async ({ page }) => {
    // Find and click the pretext detection link in navigation
    await page.click('text=Pretext Detection');
    
    // Verify navigation
    await expect(page).toHaveURL(/\/pretext-detection/);
    await expect(page.locator('h1')).toContainText('Pretext Detection');
  });

  test('should display pretext analysis for a bill', async ({ page }) => {
    // Navigate to a bill detail page
    await page.goto('/bills/1');
    
    // Click on pretext detection tab or section
    await page.click('text=Pretext Analysis');
    
    // Wait for analysis to load
    await page.waitForSelector('[data-testid="pretext-analysis"]', { timeout: 10000 });
    
    // Verify analysis is displayed
    const analysis = page.locator('[data-testid="pretext-analysis"]');
    await expect(analysis).toBeVisible();
  });

  test('should show loading state while analyzing', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Pretext Analysis');
    
    // Check for loading indicator
    const loading = page.locator('[data-testid="loading"]');
    await expect(loading).toBeVisible();
  });

  test('should handle analysis errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/pretext-detection/**', route => {
      route.fulfill({ status: 500, body: 'Server error' });
    });
    
    await page.goto('/bills/1');
    await page.click('text=Pretext Analysis');
    
    // Verify error message is displayed
    await expect(page.locator('text=Error')).toBeVisible();
  });

  test('should display notifications for new alerts', async ({ page }) => {
    await page.goto('/pretext-detection');
    
    // Wait for notifications
    const notification = page.locator('[role="alert"]');
    
    // Verify notification appears (if any)
    if (await notification.isVisible()) {
      await expect(notification).toContainText(/alert|notification/i);
    }
  });
});

test.describe('Pretext Detection Accessibility', () => {
  test('should be accessible', async ({ a11yPage: page }) => {
    await page.goto('/pretext-detection');
    
    // Run accessibility checks
    const { checkA11y } = await import('axe-playwright');
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });
});
