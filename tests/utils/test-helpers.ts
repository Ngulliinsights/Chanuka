import { Page, APIRequestContext } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export class TestHelpers {
  /**
   * Generate a unique test user
   */
  static generateTestUser(prefix = 'test'): TestUser {
    const timestamp = Date.now();
    return {
      email: `${prefix}-${timestamp}@example.com`,
      password: 'SecurePassword123!',
      name: `Test User ${timestamp}`
    };
  }

  /**
   * Register a user via API
   */
  static async registerUser(request: APIRequestContext, user: TestUser) {
    const response = await request.post('/auth/register', {
      data: user
    });
    
    if (!response.ok()) {
      throw new Error(`Registration failed: ${await response.text()}`);
    }
    
    return response.json();
  }

  /**
   * Login a user via API and return token
   */
  static async loginUser(request: APIRequestContext, email: string, password: string) {
    const response = await request.post('/auth/login', {
      data: { email, password }
    });
    
    if (!response.ok()) {
      throw new Error(`Login failed: ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.token;
  }

  /**
   * Login via UI
   */
  static async loginViaUI(page: Page, email: string, password: string) {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for navigation or success indicator
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  }

  /**
   * Wait for API response
   */
  static async waitForAPIResponse(page: Page, urlPattern: string | RegExp) {
    return page.waitForResponse(response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    });
  }

  /**
   * Get memory usage in browser
   */
  static async getMemoryUsage(page: Page) {
    return page.evaluate(() => {
      const memory = (performance as any).memory;
      if (!memory) return null;
      
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    });
  }

  /**
   * Clear browser cache and storage
   */
  static async clearBrowserData(page: Page) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Clear cookies
    const context = page.context();
    await context.clearCookies();
  }

  /**
   * Mock API response
   */
  static async mockAPIResponse(page: Page, url: string | RegExp, response: any) {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Wait for element to be stable (not moving)
   */
  static async waitForStable(page: Page, selector: string, timeout = 5000) {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    
    // Wait for element to stop moving
    let previousBox = await element.boundingBox();
    let stableCount = 0;
    
    while (stableCount < 3) {
      await page.waitForTimeout(100);
      const currentBox = await element.boundingBox();
      
      if (previousBox && currentBox &&
          previousBox.x === currentBox.x &&
          previousBox.y === currentBox.y) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      
      previousBox = currentBox;
    }
  }

  /**
   * Take screenshot with timestamp
   */
  static async takeTimestampedScreenshot(page: Page, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Measure page load performance
   */
  static async measurePagePerformance(page: Page) {
    return page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        timeToInteractive: navigation.domInteractive - navigation.navigationStart
      };
    });
  }
}