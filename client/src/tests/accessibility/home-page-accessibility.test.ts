/**
 * Home Page Accessibility Tests
 *
 * Tests to ensure WCAG AA compliance for all interactive elements
 * Requirements: 8.1, 8.2
 */

import AxeBuilder from '@axwright';
import { test, expect } from '@playwright/test';

test.describe('Home Page Accessibility', () => {
  test('should pass axe accessibility audit', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="home-hero"]');

    // Run axe accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Assert no accessibility violations
    expect(accessibilityScanResults.violations).toEqual([]);

    // Log any incomplete tests for manual review
    if (accessibilityScanResults.incomplete.length > 0) {
      console.log(
        'Incomplete accessibility tests (manual review needed):',
        accessibilityScanResults.incomplete.map(item => item.id)
      );
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="home-hero"]');

    // Get all headings
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements =>
      elements.map(el => ({
        level: parseInt(el.tagName.charAt(1)),
        text: el.textContent?.trim() || '',
        visible: el.offsetParent !== null,
      }))
    );

    const visibleHeadings = headings.filter(h => h.visible);

    // Should have exactly one h1
    const h1Count = visibleHeadings.filter(h => h.level === 1).length;
    expect(h1Count).toBe(1);

    // Check heading hierarchy (no skipping levels)
    for (let i = 1; i < visibleHeadings.length; i++) {
      const current = visibleHeadings[i];
      const previous = visibleHeadings[i - 1];

      // Should not skip more than one level
      expect(current.level - previous.level).toBeLessThanOrEqual(1);
    }

    console.log(
      'Heading structure:',
      visibleHeadings.map(h => `h${h.level}: ${h.text}`)
    );
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="home-hero"]');

    // Check search form has proper ARIA labels
    const searchForm = page.locator('form[role="search"]');
    await expect(searchForm).toBeVisible();

    const searchInput = page.locator('input[aria-label="Search legislation"]');
    await expect(searchInput).toBeVisible();

    const searchButton = page.locator('button[aria-label*="search" i]');
    await expect(searchButton).toBeVisible();

    // Check that interactive elements have accessible names
    const buttons = await page.$$eval('button', elements =>
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        hasAccessibleName: !!(el.textContent?.trim() || el.getAttribute('aria-label')),
      }))
    );

    // All buttons should have accessible names
    const buttonsWithoutNames = buttons.filter(b => !b.hasAccessibleName);
    expect(buttonsWithoutNames).toEqual([]);

    console.log('Button accessibility:', buttons);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="home-hero"]');

    // Start keyboard navigation from the top
    await page.keyboard.press('Tab');

    // Track focusable elements
    const focusableElements: string[] = [];

    for (let i = 0; i < 20; i++) {
      // Test first 20 tab stops
      const focusedElement = await page.evaluate(() => {
        const focused = document.activeElement;
        if (!focused || focused === document.body) return null;

        return {
          tagName: focused.tagName.toLowerCase(),
          text: focused.textContent?.trim().substring(0, 50) || '',
          ariaLabel: focused.getAttribute('aria-label') || '',
          role: focused.getAttribute('role') || '',
          type: focused.getAttribute('type') || '',
        };
      });

      if (focusedElement) {
        const elementDesc = `${focusedElement.tagName}${focusedElement.type ? `[${focusedElement.type}]` : ''}${focusedElement.role ? `[${focusedElement.role}]` : ''}: ${focusedElement.ariaLabel || focusedElement.text}`;
        focusableElements.push(elementDesc);
      }

      await page.keyboard.press('Tab');

      // Break if we've cycled back to the beginning
      if (
        i > 5 &&
        focusedElement &&
        focusedElement.tagName === 'a' &&
        focusedElement.text.includes('Skip')
      ) {
        break;
      }
    }

    // Should have multiple focusable elements
    expect(focusableElements.length).toBeGreaterThan(3);

    console.log('Keyboard navigation path:', focusableElements);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="home-hero"]');

    // Run axe color contrast audit specifically
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze();

    // Assert no color contrast violations
    expect(accessibilityScanResults.violations).toEqual([]);

    // Check specific elements that might have contrast issues
    const textElements = await page.$$eval('p, span, div, h1, h2, h3, h4, h5, h6', elements =>
      elements
        .filter(el => el.offsetParent !== null && el.textContent?.trim())
        .slice(0, 10) // Check first 10 text elements
        .map(el => {
          const styles = window.getComputedStyle(el);
          return {
            text: el.textContent?.trim().substring(0, 30) || '',
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            fontSize: styles.fontSize,
          };
        })
    );

    console.log('Text element styles (sample):', textElements);
  });

  test('should work with screen readers', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="home-hero"]');

    // Check for screen reader specific attributes
    const srElements = await page.$$eval(
      '[aria-label], [aria-describedby], [aria-labelledby], [role]',
      elements =>
        elements.map(el => ({
          tagName: el.tagName.toLowerCase(),
          ariaLabel: el.getAttribute('aria-label'),
          ariaDescribedby: el.getAttribute('aria-describedby'),
          ariaLabelledby: el.getAttribute('aria-labelledby'),
          role: el.getAttribute('role'),
          text: el.textContent?.trim().substring(0, 30) || '',
        }))
    );

    // Should have elements with screen reader attributes
    expect(srElements.length).toBeGreaterThan(0);

    // Check for skip links
    const skipLinks = await page.$$eval('a[href^="#"]', elements =>
      elements
        .filter(el => el.textContent?.toLowerCase().includes('skip'))
        .map(el => ({
          text: el.textContent?.trim(),
          href: el.getAttribute('href'),
        }))
    );

    console.log('Screen reader elements:', srElements);
    console.log('Skip links:', skipLinks);
  });

  test('should handle focus management properly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="home-hero"]');

    // Test focus trap in search modal (if applicable)
    const searchInput = page.locator('input[aria-label="Search legislation"]');
    await searchInput.click();

    // Check that focus is properly managed
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBe('INPUT');

    // Test escape key handling
    await page.keyboard.press('Escape');

    // Focus should return to a reasonable element
    const focusAfterEscape = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BODY', 'BUTTON', 'A']).toContain(focusAfterEscape);
  });

  test('should support high contrast mode', async ({ page, context }) => {
    // Simulate high contrast mode
    await context.addInitScript(() => {
      // Add high contrast media query simulation
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      });
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="home-hero"]');

    // Run accessibility audit with high contrast considerations
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();

    // Should still pass accessibility tests in high contrast mode
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be responsive and accessible on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForSelector('[data-testid="home-hero"]');

    // Run accessibility audit on mobile
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Check touch target sizes
    const touchTargets = await page.$$eval(
      'button, a, input[type="button"], input[type="submit"]',
      elements =>
        elements.map(el => {
          const rect = el.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            area: rect.width * rect.height,
            text: el.textContent?.trim().substring(0, 20) || '',
            meetsMinimum: rect.width >= 44 && rect.height >= 44,
          };
        })
    );

    // All touch targets should meet minimum size requirements (44x44px)
    const smallTargets = touchTargets.filter(t => !t.meetsMinimum);
    expect(smallTargets).toEqual([]);

    console.log('Touch target sizes:', touchTargets);
  });
});
e - c;
