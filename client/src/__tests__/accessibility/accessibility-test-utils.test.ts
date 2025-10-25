import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';

// Accessibility test utilities
test.describe('Accessibility Test Utils', () => {
  test('should initialize correctly', async ({ page }) => {
    const utils = new AccessibilityTestUtils(page);
    expect(utils).toBeDefined();
  });
});
export class AccessibilityTestUtils {
  private page: any;

  constructor(page: any) {
    this.page = page;
  }

  /**
   * Run axe-core accessibility audit
   */
  async runAxeAudit(options: {
    rules?: string[];
    tags?: string[];
    exclude?: string[];
  } = {}) {
    const { rules, tags, exclude } = options;

    const axeBuilder = new AxeBuilder({ page: this.page });

    if (rules) {
      axeBuilder.withRules(rules);
    }

    if (tags) {
      axeBuilder.withTags(tags);
    }

    if (exclude) {
      axeBuilder.exclude(exclude);
    }

    const results = await axeBuilder.analyze();

    return {
      violations: results.violations,
      passes: results.passes,
      incomplete: results.incomplete,
      inapplicable: results.inapplicable,
      summary: {
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length,
      },
    };
  }

  /**
   * Run Lighthouse accessibility audit
   */
  async runLighthouseAudit(url: string, options: {
    categories?: string[];
    flags?: any;
  } = {}) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const runnerResult = await lighthouse(url, {
        logLevel: 'info',
        output: 'json',
        port: new URL(browser.wsEndpoint()).port,
        ...options.flags,
      });

      return {
        accessibility: runnerResult?.lhr.categories.accessibility,
        performance: runnerResult?.lhr.categories.performance,
        seo: runnerResult?.lhr.categories.seo,
        bestPractices: runnerResult?.lhr.categories['best-practices'],
        report: runnerResult?.report,
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(options: {
    startElement?: string;
    tabOrder?: string[];
    expectedFocusOrder?: string[];
  } = {}) {
    const { startElement, tabOrder, expectedFocusOrder } = options;

    // Start from specified element or body
    if (startElement) {
      await this.page.focus(startElement);
    } else {
      await this.page.focus('body');
    }

    const focusOrder: string[] = [];

    // Tab through elements and record focus order
    for (let i = 0; i < (tabOrder?.length || 10); i++) {
      await this.page.keyboard.press('Tab');
      const focusedElement = await this.page.evaluate(() => {
        const active = document.activeElement;
        return active ? active.tagName + (active.id ? '#' + active.id : '') + (active.className ? '.' + active.className.split(' ').join('.') : '') : null;
      });
      if (focusedElement) {
        focusOrder.push(focusedElement);
      }
    }

    if (expectedFocusOrder) {
      expect(focusOrder).toEqual(expectedFocusOrder);
    }

    return focusOrder;
  }

  /**
   * Test screen reader compatibility
   */
  async testScreenReaderSupport(options: {
    elements?: string[];
    checkAriaLabels?: boolean;
    checkAltText?: boolean;
  } = {}) {
    const { elements = [], checkAriaLabels = true, checkAltText = true } = options;

    const results = {
      ariaLabels: [] as any[],
      altText: [] as any[],
      semanticStructure: [] as any[],
    };

    // Check ARIA labels
    if (checkAriaLabels) {
      for (const selector of elements) {
        const ariaInfo = await this.page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (!element) return null;

          return {
            selector: sel,
            ariaLabel: element.getAttribute('aria-label'),
            ariaLabelledBy: element.getAttribute('aria-labelledby'),
            role: element.getAttribute('role'),
            hasLabel: !!(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')),
          };
        }, selector);

        results.ariaLabels.push(ariaInfo);
      }
    }

    // Check alt text for images
    if (checkAltText) {
      const images = await this.page.$$eval('img', (imgs) => {
        return imgs.map((img, index) => ({
          index,
          src: img.src,
          alt: img.alt,
          hasAlt: !!img.alt,
        }));
      });

      results.altText = images;
    }

    // Check semantic structure
    const semanticElements = await this.page.$$eval('h1, h2, h3, h4, h5, h6, nav, main, aside, header, footer, section, article', (elements) => {
      return elements.map((el, index) => ({
        index,
        tagName: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 50),
        hasContent: !!el.textContent?.trim(),
      }));
    });

