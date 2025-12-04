#!/usr/bin/env node

/**
 * Performance Audit Script
 * Measures actual bundle size reduction and performance improvements
 */

import fs from 'fs';
import path from 'path';
import { gzipSync } from 'zlib';

import { glob } from 'glob';

interface PerformanceMetrics {
  bundleSize: {
    css: {
      total: number;
      gzipped: number;
      files: number;
    };
    js: {
      total: number;
      gzipped: number;
      files: number;
    };
  };
  codeMetrics: {
    totalLines: number;
    duplicateRules: number;
    unusedSelectors: number;
    complexityScore: number;
  };
  loadingMetrics: {
    criticalCSSSize: number;
    renderBlockingResources: number;
    estimatedFCP: number; // First Contentful Paint
    estimatedLCP: number; // Largest Contentful Paint
  };
  recommendations: string[];
}

interface ComparisonResult {
  before: PerformanceMetrics;
  after: PerformanceMetrics;
  improvements: {
    bundleSizeReduction: number;
    bundleSizeReductionPercent: number;
    duplicateRulesReduction: number;
    performanceScore: number;
  };
}

class PerformanceAuditor {
  private baseDir: string;

  constructor(baseDir: string = 'client') {
    this.baseDir = baseDir;
  }

  async auditPerformance(): Promise<PerformanceMetrics> {
    console.log('🔍 Starting performance audit...');

    const bundleSize = await this.measureBundleSize();
    const codeMetrics = await this.analyzeCodeMetrics();
    const loadingMetrics = await this.estimateLoadingMetrics();
    const recommendations = this.generateRecommendations(bundleSize, codeMetrics);

    const metrics: PerformanceMetrics = {
      bundleSize,
      codeMetrics,
      loadingMetrics,
      recommendations
    };

    this.printAuditResults(metrics);
    return metrics;
  }

