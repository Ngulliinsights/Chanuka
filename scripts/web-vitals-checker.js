#!/usr/bin/env node

/**
 * Core Web Vitals Checker for CI/CD
 * Validates Core Web Vitals metrics against defined thresholds
 */

const fs = require('fs');
const path = require('path');

// Simple logger
const logger = {
  info: (...args) => console.log(...args),
  error: (...args) => console.error('❌', ...args),
  warn: (...args) => console.warn('⚠️', ...args),
  success: (...args) => console.log('✅', ...args),
};

class WebVitalsChecker {
  constructor(options = {}) {
    this.options = {
      failOnViolation: process.env.VITALS_FAIL_ON_VIOLATION === 'true',
      lcpThreshold: parseInt(process.env.VITALS_LCP_THRESHOLD) || 2500,
      fidThreshold: parseInt(process.env.VITALS_FID_THRESHOLD) || 100,
      clsThreshold: parseFloat(process.env.VITALS_CLS_THRESHOLD) || 0.1,
      fcpThreshold: parseInt(process.env.VITALS_FCP_THRESHOLD) || 1800,
      ttfbThreshold: parseInt(process.env.VITALS_TTFB_THRESHOLD) || 800,
      verbose: process.env.VITALS_VERBOSE === 'true',
      ...options
    };

    this.thresholds = {
      LCP: this.options.lcpThreshold,
      FID: this.options.fidThreshold,
      CLS: this.options.clsThreshold,
      FCP: this.options.fcpThreshold,
      TTFB: this.options.ttfbThreshold,
    };
  }

  async run() {
    logger.info('🚀 Starting Core Web Vitals checks...\n');

    try {
      const vitalsData = await this.loadVitalsData();
      if (!vitalsData) {
        logger.warn('No Core Web Vitals data found');
        return { passed: true, violations: [] };
      }

      const violations = this.checkThresholds(vitalsData);
      const passed = !this.options.failOnViolation || violations.length === 0;

      this.generateReport(vitalsData, violations);

      if (!passed) {
        logger.error('❌ Core Web Vitals violations detected');
        process.exit(1);
      } else {
        logger.success('Core Web Vitals checks passed');
      }

      return { passed, violations };

    } catch (error) {
      logger.error('Core Web Vitals check failed:', error.message);
      process.exit(1);
    }
  }

  async loadVitalsData() {
    const vitalsPath = path.join(process.cwd(), 'performance-vitals.json');

    if (!fs.existsSync(vitalsPath)) {
      // Try to find in Lighthouse reports
      const lighthousePath = path.join(process.cwd(), 'lighthouse-report.json');
      if (fs.existsSync(lighthousePath)) {
        return this.extractVitalsFromLighthouse(lighthousePath);
      }
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(vitalsPath, 'utf8'));
      logger.success(`Loaded Core Web Vitals data from ${vitalsPath}`);
      return data;
    } catch (error) {
      logger.warn('Failed to load Core Web Vitals data:', error.message);
      return null;
    }
  }

  extractVitalsFromLighthouse(lighthousePath) {
    try {
      const report = JSON.parse(fs.readFileSync(lighthousePath, 'utf8'));
      const audits = report.audits || {};

      const vitals = {
        lcp: audits['largest-contentful-paint']?.numericValue,
        fid: audits['max-potential-fid']?.numericValue,
        cls: audits['cumulative-layout-shift']?.numericValue,
        fcp: audits['first-contentful-paint']?.numericValue,
        ttfb: audits['server-response-time']?.numericValue,
        timestamp: report.fetchTime,
        url: report.finalUrl,
      };

      logger.success(`Extracted Core Web Vitals from Lighthouse report`);
      return vitals;
    } catch (error) {
      logger.warn('Failed to extract vitals from Lighthouse report:', error.message);
      return null;
    }
  }

  checkThresholds(vitalsData) {
    const violations = [];

    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const value = vitalsData[metric.toLowerCase()];
      if (value !== undefined && value > threshold) {
        violations.push({
          metric,
          value,
          threshold,
          severity: value > threshold * 1.5 ? 'error' : 'warning',
          description: this.getMetricDescription(metric)
        });
      }
    });

    return violations;
  }

  getMetricDescription(metric) {
    const descriptions = {
      LCP: 'Largest Contentful Paint - measures loading performance',
      FID: 'First Input Delay - measures interactivity',
      CLS: 'Cumulative Layout Shift - measures visual stability',
      FCP: 'First Contentful Paint - measures loading performance',
      TTFB: 'Time to First Byte - measures server response time'
    };
    return descriptions[metric] || '';
  }

  generateReport(vitalsData, violations) {
    logger.info('\n📊 Core Web Vitals Report:');
    logger.info('================================');

    // Display metrics
    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const value = vitalsData[metric.toLowerCase()];
      const status = value !== undefined
        ? (value <= threshold ? '✅' : value <= threshold * 1.5 ? '⚠️' : '❌')
        : '❓';

      const unit = metric === 'CLS' ? '' : 'ms';
      const displayValue = value !== undefined ? `${value}${unit}` : 'N/A';
      const displayThreshold = `${threshold}${unit}`;

      console.log(`${status} ${metric}: ${displayValue} (threshold: ${displayThreshold})`);
    });

    // Display violations
    if (violations.length > 0) {
      logger.warn(`\n🚨 Found ${violations.length} violation(s):`);
      violations.forEach((violation, index) => {
        const severity = violation.severity === 'error' ? 'ERROR' : 'WARNING';
        console.log(`   ${index + 1}. ${severity}: ${violation.metric} exceeded threshold`);
        console.log(`      Expected: ≤${violation.threshold}${violation.metric === 'CLS' ? '' : 'ms'}`);
        console.log(`      Actual: ${violation.value}${violation.metric === 'CLS' ? '' : 'ms'}`);
        console.log(`      ${violation.description}`);
        console.log('');
      });
    } else {
      logger.success('\n✅ No Core Web Vitals violations found');
    }

    // Save detailed report
    this.saveReport(vitalsData, violations);
  }

  saveReport(vitalsData, violations) {
    const report = {
      timestamp: new Date().toISOString(),
      vitals: vitalsData,
      thresholds: this.thresholds,
      violations,
      summary: {
        totalMetrics: Object.keys(this.thresholds).length,
        violationsCount: violations.length,
        passed: violations.length === 0
      }
    };

    const jsonPath = path.join(process.cwd(), 'web-vitals-report.json');
    const mdPath = path.join(process.cwd(), 'web-vitals-report.md');

    // Save JSON report
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    logger.success(`JSON report saved: ${jsonPath}`);

    // Save Markdown report
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync(mdPath, markdown);
    logger.success(`Markdown report saved: ${mdPath}`);
  }

  generateMarkdownReport(report) {
    const { vitals, thresholds, violations, summary } = report;

    let markdown = `# Core Web Vitals Report

**Generated:** ${new Date().toISOString()}
**Status:** ${summary.passed ? '✅ PASSED' : '❌ FAILED'}
**Violations:** ${summary.violationsCount}

## Metrics Overview

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
`;

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const value = vitals[metric.toLowerCase()];
      const unit = metric === 'CLS' ? '' : 'ms';
      const displayValue = value !== undefined ? `${value}${unit}` : 'N/A';
      const displayThreshold = `${threshold}${unit}`;

      let status = '❓';
      if (value !== undefined) {
        status = value <= threshold ? '✅' : value <= threshold * 1.5 ? '⚠️' : '❌';
      }

      markdown += `| ${metric} | ${displayValue} | ${displayThreshold} | ${status} |\n`;
    });

    if (violations.length > 0) {
      markdown += '\n## Violations\n\n';
      violations.forEach((violation, index) => {
        const severity = violation.severity.toUpperCase();
        markdown += `### ${index + 1}. ${severity}: ${violation.metric}\n\n`;
        markdown += `- **Expected:** ≤${violation.threshold}${violation.metric === 'CLS' ? '' : 'ms'}\n`;
        markdown += `- **Actual:** ${violation.value}${violation.metric === 'CLS' ? '' : 'ms'}\n`;
        markdown += `- **Description:** ${violation.description}\n\n`;
      });
    }

    markdown += '\n## Recommendations\n\n';
    if (violations.length === 0) {
      markdown += '✅ All Core Web Vitals metrics are within acceptable thresholds.\n';
    } else {
      violations.forEach(violation => {
        markdown += `- **${violation.metric}:** ${this.getRecommendation(violation.metric)}\n`;
      });
    }

    return markdown;
  }

  getRecommendation(metric) {
    const recommendations = {
      LCP: 'Optimize Largest Contentful Paint by improving image loading, reducing server response times, and removing render-blocking JavaScript',
      FID: 'Improve First Input Delay by reducing JavaScript execution time and breaking up long tasks',
      CLS: 'Fix Cumulative Layout Shift by reserving space for dynamic content and avoiding inserting content above existing content',
      FCP: 'Speed up First Contentful Paint by optimizing CSS delivery and reducing render-blocking resources',
      TTFB: 'Reduce Time to First Byte by optimizing server response times and improving network performance'
    };
    return recommendations[metric] || 'Review and optimize this metric';
  }
}

// CLI interface
async function main() {
  const checker = new WebVitalsChecker();
  await checker.run();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = WebVitalsChecker;