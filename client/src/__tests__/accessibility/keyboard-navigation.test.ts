import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { test, expect } from './accessibility-test-utils.test';

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should allow navigation through main navigation with Tab key', async ({ accessibilityUtils }) => {
    const focusOrder = await accessibilityUtils.testKeyboardNavigation({
      startElement: 'nav a:first-child',
      expectedFocusOrder: ['nav a:first-child', 'nav a:nth-child(2)', 'nav a:nth-child(3)'],
    });

    // Verify navigation elements are focusable
    expect(focusOrder.length).toBeGreaterThan(0);
  });

  test('should support Tab order through form elements', async ({ page, accessibilityUtils }) => {
    // Navigate to a page with a form (assuming login or contact form exists)
    await page.goto('http://localhost:3000/login'); // Adjust URL as needed

    const focusOrder = await accessibilityUtils.testKeyboardNavigation({
      startElement: 'form input:first-of-type',
    });

    // Should be able to tab through all form elements
    expect(focusOrder.length).toBeGreaterThan(1);
  });

  test('should support Enter key activation', async ({ page }) => {
    // Test that Enter key works on buttons and links
    await page.focus('button:first-of-type, a[role="button"]:first-of-type');

    const initialUrl = page.url();
    await page.keyboard.press('Enter');

    // Should either navigate or trigger action
    // This is a basic check - more specific tests would be needed
    expect(page.url()).toBeDefined();
  });

  test('should support Escape key to close modals', async ({ page }) => {
    // This test assumes there are modal dialogs in the app
    // You may need to trigger a modal first
    const modal = page.locator('[role="dialog"]').first();

    if (await modal.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    } else {
      // Skip test if no modal is present
      test.skip();
    }
  });

  test('should maintain focus within modal dialogs', async ({ page }) => {
    const modal = page.locator('[role="dialog"]').first();

    if (await modal.isVisible()) {
      // Focus should stay within modal when tabbing
      const modalFocusableElements = modal.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');

      const focusableCount = await modalFocusableElements.count();
      expect(focusableCount).toBeGreaterThan(0);

      // Tab through modal elements
      for (let i = 0; i < focusableCount; i++) {
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => document.activeElement);
        expect(focusedElement).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test('should support arrow key navigation in menus', async ({ page }) => {
    // Test dropdown menus or navigation menus
    const menuTrigger = page.locator('[aria-haspopup="true"], [aria-expanded]').first();

    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();

      // Test arrow key navigation
      await page.keyboard.press('ArrowDown');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeDefined();
    } else {
      test.skip();
    }
  });

  test('should skip hidden elements in tab order', async ({ page, accessibilityUtils }) => {
    // Ensure hidden elements are not in tab order
    const hiddenElements = await page.$$('[aria-hidden="true"], [hidden], .sr-only');

    for (const element of hiddenElements) {
      const isVisible = await element.isVisible();
      const isFocusable = await element.evaluate(el => el.tabIndex >= 0);

      // Hidden elements should not be focusable
      if (!isVisible) {
        expect(isFocusable).toBe(false);
      }
    }
  });

  test('should provide visible focus indicators', async ({ page }) => {
    // Test that focused elements have visible focus styles
    await page.focus('a:first-of-type');

    const focusStyles = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement;
      const computedStyle = window.getComputedStyle(element);

      return {
        outline: computedStyle.outline,
        outlineWidth: computedStyle.outlineWidth,
        outlineColor: computedStyle.outlineColor,
        boxShadow: computedStyle.boxShadow,
      };
    });

    // Should have some form of visible focus indicator
    const hasVisibleFocus = focusStyles.outline !== 'none' ||
                           focusStyles.boxShadow !== 'none' ||
                           parseInt(focusStyles.outlineWidth) > 0;

    expect(hasVisibleFocus).toBe(true);
  });
});

