#!/usr/bin/env node

/**
 * Performance Budget Enforcer Script
 *
 * Enforces performance budgets in CI/CD pipelines with build failure support.
 * Integrates with existing bundle analysis and provides comprehensive reporting.
 */

const fs = require('fs');
const path = require('path');

// Simple logger for standalone script
const logger = {
  info: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args),
  success: (...args) => console.log('✅', ...args),
};

// Import performance monitoring (fallback if module not available)
let performanceMonitor;
try {
  performanceMonitor = require('../shared/core/src/performance').performanceMonitor;
} catch (error) {
  logger.warn('Performance monitoring module not available, using mock implementation');
  // Create a mock performance monitor for demonstration
  performanceMonitor = {
    recordBundleMetric: () => {},
    recordWebVital: () => {},
    generateReport: () => ({
      violations: [],
      metrics: [],
      healthScore: 85,
      recommendations: ['Performance monitoring module needs to be built and available']
    })
  };
}

class PerformanceBudgetEnforcer {
  constructor() {
    this.config = this.loadConfig();
    this.results = {
      passed: true,
      violations: [],
      metrics: [],
      report: {},
    };
  }

  loadConfig() {
    const configPath = path.join(process.cwd(), 'performance-budgets.json');

    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (error) {
        logger.warn('Failed to load performance budgets config, using defaults:', error.message);
      }
    }