  private async measureBundleSize() {
    console.log('📦 Measuring bundle sizes...');

    // CSS files
    const cssFiles = await glob(`${this.baseDir}/**/*.css`, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    let cssTotal = 0;
    let cssGzipped = 0;

    for (const file of cssFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const size = Buffer.byteLength(content, 'utf8');
        const gzippedSize = gzipSync(content).length;
        
        cssTotal += size;
        cssGzipped += gzippedSize;
      } catch (error) {
        console.warn(`⚠️  Could not process ${file}:`, error);
      }
    }

    // JS/TS files
    const jsFiles = await glob(`${this.baseDir}/**/*.{js,jsx,ts,tsx}`, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*'
      ]
    });

    let jsTotal = 0;
    let jsGzipped = 0;

    for (const file of jsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const size = Buffer.byteLength(content, 'utf8');
        const gzippedSize = gzipSync(content).length;
        
        jsTotal += size;
        jsGzipped += gzippedSize;
      } catch (error) {
        console.warn(`⚠️  Could not process ${file}:`, error);
      }
    }

    return {
      css: {
        total: cssTotal,
        gzipped: cssGzipped,
        files: cssFiles.length
      },
      js: {
        total: jsTotal,
        gzipped: jsGzipped,
        files: jsFiles.length
      }
    };
  }

  private async analyzeCodeMetrics() {
    console.log('📊 Analyzing code metrics...');

    const cssFiles = await glob(`${this.baseDir}/**/*.css`, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    let totalLines = 0;
    let duplicateRules = 0;
    const seenRules = new Map<string, number>();

    for (const file of cssFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        totalLines += lines.length;

        // Simple duplicate detection
        const ruleRegex = /([^{}]+)\s*\{([^{}]*)\}/g;
        let match;
        
        while ((match = ruleRegex.exec(content)) !== null) {
          const rule = match[1].trim() + '{' + match[2].trim() + '}';
          const count = seenRules.get(rule) || 0;
          seenRules.set(rule, count + 1);
          
          if (count > 0) {
            duplicateRules++;
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not analyze ${file}:`, error);
      }
    }

    // Calculate complexity score (0-100, lower is better)
    const complexityScore = Math.min(100, Math.round(
      (duplicateRules / Math.max(1, totalLines / 100)) * 10
    ));

    return {
      totalLines,
      duplicateRules,
      unusedSelectors: 0, // Would need more sophisticated analysis
      complexityScore
    };
  }

  private async estimateLoadingMetrics() {
    console.log('⚡ Estimating loading performance...');

    // Find critical CSS (typically index.css and design-system files)
    const criticalCSSFiles = await glob(`${this.baseDir}/src/{index,styles/design-tokens,styles/chanuka-design-system}.css`);
    
    let criticalCSSSize = 0;
    for (const file of criticalCSSFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        criticalCSSSize += Buffer.byteLength(content, 'utf8');
      } catch (error) {
        // File might not exist, continue
      }
    }

    // Count render-blocking resources (CSS imports)
    const allCSSFiles = await glob(`${this.baseDir}/**/*.css`);
    let renderBlockingResources = 0;

    for (const file of allCSSFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const imports = content.match(/@import/g) || [];
        renderBlockingResources += imports.length;
      } catch (error) {
        // Continue on error
      }
    }

    // Estimate performance metrics based on bundle size
    // These are rough estimates based on typical performance characteristics
    const estimatedFCP = Math.max(800, criticalCSSSize / 1000 + 500); // milliseconds
    const estimatedLCP = Math.max(1200, criticalCSSSize / 800 + 800); // milliseconds

    return {
      criticalCSSSize,
      renderBlockingResources,
      estimatedFCP,
      estimatedLCP
    };
  }

  private generateRecommendations(bundleSize: any, codeMetrics: any): string[] {
    const recommendations: string[] = [];

    // Bundle size recommendations
    if (bundleSize.css.total > 100000) { // 100KB
      recommendations.push('🗜️  CSS bundle is large (>100KB). Consider code splitting or removing unused styles.');
    }

    if (bundleSize.css.gzipped / bundleSize.css.total > 0.4) {
      recommendations.push('📦 CSS compression ratio is low. Consider minification and optimization.');
    }

    // Code quality recommendations
    if (codeMetrics.duplicateRules > 50) {
      recommendations.push(`🔄 Found ${codeMetrics.duplicateRules} duplicate CSS rules. Consider consolidation.`);
    }

    if (codeMetrics.complexityScore > 70) {
      recommendations.push('🧹 High CSS complexity detected. Consider refactoring for maintainability.');
    }

    // Performance recommendations
    recommendations.push(
      '🎯 Use CSS custom properties for consistent theming',
      '📱 Ensure critical CSS is inlined for faster rendering',
      '🔧 Consider using CSS-in-JS for truly dynamic styles only',
      '⚡ Implement CSS preloading for non-critical stylesheets'
    );

    return recommendations;
  }

  async compareWithBaseline(baselineFile: string): Promise<ComparisonResult | null> {
    if (!fs.existsSync(baselineFile)) {
      console.log('📊 No baseline found. Current metrics will be saved as baseline.');
      const currentMetrics = await this.auditPerformance();
      fs.writeFileSync(baselineFile, JSON.stringify(currentMetrics, null, 2));
      return null;
    }

    console.log('📈 Comparing with baseline...');
    
    const baseline: PerformanceMetrics = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    const current = await this.auditPerformance();

    const bundleSizeReduction = baseline.bundleSize.css.total - current.bundleSize.css.total;
    const bundleSizeReductionPercent = (bundleSizeReduction / baseline.bundleSize.css.total) * 100;
    const duplicateRulesReduction = baseline.codeMetrics.duplicateRules - current.codeMetrics.duplicateRules;
    
    // Calculate overall performance score (0-100, higher is better)
    const performanceScore = Math.max(0, Math.min(100, 
      50 + // Base score
      (bundleSizeReductionPercent * 2) + // Bundle size improvement
      (duplicateRulesReduction / 10) + // Duplicate rules improvement
      ((baseline.codeMetrics.complexityScore - current.codeMetrics.complexityScore) / 2) // Complexity improvement
    ));

    const comparison: ComparisonResult = {
      before: baseline,
      after: current,
      improvements: {
        bundleSizeReduction,
        bundleSizeReductionPercent,
        duplicateRulesReduction,
        performanceScore
      }
    };

    this.printComparison(comparison);
    return comparison;
  }

  private printAuditResults(metrics: PerformanceMetrics): void {
    console.log('\n📊 Performance Audit Results:');
    console.log('═══════════════════════════════');
    
    console.log('\n📦 Bundle Sizes:');
    console.log(`   CSS: ${this.formatBytes(metrics.bundleSize.css.total)} (${this.formatBytes(metrics.bundleSize.css.gzipped)} gzipped)`);
    console.log(`   JS:  ${this.formatBytes(metrics.bundleSize.js.total)} (${this.formatBytes(metrics.bundleSize.js.gzipped)} gzipped)`);
    console.log(`   Files: ${metrics.bundleSize.css.files} CSS, ${metrics.bundleSize.js.files} JS`);

    console.log('\n📊 Code Metrics:');
    console.log(`   Total lines: ${metrics.codeMetrics.totalLines.toLocaleString()}`);
    console.log(`   Duplicate rules: ${metrics.codeMetrics.duplicateRules}`);
    console.log(`   Complexity score: ${metrics.codeMetrics.complexityScore}/100`);

    console.log('\n⚡ Loading Metrics:');
    console.log(`   Critical CSS: ${this.formatBytes(metrics.loadingMetrics.criticalCSSSize)}`);
    console.log(`   Render-blocking resources: ${metrics.loadingMetrics.renderBlockingResources}`);
    console.log(`   Estimated FCP: ${Math.round(metrics.loadingMetrics.estimatedFCP)}ms`);
    console.log(`   Estimated LCP: ${Math.round(metrics.loadingMetrics.estimatedLCP)}ms`);

    console.log('\n💡 Recommendations:');
    metrics.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
  }

  private printComparison(comparison: ComparisonResult): void {
    console.log('\n📈 Performance Comparison:');
    console.log('═══════════════════════════════');

    const { improvements } = comparison;

    console.log(`\n📦 Bundle Size:`);
    if (improvements.bundleSizeReduction > 0) {
      console.log(`   ✅ Reduced by ${this.formatBytes(improvements.bundleSizeReduction)} (${improvements.bundleSizeReductionPercent.toFixed(1)}%)`);
    } else if (improvements.bundleSizeReduction < 0) {
      console.log(`   ⚠️  Increased by ${this.formatBytes(Math.abs(improvements.bundleSizeReduction))} (${Math.abs(improvements.bundleSizeReductionPercent).toFixed(1)}%)`);
    } else {
      console.log(`   ➡️  No change`);
    }

    console.log(`\n🔄 Duplicate Rules:`);
    if (improvements.duplicateRulesReduction > 0) {
      console.log(`   ✅ Reduced by ${improvements.duplicateRulesReduction} rules`);
    } else if (improvements.duplicateRulesReduction < 0) {
      console.log(`   ⚠️  Increased by ${Math.abs(improvements.duplicateRulesReduction)} rules`);
    } else {
      console.log(`   ➡️  No change`);
    }

    console.log(`\n🎯 Overall Performance Score: ${improvements.performanceScore.toFixed(1)}/100`);
    
    if (improvements.performanceScore >= 80) {
      console.log('   🎉 Excellent performance improvements!');
    } else if (improvements.performanceScore >= 60) {
      console.log('   ✅ Good performance improvements');
    } else if (improvements.performanceScore >= 40) {
      console.log('   ⚠️  Moderate improvements');
    } else {
      console.log('   ❌ Performance may have regressed');
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async generateReport(outputFile: string): Promise<void> {
    const metrics = await this.auditPerformance();
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      summary: {
        totalBundleSize: metrics.bundleSize.css.total + metrics.bundleSize.js.total,
        totalGzippedSize: metrics.bundleSize.css.gzipped + metrics.bundleSize.js.gzipped,
        compressionRatio: ((metrics.bundleSize.css.gzipped + metrics.bundleSize.js.gzipped) / 
                          (metrics.bundleSize.css.total + metrics.bundleSize.js.total) * 100).toFixed(1) + '%',
        performanceGrade: this.calculateGrade(metrics)
      }
    };

    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to ${outputFile}`);
  }

  private calculateGrade(metrics: PerformanceMetrics): string {
    let score = 100;
    
    // Deduct points for large bundle size
    if (metrics.bundleSize.css.total > 100000) score -= 20;
    else if (metrics.bundleSize.css.total > 50000) score -= 10;
    
    // Deduct points for duplicate rules
    score -= Math.min(30, metrics.codeMetrics.duplicateRules / 2);
    
    // Deduct points for complexity
    score -= metrics.codeMetrics.complexityScore / 5;
    
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const baseDir = args.find(arg => arg.startsWith('--dir='))?.split('=')[1] || 'client';
  
  const auditor = new PerformanceAuditor(baseDir);

  switch (command) {
    case 'compare':
      const baselineFile = args[1] || 'performance-baseline.json';
      await auditor.compareWithBaseline(baselineFile);
      break;
      
    case 'report':
      const outputFile = args[1] || 'performance-report.json';
      await auditor.generateReport(outputFile);
      break;
      
    default:
      await auditor.auditPerformance();
      break;
  }
}

// Export for programmatic use
export { PerformanceAuditor, type PerformanceMetrics, type ComparisonResult };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}