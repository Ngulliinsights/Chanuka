/**
 * Bills Dashboard E2E Tests
 * End-to-end testing for critical user journeys in the bills dashboard
 */

import { test, expect, Page } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test.describe('Bills Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to bills dashboard
    await page.goto('/bills');
    
    // Wait for the dashboard to load
    await page.waitForSelector('[data-testid="bills-dashboard"]', { timeout: 10000 });
    
    // Inject axe for accessibility testing
    await injectAxe(page);
  });

  test.describe('Basic Functionality', () => {
    test('should load bills dashboard successfully', async ({ page }) => {
      // Verify main components are present
      await expect(page.getByTestId('bills-dashboard')).toBeVisible();
      await expect(page.getByTestId('stats-overview')).toBeVisible();
      await expect(page.getByTestId('filter-panel')).toBeVisible();
      await expect(page.getByTestId('bills-grid')).toBeVisible();
      
      // Verify bills are loaded
      const billCards = page.getByTestId(/bill-card-/);
      await expect(billCards.first()).toBeVisible();
      
      // Verify at least some bills are displayed
      const billCount = await billCards.count();
      expect(billCount).toBeGreaterThan(0);
    });

    test('should display correct page title and metadata', async ({ page }) => {
      await expect(page).toHaveTitle(/Bills Dashboard/);
      
      // Check meta description
      const metaDescription = page.locator('meta[name="description"]');
      await expect(metaDescription).toHaveAttribute('content', /legislative bills/i);
    });

    test('should show loading states appropriately', async ({ page }) => {
      // Reload page to catch loading state
      await page.reload();
      
      // Should show loading skeleton initially
      const loadingSkeleton = page.getByTestId('bills-loading-skeleton');
      
      // Loading skeleton should disappear when content loads
      await expect(loadingSkeleton).not.toBeVisible({ timeout: 10000 });
      
      // Content should be visible
      await expect(page.getByTestId('bills-grid')).toBeVisible();
    });
  });

  test.describe('Search and Filtering', () => {
    test('should search bills successfully', async ({ page }) => {
      const searchInput = page.getByPlaceholderText(/search bills/i);
      
      // Type search query
      await searchInput.fill('healthcare');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      // Verify URL contains search parameter
      expect(page.url()).toContain('q=healthcare');
      
      // Verify search results are displayed
      const billCards = page.getByTestId(/bill-card-/);
      await expect(billCards.first()).toBeVisible();
    });

    test('should filter bills by category', async ({ page }) => {
      const categoryFilter = page.getByLabel(/category/i);
      
      // Select healthcare category
      await categoryFilter.selectOption('healthcare');
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // Verify URL contains filter parameter
      expect(page.url()).toContain('category=healthcare');
      
      // Verify filtered results
      const billCards = page.getByTestId(/bill-card-/);
      await expect(billCards.first()).toBeVisible();
    });

    test('should filter bills by status', async ({ page }) => {
      const statusFilter = page.getByLabel(/status/i);
      
      // Select active status
      await statusFilter.selectOption('active');
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // Verify URL contains filter parameter
      expect(page.url()).toContain('status=active');
      
      // Verify filtered results
      const billCards = page.getByTestId(/bill-card-/);
      await expect(billCards.first()).toBeVisible();
    });

    test('should clear filters', async ({ page }) => {
      // Apply some filters first
      await page.getByLabel(/category/i).selectOption('healthcare');
      await page.getByLabel(/status/i).selectOption('active');
      
      // Wait for filters to apply
      await page.waitForTimeout(1000);
      
      // Clear filters
      const clearFiltersButton = page.getByRole('button', { name: /clear filters/i });
      await clearFiltersButton.click();
      
      // Wait for filters to clear
      await page.waitForTimeout(1000);
      
      // Verify URL parameters are cleared
      expect(page.url()).not.toContain('category=');
      expect(page.url()).not.toContain('status=');
      
      // Verify all bills are shown again
      const billCards = page.getByTestId(/bill-card-/);
      const billCount = await billCards.count();
      expect(billCount).toBeGreaterThan(0);
    });
  });

  test.describe('Bill Interaction', () => {
    test('should navigate to bill detail page', async ({ page }) => {
      // Click on first bill card
      const firstBillCard = page.getByTestId(/bill-card-/).first();
      const viewDetailsLink = firstBillCard.getByText(/view details/i);
      
      await viewDetailsLink.click();
      
      // Wait for navigation
      await page.waitForURL(/\/bills\/[^\/]+$/);
      
      // Verify bill detail page loads
      await expect(page.getByTestId('bill-detail-view')).toBeVisible();
    });

    test('should save bill from dashboard', async ({ page }) => {
      // Find save button on first bill card
      const firstBillCard = page.getByTestId(/bill-card-/).first();
      const saveButton = firstBillCard.getByRole('button', { name: /save/i });
      
      await saveButton.click();
      
      // Verify save confirmation
      await expect(page.getByText(/bill saved/i)).toBeVisible();
      
      // Verify button state changes
      await expect(saveButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should share bill from dashboard', async ({ page }) => {
      // Find share button on first bill card
      const firstBillCard = page.getByTestId(/bill-card-/).first();
      const shareButton = firstBillCard.getByRole('button', { name: /share/i });
      
      await shareButton.click();
      
      // Verify share modal opens
      await expect(page.getByTestId('share-modal')).toBeVisible();
      
      // Close modal
      const closeButton = page.getByRole('button', { name: /close/i });
      await closeButton.click();
      
      // Verify modal closes
      await expect(page.getByTestId('share-modal')).not.toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('should navigate through pages', async ({ page }) => {
      // Wait for initial load
      await page.waitForSelector('[data-testid="bills-grid"]');
      
      // Find pagination controls
      const nextPageButton = page.getByRole('button', { name: /next page/i });
      
      if (await nextPageButton.isVisible()) {
        // Click next page
        await nextPageButton.click();
        
        // Wait for page change
        await page.waitForTimeout(1000);
        
        // Verify URL contains page parameter
        expect(page.url()).toContain('page=2');
        
        // Verify new bills are loaded
        const billCards = page.getByTestId(/bill-card-/);
        await expect(billCards.first()).toBeVisible();
        
        // Go back to previous page
        const prevPageButton = page.getByRole('button', { name: /previous page/i });
        await prevPageButton.click();
        
        // Wait for page change
        await page.waitForTimeout(1000);
        
        // Verify we're back on page 1
        expect(page.url()).not.toContain('page=2');
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 390, height: 844 });
      
      // Reload to apply responsive styles
      await page.reload();
      await page.waitForSelector('[data-testid="bills-dashboard"]');
      
      // Verify mobile layout
      const billsGrid = page.getByTestId('bills-grid');
      await expect(billsGrid).toHaveClass(/grid-cols-1/);
      
      // Verify mobile filter panel (should be collapsible)
      const filterToggle = page.getByRole('button', { name: /filters/i });
      if (await filterToggle.isVisible()) {
        await filterToggle.click();
        await expect(page.getByTestId('filter-panel')).toBeVisible();
      }
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Reload to apply responsive styles
      await page.reload();
      await page.waitForSelector('[data-testid="bills-dashboard"]');
      
      // Verify tablet layout
      const billsGrid = page.getByTestId('bills-grid');
      await expect(billsGrid).toHaveClass(/md:grid-cols-2/);
    });

    test('should work on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Reload to apply responsive styles
      await page.reload();
      await page.waitForSelector('[data-testid="bills-dashboard"]');
      
      // Verify desktop layout
      const billsGrid = page.getByTestId('bills-grid');
      await expect(billsGrid).toHaveClass(/lg:grid-cols-3/);
    });
  });

  test.describe('Real-time Features', () => {
    test('should show connection status', async ({ page }) => {
      // Verify connection status indicator
      const connectionStatus = page.getByTestId('connection-status');
      await expect(connectionStatus).toBeVisible();
      
      // Should show connected state
      await expect(connectionStatus).toContainText(/connected/i);
    });

    test('should handle real-time updates', async ({ page }) => {
      // Wait for WebSocket connection
      await page.waitForTimeout(2000);
      
      // Simulate real-time update (this would be done via WebSocket in real scenario)
      await page.evaluate(() => {
        // Simulate a bill status update
        window.dispatchEvent(new CustomEvent('bill-update', {
          detail: {
            billId: 'test-bill-1',
            status: 'passed',
            timestamp: new Date().toISOString(),
          }
        }));
      });
      
      // Verify update notification appears
      await expect(page.getByText(/bill updated/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Performance', () => {
    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      // Navigate to page and wait for load
      await page.goto('/bills');
      await page.waitForLoadState('networkidle');
      
      // Measure Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals: any = {};
          
          // Measure LCP
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.lcp = lastEntry.startTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Measure CLS
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            vitals.cls = clsValue;
          }).observe({ entryTypes: ['layout-shift'] });
          
          // Resolve after a short delay to capture metrics
          setTimeout(() => resolve(vitals), 3000);
        });
      });
      
      // Verify Core Web Vitals thresholds
      if (vitals.lcp) {
        expect(vitals.lcp).toBeLessThan(2500); // LCP should be < 2.5s
      }
      if (vitals.cls) {
        expect(vitals.cls).toBeLessThan(0.1); // CLS should be < 0.1
      }
    });

    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/bills');
      await page.waitForSelector('[data-testid="bills-dashboard"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible', async ({ page }) => {
      // Run accessibility checks
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true },
      });
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      // Verify focus is on first interactive element
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Continue tabbing through interactive elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const currentFocus = page.locator(':focus');
        await expect(currentFocus).toBeVisible();
      }
    });

    test('should support screen reader navigation', async ({ page }) => {
      // Verify proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
      
      // Verify first heading is h1
      const firstHeading = headings.first();
      await expect(firstHeading).toHaveAttribute('role', 'heading');
      
      // Verify ARIA landmarks
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('search')).toBeVisible();
    });

    test('should have proper color contrast', async ({ page }) => {
      // This would typically be handled by axe-core, but we can do basic checks
      const textElements = page.locator('p, span, div').filter({ hasText: /.+/ });
      const elementCount = await textElements.count();
      
      // Verify we have text elements to check
      expect(elementCount).toBeGreaterThan(0);
      
      // Run axe-core color contrast checks
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Intercept API calls and return error
      await page.route('/api/bills*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });
      
      await page.goto('/bills');
      
      // Verify error message is displayed
      await expect(page.getByText(/failed to load bills/i)).toBeVisible();
      
      // Verify retry button is available
      await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    });

    test('should handle network failures', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);
      
      await page.goto('/bills');
      
      // Verify offline indicator
      await expect(page.getByText(/offline/i)).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      
      // Verify online indicator
      await expect(page.getByText(/online/i)).toBeVisible({ timeout: 10000 });
    });
  });
});