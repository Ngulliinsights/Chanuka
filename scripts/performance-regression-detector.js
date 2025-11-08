#!/usr/bin/env node

/**
 * Performance Regression Detector
 * Analyzes performance data to detect regressions and trends
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

class PerformanceRegressionDetector {
  constructor(options = {}) {
    this.options = {
      baselineDays: options.baselineDays || 7,
      regressionThreshold: options.regressionThreshold || 0.1, // 10% degradation
      minSamples: options.minSamples || 5,
      failOnRegression: options.failOnRegression !== false,
      verbose: options.verbose || false,
      ...options
    };

    this.baseline = null;
    this.current = null;
  }

  async run() {
    logger.info('🔍 Starting performance regression detection...\n');

    try {
      await this.loadData();
      const regressions = this.detectRegressions();

      this.reportResults(regressions);

      if (this.options.failOnRegression && regressions.some(r => r.severity === 'error')) {
        logger.error('❌ Performance regressions detected - build failed');
        process.exit(1);
      } else {
        logger.success('Performance regression check completed');
      }

      return { regressions, hasRegressions: regressions.length > 0 };

    } catch (error) {
      logger.error('Performance regression detection failed:', error.message);
      process.exit(1);
    }
  }

  async loadData() {
    logger.info('📊 Loading performance data...');

    // Load current performance data
    const currentPath = path.join(process.cwd(), 'performance-vitals.json');
    if (fs.existsSync(currentPath)) {
      this.current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
      logger.success('Loaded current performance data');
    } else {
      logger.warn('No current performance data found');
    }

    // Load baseline data (last N days)
    const baselineData = await this.loadBaselineData();
    if (baselineData.length > 0) {
      this.baseline = this.calculateBaselineStats(baselineData);
      logger.success(`Loaded baseline data (${baselineData.length} samples)`);
    } else {
      logger.warn('No baseline performance data found');
    }
  }

  async loadBaselineData() {
    const data = [];
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.options.baselineDays * 24 * 60 * 60 * 1000);

    // Look for performance data files in the last N days
    // This could be extended to load from a database or external service
    const performanceDir = path.join(process.cwd(), 'performance-data');
    if (fs.existsSync(performanceDir)) {
      const files = fs.readdirSync(performanceDir)
        .filter(file => file.startsWith('performance-vitals-') && file.endsWith('.json'))
        .map(file => {
          const timestamp = file.replace('performance-vitals-', '').replace('.json', '');
          return { file, timestamp: new Date(timestamp) };
        })
        .filter(item => item.timestamp >= cutoff)
        .sort((a, b) => b.timestamp - a.timestamp);

      for (const item of files) {
        try {
          const filePath = path.join(performanceDir, item.file);
          const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          data.push({
            ...fileData,
            timestamp: item.timestamp
          });
        } catch (error) {
          logger.warn(`Failed to load ${item.file}:`, error.message);
        }
      }
    }

    return data;
  }

  calculateBaselineStats(data) {
    if (data.length < this.options.minSamples) {
      return null;
    }

    const metrics = ['lcp', 'fid', 'cls', 'fcp', 'ttfb'];
    const stats = {};

    metrics.forEach(metric => {
      const values = data
        .map(item => item[metric])
        .filter(val => val !== undefined && val !== null);

      if (values.length >= this.options.minSamples) {
        const sorted = values.sort((a, b) => a - b);
        stats[metric] = {
          mean: values.reduce((sum, val) => sum + val, 0) / values.length,
          median: sorted[Math.floor(sorted.length / 2)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    });

    return stats;
  }

  detectRegressions() {
    if (!this.baseline || !this.current) {
      return [];
    }

    const regressions = [];
    const metrics = ['lcp', 'fid', 'cls', 'fcp', 'ttfb'];

    metrics.forEach(metric => {
      const baselineStat = this.baseline[metric];
      const currentValue = this.current[metric];

      if (!baselineStat || currentValue === undefined || currentValue === null) {
        return;
      }

      // Use p95 as the baseline for comparison (more stable than mean)
      const baselineValue = baselineStat.p95;
      const change = (currentValue - baselineValue) / baselineValue;

      if (Math.abs(change) > this.options.regressionThreshold) {
        const isRegression = change > 0; // Positive change means degradation
        const severity = Math.abs(change) > this.options.regressionThreshold * 2 ? 'error' : 'warning';

        regressions.push({
          metric: metric.toUpperCase(),
          baselineValue,
          currentValue,
          changePercent: change * 100,
          severity: isRegression ? severity : 'improvement',
          direction: isRegression ? 'degraded' : 'improved',
          description: this.getMetricDescription(metric),
          recommendation: this.getRegressionRecommendation(metric, isRegression)
        });
      }
    });

    return regressions;
  }

  getMetricDescription(metric) {
    const descriptions = {
      lcp: 'Largest Contentful Paint - measures loading performance',
      fid: 'First Input Delay - measures interactivity',
      cls: 'Cumulative Layout Shift - measures visual stability',
      fcp: 'First Contentful Paint - measures loading performance',
      ttfb: 'Time to First Byte - measures server response time'
    };
    return descriptions[metric] || '';
  }

  getRegressionRecommendation(metric, isRegression) {
    if (!isRegression) {
      return 'Performance has improved - consider updating baseline';
    }

    const recommendations = {
      lcp: 'Optimize images, reduce render-blocking resources, improve server response times',
      fid: 'Break up long tasks, reduce JavaScript execution time, optimize event handlers',
      cls: 'Reserve space for dynamic content, avoid inserting content above existing content',
      fcp: 'Optimize CSS delivery, reduce render-blocking resources, improve caching',
      ttfb: 'Optimize server response times, improve database queries, use CDN'
    };

    return recommendations[metric] || 'Review recent changes and optimize accordingly';
  }

  reportResults(regressions) {
    logger.info('\n📈 Performance Regression Analysis:');
    logger.info('=====================================');

    if (regressions.length === 0) {
      logger.success('✅ No significant performance regressions detected');
      return;
    }

    const errors = regressions.filter(r => r.severity === 'error');
    const warnings = regressions.filter(r => r.severity === 'warning');
    const improvements = regressions.filter(r => r.severity === 'improvement');

    if (errors.length > 0) {
      logger.error(`🚨 ${errors.length} critical regression(s) detected:`);
      errors.forEach(regression => this.logRegression(regression));
    }

    if (warnings.length > 0) {
      logger.warn(`⚠️  ${warnings.length} performance warning(s):`);
      warnings.forEach(regression => this.logRegression(regression));
    }

    if (improvements.length > 0) {
      logger.success(`🎉 ${improvements.length} performance improvement(s):`);
      improvements.forEach(regression => this.logRegression(regression));
    }

    // Save detailed report
    this.saveReport(regressions);
  }

  logRegression(regression) {
    const changeStr = regression.changePercent >= 0
      ? `+${regression.changePercent.toFixed(1)}%`
      : `${regression.changePercent.toFixed(1)}%`;

    const icon = regression.severity === 'error' ? '🔴' :
                 regression.severity === 'warning' ? '🟡' : '🟢';

    console.log(`   ${icon} ${regression.metric}: ${changeStr}`);
    console.log(`      Baseline: ${regression.baselineValue.toFixed(0)}ms`);
    console.log(`      Current:  ${regression.currentValue.toFixed(0)}ms`);
    console.log(`      ${regression.description}`);
    if (regression.recommendation) {
      console.log(`      💡 ${regression.recommendation}`);
    }
    console.log('');
  }

  saveReport(regressions) {
    const report = {
      timestamp: new Date().toISOString(),
      baselineDays: this.options.baselineDays,
      regressionThreshold: this.options.regressionThreshold,
      regressions,
      summary: {
        totalRegressions: regressions.length,
        criticalRegressions: regressions.filter(r => r.severity === 'error').length,
        warnings: regressions.filter(r => r.severity === 'warning').length,
        improvements: regressions.filter(r => r.severity === 'improvement').length
      }
    };

    const jsonPath = path.join(process.cwd(), 'performance-regression-report.json');
    const mdPath = path.join(process.cwd(), 'performance-regression-report.md');

    // Save JSON report
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    logger.success(`JSON report saved: ${jsonPath}`);

    // Save Markdown report
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync(mdPath, markdown);
    logger.success(`Markdown report saved: ${mdPath}`);
  }

  generateMarkdownReport(report) {
    const { regressions, summary } = report;

    let markdown = `# Performance Regression Report

**Generated:** ${new Date().toISOString()}
**Baseline Period:** ${report.baselineDays} days
**Regression Threshold:** ${(report.regressionThreshold * 100).toFixed(1)}%

## Summary

- **Total Changes:** ${summary.totalRegressions}
- **Critical Regressions:** ${summary.criticalRegressions}
- **Warnings:** ${summary.warnings}
- **Improvements:** ${summary.improvements}

## Detailed Results

`;

    if (regressions.length === 0) {
      markdown += '✅ No significant performance changes detected.\n\n';
    } else {
      regressions.forEach((regression, index) => {
        const status = regression.severity === 'error' ? '🚨 CRITICAL' :
                      regression.severity === 'warning' ? '⚠️ WARNING' : '🎉 IMPROVEMENT';

        markdown += `### ${index + 1}. ${status}: ${regression.metric}

- **Change:** ${regression.changePercent >= 0 ? '+' : ''}${regression.changePercent.toFixed(1)}%
- **Baseline:** ${regression.baselineValue.toFixed(0)}ms
- **Current:** ${regression.currentValue.toFixed(0)}ms
- **Direction:** ${regression.direction}
- **Description:** ${regression.description}

**Recommendation:** ${regression.recommendation}

`;
      });
    }

    return markdown;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--baseline-days':
        options.baselineDays = parseInt(args[++i]);
        break;
      case '--regression-threshold':
        options.regressionThreshold = parseFloat(args[++i]);
        break;
      case '--min-samples':
        options.minSamples = parseInt(args[++i]);
        break;
      case '--no-fail':
        options.failOnRegression = false;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        showHelp();
        return;
    }
  }

  const detector = new PerformanceRegressionDetector(options);
  await detector.run();
}

function showHelp() {
  console.log(`
📈 Performance Regression Detector

Usage: node scripts/performance-regression-detector.js [options]

Options:
  --baseline-days <number>        Number of days to use for baseline (default: 7)
  --regression-threshold <number> Threshold for regression detection as decimal (default: 0.1)
  --min-samples <number>          Minimum samples required for baseline (default: 5)
  --no-fail                       Don't fail build on regressions
  --verbose                       Enable verbose output
  --help                          Show this help message

Examples:
  node scripts/performance-regression-detector.js
  node scripts/performance-regression-detector.js --baseline-days 14 --regression-threshold 0.05
  node scripts/performance-regression-detector.js --no-fail --verbose
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceRegressionDetector;