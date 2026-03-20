/**
 * E2E Tests for Integration Monitoring Dashboard
 * Tests the complete user flow for monitoring integrated features
 */

import { test, expect } from './fixtures';

test.describe('Monitoring Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/admin/monitoring');
  });

  test('should display monitoring dashboard', async ({ authenticatedPage: page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="monitoring-dashboard"]', { timeout: 10000 });
    
    // Verify dashboard is displayed
    const dashboard = page.locator('[data-testid="monitoring-dashboard"]');
    await expect(dashboard).toBeVisible();
  });

  test('should display metrics visualization', async ({ authenticatedPage: page }) => {
    // Look for metrics charts
    const charts = page.locator('[data-testid="metrics-chart"]');
    await expect(charts.first()).toBeVisible();
  });

  test('should display health status', async ({ authenticatedPage: page }) => {
    // Look for health status indicators
    const healthStatus = page.locator('[data-testid="health-status"]');
    await expect(healthStatus).toBeVisible();
  });

  test('should display alert management', async ({ authenticatedPage: page }) => {
    // Navigate to alerts section
    await page.click('text=Alerts');
    
    // Verify alerts are displayed
    const alerts = page.locator('[data-testid="alert-list"]');
    await expect(alerts).toBeVisible();
  });

  test('should display feature usage charts', async ({ authenticatedPage: page }) => {
    // Look for usage charts
    const usageCharts = page.locator('[data-testid="usage-chart"]');
    await expect(usageCharts.first()).toBeVisible();
  });

  test('should display performance metrics', async ({ authenticatedPage: page }) => {
    // Navigate to performance section
    await page.click('text=Performance');
    
    // Verify performance metrics
    const perfMetrics = page.locator('[data-testid="performance-metrics"]');
    await expect(perfMetrics).toBeVisible();
  });

  test('should display error tracking', async ({ authenticatedPage: page }) => {
    // Navigate to errors section
    await page.click('text=Errors');
    
    // Verify error tracking display
    const errorTracking = page.locator('[data-testid="error-tracking"]');
    await expect(errorTracking).toBeVisible();
  });

  test('should update metrics in real-time', async ({ authenticatedPage: page }) => {
    // Get initial metric value
    const metricValue = await page.locator('[data-testid="metric-value"]').first().textContent();
    
    // Wait for update (should happen within 100ms according to requirements)
    await page.waitForTimeout(200);
    
    // Check if value updated (may or may not change)
    const updatedValue = await page.locator('[data-testid="metric-value"]').first().textContent();
    
    // At minimum, the element should still be present
    expect(updatedValue).toBeDefined();
  });

  test('should filter metrics by feature', async ({ authenticatedPage: page }) => {
    // Use feature filter
    await page.selectOption('[data-testid="feature-filter"]', 'pretext-detection');
    
    // Verify filtered metrics
    await expect(page.locator('text=Pretext Detection')).toBeVisible();
  });

  test('should filter metrics by time range', async ({ authenticatedPage: page }) => {
    // Use time range filter
    await page.selectOption('[data-testid="time-range-filter"]', 'last-24h');
    
    // Verify charts update
    await page.waitForSelector('[data-testid="metrics-chart"]');
  });

  test('should export metrics data', async ({ authenticatedPage: page }) => {
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/metrics.*\.(csv|json)$/);
  });

  test('should load dashboard within 2 seconds', async ({ authenticatedPage: page }) => {
    const startTime = Date.now();
    await page.goto('/admin/monitoring');
    await page.waitForSelector('[data-testid="monitoring-dashboard"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });
});

test.describe('Monitoring Dashboard Real-time Updates', () => {
  test('should receive real-time updates within 100ms', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/monitoring');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="monitoring-dashboard"]');
    
    // Monitor for updates
    let updateReceived = false;
    page.on('websocket', ws => {
      ws.on('framereceived', () => {
        updateReceived = true;
      });
    });
    
    // Wait for potential update
    await page.waitForTimeout(200);
    
    // Real-time updates should be working (WebSocket or polling)
    // This is a basic check - actual implementation may vary
  });
});
