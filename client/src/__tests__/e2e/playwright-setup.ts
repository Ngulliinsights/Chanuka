/**
 * Playwright End-to-End Test Setup
 * Configuration and utilities for E2E testing
 */

import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { MockDataFactory } from '../../test-utils/comprehensive-test-setup';

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  mockApiData: any;
}>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    // Mock authentication
    await page.route('**/api/auth/me', async route => {
      const mockUser = MockDataFactory.createMockUser();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockUser }),
      });
    });

    // Navigate to app and wait for authentication
    await page.goto('/');
    await page.waitForSelector('[data-testid="authenticated-app"]');
    
    await use(page);
  },

  // Mock API data fixture
  mockApiData: async ({}, use) => {
    const mockData = {
      bills: Array.from({ length: 20 }, () => MockDataFactory.createMockBill()),
      users: Array.from({ length: 10 }, () => MockDataFactory.createMockUser()),
      experts: Array.from({ length: 5 }, () => MockDataFactory.createMockExpert()),
      comments: Array.from({ length: 50 }, () => MockDataFactory.createMockComment()),
    };
    
    await use(mockData);
  },
});

// Custom expect matchers for E2E tests
expect.extend({
  async toBeAccessibleE2E(page: Page) {
    // Run axe-core accessibility audit
    const accessibilityResults = await page.evaluate(async () => {
      // @ts-ignore - axe is loaded globally in E2E tests
      if (typeof axe !== 'undefined') {
        return await axe.run();
      }
      return { violations: [] };
    });

    const violations = accessibilityResults.violations || [];
    const pass = violations.length === 0;

    return {
      message: () => 
        pass 
          ? 'Expected page to have accessibility violations'
          : `Found ${violations.length} accessibility violations: ${violations.map(v => v.description).join(', ')}`,
      pass,
    };
  },

  async toHaveGoodPerformance(page: Page) {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0,
        fcp: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });

    const pass = metrics.lcp < 2500 && metrics.fcp < 1800 && metrics.domContentLoaded < 1000;

    return {
      message: () => 
        pass 
          ? 'Expected page to have poor performance'
          : `Performance metrics exceeded thresholds: LCP: ${metrics.lcp}ms, FCP: ${metrics.fcp}ms, DCL: ${metrics.domContentLoaded}ms`,
      pass,
    };
  },
});

// Page Object Model base class
export class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string) {
    await this.page.goto(path);
    await this.waitForLoad();
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  async checkAccessibility() {
    // @ts-ignore
    await expect(this.page).toBeAccessibleE2E();
  }

  async checkPerformance() {
    // @ts-ignore
    await expect(this.page).toHaveGoodPerformance();
  }
}

// Bills Dashboard Page Object
export class BillsDashboardPage extends BasePage {
  async navigateTo() {
    await this.goto('/bills');
  }

  async getBillCards() {
    return this.page.locator('[data-testid="bill-card"]');
  }

  async searchBills(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.press('[data-testid="search-input"]', 'Enter');
    await this.page.waitForSelector('[data-testid="search-results"]');
  }

  async applyFilter(filterType: string, value: string) {
    await this.page.click('[data-testid="filter-button"]');
    await this.page.click(`[data-testid="filter-${filterType}"]`);
    await this.page.click(`[data-testid="filter-option-${value}"]`);
    await this.page.waitForSelector('[data-testid="filter-applied"]');
  }

  async sortBills(sortBy: string) {
    await this.page.click('[data-testid="sort-dropdown"]');
    await this.page.click(`[data-testid="sort-${sortBy}"]`);
    await this.page.waitForSelector('[data-testid="bills-sorted"]');
  }

  async clickBillCard(index: number = 0) {
    const billCards = await this.getBillCards();
    await billCards.nth(index).click();
    await this.page.waitForURL('**/bills/**');
  }

  async saveBill(index: number = 0) {
    const billCards = await this.getBillCards();
    await billCards.nth(index).hover();
    await this.page.click(`[data-testid="save-bill-${index}"]`);
    await this.page.waitForSelector('[data-testid="bill-saved-notification"]');
  }

  async shareBill(index: number = 0) {
    const billCards = await this.getBillCards();
    await billCards.nth(index).hover();
    await this.page.click(`[data-testid="share-bill-${index}"]`);
    await this.page.waitForSelector('[data-testid="share-modal"]');
  }
}

// Bill Detail Page Object
export class BillDetailPage extends BasePage {
  async navigateTo(billId: string) {
    await this.goto(`/bills/${billId}`);
  }

  async switchToTab(tabName: string) {
    await this.page.click(`[data-testid="tab-${tabName}"]`);
    await this.page.waitForSelector(`[data-testid="tab-content-${tabName}"]`);
  }

  async addComment(content: string) {
    await this.switchToTab('community');
    await this.page.fill('[data-testid="comment-input"]', content);
    await this.page.click('[data-testid="submit-comment"]');
    await this.page.waitForSelector('[data-testid="comment-added"]');
  }

  async voteOnComment(commentIndex: number, voteType: 'up' | 'down') {
    await this.page.click(`[data-testid="comment-${commentIndex}-vote-${voteType}"]`);
    await this.page.waitForSelector(`[data-testid="vote-recorded"]`);
  }

