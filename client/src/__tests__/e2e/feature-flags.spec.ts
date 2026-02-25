/**
 * E2E Tests for Feature Flag Admin UI
 * Tests the complete user flow for feature flag management
 */

import { test, expect } from './fixtures';

test.describe('Feature Flag Admin', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Navigate to admin section
    await page.goto('/admin/feature-flags');
  });

  test('should display feature flag list', async ({ authenticatedPage: page }) => {
    // Wait for flags to load
    await page.waitForSelector('[data-testid="flag-list"]', { timeout: 10000 });
    
    // Verify flags are displayed
    const flags = page.locator('[data-testid="flag-item"]');
    await expect(flags.first()).toBeVisible();
  });

  test('should create new feature flag', async ({ authenticatedPage: page }) => {
    // Click create button
    await page.click('button:has-text("Create Flag")');
    
    // Fill form
    await page.fill('[name="name"]', 'test-feature');
    await page.fill('[name="description"]', 'Test feature flag');
    await page.check('[name="enabled"]');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator('text=Flag created')).toBeVisible();
  });

  test('should edit feature flag', async ({ authenticatedPage: page }) => {
    // Click edit on first flag
    await page.click('[data-testid="flag-item"] button:has-text("Edit")');
    
    // Update description
    await page.fill('[name="description"]', 'Updated description');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Verify success
    await expect(page.locator('text=Flag updated')).toBeVisible();
  });

  test('should configure rollout percentage', async ({ authenticatedPage: page }) => {
    // Click on a flag
    await page.click('[data-testid="flag-item"]');
    
    // Navigate to rollout section
    await page.click('text=Rollout');
    
    // Set percentage
    await page.fill('[name="percentage"]', '50');
    await page.click('button:has-text("Update Rollout")');
    
    // Verify success
    await expect(page.locator('text=Rollout updated')).toBeVisible();
  });

  test('should configure user targeting', async ({ authenticatedPage: page }) => {
    // Click on a flag
    await page.click('[data-testid="flag-item"]');
    
    // Navigate to targeting section
    await page.click('text=Targeting');
    
    // Add user target
    await page.fill('[name="userId"]', 'user123');
    await page.click('button:has-text("Add User")');
    
    // Verify success
    await expect(page.locator('text=User added')).toBeVisible();
  });

  test('should configure A/B test', async ({ authenticatedPage: page }) => {
    // Click on a flag
    await page.click('[data-testid="flag-item"]');
    
    // Navigate to A/B test section
    await page.click('text=A/B Test');
    
    // Configure test
    await page.fill('[name="variantA"]', '50');
    await page.fill('[name="variantB"]', '50');
    await page.click('button:has-text("Start Test")');
    
    // Verify success
    await expect(page.locator('text=Test started')).toBeVisible();
  });

  test('should display analytics dashboard', async ({ authenticatedPage: page }) => {
    // Navigate to analytics
    await page.click('text=Analytics');
    
    // Verify dashboard is displayed
    const dashboard = page.locator('[data-testid="analytics-dashboard"]');
    await expect(dashboard).toBeVisible();
  });

  test('should delete feature flag', async ({ authenticatedPage: page }) => {
    // Click delete on first flag
    await page.click('[data-testid="flag-item"] button:has-text("Delete")');
    
    // Confirm deletion
    await page.click('button:has-text("Confirm")');
    
    // Verify success
    await expect(page.locator('text=Flag deleted')).toBeVisible();
  });
});

test.describe('Feature Flag Admin Accessibility', () => {
  test('should be accessible', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/feature-flags');
    
    // Run accessibility checks
    const { injectAxe, checkA11y } = await import('axe-playwright');
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
    });
  });
});
