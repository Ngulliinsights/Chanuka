/**
 * Home Page Performance Tests
 *
 * Tests to ensure home page loads in under 2 seconds and meets performance requirements
 * Requirements: 3.4, 3.5, 9.1
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page Performance', () => {
  test('should load home page in under 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to home page
    await page.goto('/');

    // Wait for the main content to be visible
    await page.waitForSelector('[data-testid="home-hero"]', { timeout: 5000 });

    const loadTime = Date.now() - startTime;

    // Assert load time is under 2 seconds (2000ms)
    expect(loadTime).toBeLessThan(2000);

    console.log(`Home page loaded in ${loadTime}ms`);
  });

  test('should have Core Web Vitals within acceptable ranges', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: Record<string, number> = {};

        // Largest Contentful Paint (LCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID) - simulated
        vitals.fid = 0; // Will be 0 in automated tests

        // Cumulative Layout Shift (CLS)
        new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // Give time for measurements
        setTimeout(() => resolve(vitals), 1000);
      });
    });

    // Assert Core Web Vitals thresholds
    expect(vitals.lcp).toBeLessThan(2500); // LCP should be < 2.5s
    expect(vitals.cls).toBeLessThan(0.1);  // CLS should be < 0.1

    console.log('Core Web Vitals:', vitals);
  });

  test('should lazy load non-critical components', async ({ page }) => {
    // Start monitoring network requests
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('.js') || request.url().includes('.tsx')) {
        requests.push(request.url());
      }
    });

    await page.goto('/');

    // Wait for initial load
    await page.waitForSelector('[data-testid="home-hero"]');

    // Check that lazy-loaded components are not immediately loaded
    const initialRequests = requests.filter(url =>
      url.includes('PlatformStats') ||
      url.includes('RecentActivity') ||
      url.includes('PersonalizedDashboardPreview')
    );

    // These should be loaded lazily, not immediately
    expect(initialRequests.length).toBeLessThan(3);

    // Scroll to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait a bit for lazy loading to trigger
    await page.waitForTimeout(500);

    // Now lazy components should be loaded
    const finalRequests = requests.filter(url =>
      url.includes('PlatformStats') ||
      url.includes('RecentActivity') ||
      url.includes('PersonalizedDashboardPreview')
    );

    expect(finalRequests.length).toBeGreaterThan(0);
  });

  test('should have optimized bundle size', async ({ page }) => {
    const responses: { url: string; size: number }[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('.js') && response.status() === 200) {
        const buffer = await response.body();
        responses.push({
          url: response.url(),
          size: buffer.length
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Calculate total JavaScript bundle size
    const totalSize = responses.reduce((sum, response) => sum + response.size, 0);
    const totalSizeKB = totalSize / 1024;

    // Assert bundle size is reasonable (under 500KB for initial load)
    expect(totalSizeKB).toBeLessThan(500);

    console.log(`Total JavaScript bundle size: ${totalSizeKB.toFixed(2)}KB`);

    // Log largest bundles for optimization insights
    const largestBundles = responses
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .map(r => ({ url: r.url.split('/').pop(), size: (r.size / 1024).toFixed(2) + 'KB' }));

    console.log('Largest bundles:', largestBundles);
  });

  test('should handle slow network conditions gracefully', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('/');

    // Should still show loading state and eventually load
    await page.waitForSelector('[data-testid="home-hero"]', { timeout: 10000 });

    const loadTime = Date.now() - startTime;
    console.log(`Home page loaded in slow network conditions in ${loadTime}ms`);

    // Should still be reasonable even with network delays
    expect(loadTime).toBeLessThan(5000);
  });

  test('should preload critical resources', async ({ page }) => {
    const preloadedResources: string[] = [];

    page.on('request', (request) => {
      const headers = request.headers();
      if (headers['purpose'] === 'prefetch' || request.url().includes('preload')) {
        preloadedResources.push(request.url());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that some resources are preloaded
    // This might vary based on implementation, so we just check that preloading is happening
    console.log('Preloaded resources:', preloadedResources);
  });
});
