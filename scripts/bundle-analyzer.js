#!/usr/bin/env node

/**
 * Comprehensive Bundle Analyzer with CI/CD Integration
 * Provides automated bundle analysis and optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BundleAnalyzerCI {
  constructor(options = {}) {
    this.options = {
      failOnScore: options.failOnScore || 0,
      failOnSize: options.failOnSize || 0, // in MB
      outputFormat: options.outputFormat || 'console', // console, json, html, markdown
      compareBaseline: options.compareBaseline || false,
      baselineFile: options.baselineFile || 'bundle-baseline.json',
      ...options
    };

    this.analysis = null;
    this.baseline = null;
  }

  async run() {
    try {
      console.log('🚀 Starting bundle analysis...\n');

      // Load baseline if comparison is enabled
      if (this.options.compareBaseline) {
        await this.loadBaseline();
      }

      // Build the project if requested
      if (this.options.build) {
        await this.buildProject();
      }

      // Run the analysis
      const { BundleAnalyzer } = require('./analyze-bundle.js');
      const analyzer = new BundleAnalyzer();
      await analyzer.analyze();

      this.analysis = analyzer.analysis;

      // Generate reports
      await this.generateReports();

      // Compare with baseline
      if (this.baseline) {
        this.compareWithBaseline();
      }

      // Check thresholds
      const passed = this.checkThresholds();

      // Output results
      this.outputResults();

      if (!passed) {
        console.log('\n❌ Bundle analysis failed - thresholds exceeded');
        process.exit(1);
      }

      console.log('\n✅ Bundle analysis completed successfully');
      return { passed, analysis: this.analysis };

    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }

  async loadBaseline() {
    const baselinePath = path.join(process.cwd(), this.options.baselineFile);
    if (fs.existsSync(baselinePath)) {
      this.baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      console.log(`📊 Loaded baseline from ${baselinePath}`);
    } else {
      console.log(`⚠️  Baseline file not found: ${baselinePath}`);
    }
  }

  async buildProject() {
    console.log('🔨 Building project...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ Build completed');
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  async generateReports() {
    const formats = Array.isArray(this.options.outputFormat)
      ? this.options.outputFormat
      : [this.options.outputFormat];

    for (const format of formats) {
      switch (format) {
        case 'json':
          this.saveJSONReport();
          break;
        case 'html':
          this.saveHTMLReport();
          break;
        case 'markdown':
          this.saveMarkdownReport();
          break;
        case 'console':
          // Already displayed by analyzer
          break;
      }
    }
  }

  saveJSONReport() {
    const outputPath = path.join(process.cwd(), 'bundle-analysis-ci.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      analysis: this.analysis,
      baseline: this.baseline,
      comparison: this.baseline ? this.getComparison() : null,
      thresholds: {
        score: this.options.failOnScore,
        size: this.options.failOnSize
      },
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log(`💾 JSON report saved: ${outputPath}`);
  }

  saveHTMLReport() {
    const BundleReportGenerator = require('./generate-bundle-report.js');
    const reportGenerator = new BundleReportGenerator(this.analysis);
    const htmlPath = reportGenerator.generateHTMLReport();
    console.log(`📊 HTML report saved: ${htmlPath}`);
  }

  saveMarkdownReport() {
    const outputPath = path.join(process.cwd(), 'bundle-analysis.md');
    const markdown = this.generateMarkdownReport();
    fs.writeFileSync(outputPath, markdown);
    console.log(`📝 Markdown report saved: ${outputPath}`);
  }

  generateMarkdownReport() {
    const metrics = this.analysis.performanceMetrics;
    const score = metrics.efficiencyScore;

    let markdown = `# 📦 Bundle Analysis Report

Generated on ${new Date(this.analysis.timestamp).toLocaleString()}

## 🎯 Efficiency Score: ${score}/100

${this.getScoreBadge(score)} ${this.getScoreDescription(score)}

## 📊 Key Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Total Size | ${this.formatBytes(metrics.totalSize)} | ${metrics.totalSize > 2*1024*1024 ? '🔴' : metrics.totalSize > 1*1024*1024 ? '🟡' : '🟢'} |
| Gzipped Size | ${this.formatBytes(metrics.gzippedSize)} | ${metrics.compressionRatio > 0.5 ? '🔴' : metrics.compressionRatio > 0.3 ? '🟡' : '🟢'} |
| Compression Ratio | ${(metrics.compressionRatio * 100).toFixed(1)}% | ${metrics.compressionRatio > 0.5 ? '🔴' : metrics.compressionRatio > 0.3 ? '🟡' : '🟢'} |
| File Count | ${metrics.fileCount} | - |
| Chunk Count | ${metrics.chunkCount} | ${metrics.chunkCount < 3 ? '🔴' : metrics.chunkCount > 20 ? '🟡' : '🟢'} |
| Dependencies | ${metrics.dependencyCount} | - |

`;

    if (this.baseline) {
      markdown += `## 📈 Comparison with Baseline

${this.generateComparisonTable()}

`;
    }

    if (this.analysis.recommendations.length > 0) {
      markdown += `## 💡 Recommendations

${this.analysis.recommendations.map(rec => {
  const priority = rec.priority.toUpperCase();
  const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';

  return `### ${icon} ${priority}: ${rec.message}

**Suggestion:** ${rec.suggestion}

**Impact:** ${rec.impact} | **Effort:** ${rec.effort}

${rec.files ? `**Affected Files:**\n${rec.files.map(f => `- ${f.path} (${f.size})`).join('\n')}\n\n` : ''}
${rec.dependencies ? `**Dependencies:**\n${rec.dependencies.map(d => `- ${d.name}@${d.version} (${d.size})`).join('\n')}\n\n` : ''}
`;
}).join('')}

`;
    }

    if (this.analysis.dependencies.length > 0) {
      markdown += `## 📦 Largest Dependencies

| Package | Version | Size | Type |
|---------|---------|------|------|
${this.analysis.dependencies.slice(0, 10).map(dep =>
  `| ${dep.name} | ${dep.version} | ${this.formatBytes(dep.size)} | ${dep.isDev ? 'dev' : 'prod'} |`
).join('\n')}

`;
    }

    return markdown;
  }

  getScoreBadge(score) {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    return '🔴';
  }

  getScoreDescription(score) {
    if (score >= 90) return 'Excellent bundle optimization!';
    if (score >= 80) return 'Good performance, minor improvements possible.';
    if (score >= 70) return 'Decent performance, optimization recommended.';
    if (score >= 60) return 'Needs significant optimization.';
    return 'Critical optimization required.';
  }

  getComparison() {
    if (!this.baseline) return null;

    const current = this.analysis.performanceMetrics;
    const baseline = this.baseline.performanceMetrics;

    return {
      scoreChange: current.efficiencyScore - baseline.efficiencyScore,
      sizeChange: current.totalSize - baseline.totalSize,
      compressionChange: current.compressionRatio - baseline.compressionRatio,
      fileCountChange: current.fileCount - baseline.fileCount
    };
  }

  generateComparisonTable() {
    const comparison = this.getComparison();
    if (!comparison) return '';

    return `| Metric | Current | Baseline | Change |
|--------|---------|----------|--------|
| Efficiency Score | ${this.analysis.performanceMetrics.efficiencyScore} | ${this.baseline.performanceMetrics.efficiencyScore} | ${comparison.scoreChange >= 0 ? '+' : ''}${comparison.scoreChange} |
| Total Size | ${this.formatBytes(this.analysis.performanceMetrics.totalSize)} | ${this.formatBytes(this.baseline.performanceMetrics.totalSize)} | ${comparison.sizeChange >= 0 ? '+' : ''}${this.formatBytes(Math.abs(comparison.sizeChange))} |
| Compression Ratio | ${(this.analysis.performanceMetrics.compressionRatio * 100).toFixed(1)}% | ${(this.baseline.performanceMetrics.compressionRatio * 100).toFixed(1)}% | ${comparison.compressionChange >= 0 ? '+' : ''}${(comparison.compressionChange * 100).toFixed(1)}% |
| File Count | ${this.analysis.performanceMetrics.fileCount} | ${this.baseline.performanceMetrics.fileCount} | ${comparison.fileCountChange >= 0 ? '+' : ''}${comparison.fileCountChange} |`;
  }

  compareWithBaseline() {
    const comparison = this.getComparison();
    if (!comparison) return;

    console.log('\n📈 Baseline Comparison:');
    console.log(`   Score Change: ${comparison.scoreChange >= 0 ? '+' : ''}${comparison.scoreChange} points`);
    console.log(`   Size Change: ${comparison.sizeChange >= 0 ? '+' : ''}${this.formatBytes(Math.abs(comparison.sizeChange))}`);
    console.log(`   Compression Change: ${comparison.compressionChange >= 0 ? '+' : ''}${(comparison.compressionChange * 100).toFixed(1)}%`);
  }

  checkThresholds() {
    const metrics = this.analysis.performanceMetrics;
    let passed = true;

    if (this.options.failOnScore > 0 && metrics.efficiencyScore < this.options.failOnScore) {
      console.log(`❌ Score threshold failed: ${metrics.efficiencyScore} < ${this.options.failOnScore}`);
      passed = false;
    }

    const sizeMB = metrics.totalSize / (1024 * 1024);
    if (this.options.failOnSize > 0 && sizeMB > this.options.failOnSize) {
      console.log(`❌ Size threshold failed: ${sizeMB.toFixed(2)}MB > ${this.options.failOnSize}MB`);
      passed = false;
    }

    return passed;
  }

  outputResults() {
    const metrics = this.analysis.performanceMetrics;

    console.log('\n📊 Analysis Summary:');
    console.log(`   Efficiency Score: ${metrics.efficiencyScore}/100`);
    console.log(`   Total Size: ${this.formatBytes(metrics.totalSize)}`);
    console.log(`   Files: ${metrics.fileCount}, Chunks: ${metrics.chunkCount}`);

    if (this.options.failOnScore > 0 || this.options.failOnSize > 0) {
      console.log('\n🔍 Threshold Checks:');
      if (this.options.failOnScore > 0) {
        const status = metrics.efficiencyScore >= this.options.failOnScore ? '✅' : '❌';
        console.log(`   ${status} Score ≥ ${this.options.failOnScore}: ${metrics.efficiencyScore}`);
      }
      if (this.options.failOnSize > 0) {
        const sizeMB = metrics.totalSize / (1024 * 1024);
        const status = sizeMB <= this.options.failOnSize ? '✅' : '❌';
        console.log(`   ${status} Size ≤ ${this.options.failOnSize}MB: ${sizeMB.toFixed(2)}MB`);
      }
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Save current analysis as baseline
  saveBaseline() {
    const baselinePath = path.join(process.cwd(), this.options.baselineFile);
    fs.writeFileSync(baselinePath, JSON.stringify(this.analysis, null, 2));
    console.log(`💾 Baseline saved: ${baselinePath}`);
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
      case '--fail-on-score':
        options.failOnScore = parseInt(args[++i]);
        break;
      case '--fail-on-size':
        options.failOnSize = parseFloat(args[++i]);
        break;
      case '--output':
        options.outputFormat = args[++i].split(',');
        break;
      case '--compare-baseline':
        options.compareBaseline = true;
        break;
      case '--baseline-file':
        options.baselineFile = args[++i];
        break;
      case '--build':
        options.build = true;
        break;
      case '--save-baseline':
        options.saveBaseline = true;
        break;
      case '--help':
        showHelp();
        return;
    }
  }

  const analyzer = new BundleAnalyzerCI(options);
  const result = await analyzer.run();

  if (options.saveBaseline) {
    analyzer.saveBaseline();
  }

  process.exit(result.passed ? 0 : 1);
}

function showHelp() {
  console.log(`
📦 Bundle Analyzer CI

Usage: node scripts/bundle-analyzer.js [options]

Options:
  --fail-on-score <number>    Fail if efficiency score is below this value (0-100)
  --fail-on-size <number>     Fail if bundle size exceeds this value in MB
  --output <format>           Output format: console,json,html,markdown (comma-separated)
  --compare-baseline          Compare results with baseline file
  --baseline-file <file>      Path to baseline file (default: bundle-baseline.json)
  --build                     Build the project before analysis
  --save-baseline             Save current results as new baseline
  --help                      Show this help message

Examples:
  node scripts/bundle-analyzer.js --fail-on-score 80 --fail-on-size 2.5 --output json,html
  node scripts/bundle-analyzer.js --compare-baseline --build
  node scripts/bundle-analyzer.js --save-baseline
`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = BundleAnalyzerCI;