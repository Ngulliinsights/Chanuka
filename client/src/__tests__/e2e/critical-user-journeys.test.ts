/**
 * Critical User Journeys - End-to-End Tests
 * Tests complete user workflows using Playwright
 */

import { 
  test, 
  expect, 
  BillsDashboardPage, 
  BillDetailPage, 
  SearchPage, 
  CommunityPage,
  E2ETestUtils 
} from './playwright-setup';

test.describe('Critical User Journeys', () => {
  
  // =============================================================================
  // BILL DISCOVERY JOURNEY
  // =============================================================================

  test.describe('Bill Discovery Journey', () => {
    test('should complete full bill discovery workflow', async ({ authenticatedPage, mockApiData }) => {
      const billsPage = new BillsDashboardPage(authenticatedPage);
      
      // Setup mock data
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      
      // Step 1: Navigate to bills dashboard
      await billsPage.navigateTo();
      await billsPage.checkAccessibility();
      await billsPage.checkPerformance();
      
      // Step 2: Verify bills are loaded
      const billCards = await billsPage.getBillCards();
      await expect(billCards).toHaveCount(mockApiData.bills.length);
      
      // Step 3: Apply filters
      await billsPage.applyFilter('category', 'healthcare');
      
      // Step 4: Search for specific bills
      await billsPage.searchBills('healthcare reform');
      
      // Step 5: Sort results
      await billsPage.sortBills('date');
      
      // Step 6: Interact with bill card
      await billsPage.saveBill(0);
      await billsPage.shareBill(0);
      
      // Step 7: Navigate to bill detail
      await billsPage.clickBillCard(0);
      
      // Verify navigation to bill detail page
      await expect(authenticatedPage).toHaveURL(/\/bills\/.*$/);
    });

    test('should handle real-time bill updates', async ({ authenticatedPage, mockApiData }) => {
      const billsPage = new BillsDashboardPage(authenticatedPage);
      
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      await billsPage.navigateTo();
      
      // Simulate WebSocket connection and real-time update
      await authenticatedPage.evaluate(() => {
        // Mock WebSocket message
        const event = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'BILL_UPDATED',
            payload: {
              id: 'bill-1',
              status: 'passed',
              engagement_metrics: { views: 2000, saves: 150 }
            }
          })
        });
        
        // Dispatch to WebSocket handlers
        window.dispatchEvent(new CustomEvent('websocket-message', { detail: event.data }));
      });
      
      // Wait for real-time update to appear
      await E2ETestUtils.waitForRealTimeUpdate(authenticatedPage);
      
      // Verify update is reflected in UI
      await expect(authenticatedPage.locator('[data-testid="bill-status"]')).toContainText('passed');
    });

    test('should work on mobile devices', async ({ authenticatedPage, mockApiData }) => {
      await E2ETestUtils.simulateMobileDevice(authenticatedPage);
      
      const billsPage = new BillsDashboardPage(authenticatedPage);
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      
      await billsPage.navigateTo();
      
      // Verify mobile layout
      await expect(authenticatedPage.locator('[data-testid="mobile-layout"]')).toBeVisible();
      
      // Test mobile-specific interactions
      await authenticatedPage.tap('[data-testid="mobile-filter-button"]');
      await expect(authenticatedPage.locator('[data-testid="filter-bottom-sheet"]')).toBeVisible();
      
      // Test swipe navigation
      await authenticatedPage.touchscreen.tap(200, 300);
      await authenticatedPage.touchscreen.tap(400, 300);
      
      await billsPage.checkAccessibility();
    });

    test('should handle slow network conditions', async ({ authenticatedPage, mockApiData }) => {
      await E2ETestUtils.simulateSlowNetwork(authenticatedPage);
      
      const billsPage = new BillsDashboardPage(authenticatedPage);
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      
      await billsPage.navigateTo();
      
      // Should show loading states
      await expect(authenticatedPage.locator('[data-testid="loading-skeleton"]')).toBeVisible();
      
      // Should eventually load content
      const billCards = await billsPage.getBillCards();
      await expect(billCards.first()).toBeVisible({ timeout: 10000 });
      
      // Performance should still be acceptable
      const loadTime = await E2ETestUtils.measurePageLoadTime(authenticatedPage);
      expect(loadTime).toBeLessThan(5000); // 5 seconds max for slow network
    });
  });

  // =============================================================================
  // BILL ANALYSIS JOURNEY
  // =============================================================================

  test.describe('Bill Analysis Journey', () => {
    test('should complete comprehensive bill analysis workflow', async ({ authenticatedPage, mockApiData }) => {
      const billDetailPage = new BillDetailPage(authenticatedPage);
      const billId = mockApiData.bills[0].id;
      
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      
      // Step 1: Navigate to bill detail
      await billDetailPage.navigateTo(billId);
      await billDetailPage.checkAccessibility();
      await billDetailPage.checkPerformance();
      
      // Step 2: Review overview tab
      await expect(authenticatedPage.locator('[data-testid="bill-title"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="bill-summary"]')).toBeVisible();
      
      // Step 3: Analyze constitutional implications
      await billDetailPage.switchToTab('analysis');
      await expect(authenticatedPage.locator('[data-testid="constitutional-analysis"]')).toBeVisible();
      
      // Step 4: Review sponsor information and conflicts
      await billDetailPage.switchToTab('sponsors');
      await expect(authenticatedPage.locator('[data-testid="sponsor-info"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="conflict-visualization"]')).toBeVisible();
      
      // Step 5: Read full bill text
      await billDetailPage.switchToTab('full-text');
      await expect(authenticatedPage.locator('[data-testid="bill-full-text"]')).toBeVisible();
      
      // Step 6: Engage with community
      await billDetailPage.switchToTab('community');
      await billDetailPage.addComment('This bill has significant implications for healthcare access.');
      
      // Step 7: Save and share bill
      await billDetailPage.saveBill();
      await billDetailPage.shareBill();
      
      // Verify engagement metrics update
      const metrics = await billDetailPage.getEngagementMetrics();
      expect(metrics.comments).toBeTruthy();
      expect(metrics.saves).toBeTruthy();
    });

    test('should handle expert verification and credibility', async ({ authenticatedPage, mockApiData }) => {
      const billDetailPage = new BillDetailPage(authenticatedPage);
      const billId = mockApiData.bills[0].id;
      
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      await billDetailPage.navigateTo(billId);
      
      await billDetailPage.switchToTab('analysis');
      
      // Verify expert badges are displayed
      await expect(authenticatedPage.locator('[data-testid="expert-badge"]')).toBeVisible();
      
      // Check credibility scores
      await expect(authenticatedPage.locator('[data-testid="credibility-score"]')).toBeVisible();
      
      // Test expert analysis voting
      await authenticatedPage.click('[data-testid="expert-analysis-upvote"]');
      await expect(authenticatedPage.locator('[data-testid="vote-recorded"]')).toBeVisible();
      
      // Verify expert profile access
      await authenticatedPage.click('[data-testid="expert-profile-link"]');
      await expect(authenticatedPage.locator('[data-testid="expert-profile-modal"]')).toBeVisible();
    });

    test('should provide educational context and guidance', async ({ authenticatedPage, mockApiData }) => {
      const billDetailPage = new BillDetailPage(authenticatedPage);
      const billId = mockApiData.bills[0].id;
      
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      await billDetailPage.navigateTo(billId);
      
      // Test educational tooltips
      await authenticatedPage.hover('[data-testid="constitutional-term"]');
      await expect(authenticatedPage.locator('[data-testid="educational-tooltip"]')).toBeVisible();
      
      // Test process education
      await authenticatedPage.click('[data-testid="process-education-button"]');
      await expect(authenticatedPage.locator('[data-testid="process-education-modal"]')).toBeVisible();
      
      // Test civic action guidance
      await authenticatedPage.click('[data-testid="civic-action-button"]');
      await expect(authenticatedPage.locator('[data-testid="civic-action-steps"]')).toBeVisible();
      
      // Test plain language summaries
      await authenticatedPage.click('[data-testid="plain-language-toggle"]');
      await expect(authenticatedPage.locator('[data-testid="plain-language-summary"]')).toBeVisible();
    });
  });

  // =============================================================================
  // INTELLIGENT SEARCH JOURNEY
  // =============================================================================

  test.describe('Intelligent Search Journey', () => {
    test('should complete advanced search workflow', async ({ authenticatedPage, mockApiData }) => {
      const searchPage = new SearchPage(authenticatedPage);
      
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      
      // Step 1: Navigate to search page
      await searchPage.navigateTo();
      await searchPage.checkAccessibility();
      
      // Step 2: Test autocomplete functionality
      await authenticatedPage.fill('[data-testid="search-input"]', 'heal');
      await expect(authenticatedPage.locator('[data-testid="autocomplete-suggestions"]')).toBeVisible();
      
      // Step 3: Perform basic search
      await searchPage.performBasicSearch('healthcare reform');
      
      const results = await searchPage.getSearchResults();
      await expect(results).toHaveCount.greaterThan(0);
      
      // Step 4: Use advanced search
      await searchPage.performAdvancedSearch({
        query: 'healthcare',
        category: 'health',
        sponsor: 'Senator Smith',
        dateRange: 'last-month'
      });
      
      // Step 5: Save search for later
      await searchPage.saveSearch('Healthcare Bills');
      
      // Step 6: Test saved search recall
      await searchPage.loadSavedSearch('Healthcare Bills');
      
      // Step 7: Navigate to search result
      await searchPage.clickSearchResult(0);
      
      await expect(authenticatedPage).toHaveURL(/\/bills\/.*$/);
    });

    test('should handle search result highlighting and relevance', async ({ authenticatedPage, mockApiData }) => {
      const searchPage = new SearchPage(authenticatedPage);
      
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      await searchPage.navigateTo();
      
      await searchPage.performBasicSearch('constitutional rights');
      
      // Verify search term highlighting
      await expect(authenticatedPage.locator('[data-testid="search-highlight"]')).toBeVisible();
      
      // Verify relevance scoring
      await expect(authenticatedPage.locator('[data-testid="relevance-score"]')).toBeVisible();
      
      // Test search filters
      await authenticatedPage.click('[data-testid="search-filter-relevance"]');
      await authenticatedPage.click('[data-testid="search-filter-date"]');
      
      // Verify results update
      await expect(authenticatedPage.locator('[data-testid="search-results-updated"]')).toBeVisible();
    });

    test('should provide search analytics and suggestions', async ({ authenticatedPage, mockApiData }) => {
      const searchPage = new SearchPage(authenticatedPage);
      
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      await searchPage.navigateTo();
      
      // Test search suggestions
      await expect(authenticatedPage.locator('[data-testid="popular-searches"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="recent-searches"]')).toBeVisible();
      
      // Test search analytics
      await searchPage.performBasicSearch('healthcare');
      await expect(authenticatedPage.locator('[data-testid="search-analytics"]')).toBeVisible();
      
      // Test related searches
      await expect(authenticatedPage.locator('[data-testid="related-searches"]')).toBeVisible();
    });
  });

  // =============================================================================
  // COMMUNITY ENGAGEMENT JOURNEY
  // =============================================================================

  test.describe('Community Engagement Journey', () => {
    test('should complete community participation workflow', async ({ authenticatedPage, mockApiData }) => {
      const communityPage = new CommunityPage(authenticatedPage);
      
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      
      // Step 1: Navigate to community hub
      await communityPage.navigateTo();
      await communityPage.checkAccessibility();
      
      // Step 2: View activity feed
      await communityPage.viewActivityFeed();
      await expect(authenticatedPage.locator('[data-testid="activity-item"]')).toHaveCount.greaterThan(0);
      
      // Step 3: Participate in discussion
      await communityPage.participateInDiscussion(0, 'Great analysis of the constitutional implications!');
      
      // Step 4: Vote on expert analysis
      await communityPage.voteOnExpertAnalysis(0, 'up');
      
      // Step 5: View trending topics
      await communityPage.viewTrendingTopics();
      await expect(authenticatedPage.locator('[data-testid="trending-topic"]')).toBeVisible();
      
      // Step 6: View expert insights
      await communityPage.viewExpertInsights();
      await expect(authenticatedPage.locator('[data-testid="expert-insight"]')).toBeVisible();
      
      // Verify engagement metrics update
      await expect(authenticatedPage.locator('[data-testid="user-engagement-score"]')).toBeVisible();
    });

    test('should handle real-time community updates', async ({ authenticatedPage, mockApiData }) => {
      const communityPage = new CommunityPage(authenticatedPage);
      
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      await communityPage.navigateTo();
      
      // Simulate real-time comment
      await authenticatedPage.evaluate(() => {
        window.dispatchEvent(new CustomEvent('websocket-message', {
          detail: JSON.stringify({
            type: 'NEW_COMMENT',
            payload: {
              id: 'comment-new',
              content: 'This is a new real-time comment',
              author: { name: 'Real-time User' }
            }
          })
        }));
      });
      
      await E2ETestUtils.waitForRealTimeUpdate(authenticatedPage);
      
      // Verify new comment appears
      await expect(authenticatedPage.locator('[data-testid="new-comment"]')).toBeVisible();
      
      // Simulate expert verification update
      await authenticatedPage.evaluate(() => {
        window.dispatchEvent(new CustomEvent('websocket-message', {
          detail: JSON.stringify({
            type: 'EXPERT_VERIFIED',
            payload: { expertId: 'expert-123', verificationType: 'official' }
          })
        }));
      });
      
      await expect(authenticatedPage.locator('[data-testid="expert-verification-update"]')).toBeVisible();
    });

    test('should handle community moderation features', async ({ authenticatedPage, mockApiData }) => {
      const communityPage = new CommunityPage(authenticatedPage);
      
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      await communityPage.navigateTo();
      
      // Test comment reporting
      await authenticatedPage.click('[data-testid="comment-menu"]');
      await authenticatedPage.click('[data-testid="report-comment"]');
      await expect(authenticatedPage.locator('[data-testid="report-modal"]')).toBeVisible();
      
      await authenticatedPage.selectOption('[data-testid="report-reason"]', 'inappropriate');
      await authenticatedPage.click('[data-testid="submit-report"]');
      
      await expect(authenticatedPage.locator('[data-testid="report-submitted"]')).toBeVisible();
      
      // Test community guidelines access
      await authenticatedPage.click('[data-testid="community-guidelines"]');
      await expect(authenticatedPage.locator('[data-testid="guidelines-modal"]')).toBeVisible();
    });
  });

  // =============================================================================
  // ERROR HANDLING AND RECOVERY
  // =============================================================================

  test.describe('Error Handling and Recovery', () => {
    test('should handle network errors gracefully', async ({ authenticatedPage }) => {
      const billsPage = new BillsDashboardPage(authenticatedPage);
      
      // Mock network error
      await authenticatedPage.route('**/api/bills**', route => route.abort());
      
      await billsPage.navigateTo();
      
      // Should show error state
      await expect(authenticatedPage.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Test retry functionality
      await authenticatedPage.route('**/api/bills**', route => 
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], total: 0 }),
        })
      );
      
      await authenticatedPage.click('[data-testid="retry-button"]');
      await expect(authenticatedPage.locator('[data-testid="bills-dashboard"]')).toBeVisible();
    });

    test('should handle authentication errors', async ({ page }) => {
      // Mock authentication failure
      await page.route('**/api/auth/me', route => 
        route.fulfill({ status: 401, body: JSON.stringify({ error: 'Unauthorized' }) })
      );
      
      await page.goto('/bills');
      
      // Should redirect to login
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // Test login flow
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      
      // Mock successful login
      await page.route('**/api/auth/login', route => 
        route.fulfill({
          status: 200,
          body: JSON.stringify({ token: 'mock-token', user: { id: '1', name: 'Test User' } })
        })
      );
      
      await page.click('[data-testid="login-button"]');
      
      // Should redirect back to bills page
      await expect(page).toHaveURL('/bills');
    });

    test('should handle WebSocket disconnection and reconnection', async ({ authenticatedPage, mockApiData }) => {
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      
      const billsPage = new BillsDashboardPage(authenticatedPage);
      await billsPage.navigateTo();
      
      // Simulate WebSocket disconnection
      await authenticatedPage.evaluate(() => {
        window.dispatchEvent(new CustomEvent('websocket-disconnect'));
      });
      
      // Should show connection status
      await expect(authenticatedPage.locator('[data-testid="connection-status"]')).toContainText('Disconnected');
      
      // Simulate reconnection
      await authenticatedPage.evaluate(() => {
        window.dispatchEvent(new CustomEvent('websocket-reconnect'));
      });
      
      await expect(authenticatedPage.locator('[data-testid="connection-status"]')).toContainText('Connected');
    });
  });

  // =============================================================================
  // PERFORMANCE AND ACCESSIBILITY
  // =============================================================================

  test.describe('Performance and Accessibility', () => {
    test('should meet performance benchmarks across all pages', async ({ authenticatedPage, mockApiData }) => {
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      
      const pages = [
        { path: '/bills', name: 'Bills Dashboard' },
        { path: '/search', name: 'Search Page' },
        { path: '/community', name: 'Community Hub' },
        { path: `/bills/${mockApiData.bills[0].id}`, name: 'Bill Detail' },
      ];
      
      for (const pageInfo of pages) {
        await authenticatedPage.goto(pageInfo.path);
        await authenticatedPage.waitForLoadState('networkidle');
        
        // Check performance
        const loadTime = await E2ETestUtils.measurePageLoadTime(authenticatedPage);
        expect(loadTime).toBeLessThan(3000); // 3 seconds max
        
        // Check for console errors
        const errors = await E2ETestUtils.checkConsoleErrors(authenticatedPage);
        expect(errors).toHaveLength(0);
        
        // Take performance screenshot
        await authenticatedPage.screenshot({ 
          path: `test-results/performance/${pageInfo.name.toLowerCase().replace(' ', '-')}.png` 
        });
      }
    });

    test('should be fully accessible across all components', async ({ authenticatedPage, mockApiData }) => {
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      
      // Load axe-core for accessibility testing
      await authenticatedPage.addScriptTag({ 
        url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js' 
      });
      
      const pages = ['/bills', '/search', '/community'];
      
      for (const path of pages) {
        await authenticatedPage.goto(path);
        await authenticatedPage.waitForLoadState('networkidle');
        
        // Run accessibility audit
        // @ts-ignore
        await expect(authenticatedPage).toBeAccessibleE2E();
        
        // Test keyboard navigation
        await authenticatedPage.keyboard.press('Tab');
        const focusedElement = await authenticatedPage.locator(':focus');
        await expect(focusedElement).toBeVisible();
        
        // Test screen reader compatibility
        const headings = await authenticatedPage.locator('h1, h2, h3, h4, h5, h6').count();
        expect(headings).toBeGreaterThan(0);
        
        const landmarks = await authenticatedPage.locator('[role="main"], [role="navigation"], [role="banner"]').count();
        expect(landmarks).toBeGreaterThan(0);
      }
    });

    test('should work across different browsers and devices', async ({ authenticatedPage, mockApiData }) => {
      await E2ETestUtils.setupMockData(authenticatedPage, mockApiData);
      
      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1920, height: 1080, name: 'Desktop' },
      ];
      
      for (const viewport of viewports) {
        await authenticatedPage.setViewportSize(viewport);
        await authenticatedPage.goto('/bills');
        
        // Verify responsive layout
        const layout = await authenticatedPage.locator('[data-testid="responsive-layout"]');
        await expect(layout).toBeVisible();
        
        // Test touch interactions on mobile
        if (viewport.name === 'Mobile') {
          await authenticatedPage.tap('[data-testid="mobile-menu-button"]');
          await expect(authenticatedPage.locator('[data-testid="mobile-menu"]')).toBeVisible();
        }
        
        // Take responsive screenshot
        await authenticatedPage.screenshot({ 
          path: `test-results/responsive/${viewport.name.toLowerCase()}.png`,
          fullPage: true 
        });
      }
    });
  });
});