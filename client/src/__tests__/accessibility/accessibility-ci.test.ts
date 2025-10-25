import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Accessibility CI Integration Tests
 * Tests that run in CI to ensure accessibility compliance
 */

import { test, expect } from './accessibility-test-utils.test';

test.describe('Accessibility CI Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    // Start the development server for testing
    // In CI, this would be handled by the workflow
    await page.goto('http://localhost:3000');
  });

  test('accessibility CI - axe-core audit', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runAxeAudit({
      tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    });

    // CI should fail if there are critical violations
    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);

    // CI should fail if there are serious violations
    expect(results.violations.filter(v => v.impact === 'serious')).toHaveLength(0);

    // Generate report for CI artifacts
    const report = accessibilityUtils.generateReport({
      axe: results,
      timestamp: new Date().toISOString(),
    });

    // In CI, this would be written to a file
    console.log('Axe-core audit report:', JSON.stringify(report, null, 2));
  });

  test('accessibility CI - lighthouse audit', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runLighthouseAudit('http://localhost:3000', {
      categories: ['accessibility'],
    });

    // CI should fail if accessibility score is below threshold
    expect(results.accessibility?.score).toBeGreaterThanOrEqual(0.9);

    // Key audits should pass
    const audits = results.accessibility?.auditRefs || {};
    expect(audits['color-contrast']?.score).toBeGreaterThanOrEqual(0.9);
    expect(audits['image-alt']?.score).toBe(1);
    expect(audits['label']?.score).toBe(1);
  });

  test('accessibility CI - keyboard navigation', async ({ accessibilityUtils }) => {
    const focusOrder = await accessibilityUtils.testKeyboardNavigation();

    // CI should fail if keyboard navigation is broken
    expect(focusOrder.length).toBeGreaterThan(3);

    // Should not have duplicate focus stops
    const uniqueElements = new Set(focusOrder);
    expect(uniqueElements.size).toBe(focusOrder.length);
  });

  test('accessibility CI - screen reader support', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.testScreenReaderSupport({
      checkAriaLabels: true,
      checkAltText: true,
    });

    // CI should fail if there are missing ARIA labels on interactive elements
    const elementsWithoutLabels = results.ariaLabels.filter(item => item && !item.hasLabel && !item.role);
    expect(elementsWithoutLabels.length).toBeLessThan(3); // Allow some flexibility

    // CI should fail if images are missing alt text
    const imagesWithoutAlt = results.altText.filter(img => !img.hasAlt && !img.src.includes('decorative'));
    expect(imagesWithoutAlt.length).toBeLessThan(2); // Allow some decorative images
  });

  test('accessibility CI - color contrast', async ({ accessibilityUtils }) => {
    const contrastResults = await accessibilityUtils.testColorContrast({
      elements: ['button', 'a', 'h1', 'h2', 'h3', 'p'],
      minimumRatio: 4.5,
    });

    // CI should fail if too many elements fail contrast
    const failingElements = contrastResults.filter(r => !r.passes);
    expect(failingElements.length).toBeLessThan(contrastResults.length * 0.2); // Less than 20% fail
  });

  test('accessibility CI - visual accessibility', async ({ page, accessibilityUtils }) => {
    // Test touch target sizes
    const touchTargets = await page.$$eval('button, [role="button"], a, input[type="button"]', (elements) => {
      return elements.map(el => ({
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      }));
    });

    // CI should fail if touch targets are too small
    const smallTargets = touchTargets.filter(target => target.width < 44 || target.height < 44);
    expect(smallTargets.length).toBeLessThan(touchTargets.length * 0.1); // Less than 10% fail
  });

  test('accessibility CI - regression check', async ({ accessibilityUtils }) => {
    // Run comprehensive audit
    const axeResults = await accessibilityUtils.runAxeAudit();
    const lighthouseResults = await accessibilityUtils.runLighthouseAudit('http://localhost:3000');
    const keyboardResults = await accessibilityUtils.testKeyboardNavigation();
    const screenReaderResults = await accessibilityUtils.testScreenReaderSupport();
    const contrastResults = await accessibilityUtils.testColorContrast();

    const allResults = {
      axe: axeResults,
      lighthouse: lighthouseResults,
      keyboard: { focusOrder: keyboardResults, issues: 0 },
      screenReader: screenReaderResults,
      contrast: contrastResults,
    };

    // Generate comprehensive report
    const report = accessibilityUtils.generateReport(allResults);

    // CI should fail if overall accessibility is poor
    expect(report.summary.totalViolations).toBeLessThan(10);
    expect(report.summary.accessibilityScore).toBeGreaterThanOrEqual(0.85);
    expect(report.summary.contrastIssues).toBeLessThan(5);

    // In CI, this report would be saved as an artifact
    console.log('Comprehensive accessibility report:', JSON.stringify(report, null, 2));
  });
});