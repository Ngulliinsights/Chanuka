/**
 * End-to-End Tests for Critical User Journeys
 * 
 * Tests complete user workflows using Playwright:
 * - Bill discovery and engagement
 * - Search and filtering
 * - Community participation
 * - Expert analysis review
 * - Real-time collaboration
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { e2eConfig } from '@client/comprehensive-test-config';

// Configure test settings
test.use({
  baseURL: e2eConfig.baseURL,
  actionTimeout: e2eConfig.use.actionTimeout,
  navigationTimeout: e2eConfig.use.navigationTimeout,
});

// Test data setup
const testUser = {
  email: 'test.citizen@example.com',
  password: 'TestPassword123!',
  name: 'Test Citizen',
};

const testExpert = {
  email: 'expert@example.com',
  password: 'ExpertPassword123!',
  name: 'Dr. Test Expert',
};

// =============================================================================
// BILL DISCOVERY AND ENGAGEMENT JOURNEY
// =============================================================================

test.describe('Bill Discovery and Engagement Journey', () => {
  test('should allow user to discover, filter, and engage with bills', async ({ page }) => {
    // 1. Navigate to application
    await page.goto('/');
    
    // 2. Verify landing page loads
    await expect(page.getByRole('heading', { name: /chanuka/i })).toBeVisible();
    
    // 3. Navigate to bills dashboard
    await page.getByRole('link', { name: /bills/i }).click();
    await expect(page.getByRole('heading', { name: /bills dashboard/i })).toBeVisible();
    
    // 4. Verify bills are loaded
    await expect(page.getByRole('article').first()).toBeVisible();
    await expect(page.getByText(/healthcare reform/i).first()).toBeVisible();
    
    // 5. Apply category filter
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByLabel('Healthcare').check();
    await page.getByRole('button', { name: /apply filters/i }).click();
    
    // 6. Verify filtered results
    await expect(page.getByText('Healthcare')).toBeVisible(); // Filter chip
    const billCards = page.getByRole('article');
    await expect(billCards).toHaveCount(await billCards.count());
    
    // 7. Click on a bill to view details
    await page.getByRole('article').first().click();
    
    // 8. Verify bill detail page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('tablist')).toBeVisible();
    
    // 9. Navigate to Community tab
    await page.getByRole('tab', { name: /community/i }).click();
    await expect(page.getByText(/discussion/i)).toBeVisible();
    
    // 10. Add a comment (requires authentication)
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.getByLabel('Email').fill(testUser.email);
    await page.getByLabel('Password').fill(testUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // 11. Post comment
    await page.getByPlaceholder(/share your thoughts/i).fill('This bill will have significant impact on healthcare access.');
    await page.getByRole('button', { name: /post comment/i }).click();
    
    // 12. Verify comment appears
    await expect(page.getByText('This bill will have significant impact on healthcare access.')).toBeVisible();
    
    // 13. Save bill for later
    await page.getByRole('button', { name: /save bill/i }).click();
    await expect(page.getByText(/bill saved/i)).toBeVisible();
  });

  test('should handle real-time updates during bill engagement', async ({ page, context }) => {
    // Open two browser contexts to simulate real-time updates
    const page2 = await context.newPage();
    
    // Both users navigate to the same bill
    await page.goto('/bills/healthcare-reform-2024');
    await page2.goto('/bills/healthcare-reform-2024');
    
    // User 1 posts a comment
    await page.getByPlaceholder(/share your thoughts/i).fill('Real-time test comment from user 1');
    await page.getByRole('button', { name: /post comment/i }).click();
    
    // User 2 should see the comment appear in real-time
    await expect(page2.getByText('Real-time test comment from user 1')).toBeVisible({ timeout: 5000 });
    
    // User 2 votes on the comment
    await page2.getByRole('button', { name: /upvote/i }).first().click();
    
    // User 1 should see the vote count update
    await expect(page.getByText('1')).toBeVisible({ timeout: 3000 }); // Vote count
  });
});

// =============================================================================
// SEARCH AND FILTERING JOURNEY
// =============================================================================

test.describe('Search and Filtering Journey', () => {
  test('should provide comprehensive search functionality', async ({ page }) => {
    // 1. Navigate to search page
    await page.goto('/search');
    
    // 2. Verify search interface
    await expect(page.getByPlaceholder(/search bills/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /advanced search/i })).toBeVisible();
    
    // 3. Perform basic search
    await page.getByPlaceholder(/search bills/i).fill('healthcare');
    await page.keyboard.press('Enter');
    
    // 4. Verify search results
    await expect(page.getByText(/search results/i)).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(await page.getByRole('article').count());
    
    // 5. Test autocomplete
    await page.getByPlaceholder(/search bills/i).clear();
    await page.getByPlaceholder(/search bills/i).type('health');
    
    // 6. Verify autocomplete suggestions
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect(page.getByText(/healthcare/i)).toBeVisible();
    
    // 7. Select autocomplete suggestion
    await page.getByText(/healthcare reform/i).click();
    
    // 8. Verify search is performed
    await expect(page.getByPlaceholder(/search bills/i)).toHaveValue(/healthcare reform/i);
    
    // 9. Open advanced search
    await page.getByRole('button', { name: /advanced search/i }).click();
    
    // 10. Fill advanced search form
    await page.getByLabel('Title').fill('Healthcare');
    await page.getByLabel('Sponsor').fill('Senator Smith');
    await page.getByLabel('Status').selectOption('active');
    
    // 11. Perform advanced search
    await page.getByRole('button', { name: /search/i }).click();
    
    // 12. Verify advanced search results
    await expect(page.getByText(/advanced search results/i)).toBeVisible();
    
    // 13. Save search
    await page.getByRole('button', { name: /save search/i }).click();
    await page.getByPlaceholder('Search name').fill('My Healthcare Search');
    await page.getByRole('button', { name: /save/i }).click();
    
    // 14. Verify search saved
    await expect(page.getByText(/search saved/i)).toBeVisible();
  });

  test('should support complex filtering workflows', async ({ page }) => {
    await page.goto('/bills');
    
    // Apply multiple filters
    await page.getByRole('button', { name: /filter/i }).click();
    
    // Category filter
    await page.getByLabel('Healthcare').check();
    await page.getByLabel('Education').check();
    
    // Status filter
    await page.getByLabel('Active').check();
    
    // Urgency filter
    await page.getByLabel('High Priority').check();
    
    // Apply filters
    await page.getByRole('button', { name: /apply filters/i }).click();
    
    // Verify filter chips
    await expect(page.getByText('Healthcare')).toBeVisible();
    await expect(page.getByText('Education')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('High Priority')).toBeVisible();
    
    // Verify URL contains filter parameters
    expect(page.url()).toContain('category=healthcare');
    expect(page.url()).toContain('category=education');
    expect(page.url()).toContain('status=active');
    expect(page.url()).toContain('urgency=high');
    
    // Remove individual filter
    await page.getByText('Healthcare').locator('..').getByRole('button').click();
    await expect(page.getByText('Healthcare')).not.toBeVisible();
    
    // Clear all filters
    await page.getByRole('button', { name: /clear all/i }).click();
    await expect(page.getByText('Education')).not.toBeVisible();
    await expect(page.getByText('Active')).not.toBeVisible();
    await expect(page.getByText('High Priority')).not.toBeVisible();
  });
});

// =============================================================================
// EXPERT ANALYSIS AND VERIFICATION JOURNEY
// =============================================================================

test.describe('Expert Analysis and Verification Journey', () => {
  test('should display and validate expert analysis', async ({ page }) => {
    // 1. Navigate to bill with expert analysis
    await page.goto('/bills/constitutional-amendment-2024');
    
    // 2. Navigate to Analysis tab
    await page.getByRole('tab', { name: /analysis/i }).click();
    
    // 3. Verify expert analysis is displayed
    await expect(page.getByText(/constitutional analysis/i)).toBeVisible();
    await expect(page.getByText(/expert insights/i)).toBeVisible();
    
    // 4. Verify expert badges
    await expect(page.getByText(/verified expert/i)).toBeVisible();
    await expect(page.getByText(/domain expert/i)).toBeVisible();
    
    // 5. Click on expert profile
    await page.getByRole('button', { name: /expert profile/i }).first().click();
    
    // 6. Verify expert credentials modal
    await expect(page.getByText(/credentials/i)).toBeVisible();
    await expect(page.getByText(/phd/i)).toBeVisible();
    await expect(page.getByText(/specializations/i)).toBeVisible();
    
    // 7. Close modal
    await page.getByRole('button', { name: /close/i }).click();
    
    // 8. Verify constitutional flags
    await expect(page.getByText(/constitutional concern/i)).toBeVisible();
    await expect(page.getByText(/commerce clause/i)).toBeVisible();
    
    // 9. Expand constitutional analysis
    await page.getByRole('button', { name: /view full analysis/i }).click();
    
    // 10. Verify detailed analysis
    await expect(page.getByText(/legal precedent/i)).toBeVisible();
    await expect(page.getByText(/historical context/i)).toBeVisible();
  });

  test('should allow expert to contribute analysis', async ({ page }) => {
    // 1. Sign in as expert
    await page.goto('/signin');
    await page.getByLabel('Email').fill(testExpert.email);
    await page.getByLabel('Password').fill(testExpert.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // 2. Navigate to bill
    await page.goto('/bills/new-legislation-2024');
    
    // 3. Navigate to Analysis tab
    await page.getByRole('tab', { name: /analysis/i }).click();
    
    // 4. Add expert analysis
    await page.getByRole('button', { name: /contribute analysis/i }).click();
    
    // 5. Fill analysis form
    await page.getByLabel('Analysis Title').fill('Constitutional Review of New Legislation');
    await page.getByLabel('Analysis Content').fill('This legislation raises several constitutional questions regarding federal authority...');
    await page.getByLabel('Severity Level').selectOption('moderate');
    
    // 6. Submit analysis
    await page.getByRole('button', { name: /submit analysis/i }).click();
    
    // 7. Verify analysis appears
    await expect(page.getByText('Constitutional Review of New Legislation')).toBeVisible();
    await expect(page.getByText('This legislation raises several constitutional questions')).toBeVisible();
    
    // 8. Verify expert badge on analysis
    await expect(page.getByText(/dr\. test expert/i)).toBeVisible();
    await expect(page.getByText(/verified expert/i)).toBeVisible();
  });
});

// =============================================================================
// COMMUNITY PARTICIPATION JOURNEY
// =============================================================================

test.describe('Community Participation Journey', () => {
  test('should enable comprehensive community engagement', async ({ page }) => {
    // 1. Sign in as citizen
    await page.goto('/signin');
    await page.getByLabel('Email').fill(testUser.email);
    await page.getByLabel('Password').fill(testUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // 2. Navigate to Community Hub
    await page.goto('/community');
    
    // 3. Verify community features
    await expect(page.getByText(/community hub/i)).toBeVisible();
    await expect(page.getByText(/recent activity/i)).toBeVisible();
    await expect(page.getByText(/trending discussions/i)).toBeVisible();
    
    // 4. Join a discussion
    await page.getByRole('link', { name: /healthcare reform discussion/i }).click();
    
    // 5. Participate in discussion
    await page.getByPlaceholder(/join the discussion/i).fill('I believe this reform will significantly improve access to healthcare for underserved communities.');
    await page.getByRole('button', { name: /post/i }).click();
    
    // 6. Verify comment appears
    await expect(page.getByText('I believe this reform will significantly improve access')).toBeVisible();
    
    // 7. Reply to another comment
    await page.getByRole('button', { name: /reply/i }).first().click();
    await page.getByPlaceholder(/write a reply/i).fill('That\'s an excellent point about rural healthcare access.');
    await page.getByRole('button', { name: /post reply/i }).click();
    
    // 8. Verify reply appears
    await expect(page.getByText('That\'s an excellent point about rural healthcare access.')).toBeVisible();
    
    // 9. Vote on comments
    await page.getByRole('button', { name: /upvote/i }).first().click();
    await expect(page.getByText('1')).toBeVisible(); // Vote count
    
    // 10. Report inappropriate content
    await page.getByRole('button', { name: /more options/i }).first().click();
    await page.getByRole('button', { name: /report/i }).click();
    await page.getByLabel('Reason').selectOption('spam');
    await page.getByRole('button', { name: /submit report/i }).click();
    
    // 11. Verify report submitted
    await expect(page.getByText(/report submitted/i)).toBeVisible();
  });

  test('should support threaded discussions with proper nesting', async ({ page }) => {
    await page.goto('/bills/education-funding-2024');
    await page.getByRole('tab', { name: /community/i }).click();
    
    // Create nested discussion thread
    const comments = [
      'This funding model needs significant revision.',
      'I agree, but what specific changes do you propose?',
      'We should focus on rural school districts first.',
      'Rural districts definitely need priority, but urban schools face different challenges.',
      'Perhaps a tiered approach would work better?'
    ];
    
    // Post initial comment
    await page.getByPlaceholder(/share your thoughts/i).fill(comments[0]);
    await page.getByRole('button', { name: /post comment/i }).click();
    
    // Create nested replies (up to 5 levels)
    for (let i = 1; i < comments.length; i++) {
      await page.getByRole('button', { name: /reply/i }).last().click();
      await page.getByPlaceholder(/write a reply/i).last().fill(comments[i]);
      await page.getByRole('button', { name: /post reply/i }).last().click();
      
      // Verify comment appears with proper nesting
      await expect(page.getByText(comments[i])).toBeVisible();
    }
    
    // Verify thread structure
    const threadContainer = page.getByTestId('discussion-thread');
    await expect(threadContainer.getByText(comments[0])).toBeVisible();
    await expect(threadContainer.getByText(comments[4])).toBeVisible();
  });
});

// =============================================================================
// ACCESSIBILITY AND KEYBOARD NAVIGATION JOURNEY
// =============================================================================

test.describe('Accessibility and Keyboard Navigation Journey', () => {
  test('should support full keyboard navigation', async ({ page }) => {
    await page.goto('/bills');
    
    // Navigate using keyboard only
    await page.keyboard.press('Tab'); // Focus first interactive element
    await page.keyboard.press('Tab'); // Navigate to search
    await page.keyboard.press('Tab'); // Navigate to filter button
    
    // Open filter with keyboard
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Navigate within filter dialog
    await page.keyboard.press('Tab'); // First checkbox
    await page.keyboard.press('Space'); // Check checkbox
    await page.keyboard.press('Tab'); // Next checkbox
    await page.keyboard.press('Tab'); // Apply button
    await page.keyboard.press('Enter'); // Apply filters
    
    // Navigate to bill cards
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Open bill detail
    
    // Verify navigation worked
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Navigate tabs with keyboard
    await page.keyboard.press('Tab'); // Focus tab list
    await page.keyboard.press('ArrowRight'); // Next tab
    await page.keyboard.press('ArrowRight'); // Next tab
    await page.keyboard.press('Enter'); // Activate tab
    
    // Verify tab navigation
    await expect(page.getByRole('tabpanel')).toBeVisible();
  });

  test('should provide proper screen reader support', async ({ page }) => {
    await page.goto('/bills');
    
    // Verify ARIA labels and roles
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('search')).toBeVisible();
    
    // Verify bill cards have proper labels
    const billCard = page.getByRole('article').first();
    await expect(billCard).toHaveAttribute('aria-label');
    
    // Verify interactive elements have labels
    await expect(page.getByRole('button', { name: /filter/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /search/i })).toBeVisible();
    
    // Verify status announcements
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByLabel('Healthcare').check();
    await page.getByRole('button', { name: /apply filters/i }).click();
    
    // Verify live region updates
    await expect(page.getByRole('status')).toBeVisible();
  });
});

// =============================================================================
// PERFORMANCE AND RELIABILITY JOURNEY
// =============================================================================

test.describe('Performance and Reliability Journey', () => {
  test('should handle network failures gracefully', async ({ page, context }) => {
    // Start with normal network
    await page.goto('/bills');
    await expect(page.getByText(/bills dashboard/i)).toBeVisible();
    
    // Simulate network failure
    await context.setOffline(true);
    
    // Try to navigate to another page
    await page.getByRole('link', { name: /search/i }).click();
    
    // Verify offline handling
    await expect(page.getByText(/offline/i)).toBeVisible();
    await expect(page.getByText(/cached content/i)).toBeVisible();
    
    // Restore network
    await context.setOffline(false);
    
    // Verify reconnection
    await page.getByRole('button', { name: /retry/i }).click();
    await expect(page.getByPlaceholder(/search bills/i)).toBeVisible();
  });

  test('should maintain performance with large datasets', async ({ page }) => {
    // Navigate to page with large dataset
    await page.goto('/bills?limit=1000');
    
    // Measure load time
    const startTime = Date.now();
    await expect(page.getByText(/bills dashboard/i)).toBeVisible();
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(3000); // 3 seconds
    
    // Verify virtual scrolling works
    const initialCards = await page.getByRole('article').count();
    expect(initialCards).toBeLessThan(100); // Should not render all items
    
    // Scroll to load more
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Verify more items loaded
    const finalCards = await page.getByRole('article').count();
    expect(finalCards).toBeGreaterThan(initialCards);
  });
});

// =============================================================================
// CROSS-BROWSER COMPATIBILITY JOURNEY
// =============================================================================

test.describe('Cross-Browser Compatibility Journey', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work correctly in ${browserName}`, async ({ page }) => {
      await page.goto('/');
      
      // Basic functionality test
      await expect(page.getByRole('heading', { name: /chanuka/i })).toBeVisible();
      
      // Navigation test
      await page.getByRole('link', { name: /bills/i }).click();
      await expect(page.getByText(/bills dashboard/i)).toBeVisible();
      
      // Interactive features test
      await page.getByRole('button', { name: /filter/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Form interaction test
      await page.getByLabel('Healthcare').check();
      await expect(page.getByLabel('Healthcare')).toBeChecked();
      
      // Search functionality test
      await page.getByRole('button', { name: /close/i }).click();
      await page.getByPlaceholder(/search/i).fill('healthcare');
      await page.keyboard.press('Enter');
      
      // Verify search works
      await expect(page.getByText(/search results/i)).toBeVisible();
    });
  });
});

// =============================================================================
// MOBILE RESPONSIVENESS JOURNEY
// =============================================================================

test.describe('Mobile Responsiveness Journey', () => {
  test('should provide optimal mobile experience', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/bills');
    
    // Verify mobile layout
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
    
    // Test mobile navigation
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
    
    // Test mobile filtering
    await page.getByRole('button', { name: /filter/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Verify mobile-optimized filter interface
    await expect(page.getByText(/filter options/i)).toBeVisible();
    
    // Test touch interactions
    await page.getByLabel('Healthcare').tap();
    await expect(page.getByLabel('Healthcare')).toBeChecked();
    
    // Test mobile search
    await page.getByRole('button', { name: /close/i }).click();
    await page.getByPlaceholder(/search/i).tap();
    await page.getByPlaceholder(/search/i).fill('education');
    
    // Verify mobile search results
    await page.keyboard.press('Enter');
    await expect(page.getByText(/search results/i)).toBeVisible();
  });

  test('should handle tablet viewport correctly', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/bills');
    
    // Verify tablet layout (hybrid of mobile and desktop)
    await expect(page.getByRole('navigation')).toBeVisible();
    
    // Test tablet-specific interactions
    const billCards = page.getByRole('article');
    await expect(billCards).toHaveCount(await billCards.count());
    
    // Verify responsive grid
    const firstCard = billCards.first();
    const cardWidth = await firstCard.evaluate(el => el.getBoundingClientRect().width);
    
    // Should be wider than mobile but not full desktop width
    expect(cardWidth).toBeGreaterThan(300);
    expect(cardWidth).toBeLessThan(600);
  });
});