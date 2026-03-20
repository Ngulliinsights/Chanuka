/**
 * E2E Tests for Argument Intelligence
 * Tests the complete user flow for argument clustering and analysis
 */

import { test, expect } from './fixtures';

test.describe('Argument Intelligence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display argument clusters on bill page', async ({ page }) => {
    await page.goto('/bills/1');
    
    // Navigate to arguments/comments section
    await page.click('text=Arguments');
    
    // Wait for clusters to load
    await page.waitForSelector('[data-testid="argument-clusters"]', { timeout: 10000 });
    
    // Verify clusters are displayed
    const clusters = page.locator('[data-testid="argument-cluster"]');
    await expect(clusters.first()).toBeVisible();
  });

  test('should display sentiment heatmap', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Arguments');
    
    // Look for sentiment visualization
    const heatmap = page.locator('[data-testid="sentiment-heatmap"]');
    await expect(heatmap).toBeVisible();
  });

  test('should show quality metrics for arguments', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Arguments');
    
    // Wait for quality metrics
    await page.waitForSelector('[data-testid="quality-metrics"]');
    
    // Verify metrics are displayed
    const metrics = page.locator('[data-testid="quality-metrics"]');
    await expect(metrics).toBeVisible();
  });

  test('should filter arguments by cluster', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Arguments');
    
    // Click on a cluster
    await page.click('[data-testid="argument-cluster"]');
    
    // Verify filtered arguments are displayed
    const filteredArgs = page.locator('[data-testid="filtered-arguments"]');
    await expect(filteredArgs).toBeVisible();
  });

  test('should search within arguments', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Arguments');
    
    // Use search functionality
    await page.fill('[data-testid="argument-search"]', 'healthcare');
    await page.press('[data-testid="argument-search"]', 'Enter');
    
    // Verify search results
    const results = page.locator('[data-testid="search-results"]');
    await expect(results).toBeVisible();
  });

  test('should display position tracking', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Arguments');
    
    // Look for position indicators (support/oppose)
    const positions = page.locator('[data-testid="position-indicator"]');
    await expect(positions.first()).toBeVisible();
  });

  test('should handle large number of arguments efficiently', async ({ page }) => {
    // Mock large dataset
    await page.route('**/api/arguments/**', route => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `Argument ${i}`,
        sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
        cluster: Math.floor(Math.random() * 10),
      }));
      route.fulfill({ status: 200, body: JSON.stringify({ arguments: largeDataset }) });
    });
    
    await page.goto('/bills/1');
    await page.click('text=Arguments');
    
    // Verify virtualization or pagination works
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="argument-clusters"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    // Should render within 1 second even with 10k arguments
    expect(loadTime).toBeLessThan(1000);
  });
});

test.describe('Argument Intelligence Accessibility', () => {
  test('should be accessible', async ({ a11yPage: page }) => {
    await page.goto('/bills/1');
    await page.click('text=Arguments');
    
    // Run accessibility checks
    const { checkA11y } = await import('axe-playwright');
    await checkA11y(page, '[data-testid="argument-clusters"]', {
      detailedReport: true,
    });
  });
});
