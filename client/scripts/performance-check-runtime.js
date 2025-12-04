#!/usr/bin/env node

/**
 * Runtime Performance Check Script
 *
 * Performs comprehensive performance checks including:
 * - Bundle size analysis (build-time)
 * - Runtime performance budget validation
 * - Trend analysis and regression detection
 * - Automated alerting for CI/CD pipelines
 */

const fs = require('fs');
const path = require('path');

// Import existing bundle checker
const { analyzeBundles, checkBudgets, formatBytes } = require('./check-performance-budget.js');

// Load performance budgets
const budgetsPath = path.join(__dirname, '../../performance-budgets.json');
const budgets = JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));

// Historical data storage
const historyPath = path.join(__dirname, '../../performance-history.json');

/**
 * Load historical performance data
 */
function loadHistory() {
  try {
    if (fs.existsSync(historyPath)) {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  } catch (error) {
    console.warn('Failed to load performance history:', error.message);
  }
  return { builds: [], trends: {} };
}

/**
 * Save historical performance data
 */
function saveHistory(history) {
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.warn('Failed to save performance history:', error.message);
  }
}

/**
 * Analyze performance trends
 */
function analyzeTrends(currentMetrics, history) {
  const trends = {
    bundleSize: { change: 0, direction: 'stable', significant: false },
    largestChunk: { change: 0, direction: 'stable', significant: false },
    chunkCount: { change: 0, direction: 'stable', significant: false }
  };

  if (history.builds.length >= 3) {
    const recentBuilds = history.builds.slice(-5); // Last 5 builds
    const avgBundleSize = recentBuilds.reduce((sum, build) => sum + build.totalSize, 0) / recentBuilds.length;
    const avgLargestChunk = recentBuilds.reduce((sum, build) => sum + build.largestChunkSize, 0) / recentBuilds.length;
    const avgChunkCount = recentBuilds.reduce((sum, build) => sum + build.chunkCount, 0) / recentBuilds.length;

    // Calculate changes
    trends.bundleSize.change = ((currentMetrics.totalSize - avgBundleSize) / avgBundleSize) * 100;
    trends.largestChunk.change = ((currentMetrics.largestChunkSize - avgLargestChunk) / avgLargestChunk) * 100;
    trends.chunkCount.change = ((currentMetrics.chunkCount - avgChunkCount) / avgChunkCount) * 100;

    // Determine direction and significance
    Object.keys(trends).forEach(metric => {
      const change = Math.abs(trends[metric].change);
      if (change > 10) { // 10% change threshold
        trends[metric].direction = trends[metric].change > 0 ? 'increasing' : 'decreasing';
        trends[metric].significant = true;
      }
    });
  }

  return trends;
}

/**
 * Check runtime performance budgets
 */
function checkRuntimeBudgets(analysis) {
  const runtimeIssues = [];

  // Check for potential runtime performance issues based on bundle analysis
  if (analysis.chunkCount > 50) {
    runtimeIssues.push({
      type: 'warning',
      message: `High chunk count (${analysis.chunkCount}) may impact runtime performance`,
      recommendation: 'Consider consolidating chunks or implementing better code splitting strategy'
    });
  }

  if (analysis.largestChunkSize > analysis.totalSize * 0.5) {
    runtimeIssues.push({
      type: 'warning',
      message: 'Largest chunk is >50% of total bundle size',
      recommendation: 'Consider splitting the large chunk to improve loading performance'
    });
  }

  if (analysis.initialChunkSize > 1024 * 1024) { // 1MB
    runtimeIssues.push({
      type: 'error',
      message: `Initial chunk size (${formatBytes(analysis.initialChunkSize)}) is very large`,
      recommendation: 'Optimize initial bundle size to improve Time to Interactive'
    });
  }

  return runtimeIssues;
}

/**
 * Generate performance report
 */
function generateReport(analysis, budgetResults, trends, runtimeIssues) {
  const report = {
    timestamp: new Date().toISOString(),
    build: {
      commit: process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA || 'unknown',
      branch: process.env.GITHUB_REF || process.env.CI_COMMIT_REF_NAME || 'unknown',
      environment: process.env.NODE_ENV || 'development'
    },
    metrics: analysis,
    budgets: budgetResults,
    trends,
    runtimeIssues,
    summary: {
      violations: budgetResults.violations.length,
      warnings: budgetResults.warnings.length,
      runtimeIssues: runtimeIssues.length,
      trendAlerts: Object.values(trends).filter(t => t.significant).length,
      overall: budgetResults.violations.length === 0 ? 'pass' : 'fail'
    }
  };

  return report;
}

