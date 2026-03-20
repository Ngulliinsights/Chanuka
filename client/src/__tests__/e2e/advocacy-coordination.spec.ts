/**
 * E2E Tests for Advocacy Coordination
 * Tests the complete user flow for advocacy campaigns and actions
 */

import { test, expect } from './fixtures';

test.describe('Advocacy Coordination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to advocacy dashboard', async ({ page }) => {
    // Navigate to advocacy section
    await page.click('text=Advocacy');
    
    // Verify navigation
    await expect(page).toHaveURL(/\/advocacy/);
    await expect(page.locator('h1')).toContainText('Advocacy');
  });

  test('should display active campaigns', async ({ page }) => {
    await page.goto('/advocacy');
    
    // Wait for campaigns to load
    await page.waitForSelector('[data-testid="campaign-card"]', { timeout: 10000 });
    
    // Verify campaigns are displayed
    const campaigns = page.locator('[data-testid="campaign-card"]');
    await expect(campaigns.first()).toBeVisible();
  });

  test('should display campaign details', async ({ page }) => {
    await page.goto('/advocacy');
    
    // Click on a campaign
    await page.click('[data-testid="campaign-card"]');
    
    // Verify campaign details page
    await expect(page).toHaveURL(/\/advocacy\/campaigns\/\d+/);
    await expect(page.locator('[data-testid="campaign-details"]')).toBeVisible();
  });

  test('should display action cards', async ({ page }) => {
    await page.goto('/advocacy');
    
    // Look for action cards
    const actions = page.locator('[data-testid="action-card"]');
    await expect(actions.first()).toBeVisible();
  });

  test('should allow users to join a campaign', async ({ authenticatedPage: page }) => {
    await page.goto('/advocacy/campaigns/1');
    
    // Click join button
    await page.click('button:has-text("Join Campaign")');
    
    // Verify success message
    await expect(page.locator('text=Successfully joined')).toBeVisible();
  });

  test('should display impact tracking', async ({ page }) => {
    await page.goto('/advocacy');
    
    // Look for impact dashboard
    const impact = page.locator('[data-testid="impact-dashboard"]');
    await expect(impact).toBeVisible();
  });

  test('should display coalition builder', async ({ page }) => {
    await page.goto('/advocacy');
    
    // Navigate to coalition section
    await page.click('text=Coalitions');
    
    // Verify coalition builder is displayed
    const coalitionBuilder = page.locator('[data-testid="coalition-builder"]');
    await expect(coalitionBuilder).toBeVisible();
  });

  test('should share campaign', async ({ page }) => {
    await page.goto('/advocacy/campaigns/1');
    
    // Click share button
    await page.click('button:has-text("Share")');
    
    // Verify share dialog
    const shareDialog = page.locator('[role="dialog"]');
    await expect(shareDialog).toBeVisible();
  });

  test('should track campaign analytics', async ({ page }) => {
    await page.goto('/advocacy/campaigns/1');
    
    // Look for analytics section
    const analytics = page.locator('[data-testid="campaign-analytics"]');
    await expect(analytics).toBeVisible();
  });

  test('should create new campaign', async ({ authenticatedPage: page }) => {
    await page.goto('/advocacy');
    
    // Click create campaign button
    await page.click('button:has-text("Create Campaign")');
    
    // Fill campaign form
    await page.fill('[name="title"]', 'Test Campaign');
    await page.fill('[name="description"]', 'This is a test campaign');
    await page.fill('[name="goal"]', 'Achieve test goal');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator('text=Campaign created')).toBeVisible();
  });
});

test.describe('Advocacy Coordination Performance', () => {
  test('should load dashboard within 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/advocacy');
    await page.waitForSelector('[data-testid="campaign-card"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });
});
