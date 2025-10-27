import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  },
});

import { test, expect } from '@playwright/test';
import { TestHelpers } from '@/utils/test-helpers';

// Strategic E2E Testing: Database Performance from User Perspective
// Tests how database performance impacts real user interactions
test.describe('Database Performance - User Experience', () => {
  let testUser: any;

  test.beforeEach(async ({ page, request }) => {
    testUser = TestHelpers.generateTestUser('db-perf');
    await TestHelpers.registerUser(request, testUser);
    await TestHelpers.loginViaUI(page, testUser.email, testUser.password);
  });

  test.describe('Bill Browsing Performance', () => {
    test('should load bill list within acceptable time', async ({ page }) => {
      const startTime = performance.now();
      
      await page.goto('/bills');
      await page.waitForSelector('[data-testid="bill-list"]');
      
      const loadTime = performance.now() - startTime;
      console.log(`Bill list load time: ${Math.round(loadTime)}ms`);
      
      expect(loadTime).toBeLessThan(2000); // 2 seconds max
      
      // Verify content loaded
      const billItems = page.locator('[data-testid="bill-item"]');
      await expect(billItems.first()).toBeVisible();
      
      const billCount = await billItems.count();
      expect(billCount).toBeGreaterThan(0);
    });

    test('should handle pagination smoothly', async ({ page }) => {
      await page.goto('/bills');
      await page.waitForSelector('[data-testid="bill-list"]');
      
      // Click next page
      const startTime = performance.now();
      await page.click('[data-testid="pagination-next"]');
      await page.waitForSelector('[data-testid="bill-list"]');
      
      const paginationTime = performance.now() - startTime;
      console.log(`Pagination time: ${Math.round(paginationTime)}ms`);
      
      expect(paginationTime).toBeLessThan(1000); // 1 second max for pagination
      
      // Verify page changed
      const pageIndicator = page.locator('[data-testid="current-page"]');
      await expect(pageIndicator).toContainText('2');
    });

    test('should perform search without blocking UI', async ({ page }) => {
      await page.goto('/bills');
      
      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill('healthcare');
      
      // Start typing and measure response
      const startTime = performance.now();
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForSelector('[data-testid="search-results"]');
      
      const searchTime = performance.now() - startTime;
      console.log(`Search response time: ${Math.round(searchTime)}ms`);
      
      expect(searchTime).toBeLessThan(1500); // 1.5 seconds max
      
      // Verify search results
      const results = page.locator('[data-testid="bill-item"]');
      const resultCount = await results.count();
      expect(resultCount).toBeGreaterThan(0);
    });

    test('should show loading states during slow operations', async ({ page }) => {
      await page.goto('/bills');
      
      // Trigger a potentially slow operation
      await page.click('[data-testid="load-more-bills"]');
      
      // Should show loading indicator
      const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
      await expect(loadingIndicator).toBeVisible();
      
      // Wait for operation to complete
      await page.waitForSelector('[data-testid="bill-list"]');
      
      // Loading indicator should disappear
      await expect(loadingIndicator).not.toBeVisible();
    });
  });

  test.describe('Bill Details Performance', () => {
    test('should load bill details quickly', async ({ page }) => {
      await page.goto('/bills');
      await page.waitForSelector('[data-testid="bill-item"]');
      
      // Click on first bill
      const startTime = performance.now();
      await page.click('[data-testid="bill-item"]');
      
      // Wait for bill details to load
      await page.waitForSelector('[data-testid="bill-details"]');
      
      const loadTime = performance.now() - startTime;
      console.log(`Bill details load time: ${Math.round(loadTime)}ms`);
      
      expect(loadTime).toBeLessThan(1500); // 1.5 seconds max
      
      // Verify all sections loaded
      await expect(page.locator('[data-testid="bill-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="bill-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="bill-sponsor"]')).toBeVisible();
    });

    test('should load engagement data efficiently', async ({ page }) => {
      // Navigate to a bill with engagement data
      await page.goto('/bills/1');
      await page.waitForSelector('[data-testid="bill-details"]');
      
      // Click on engagement tab
      const startTime = performance.now();
      await page.click('[data-testid="engagement-tab"]');
      
      // Wait for engagement data
      await page.waitForSelector('[data-testid="engagement-stats"]');
      
      const loadTime = performance.now() - startTime;
      console.log(`Engagement data load time: ${Math.round(loadTime)}ms`);
      
      expect(loadTime).toBeLessThan(1000); // 1 second max
      
      // Verify engagement data loaded
      await expect(page.locator('[data-testid="view-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="comment-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-count"]')).toBeVisible();
    });

    test('should handle comments loading efficiently', async ({ page }) => {
      await page.goto('/bills/1');
      await page.waitForSelector('[data-testid="bill-details"]');
      
      // Click on comments section
      const startTime = performance.now();
      await page.click('[data-testid="comments-section"]');
      
      // Wait for comments to load
      await page.waitForSelector('[data-testid="comments-list"]');
      
      const loadTime = performance.now() - startTime;
      console.log(`Comments load time: ${Math.round(loadTime)}ms`);
      
      expect(loadTime).toBeLessThan(1200); // 1.2 seconds max
      
      // Verify comments structure
      const comments = page.locator('[data-testid="comment-item"]');
      if (await comments.count() > 0) {
        await expect(comments.first()).toBeVisible();
      }
    });
  });

  test.describe('Dashboard Performance', () => {
    test('should load dashboard with aggregated data quickly', async ({ page }) => {
      const startTime = performance.now();
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="dashboard-content"]');
      
      const loadTime = performance.now() - startTime;
      console.log(`Dashboard load time: ${Math.round(loadTime)}ms`);
      
      expect(loadTime).toBeLessThan(2500); // 2.5 seconds max for dashboard
      
      // Verify all dashboard sections loaded
      await expect(page.locator('[data-testid="recent-bills"]')).toBeVisible();
      await expect(page.locator('[data-testid="engagement-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
    });

    test('should update dashboard data without full reload', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="dashboard-content"]');
      
      // Trigger data refresh
      const startTime = performance.now();
      await page.click('[data-testid="refresh-dashboard"]');
      
      // Wait for refresh indicator
      await page.waitForSelector('[data-testid="refreshing-indicator"]');
      
      // Wait for refresh to complete
      await page.waitForSelector('[data-testid="dashboard-content"]');
      await expect(page.locator('[data-testid="refreshing-indicator"]')).not.toBeVisible();
      
      const refreshTime = performance.now() - startTime;
      console.log(`Dashboard refresh time: ${Math.round(refreshTime)}ms`);
      
      expect(refreshTime).toBeLessThan(1500); // 1.5 seconds max for refresh
    });

    test('should handle real-time updates efficiently', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="dashboard-content"]');
      
      // Monitor for real-time updates (if implemented)
      const activityFeed = page.locator('[data-testid="activity-feed"]');
      const initialCount = await activityFeed.locator('[data-testid="activity-item"]').count();
      
      // Wait for potential real-time updates
      await page.waitForTimeout(2000);
      
      const finalCount = await activityFeed.locator('[data-testid="activity-item"]').count();
      
      // If real-time updates occurred, they should be smooth
      if (finalCount > initialCount) {
        console.log(`Real-time updates detected: ${finalCount - initialCount} new items`);
        
        // New items should be visible
        const newItems = activityFeed.locator('[data-testid="activity-item"]').first();
        await expect(newItems).toBeVisible();
      }
    });
  });

  test.describe('Performance Under Load', () => {
    test('should maintain responsiveness with multiple tabs', async ({ context }) => {
      // Open multiple tabs to simulate heavy usage
      const pages = [];
      
      for (let i = 0; i < 3; i++) {
        const page = await context.newPage();
        await TestHelpers.loginViaUI(page, testUser.email, testUser.password);
        pages.push(page);
      }
      
      // Navigate each tab to different sections
      const startTime = performance.now();
      
      await Promise.all([
        pages[0].goto('/bills'),
        pages[1].goto('/dashboard'),
        pages[2].goto('/sponsors')
      ]);
      
      // Wait for all pages to load
      await Promise.all([
        pages[0].waitForSelector('[data-testid="bill-list"]'),
        pages[1].waitForSelector('[data-testid="dashboard-content"]'),
        pages[2].waitForSelector('[data-testid="sponsors-list"]')
      ]);
      
      const totalTime = performance.now() - startTime;
      console.log(`Multiple tabs load time: ${Math.round(totalTime)}ms`);
      
      expect(totalTime).toBeLessThan(4000); // 4 seconds max for 3 tabs
      
      // Clean up
      for (const page of pages) {
        await page.close();
      }
    });

    test('should handle concurrent user actions gracefully', async ({ page }) => {
      await page.goto('/bills');
      await page.waitForSelector('[data-testid="bill-list"]');
      
      // Perform multiple actions simultaneously
      const startTime = performance.now();
      
      await Promise.all([
        page.fill('[data-testid="search-input"]', 'healthcare'),
        page.selectOption('[data-testid="sort-select"]', 'date'),
        page.selectOption('[data-testid="filter-status"]', 'active')
      ]);
      
      // Trigger all actions
      await page.press('[data-testid="search-input"]', 'Enter');
      
      // Wait for results
      await page.waitForSelector('[data-testid="search-results"]');
      
      const actionTime = performance.now() - startTime;
      console.log(`Concurrent actions time: ${Math.round(actionTime)}ms`);
      
      expect(actionTime).toBeLessThan(2000); // 2 seconds max
      
      // Verify all filters applied
      const results = page.locator('[data-testid="bill-item"]');
      expect(await results.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Memory Performance in Browser', () => {
    test('should not leak memory during navigation', async ({ page }) => {
      // Get initial memory
      const initialMemory = await TestHelpers.getMemoryUsage(page);
      
      if (!initialMemory) {
        test.skip('Memory API not available');
        return;
      }
      
      // Navigate through multiple pages
      const pages = ['/bills', '/dashboard', '/sponsors', '/bills/1', '/dashboard'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500); // Let page settle
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Get final memory
      const finalMemory = await TestHelpers.getMemoryUsage(page);
      
      if (finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
        
        console.log(`Memory increase after navigation: ${memoryIncreaseMB.toFixed(2)}MB`);
        
        // Memory increase should be reasonable
        expect(memoryIncreaseMB).toBeLessThan(20); // Less than 20MB increase
      }
    });

    test('should handle large data sets without memory issues', async ({ page }) => {
      const initialMemory = await TestHelpers.getMemoryUsage(page);
      
      if (!initialMemory) {
        test.skip('Memory API not available');
        return;
      }
      
      // Load a page with large dataset
      await page.goto('/bills?limit=100');
      await page.waitForSelector('[data-testid="bill-list"]');
      
      // Scroll through the list to trigger rendering
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await page.waitForTimeout(200);
      }
      
      const finalMemory = await TestHelpers.getMemoryUsage(page);
      
      if (finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
        
        console.log(`Memory increase with large dataset: ${memoryIncreaseMB.toFixed(2)}MB`);
        
        // Should handle large datasets efficiently
        expect(memoryIncreaseMB).toBeLessThan(30); // Less than 30MB for 100 items
      }
    });
  });
});




