/**
 * Display results in console
 */
function displayResults(analysis, budgetResults, trends, runtimeIssues, report) {
  console.log('🚀 Runtime Performance Check Results');
  console.log('='.repeat(60));

  // Bundle Analysis
  console.log('\n📊 Bundle Analysis:');
  console.log('-'.repeat(30));
  console.log(`Total Size:        ${formatBytes(analysis.totalSize)}`);
  console.log(`Gzipped Size:      ${formatBytes(analysis.totalGzippedSize)}`);
  console.log(`JS Bundle Size:    ${formatBytes(analysis.jsTotalSize)}`);
  console.log(`Largest Chunk:     ${formatBytes(analysis.largestChunkSize)}`);
  console.log(`Initial Chunk:     ${formatBytes(analysis.initialChunkSize)}`);
  console.log(`Chunk Count:       ${analysis.chunkCount}`);

  // Trends
  console.log('\n📈 Performance Trends:');
  console.log('-'.repeat(30));
  Object.entries(trends).forEach(([metric, trend]) => {
    const icon = trend.direction === 'increasing' ? '📈' : trend.direction === 'decreasing' ? '📉' : '➡️';
    const change = trend.change.toFixed(1);
    const significant = trend.significant ? ' (significant)' : '';
    console.log(`${icon} ${metric}: ${change}% ${trend.direction}${significant}`);
  });

  // Budget Results
  if (budgetResults.warnings.length > 0) {
    console.log('\n⚠️  Budget Warnings:');
    console.log('-'.repeat(30));
    budgetResults.warnings.forEach(warning => {
      console.log(`• ${warning.metric}: ${formatBytes(warning.actual)} (${warning.percentage}% of budget)`);
    });
  }

  if (budgetResults.violations.length > 0) {
    console.log('\n❌ Budget Violations:');
    console.log('-'.repeat(30));
    budgetResults.violations.forEach(violation => {
      console.log(`• ${violation.metric}: ${formatBytes(violation.actual)} > ${formatBytes(violation.limit)}`);
    });
  }

  // Runtime Issues
  if (runtimeIssues.length > 0) {
    console.log('\n🔍 Runtime Performance Issues:');
    console.log('-'.repeat(30));
    runtimeIssues.forEach(issue => {
      const icon = issue.type === 'error' ? '❌' : '⚠️';
      console.log(`${icon} ${issue.message}`);
      console.log(`   💡 ${issue.recommendation}`);
    });
  }

  // Summary
  console.log('\n📋 Summary:');
  console.log('-'.repeat(30));
  console.log(`Violations: ${report.summary.violations}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Runtime Issues: ${report.summary.runtimeIssues}`);
  console.log(`Trend Alerts: ${report.summary.trendAlerts}`);

  const statusIcon = report.summary.overall === 'pass' ? '✅' : '❌';
  console.log(`\n${statusIcon} Overall Status: ${report.summary.overall.toUpperCase()}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Starting comprehensive performance check...\n');

  try {
    // Analyze bundles
    const analysis = analyzeBundles();

    // Check budgets
    const budgetResults = checkBudgets(analysis);

    // Load and analyze trends
    const history = loadHistory();
    const trends = analyzeTrends(analysis, history);

    // Check runtime performance
    const runtimeIssues = checkRuntimeBudgets(analysis);

    // Generate report
    const report = generateReport(analysis, budgetResults, trends, runtimeIssues);

    // Save to history
    history.builds.push({
      timestamp: report.timestamp,
      ...analysis
    });

    // Keep only last 20 builds
    if (history.builds.length > 20) {
      history.builds = history.builds.slice(-20);
    }

    saveHistory(history);

    // Display results
    displayResults(analysis, budgetResults, trends, runtimeIssues, report);

    // Export report for CI/CD
    if (process.env.CI) {
      const reportPath = path.join(process.cwd(), 'performance-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report exported to: ${reportPath}`);
    }

    // Determine exit code
    const hasErrors = budgetResults.violations.length > 0 || runtimeIssues.some(i => i.type === 'error');
    const environment = process.env.NODE_ENV || 'development';
    const envConfig = budgets.environments[environment];

    if (hasErrors && envConfig && envConfig.failOnViolation) {
      console.log('\n🚫 Build failed due to performance issues');
      process.exit(1);
    } else {
      console.log('\n✅ Performance check completed');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Performance check failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  analyzeTrends,
  checkRuntimeBudgets,
  generateReport
};