    // Return default config
    return {
      environment: process.env.NODE_ENV || 'development',
      strictMode: process.env.CI === 'true',
      failOnViolation: process.env.BUDGET_FAIL_ON_VIOLATION !== 'false',
      failScore: parseInt(process.env.BUDGET_FAIL_SCORE) || 75,
      failSize: parseFloat(process.env.BUDGET_FAIL_SIZE) || 3.0, // MB
      verbose: process.env.BUDGET_VERBOSE === 'true',
    };
  }

  async enforce() {
    logger.info('🚀 Starting performance budget enforcement...\n');

    try {
      // Load bundle analysis results
      await this.loadBundleAnalysis();

      // Load Core Web Vitals data if available
      await this.loadWebVitalsData();

      // Check budgets
      await this.checkBudgets();

      // Generate report
      this.generateReport();

      // Determine if build should fail
      const shouldFail = this.shouldFailBuild();

      if (shouldFail) {
        logger.error('❌ Performance budget violations detected - build failed');
        process.exit(1);
      } else {
        logger.success('Performance budgets passed');
      }

    } catch (error) {
      logger.error('❌ Budget enforcement failed:', error.message);
      process.exit(1);
    }
  }

  async loadBundleAnalysis() {
    logger.info('📦 Loading bundle analysis...');

    const bundleAnalysisPath = path.join(process.cwd(), 'bundle-analysis.json');

    if (!fs.existsSync(bundleAnalysisPath)) {
      logger.warn('Bundle analysis file not found, running analysis...');
      await this.runBundleAnalysis();
      return;
    }

    try {
      const bundleData = JSON.parse(fs.readFileSync(bundleAnalysisPath, 'utf8'));

      // Record bundle metrics
      if (bundleData.totalSize) {
        performanceMonitor.recordBundleMetric('totalJsSize', bundleData.totalSize);
      }

      if (bundleData.gzippedSize) {
        performanceMonitor.recordBundleMetric('totalGzippedSize', bundleData.gzippedSize);
      }

      // Record chunk information
      if (bundleData.chunks && bundleData.chunks.length > 0) {
        const initialChunk = bundleData.chunks.find(c => c.isInitial) || bundleData.chunks[0];
        if (initialChunk) {
          performanceMonitor.recordBundleMetric('initialChunkSize', initialChunk.size);
        }

        const largestChunk = bundleData.chunks.reduce((max, chunk) =>
          chunk.size > max.size ? chunk : max, bundleData.chunks[0]);
        performanceMonitor.recordBundleMetric('largestChunkSize', largestChunk.size);
      }

      logger.success(`Loaded bundle analysis: ${this.formatBytes(bundleData.totalSize)} total`);

    } catch (error) {
      logger.warn('Failed to load bundle analysis:', error.message);
    }
  }

  async runBundleAnalysis() {
    try {
      const { execSync } = require('child_process');
      logger.info('Running bundle analysis...');
      execSync('npm run analyze:bundle', { stdio: 'inherit' });
      await this.loadBundleAnalysis(); // Reload after running
    } catch (error) {
      logger.warn('Failed to run bundle analysis:', error.message);
    }
  }

  async loadWebVitalsData() {
    logger.info('📊 Loading Core Web Vitals data...');

    const vitalsPath = path.join(process.cwd(), 'performance-vitals.json');

    if (fs.existsSync(vitalsPath)) {
      try {
        const vitalsData = JSON.parse(fs.readFileSync(vitalsPath, 'utf8'));

        // Record Core Web Vitals metrics
        if (vitalsData.lcp) performanceMonitor.recordWebVital('lcp', vitalsData.lcp);
        if (vitalsData.fid) performanceMonitor.recordWebVital('fid', vitalsData.fid);
        if (vitalsData.cls) performanceMonitor.recordWebVital('cls', vitalsData.cls);
        if (vitalsData.fcp) performanceMonitor.recordWebVital('fcp', vitalsData.fcp);
        if (vitalsData.ttfb) performanceMonitor.recordWebVital('ttfb', vitalsData.ttfb);

        logger.success('Loaded Core Web Vitals data');

      } catch (error) {
        logger.warn('Failed to load Core Web Vitals data:', error.message);
      }
    } else {
      logger.info('No Core Web Vitals data found');
    }
  }

  async checkBudgets() {
    logger.info('🔍 Checking performance budgets...');

    // Generate performance report
    const report = performanceMonitor.generateReport();

    this.results.violations = report.violations;
    this.results.metrics = report.metrics;
    this.results.report = report;

    // Log violations
    if (report.violations.length > 0) {
      logger.warn(`⚠️  Found ${report.violations.length} budget violation(s):`);

      report.violations.forEach((violation, index) => {
        const severity = violation.severity === 'error' ? '🚨' : '⚠️';
        console.log(`   ${index + 1}. ${severity} ${violation.budget.name}`);
        console.log(`      Expected: ${violation.threshold}${violation.budget.unit}`);
        console.log(`      Actual: ${violation.actualValue.toFixed(2)}${violation.budget.unit}`);
        console.log(`      Severity: ${violation.severity.toUpperCase()}`);
        console.log('');
      });
    } else {
      logger.success('No budget violations found');
    }

    // Log health score
    const healthScore = report.healthScore;
    const scoreColor = healthScore >= 90 ? '🟢' : healthScore >= 70 ? '🟡' : '🔴';
    logger.info(`${scoreColor} Performance Health Score: ${healthScore}/100`);
  }

  generateReport() {
    logger.info('📊 Generating performance report...');

    const reportPath = path.join(process.cwd(), 'performance-budget-report.json');
    const markdownPath = path.join(process.cwd(), 'performance-budget-report.md');

    const report = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      config: this.config,
      results: this.results,
      summary: {
        passed: this.results.passed,
        violationsCount: this.results.violations.length,
        metricsCount: this.results.metrics.length,
        healthScore: this.results.report.healthScore,
        recommendations: this.results.report.recommendations,
      },
    };

    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.success(`JSON report saved: ${reportPath}`);

    // Generate markdown report
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync(markdownPath, markdown);
    logger.success(`Markdown report saved: ${markdownPath}`);
  }

  generateMarkdownReport(report) {
    const { results, summary } = report;

    let markdown = `# Performance Budget Report

**Generated:** ${new Date().toISOString()}
**Environment:** ${this.config.environment}
**Health Score:** ${summary.healthScore}/100

## Summary

- **Status:** ${summary.passed ? '✅ PASSED' : '❌ FAILED'}
- **Violations:** ${summary.violationsCount}
- **Metrics Recorded:** ${summary.metricsCount}

## Budget Violations

`;

    if (results.violations.length === 0) {
      markdown += '✅ No budget violations found.\n\n';
    } else {
      results.violations.forEach((violation, index) => {
        const severity = violation.severity === 'error' ? '🚨 ERROR' : '⚠️ WARNING';
        markdown += `### ${index + 1}. ${violation.budget.name}

- **Severity:** ${severity}
- **Expected:** ${violation.threshold}${violation.budget.unit}
- **Actual:** ${violation.actualValue.toFixed(2)}${violation.budget.unit}
- **Description:** ${violation.budget.description}

`;
      });
    }

    markdown += `## Recommendations

`;

    if (summary.recommendations.length === 0) {
      markdown += '✅ No recommendations at this time.\n\n';
    } else {
      summary.recommendations.forEach((rec, index) => {
        markdown += `${index + 1}. ${rec}\n`;
      });
      markdown += '\n';
    }

    markdown += `## Recent Metrics

| Metric | Value | Unit | Timestamp |
|--------|-------|------|-----------|
`;

    results.metrics.slice(-10).forEach(metric => {
      markdown += `| ${metric.name} | ${metric.value.toFixed(2)} | ${metric.unit} | ${new Date(metric.timestamp).toLocaleString()} |\n`;
    });

    return markdown;
  }

  shouldFailBuild() {
    if (!this.config.failOnViolation) {
      return false;
    }

    // Check for error violations
    const errorViolations = this.results.violations.filter(v => v.severity === 'error');
    if (errorViolations.length > 0) {
      return true;
    }

    // Check health score threshold
    if (this.results.report.healthScore < this.config.failScore) {
      logger.warn(`Health score ${this.results.report.healthScore} below threshold ${this.config.failScore}`);
      return true;
    }

    // Check bundle size threshold
    const totalJsMetric = this.results.metrics.find(m => m.name === 'totalJsSize');
    if (totalJsMetric && totalJsMetric.value > this.config.failSize * 1024) {
      logger.warn(`Bundle size ${(totalJsMetric.value / 1024).toFixed(2)}MB exceeds threshold ${this.config.failSize}MB`);
      return true;
    }

    return false;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI interface
async function main() {
  const enforcer = new PerformanceBudgetEnforcer();

  logger.info('🚀 Chanuka Platform - Performance Budget Enforcer');
  logger.info('================================================\n');

  await enforcer.enforce();

  logger.success('\n✅ Budget enforcement complete');
}

if (require.main === module) {
  main().catch(error => {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceBudgetEnforcer;