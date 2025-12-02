/**
 * Feature-Sliced Migration Visual Regression Tests
 * Ensures UI consistency during the migration to Feature-Sliced Design
 */

import { test, expect } from '@playwright/test';

test.describe('Feature-Sliced Migration Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test.describe('Bills Components Migration', () => {
    test('should match BillCard component after migration', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Navigate to a page that uses BillCard
      await page.goto('/bills');

      // Wait for bill cards to load
      await page.waitForSelector('[data-testid*="bill-card"]', { timeout: 10000 });

      // Take screenshot of first bill card
      const firstBillCard = page.locator('[data-testid*="bill-card"]').first();
      await expect(firstBillCard).toHaveScreenshot('bill-card-migration.png', {
        animations: 'disabled',
      });
    });

    test('should match BillList component after migration', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto('/bills');

      // Wait for bill list to load
      await page.waitForSelector('[data-testid="bill-list"]', { timeout: 10000 });

      const billList = page.locator('[data-testid="bill-list"]');
      await expect(billList).toHaveScreenshot('bill-list-migration.png', {
        animations: 'disabled',
      });
    });

    test('should match BillsDashboard component after migration', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto('/bills');

      // Wait for dashboard to load
      await page.waitForSelector('[data-testid="bills-dashboard"]', { timeout: 10000 });

      const dashboard = page.locator('[data-testid="bills-dashboard"]');
      await expect(page).toHaveScreenshot('bills-dashboard-migration.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match FilterPanel component after migration', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto('/bills');

      // Wait for filter panel to load
      await page.waitForSelector('[data-testid="filter-panel"]', { timeout: 10000 });

      const filterPanel = page.locator('[data-testid="filter-panel"]');
      await expect(filterPanel).toHaveScreenshot('filter-panel-migration.png', {
        animations: 'disabled',
      });
    });

    test('should match StatsOverview component after migration', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto('/bills');

      // Wait for stats overview to load
      await page.waitForSelector('[data-testid="stats-overview"]', { timeout: 10000 });

      const statsOverview = page.locator('[data-testid="stats-overview"]');
      await expect(statsOverview).toHaveScreenshot('stats-overview-migration.png', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Migration Consistency Across Viewports', () => {
    test('should maintain layout consistency on desktop after migration', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/bills');
      await page.waitForSelector('[data-testid="bills-dashboard"]', { timeout: 10000 });

      await expect(page).toHaveScreenshot('migration-desktop-consistency.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should maintain layout consistency on tablet after migration', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/bills');
      await page.waitForSelector('[data-testid="bills-dashboard"]', { timeout: 10000 });

      await expect(page).toHaveScreenshot('migration-tablet-consistency.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should maintain layout consistency on mobile after migration', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/bills');
      await page.waitForSelector('[data-testid="bills-dashboard"]', { timeout: 10000 });

      await expect(page).toHaveScreenshot('migration-mobile-consistency.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Migration Theme Consistency', () => {
    test('should maintain light theme appearance after migration', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      await page.goto('/bills');
      await page.waitForSelector('[data-testid="bills-dashboard"]', { timeout: 10000 });

      await expect(page).toHaveScreenshot('migration-light-theme.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should maintain dark theme appearance after migration', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.goto('/bills');
      await page.waitForSelector('[data-testid="bills-dashboard"]', { timeout: 10000 });

      await expect(page).toHaveScreenshot('migration-dark-theme.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Migration Interactive States', () => {
    test('should maintain hover states after migration', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/bills');
      await page.waitForSelector('[data-testid*="bill-card"]', { timeout: 10000 });

      const firstBillCard = page.locator('[data-testid*="bill-card"]').first();

      // Hover and capture
      await firstBillCard.hover();
      await page.waitForTimeout(300);

      await expect(firstBillCard).toHaveScreenshot('migration-bill-card-hover.png', {
        animations: 'disabled',
      });
    });

    test('should maintain focus states after migration', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/bills');

      // Focus on search input
      const searchInput = page.getByPlaceholder(/search bills/i);
      await searchInput.focus();

      await expect(searchInput).toHaveScreenshot('migration-search-focus.png', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Migration Error States', () => {
    test('should maintain error state appearance after migration', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Intercept API to return error
      await page.route('/api/bills*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('/bills');

      // Wait for error state
      await expect(page.getByText(/failed to load bills/i)).toBeVisible();

      await expect(page).toHaveScreenshot('migration-error-state.png', {
        animations: 'disabled',
      });
    });
  });
});