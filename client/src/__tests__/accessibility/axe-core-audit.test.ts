import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { test, expect } from './accessibility-test-utils.test';

test.describe('Axe Core Accessibility Audits', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test('should pass basic accessibility audit', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runAxeAudit({
      tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    });

    // Log results for debugging
    console.log('Axe audit results:', results.summary);

    // Assert no critical violations
    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);

    // Assert no serious violations
    expect(results.violations.filter(v => v.impact === 'serious')).toHaveLength(0);

    // Assert reasonable number of passes
    expect(results.passes.length).toBeGreaterThan(0);
  });

  test('should have proper heading structure', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runAxeAudit({
      rules: ['heading-order', 'empty-heading', 'p-as-heading'],
    });

    const headingViolations = results.violations.filter(v =>
      ['heading-order', 'empty-heading', 'p-as-heading'].includes(v.id)
    );

    expect(headingViolations).toHaveLength(0);
  });

  test('should have proper form labels', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runAxeAudit({
      rules: ['label', 'label-title-only', 'help-same-as-label', 'multiple-label'],
    });

    const labelViolations = results.violations.filter(v =>
      ['label', 'label-title-only', 'help-same-as-label', 'multiple-label'].includes(v.id)
    );

    expect(labelViolations).toHaveLength(0);
  });

  test('should have proper color contrast', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runAxeAudit({
      rules: ['color-contrast'],
    });

    const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');

    expect(contrastViolations).toHaveLength(0);
  });

  test('should have proper image alt text', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runAxeAudit({
      rules: ['image-alt', 'image-redundant-alt', 'input-image-alt'],
    });

    const imageViolations = results.violations.filter(v =>
      ['image-alt', 'image-redundant-alt', 'input-image-alt'].includes(v.id)
    );

    expect(imageViolations).toHaveLength(0);
  });

  test('should have proper ARIA attributes', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runAxeAudit({
      rules: ['aria-allowed-attr', 'aria-required-attr', 'aria-roles', 'aria-valid-attr-value'],
    });

    const ariaViolations = results.violations.filter(v =>
      ['aria-allowed-attr', 'aria-required-attr', 'aria-roles', 'aria-valid-attr-value'].includes(v.id)
    );

    expect(ariaViolations).toHaveLength(0);
  });

  test('should be keyboard accessible', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runAxeAudit({
      rules: ['keyboard', 'focus-order-semantics', 'tabindex'],
    });

    const keyboardViolations = results.violations.filter(v =>
      ['keyboard', 'focus-order-semantics', 'tabindex'].includes(v.id)
    );

    expect(keyboardViolations).toHaveLength(0);
  });

  test('should have proper semantic structure', async ({ accessibilityUtils }) => {
    const results = await accessibilityUtils.runAxeAudit({
      rules: ['landmark-one-main', 'landmark-main-is-top-level', 'landmark-no-duplicate-main', 'region'],
    });

    const landmarkViolations = results.violations.filter(v =>
      ['landmark-one-main', 'landmark-main-is-top-level', 'landmark-no-duplicate-main', 'region'].includes(v.id)
    );

    expect(landmarkViolations).toHaveLength(0);
  });
});