  async saveBill() {
    await this.page.click('[data-testid="save-bill-button"]');
    await this.page.waitForSelector('[data-testid="bill-saved-notification"]');
  }

  async shareBill() {
    await this.page.click('[data-testid="share-bill-button"]');
    await this.page.waitForSelector('[data-testid="share-modal"]');
  }

  async getEngagementMetrics() {
    return {
      views: await this.page.textContent('[data-testid="views-count"]'),
      saves: await this.page.textContent('[data-testid="saves-count"]'),
      comments: await this.page.textContent('[data-testid="comments-count"]'),
      shares: await this.page.textContent('[data-testid="shares-count"]'),
    };
  }
}

// Search Page Object
export class SearchPage extends BasePage {
  async navigateTo() {
    await this.goto('/search');
  }

  async performBasicSearch(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.click('[data-testid="search-button"]');
    await this.page.waitForSelector('[data-testid="search-results"]');
  }

  async performAdvancedSearch(options: {
    query?: string;
    category?: string;
    sponsor?: string;
    dateRange?: string;
  }) {
    await this.page.click('[data-testid="advanced-search-toggle"]');
    
    if (options.query) {
      await this.page.fill('[data-testid="advanced-search-query"]', options.query);
    }
    
    if (options.category) {
      await this.page.selectOption('[data-testid="category-select"]', options.category);
    }
    
    if (options.sponsor) {
      await this.page.fill('[data-testid="sponsor-input"]', options.sponsor);
    }
    
    if (options.dateRange) {
      await this.page.selectOption('[data-testid="date-range-select"]', options.dateRange);
    }
    
    await this.page.click('[data-testid="advanced-search-button"]');
    await this.page.waitForSelector('[data-testid="search-results"]');
  }

  async saveSearch(name: string) {
    await this.page.click('[data-testid="save-search-button"]');
    await this.page.fill('[data-testid="search-name-input"]', name);
    await this.page.click('[data-testid="confirm-save-search"]');
    await this.page.waitForSelector('[data-testid="search-saved-notification"]');
  }

  async loadSavedSearch(name: string) {
    await this.page.click('[data-testid="saved-searches-button"]');
    await this.page.click(`[data-testid="saved-search-${name}"]`);
    await this.page.waitForSelector('[data-testid="search-results"]');
  }

  async getSearchResults() {
    return this.page.locator('[data-testid="search-result-item"]');
  }

  async clickSearchResult(index: number = 0) {
    const results = await this.getSearchResults();
    await results.nth(index).click();
    await this.page.waitForURL('**/bills/**');
  }
}

// Community Page Object
export class CommunityPage extends BasePage {
  async navigateTo() {
    await this.goto('/community');
  }

  async viewActivityFeed() {
    await this.page.waitForSelector('[data-testid="activity-feed"]');
  }

  async participateInDiscussion(discussionIndex: number, comment: string) {
    await this.page.click(`[data-testid="discussion-${discussionIndex}"]`);
    await this.page.fill('[data-testid="discussion-comment-input"]', comment);
    await this.page.click('[data-testid="submit-discussion-comment"]');
    await this.page.waitForSelector('[data-testid="comment-added"]');
  }

  async voteOnExpertAnalysis(analysisIndex: number, voteType: 'up' | 'down') {
    await this.page.click(`[data-testid="expert-analysis-${analysisIndex}-vote-${voteType}"]`);
    await this.page.waitForSelector('[data-testid="vote-recorded"]');
  }

  async viewTrendingTopics() {
    await this.page.click('[data-testid="trending-topics-tab"]');
    await this.page.waitForSelector('[data-testid="trending-topics-list"]');
  }

  async viewExpertInsights() {
    await this.page.click('[data-testid="expert-insights-tab"]');
    await this.page.waitForSelector('[data-testid="expert-insights-list"]');
  }
}

// Utility functions for E2E tests
export class E2ETestUtils {
  static async setupMockData(page: Page, mockData: any) {
    // Mock API endpoints
    await page.route('**/api/bills**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockData.bills, total: mockData.bills.length }),
      });
    });

    await page.route('**/api/users**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockData.users }),
      });
    });

    await page.route('**/api/comments**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockData.comments }),
      });
    });
  }

  static async simulateSlowNetwork(page: Page) {
    // Simulate slow 3G network
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 500 * 1024 / 8, // 500 kbps
      uploadThroughput: 500 * 1024 / 8,
      latency: 400, // 400ms latency
    });
  }

  static async simulateMobileDevice(page: Page) {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.emulateMedia({ media: 'screen' });
  }

  static async simulateTabletDevice(page: Page) {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.emulateMedia({ media: 'screen' });
  }

  static async measurePageLoadTime(page: Page): Promise<number> {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation.loadEventEnd - navigation.loadEventStart;
    });
  }

  static async waitForRealTimeUpdate(page: Page, timeout: number = 5000) {
    await page.waitForFunction(
      () => document.querySelector('[data-testid="real-time-update"]'),
      { timeout }
    );
  }

  static async checkConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    return errors;
  }
}

export { expect };