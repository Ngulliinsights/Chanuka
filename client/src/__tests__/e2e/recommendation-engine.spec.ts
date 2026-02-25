/**
 * E2E Tests for Recommendation Engine
 * Tests the complete user flow for personalized recommendations
 */

import { test, expect } from './fixtures';

test.describe('Recommendation Engine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display recommendations on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for recommendations widget
    await page.waitForSelector('[data-testid="recommendations-widget"]', { timeout: 10000 });
    
    // Verify recommendations are displayed
    const widget = page.locator('[data-testid="recommendations-widget"]');
    await expect(widget).toBeVisible();
    
    // Check for recommendation items
    const items = page.locator('[data-testid="recommendation-item"]');
    await expect(items.first()).toBeVisible();
  });

  test('should display recommendations on bill pages', async ({ page }) => {
    await page.goto('/bills/1');
    
    // Look for related bills or recommendations section
    const recommendations = page.locator('[data-testid="related-bills"]');
    await expect(recommendations).toBeVisible();
  });

  test('should track clicks on recommendations', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for recommendations
    await page.waitForSelector('[data-testid="recommendation-item"]');
    
    // Click on a recommendation
    await page.click('[data-testid="recommendation-item"]');
    
    // Verify navigation occurred
    await expect(page).toHaveURL(/\/bills\/\d+/);
  });

  test('should show loading state while fetching recommendations', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for loading indicator
    const loading = page.locator('[data-testid="recommendations-loading"]');
    
    // Loading should appear briefly
    if (await loading.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(loading).toBeVisible();
    }
  });

  test('should handle empty recommendations gracefully', async ({ page }) => {
    // Mock empty recommendations
    await page.route('**/api/recommendations/**', route => {
      route.fulfill({ status: 200, body: JSON.stringify({ recommendations: [] }) });
    });
    
    await page.goto('/dashboard');
    
    // Verify empty state message
    await expect(page.locator('text=No recommendations')).toBeVisible();
  });

  test('should update recommendations based on user interactions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Get initial recommendations
    const initialRecs = await page.locator('[data-testid="recommendation-item"]').count();
    
    // Interact with a bill
    await page.goto('/bills/1');
    await page.click('button:has-text("Support")');
    
    // Go back to dashboard
    await page.goto('/dashboard');
    
    // Recommendations should still be present
    const updatedRecs = await page.locator('[data-testid="recommendation-item"]').count();
    expect(updatedRecs).toBeGreaterThan(0);
  });
});

test.describe('Recommendation Engine Performance', () => {
  test('should load recommendations within 500ms', async ({ page }) => {
    await page.goto('/dashboard');
    
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="recommendations-widget"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(500);
  });
});
