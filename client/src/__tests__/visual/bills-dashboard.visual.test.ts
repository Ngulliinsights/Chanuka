/**
 * Bills Dashboard Visual Regression Tests
 * Tests for visual consistency across browsers and viewports
 */

import { test, expect } from '@playwright/test';

test.describe('Bills Dashboard Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to bills dashboard
    await page.goto('/bills');
    
    // Wait for the dashboard to load completely
    await page.waitForSelector('[data-testid="bills-dashboard"]', { timeout: 10000 });
    
    // Wait for any animations to complete
    await page.waitForTimeout(1000);
    
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

  test.describe('Desktop Views', () => {
    test('should match dashboard layout on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Wait for responsive layout to apply
      await page.waitForTimeout(500);
      
      // Take full page screenshot
      await expect(page).toHaveScreenshot('bills-dashboard-desktop.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match dashboard with filters applied', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Apply filters
      await page.getByLabel(/category/i).selectOption('healthcare');
      await page.getByLabel(/status/i).selectOption('active');
      
      // Wait for filters to apply
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('bills-dashboard-filtered-desktop.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match dashboard with search results', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Perform search
      const searchInput = page.getByPlaceholderText(/search bills/i);
      await searchInput.fill('healthcare reform');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('bills-dashboard-search-desktop.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match loading state', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Intercept API to delay response
      await page.route('/api/bills*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        route.continue();
      });
      
      // Reload to trigger loading state
      await page.reload();
      
      // Capture loading state
      await expect(page.getByTestId('bills-loading-skeleton')).toBeVisible();
      
      await expect(page).toHaveScreenshot('bills-dashboard-loading-desktop.png', {
        animations: 'disabled',
      });
    });

    test('should match error state', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Intercept API to return error
      await page.route('/api/bills*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });
      
      await page.reload();
      
      // Wait for error state
      await expect(page.getByText(/failed to load bills/i)).toBeVisible();
      
      await expect(page).toHaveScreenshot('bills-dashboard-error-desktop.png', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Tablet Views', () => {
    test('should match dashboard layout on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Wait for responsive layout to apply
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('bills-dashboard-tablet.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match tablet filter panel', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Open filter panel if it's collapsible on tablet
      const filterToggle = page.getByRole('button', { name: /filters/i });
      if (await filterToggle.isVisible()) {
        await filterToggle.click();
        await page.waitForTimeout(500);
      }
      
      await expect(page).toHaveScreenshot('bills-dashboard-tablet-filters.png', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Mobile Views', () => {
    test('should match dashboard layout on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      
      // Wait for responsive layout to apply
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('bills-dashboard-mobile.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match mobile navigation', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      
      // Open mobile navigation if available
      const navToggle = page.getByRole('button', { name: /menu/i });
      if (await navToggle.isVisible()) {
        await navToggle.click();
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot('bills-dashboard-mobile-nav.png', {
          animations: 'disabled',
        });
      }
    });

    test('should match mobile filter bottom sheet', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      
      // Open filter bottom sheet
      const filterButton = page.getByRole('button', { name: /filters/i });
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot('bills-dashboard-mobile-filters.png', {
          animations: 'disabled',
        });
      }
    });
  });

  test.describe('Component-Level Visual Tests', () => {
    test('should match bill card component', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Focus on first bill card
      const firstBillCard = page.getByTestId(/bill-card-/).first();
      await expect(firstBillCard).toBeVisible();
      
      await expect(firstBillCard).toHaveScreenshot('bill-card-component.png', {
        animations: 'disabled',
      });
    });

    test('should match bill card hover state', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      const firstBillCard = page.getByTestId(/bill-card-/).first();
      
      // Hover over bill card
      await firstBillCard.hover();
      await page.waitForTimeout(300);
      
      await expect(firstBillCard).toHaveScreenshot('bill-card-hover.png', {
        animations: 'disabled',
      });
    });

    test('should match stats overview component', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      const statsOverview = page.getByTestId('stats-overview');
      await expect(statsOverview).toBeVisible();
      
      await expect(statsOverview).toHaveScreenshot('stats-overview-component.png', {
        animations: 'disabled',
      });
    });

    test('should match filter panel component', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      const filterPanel = page.getByTestId('filter-panel');
      await expect(filterPanel).toBeVisible();
      
      await expect(filterPanel).toHaveScreenshot('filter-panel-component.png', {
        animations: 'disabled',
      });
    });

    test('should match real-time dashboard component', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      const realTimeDashboard = page.getByTestId('real-time-dashboard');
      await expect(realTimeDashboard).toBeVisible();
      
      await expect(realTimeDashboard).toHaveScreenshot('real-time-dashboard-component.png', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Theme and Color Variations', () => {
    test('should match light theme', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Ensure light theme is active
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('bills-dashboard-light-theme.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match dark theme', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('bills-dashboard-dark-theme.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match high contrast mode', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Enable high contrast mode
      await page.evaluate(() => {
        document.documentElement.classList.add('high-contrast');
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('bills-dashboard-high-contrast.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Interactive State Visual Tests', () => {
    test('should match focus states', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Focus on search input
      const searchInput = page.getByPlaceholderText(/search bills/i);
      await searchInput.focus();
      
      await expect(searchInput).toHaveScreenshot('search-input-focus.png', {
        animations: 'disabled',
      });
    });

    test('should match active filter states', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Apply filters to show active state
      await page.getByLabel(/category/i).selectOption('healthcare');
      await page.waitForTimeout(500);
      
      const filterPanel = page.getByTestId('filter-panel');
      
      await expect(filterPanel).toHaveScreenshot('filter-panel-active.png', {
        animations: 'disabled',
      });
    });

    test('should match pagination states', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Navigate to page 2 if pagination exists
      const nextPageButton = page.getByRole('button', { name: /next page/i });
      if (await nextPageButton.isVisible()) {
        await nextPageButton.click();
        await page.waitForTimeout(1000);
        
        const pagination = page.getByTestId('pagination');
        if (await pagination.isVisible()) {
          await expect(pagination).toHaveScreenshot('pagination-page-2.png', {
            animations: 'disabled',
          });
        }
      }
    });
  });

  test.describe('Cross-Browser Consistency', () => {
    test('should render consistently across browsers', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Take screenshot with browser name in filename
      await expect(page).toHaveScreenshot(`bills-dashboard-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
        threshold: 0.3, // Allow slight differences between browsers
      });
    });
  });

  test.describe('Accessibility Visual Tests', () => {
    test('should match reduced motion preferences', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('bills-dashboard-reduced-motion.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match keyboard navigation indicators', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Navigate with keyboard to show focus indicators
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      await expect(page).toHaveScreenshot('bills-dashboard-keyboard-focus.png', {
        animations: 'disabled',
      });
    });
  });
});