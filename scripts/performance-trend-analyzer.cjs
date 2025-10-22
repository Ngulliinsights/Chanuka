#!/usr/bin/env node

/**
 * Performance Trend Analyzer Script
 *
 * Analyzes performance trends over time and generates comprehensive reports
 * with historical data and predictive insights.
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

class PerformanceTrendAnalyzer {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'performance-data');
    this.reportsDir = path.join(process.cwd(), 'performance-reports');
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async analyzeTrends(options = {}) {
    logger.info('📈 Starting performance trend analysis...\n');

    try {
      const {
        days = 30,
        metrics = ['lcp', 'fid', 'cls', 'fcp', 'ttfb', 'totalJsSize'],
        generateCharts = true,
      } = options;

      // Load historical data
      const historicalData = this.loadHistoricalData(days);

      if (historicalData.length === 0) {
        logger.warn('No historical performance data found');
        return;
      }

      // Analyze trends for each metric
      const trendAnalysis = {};
      for (const metric of metrics) {
        trendAnalysis[metric] = this.analyzeMetricTrend(historicalData, metric);
      }

      // Generate overall insights
      const insights = this.generateInsights(trendAnalysis, historicalData);

      // Generate report
      const report = {
        timestamp: new Date().toISOString(),
        period: `${days} days`,
        dataPoints: historicalData.length,
        metrics: trendAnalysis,
        insights,
        recommendations: this.generateRecommendations(trendAnalysis),
      };

      // Save analysis
      this.saveAnalysis(report);

      // Generate charts if requested
      if (generateCharts) {
        await this.generateCharts(report, historicalData);
      }

      // Display results
      this.displayResults(report);

    } catch (error) {
      logger.error('❌ Trend analysis failed:', error.message);
      process.exit(1);
    }
  }

  loadHistoricalData(days) {
    const files = fs.readdirSync(this.dataDir)
      .filter(file => file.endsWith('.json'))
      .sort()
      .reverse() // Most recent first
      .slice(0, days); // Limit to specified days

    const data = [];

    for (const file of files) {
      try {
        const filePath = path.join(this.dataDir, file);
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (fileData.metrics && Array.isArray(fileData.metrics)) {
          data.push({
            date: fileData.timestamp,
            metrics: fileData.metrics,
            violations: fileData.violations || [],
            healthScore: fileData.healthScore || 0,
          });
        }
      } catch (error) {
        logger.warn(`Failed to load data from ${file}:`, error.message);
      }
    }

    return data.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  analyzeMetricTrend(historicalData, metricName) {
    const values = [];
    const timestamps = [];

    for (const dataPoint of historicalData) {
      const metric = dataPoint.metrics.find(m => m.name === metricName);
      if (metric) {
        values.push(metric.value);
        timestamps.push(new Date(dataPoint.date).getTime());
      }
    }

    if (values.length < 2) {
      return {
        metric: metricName,
        dataPoints: values.length,
        trend: 'insufficient-data',
        message: 'Not enough data points for trend analysis',
      };
    }

    // Calculate trend statistics
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const change = lastValue - firstValue;
    const changePercent = (change / firstValue) * 100;

    // Calculate linear regression for trend direction
    const regression = this.calculateLinearRegression(timestamps, values);
    const trend = this.determineTrend(regression.slope, metricName);

    // Calculate volatility (standard deviation)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    return {
      metric: metricName,
      dataPoints: values.length,
      current: lastValue,
      previous: firstValue,
      change,
      changePercent,
      trend,
      slope: regression.slope,
      r2: regression.r2,
      volatility,
      min: Math.min(...values),
      max: Math.max(...values),
      mean,
      median: this.calculateMedian(values),
    };
  }

  calculateLinearRegression(x, y) {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const r2 = 1 - (ssRes / ssTot);

    return { slope, intercept, r2 };
  }

  determineTrend(slope, metricName) {
    const absSlope = Math.abs(slope);

    // Define what constitutes an "improving" vs "degrading" trend based on metric
    const isImprovementGood = !['totalJsSize', 'largestChunkSize', 'initialChunkSize'].includes(metricName);

    if (absSlope < 0.001) return 'stable';
    if (absSlope < 0.01) return 'slight-' + (slope > 0 ? (isImprovementGood ? 'improvement' : 'degradation') : (isImprovementGood ? 'degradation' : 'improvement'));

    return slope > 0 ? (isImprovementGood ? 'improving' : 'degrading') : (isImprovementGood ? 'degrading' : 'improving');
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  generateInsights(trendAnalysis, historicalData) {
    const insights = [];

    // Overall performance trend
    const healthScores = historicalData.map(d => d.healthScore).filter(score => score > 0);
    if (healthScores.length > 1) {
      const firstScore = healthScores[0];
      const lastScore = healthScores[healthScores.length - 1];
      const scoreChange = lastScore - firstScore;

      if (Math.abs(scoreChange) > 5) {
        insights.push({
          type: scoreChange > 0 ? 'positive' : 'negative',
          message: `Performance health score ${scoreChange > 0 ? 'improved' : 'declined'} by ${Math.abs(scoreChange).toFixed(1)} points`,
          severity: Math.abs(scoreChange) > 15 ? 'high' : 'medium',
        });
      }
    }

    // Individual metric insights
    for (const [metricName, analysis] of Object.entries(trendAnalysis)) {
      if (analysis.trend === 'insufficient-data') continue;

      const changePercent = Math.abs(analysis.changePercent);
      if (changePercent > 10) {
        const direction = analysis.change > 0 ? 'increased' : 'decreased';
        insights.push({
          type: analysis.change > 0 ? 'negative' : 'positive',
          message: `${metricName.toUpperCase()} ${direction} by ${changePercent.toFixed(1)}%`,
          severity: changePercent > 25 ? 'high' : 'medium',
        });
      }

      // Volatility insights
      if (analysis.volatility > analysis.mean * 0.2) {
        insights.push({
          type: 'warning',
          message: `${metricName.toUpperCase()} shows high volatility (${analysis.volatility.toFixed(2)} std dev)`,
          severity: 'medium',
        });
      }
    }

    return insights;
  }

  generateRecommendations(trendAnalysis) {
    const recommendations = [];

    for (const [metricName, analysis] of Object.entries(trendAnalysis)) {
      if (analysis.trend === 'insufficient-data') continue;

      switch (analysis.trend) {
        case 'degrading':
          if (['lcp', 'fcp', 'ttfb'].includes(metricName)) {
            recommendations.push(`Optimize server response times to improve ${metricName.toUpperCase()}`);
          } else if (metricName === 'cls') {
            recommendations.push('Fix layout shifts by reserving space for dynamic content');
          } else if (metricName === 'fid') {
            recommendations.push('Reduce JavaScript execution time to improve interactivity');
          } else if (metricName.includes('Size')) {
            recommendations.push('Implement code splitting and lazy loading to reduce bundle sizes');
          }
          break;

        case 'improving':
          recommendations.push(`Continue optimizing ${metricName.toUpperCase()} - trend is positive`);
          break;

        case 'stable':
          recommendations.push(`Monitor ${metricName.toUpperCase()} for potential optimization opportunities`);
          break;
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  saveAnalysis(report) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `trend-analysis-${timestamp}.json`;
    const filePath = path.join(this.reportsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    logger.success(`Trend analysis saved: ${filePath}`);
  }

  async generateCharts(report, historicalData) {
    // Generate simple ASCII charts for console output
    logger.info('📊 Generating trend charts...');

    for (const [metricName, analysis] of Object.entries(report.metrics)) {
      if (analysis.trend === 'insufficient-data') continue;

      console.log(`\n📈 ${metricName.toUpperCase()} Trend:`);
      console.log(this.generateAsciiChart(historicalData, metricName));
      console.log(`   Trend: ${analysis.trend} | Change: ${analysis.changePercent.toFixed(1)}%`);
    }
  }

  generateAsciiChart(historicalData, metricName) {
    const values = [];
    const labels = [];

    for (const dataPoint of historicalData.slice(-20)) { // Last 20 data points
      const metric = dataPoint.metrics.find(m => m.name === metricName);
      if (metric) {
        values.push(metric.value);
        labels.push(new Date(dataPoint.date).toLocaleDateString());
      }
    }

    if (values.length < 2) return 'Insufficient data for chart';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const chartWidth = 40;
    const chartHeight = 10;

    let chart = '';

    for (let i = chartHeight - 1; i >= 0; i--) {
      const threshold = min + (range * i / (chartHeight - 1));
      let line = '';

      for (const value of values) {
        if (value >= threshold) {
          line += '█';
        } else {
          line += ' ';
        }
      }

      chart += line + '\n';
    }

    // Add x-axis labels
    chart += '└' + '─'.repeat(chartWidth - 2) + '┘\n';
    chart += labels.map(label => label.slice(-3)).join(' ');

    return chart;
  }

  displayResults(report) {
    logger.info('\n📊 Performance Trend Analysis Results');
    logger.info('='.repeat(50));

    console.log(`Period: ${report.period}`);
    console.log(`Data Points: ${report.dataPoints}`);
    console.log(`Insights: ${report.insights.length}`);
    console.log(`Recommendations: ${report.recommendations.length}`);

    if (report.insights.length > 0) {
      console.log('\n💡 Key Insights:');
      report.insights.forEach((insight, index) => {
        const icon = insight.type === 'positive' ? '✅' : insight.type === 'negative' ? '❌' : '⚠️';
        console.log(`   ${index + 1}. ${icon} ${insight.message}`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log('\n🎯 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log('\n📈 Metric Trends:');
    Object.entries(report.metrics).forEach(([metric, analysis]) => {
      if (analysis.trend === 'insufficient-data') return;

      const trendIcon = analysis.trend.includes('improving') ? '📈' :
                       analysis.trend.includes('degrading') ? '📉' : '📊';
      console.log(`   ${metric.toUpperCase()}: ${trendIcon} ${analysis.trend} (${analysis.changePercent.toFixed(1)}%)`);
    });
  }
}

// CLI interface
async function main() {
  const analyzer = new PerformanceTrendAnalyzer();

  logger.info('🚀 Chanuka Platform - Performance Trend Analyzer');
  logger.info('===============================================\n');

  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--days':
        options.days = parseInt(args[++i]);
        break;
      case '--metrics':
        options.metrics = args[++i].split(',');
        break;
      case '--no-charts':
        options.generateCharts = false;
        break;
    }
  }

  await analyzer.analyzeTrends(options);

  logger.success('\n✅ Trend analysis complete');
}

if (require.main === module) {
  main().catch(error => {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTrendAnalyzer;