import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { test, expect } from './accessibility-test-utils.test';

test.describe('Lighthouse Accessibility Audits', () => {
  test('should achieve high accessibility score', async ({ page, accessibilityUtils }) => {

    const results = await accessibilityUtils.runLighthouseAudit('http://localhost:3000', {
      categories: ['accessibility'],
      flags: {
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
        },
      },
    });

    console.log('Lighthouse accessibility score:', results.accessibility?.score);

    // Assert accessibility score is above 90
    expect(results.accessibility?.score).toBeGreaterThanOrEqual(0.9);

    // Assert no critical audits failed
    const failedAudits = Object.values(results.accessibility?.auditRefs || {})
      .filter((audit: any) => audit.result?.score === 0);

    expect(failedAudits).toHaveLength(0);
  });

  test('should pass all accessibility audits', async ({ page, accessibilityUtils }) => {

    const results = await accessibilityUtils.runLighthouseAudit('http://localhost:3000', {
      categories: ['accessibility'],
    });

    // Check specific accessibility audits
    const audits = results.accessibility?.auditRefs || {};

    // Color contrast
    expect(audits['color-contrast']?.score).toBeGreaterThanOrEqual(0.9);

    // Image alt text
    expect(audits['image-alt']?.score).toBe(1);

    // Form labels
    expect(audits['label']?.score).toBe(1);

    // Heading structure
    expect(audits['heading-order']?.score).toBeGreaterThanOrEqual(0.9);

    // Keyboard navigation
    expect(audits['keyboard']?.score).toBeGreaterThanOrEqual(0.9);

    // ARIA attributes
    expect(audits['aria-valid-attr-value']?.score).toBe(1);
    expect(audits['aria-required-attr']?.score).toBe(1);
  });

  test('should have good performance alongside accessibility', async ({ page, accessibilityUtils }) => {

    const results = await accessibilityUtils.runLighthouseAudit('http://localhost:3000', {
      categories: ['accessibility', 'performance', 'seo', 'best-practices'],
    });

    // Accessibility should not come at the cost of performance
    expect(results.performance?.score).toBeGreaterThanOrEqual(0.7);
    expect(results.accessibility?.score).toBeGreaterThanOrEqual(0.9);
    expect(results.seo?.score).toBeGreaterThanOrEqual(0.8);
    expect(results.bestPractices?.score).toBeGreaterThanOrEqual(0.8);
  });

  test('should work well on mobile devices', async ({ page, accessibilityUtils }) => {

    const results = await accessibilityUtils.runLighthouseAudit('http://localhost:3000', {
      categories: ['accessibility'],
      flags: {
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
        },
      },
    });

    // Mobile accessibility should also be good
    expect(results.accessibility?.score).toBeGreaterThanOrEqual(0.85);
  });
});

