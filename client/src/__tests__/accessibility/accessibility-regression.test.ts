import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { test, expect } from './accessibility-test-utils.test';

test.describe('Accessibility Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should not introduce new accessibility violations', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runAxeAudit({
      tags: ['wcag2a', 'wcag2aa'],
    });

    // Store baseline for comparison
    const baseline = {
      violations: results.violations.length,
      seriousViolations: results.violations.filter(v => v.impact === 'serious').length,
      criticalViolations: results.violations.filter(v => v.impact === 'critical').length,
    };

    // In a real CI setup, you'd compare against a stored baseline
    console.log('Current accessibility baseline:', baseline);

    // For now, just ensure we don't have critical violations
    expect(baseline.criticalViolations).toBe(0);

    // And keep serious violations low
    expect(baseline.seriousViolations).toBeLessThan(5);
  });

  test('should maintain keyboard accessibility', async ({ accessibilityUtils }) => {
    const focusOrder = await accessibilityUtils.testKeyboardNavigation();

    // Should be able to navigate through the page
    expect(focusOrder.length).toBeGreaterThan(5);

    // Focus should move in a logical order (basic check)
    const uniqueElements = new Set(focusOrder);
    expect(uniqueElements.size).toBe(focusOrder.length); // No duplicate focuses
  });

  test('should maintain screen reader compatibility', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.testScreenReaderSupport({
      checkAriaLabels: true,
      checkAltText: true,
    });

    // Should have some ARIA labels
    const elementsWithLabels = results.ariaLabels.filter(item => item?.hasLabel);
    expect(elementsWithLabels.length).toBeGreaterThan(0);

    // Images should have alt text (with some tolerance for decorative images)
    const imagesWithAlt = results.altText.filter(img => img.hasAlt);
    const totalImages = results.altText.length;

    if (totalImages > 0) {
      const altTextRatio = imagesWithAlt.length / totalImages;
      expect(altTextRatio).toBeGreaterThan(0.8); // 80% of images should have alt text
    }
  });

  test('should maintain color contrast standards', async ({ accessibilityUtils }) => {
    const contrastResults = await accessibilityUtils.testColorContrast({
      elements: ['button', 'a', 'h1', 'h2', 'h3', 'p'],
      minimumRatio: 4.5,
    });

    const passingElements = contrastResults.filter(r => r.passes);
    const totalElements = contrastResults.length;

    if (totalElements > 0) {
      const passRatio = passingElements.length / totalElements;
      expect(passRatio).toBeGreaterThan(0.9); // 90% should pass contrast requirements
    }
  });

  test('should maintain Lighthouse accessibility score', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runLighthouseAudit('http://localhost:3000', {
      categories: ['accessibility'],
    });

    // Should maintain a good accessibility score
    expect(results.accessibility?.score).toBeGreaterThanOrEqual(0.85);

    // Key audits should pass
    const audits = results.accessibility?.auditRefs || {};
    expect(audits['color-contrast']?.score).toBeGreaterThanOrEqual(0.9);
    expect(audits['image-alt']?.score).toBe(1);
    expect(audits['label']?.score).toBe(1);
  });

  test('should not break existing functionality with accessibility fixes', async ({ page }) => {
    // Basic functionality test to ensure accessibility improvements don't break features
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check that main navigation works
    const navLinks = await page.$$('nav a');
    expect(navLinks.length).toBeGreaterThan(0);

    // Check that buttons are clickable
    const buttons = await page.$$('button');
    if (buttons.length > 0) {
      const isVisible = await buttons[0].isVisible();
      expect(isVisible).toBe(true);
    }
  });

  test('should maintain performance with accessibility features', async ({ page }) => {
    // Quick performance check to ensure accessibility doesn't hurt performance
    const startTime = Date.now();

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

    // Check that the page is interactive
    const interactiveElements = await page.$$('button, input, a');
    expect(interactiveElements.length).toBeGreaterThan(0);
  });
});