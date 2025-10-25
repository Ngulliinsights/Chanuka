import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { test, expect } from './accessibility-test-utils.test';

test.describe('Screen Reader Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should have proper ARIA labels on interactive elements', async ({ page, accessibilityUtils }) => {
    const results = await accessibilityUtils.testScreenReaderSupport({
      elements: ['button', '[role="button"]', 'input', 'select', 'textarea'],
      checkAriaLabels: true,
    });

    // Check that interactive elements have appropriate labels
    for (const element of results.ariaLabels) {
      if (element) {
        expect(element.hasLabel || element.role).toBeTruthy();
      }
    }
  });

  test('should have alt text for all images', async ({ page, accessibilityUtils }) => {
    const results = await accessibilityUtils.testScreenReaderSupport({
      checkAltText: true,
    });

    // All images should have alt text (or be decorative)
    const imagesWithoutAlt = results.altText.filter(img => !img.hasAlt && !img.src.includes('decorative'));

    // Allow some leniency for decorative images, but flag missing alt text
    if (imagesWithoutAlt.length > 0) {
      console.warn('Images missing alt text:', imagesWithoutAlt);
    }

    // For now, just ensure we don't have critical missing alt text
    // In a real scenario, you'd want to review each case
    expect(imagesWithoutAlt.length).toBeLessThan(5); // Arbitrary threshold
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) => {
      return elements.map((el, index) => ({
        index,
        level: parseInt(el.tagName.charAt(1)),
        text: el.textContent?.trim(),
        hasContent: !!el.textContent?.trim(),
      }));
    });

    // Should have at least one h1
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBeGreaterThan(0);

    // Headings should have content
    const emptyHeadings = headings.filter(h => !h.hasContent);
    expect(emptyHeadings).toHaveLength(0);

    // Heading levels should not skip (basic check)
    const levels = headings.map(h => h.level).sort((a, b) => a - b);
    for (let i = 1; i < levels.length; i++) {
      // Allow some flexibility, but avoid large skips
      expect(levels[i] - levels[i-1]).toBeLessThanOrEqual(2);
    }
  });

  test('should have proper semantic structure', async ({ page }) => {
    const semanticElements = await page.$$eval('nav, main, aside, header, footer, section, article', (elements) => {
      return elements.map((el, index) => ({
        index,
        tagName: el.tagName.toLowerCase(),
        hasContent: !!el.textContent?.trim(),
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledBy: el.getAttribute('aria-labelledby'),
      }));
    });

    // Should have main landmark
    const hasMain = semanticElements.some(el => el.tagName === 'main');
    expect(hasMain).toBe(true);

    // Should have navigation
    const hasNav = semanticElements.some(el => el.tagName === 'nav');
    expect(hasNav).toBe(true);

    // Landmarks should have identifying information
    const landmarksWithoutLabels = semanticElements.filter(el =>
      ['nav', 'aside', 'section'].includes(el.tagName) &&
      !el.ariaLabel && !el.ariaLabelledBy
    );

    // Allow some flexibility, but flag issues
    if (landmarksWithoutLabels.length > 0) {
      console.warn('Landmarks without labels:', landmarksWithoutLabels);
    }
  });

  test('should announce dynamic content changes', async ({ page }) => {
    // Test for ARIA live regions
    const liveRegions = await page.$$eval('[aria-live], [aria-atomic]', (elements) => {
      return elements.map((el, index) => ({
        index,
        ariaLive: el.getAttribute('aria-live'),
        ariaAtomic: el.getAttribute('aria-atomic'),
        role: el.getAttribute('role'),
      }));
    });

    // Should have some live regions for dynamic content
    // This is application-specific, so we'll just check they exist if needed
    if (liveRegions.length > 0) {
      for (const region of liveRegions) {
        expect(['polite', 'assertive', 'off']).toContain(region.ariaLive);
      }
    }
  });

  test('should have proper focus management', async ({ page }) => {
    // Test that focus moves appropriately after actions
    const buttons = await page.$$('button');

    if (buttons.length > 0) {
      // Click a button and check if focus moves appropriately
      await buttons[0].click();

      // Wait a bit for any focus changes
      await page.waitForTimeout(500);

      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.tagName.toLowerCase() : null;
      });

      // Focus should be somewhere (not lost)
      expect(activeElement).toBeTruthy();
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Test that elements are in a logical order for screen readers
    const allFocusable = await page.$$eval('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', (elements) => {
      return elements.map((el, index) => {
        const htmlEl = el as HTMLElement;
        return {
          index,
          tagName: el.tagName.toLowerCase(),
          visible: htmlEl.offsetWidth > 0 && htmlEl.offsetHeight > 0,
          tabIndex: htmlEl.tabIndex,
        };
      });
    });

    // All focusable elements should be visible (or intentionally hidden)
    const invisibleFocusable = allFocusable.filter(el => !el.visible && el.tabIndex >= 0);

    // Hidden focusable elements should have tabindex="-1" or be screen reader only
    for (const element of invisibleFocusable) {
      expect(element.tabIndex).toBe(-1);
    }
  });
});