    results.semanticStructure = semanticElements;

    return results;
  }

  /**
   * Test color contrast
   */
  async testColorContrast(options: {
    elements?: string[];
    minimumRatio?: number;
  } = {}) {
    const { elements = [], minimumRatio = 4.5 } = options;

    const contrastResults = await this.page.$$eval(elements.join(', '), (els, minRatio) => {
      const results = [];

      for (const el of els) {
        const style = window.getComputedStyle(el);
        const backgroundColor = style.backgroundColor;
        const color = style.color;

        // Simple contrast calculation (would need more sophisticated implementation for production)
        const bgLuminance = getLuminance(backgroundColor);
        const textLuminance = getLuminance(color);
        const ratio = (Math.max(bgLuminance, textLuminance) + 0.05) / (Math.min(bgLuminance, textLuminance) + 0.05);

        results.push({
          element: el.tagName + (el.id ? '#' + el.id : ''),
          backgroundColor,
          color,
          contrastRatio: ratio,
          passes: ratio >= minRatio,
        });
      }

      function getLuminance(color: string): number {
        // Convert color to RGB and calculate luminance
        // This is a simplified implementation
        const rgb = color.match(/\d+/g);
        if (!rgb) return 0;

        const r = parseInt(rgb[0]) / 255;
        const g = parseInt(rgb[1]) / 255;
        const b = parseInt(rgb[2]) / 255;

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }

      return results;
    }, minimumRatio);

    return contrastResults;
  }

  /**
   * Generate accessibility report
   */
  generateReport(results: any) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalViolations: 0,
        totalPasses: 0,
        accessibilityScore: 0,
        keyboardNavigationIssues: 0,
        screenReaderIssues: 0,
        contrastIssues: 0,
      },
      details: results,
      recommendations: [] as string[],
    };

    // Calculate summary
    if (results.axe) {
      report.summary.totalViolations += results.axe.violations.length;
      report.summary.totalPasses += results.axe.passes.length;
    }

    if (results.lighthouse) {
      report.summary.accessibilityScore = results.lighthouse.accessibility?.score || 0;
    }

    if (results.keyboard) {
      report.summary.keyboardNavigationIssues = results.keyboard.issues || 0;
    }

    if (results.screenReader) {
      report.summary.screenReaderIssues = results.screenReader.issues || 0;
    }

    if (results.contrast) {
      report.summary.contrastIssues = results.contrast.filter((c: any) => !c.passes).length;
    }

    // Generate recommendations
    if (report.summary.totalViolations > 0) {
      report.recommendations.push('Fix axe-core violations to improve accessibility compliance');
    }

    if (report.summary.accessibilityScore < 90) {
      report.recommendations.push('Improve Lighthouse accessibility score above 90');
    }

    if (report.summary.keyboardNavigationIssues > 0) {
      report.recommendations.push('Fix keyboard navigation issues for better usability');
    }

    if (report.summary.screenReaderIssues > 0) {
      report.recommendations.push('Add proper ARIA labels and semantic structure for screen readers');
    }

    if (report.summary.contrastIssues > 0) {
      report.recommendations.push('Fix color contrast issues to meet WCAG guidelines');
    }

    return report;
  }
}

// Test fixtures
export const test = base.extend<{
  accessibilityUtils: AccessibilityTestUtils;
}>({
  accessibilityUtils: async ({ page }, use) => {
    const utils = new AccessibilityTestUtils(page);
    await use(utils);
  },
});

export { expect };