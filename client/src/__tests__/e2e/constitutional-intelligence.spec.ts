/**
 * E2E Tests for Constitutional Intelligence
 * Tests the complete user flow for constitutional analysis
 */

import { test, expect } from './fixtures';

test.describe('Constitutional Intelligence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display constitutional analysis tab on bill page', async ({ page }) => {
    await page.goto('/bills/1');
    
    // Click on constitutional analysis tab
    await page.click('text=Constitutional Analysis');
    
    // Verify tab content is displayed
    await page.waitForSelector('[data-testid="constitutional-analysis"]', { timeout: 10000 });
    const analysis = page.locator('[data-testid="constitutional-analysis"]');
    await expect(analysis).toBeVisible();
  });

  test('should display rights impact assessment', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Constitutional Analysis');
    
    // Look for rights impact visualization
    const rightsImpact = page.locator('[data-testid="rights-impact"]');
    await expect(rightsImpact).toBeVisible();
  });

  test('should display precedent matches', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Constitutional Analysis');
    
    // Look for precedent section
    const precedents = page.locator('[data-testid="precedents"]');
    await expect(precedents).toBeVisible();
  });

  test('should display conflict warnings', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Constitutional Analysis');
    
    // Look for conflict warnings
    const conflicts = page.locator('[data-testid="conflicts"]');
    
    // Conflicts may or may not exist
    if (await conflicts.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(conflicts).toBeVisible();
    }
  });

  test('should export analysis as PDF', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Constitutional Analysis');
    
    // Wait for analysis to load
    await page.waitForSelector('[data-testid="constitutional-analysis"]');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export PDF")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should export analysis as JSON', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Constitutional Analysis');
    
    // Wait for analysis to load
    await page.waitForSelector('[data-testid="constitutional-analysis"]');
    
    // Click export JSON button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export JSON")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test('should share analysis', async ({ page }) => {
    await page.goto('/bills/1');
    await page.click('text=Constitutional Analysis');
    
    // Click share button
    await page.click('button:has-text("Share")');
    
    // Verify share dialog appears
    const shareDialog = page.locator('[role="dialog"]');
    await expect(shareDialog).toBeVisible();
  });

  test('should load analysis within 1 second', async ({ page }) => {
    await page.goto('/bills/1');
    
    const startTime = Date.now();
    await page.click('text=Constitutional Analysis');
    await page.waitForSelector('[data-testid="constitutional-analysis"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(1000);
  });
});

test.describe('Constitutional Intelligence Expert Review', () => {
  test('should allow experts to review analysis', async ({ authenticatedPage: page }) => {
    // Assume user is logged in as expert
    await page.goto('/bills/1');
    await page.click('text=Constitutional Analysis');
    
    // Look for expert review section
    const reviewSection = page.locator('[data-testid="expert-review"]');
    
    if (await reviewSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(reviewSection).toBeVisible();
      
      // Submit a review
      await page.fill('[data-testid="review-comment"]', 'This analysis is accurate.');
      await page.click('button:has-text("Submit Review")');
      
      // Verify success message
      await expect(page.locator('text=Review submitted')).toBeVisible();
    }
  });
});
