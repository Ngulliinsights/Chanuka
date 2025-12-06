#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes CSS bundle size and identifies optimization opportunities
 */

import fs from 'fs';
import path from 'path';

import { glob } from 'glob';

interface CSSAnalysis {
  totalSize: number;
  gzippedSize: number;
  files: {
    path: string;
    size: number;
    duplicateRules: number;
    unusedSelectors: number;
  }[];
  duplicateRules: {
    rule: string;
    count: number;
    files: string[];
  }[];
  recommendations: string[];
}

interface CSSRule {
  selector: string;
  properties: string[];
  file: string;
  line: number;
}

class CSSAnalyzer {
  private cssFiles: string[] = [];
  private rules: CSSRule[] = [];

  async analyzeCSSBundle(directory: string): Promise<CSSAnalysis> {
    console.log('🔍 Analyzing CSS bundle...');

    // Find all CSS files
    this.cssFiles = await glob(`${directory}/**/*.css`, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    console.log(`📁 Found ${this.cssFiles.length} CSS files`);

    // Parse CSS files
    await this.parseAllCSSFiles();

    // Analyze for duplicates and issues
    const analysis = await this.performAnalysis();

    this.printAnalysis(analysis);
    return analysis;
  }

  private async parseAllCSSFiles(): Promise<void> {
    for (const file of this.cssFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        this.parseCSSFile(content, file);
      } catch (error) {
        console.warn(`⚠️  Could not parse ${file}:`, error);
      }
    }
  }

  private parseCSSFile(content: string, filePath: string): void {
    // Simple CSS parser - matches basic rules
    const ruleRegex = /([^{}]+)\s*\{([^{}]*)\}/g;
    let match;
    let lineNumber = 1;

    while ((match = ruleRegex.exec(content)) !== null) {
      const selector = match[1].trim();
      const properties = match[2]
        .split(';')
        .map(prop => prop.trim())
        .filter(prop => prop.length > 0);

      if (selector && properties.length > 0) {
        this.rules.push({
          selector,
          properties,
          file: filePath,
          line: lineNumber
        });
      }

      // Count lines for better error reporting
      lineNumber += (match[0].match(/\n/g) || []).length;
    }
  }

  private async performAnalysis(): Promise<CSSAnalysis> {
    const totalSize = this.calculateTotalSize();
    const gzippedSize = this.estimateGzippedSize(totalSize);
    const duplicateRules = this.findDuplicateRules();
    const fileAnalysis = this.analyzeFiles();
    const recommendations = this.generateRecommendations(duplicateRules, fileAnalysis);

    return {
      totalSize,
      gzippedSize,
      files: fileAnalysis,
      duplicateRules,
      recommendations
    };
  }

  private calculateTotalSize(): number {
    return this.cssFiles.reduce((total, file) => {
      try {
        const stats = fs.statSync(file);
        return total + stats.size;
      } catch {
        return total;
      }
    }, 0);
  }

  private estimateGzippedSize(totalSize: number): number {
    // Rough estimation: CSS typically compresses to ~25% of original size
    return Math.round(totalSize * 0.25);
  }

  private findDuplicateRules(): { rule: string; count: number; files: string[] }[] {
    const ruleMap = new Map<string, { count: number; files: Set<string> }>();

    this.rules.forEach(rule => {
      const ruleKey = `${rule.selector}:${rule.properties.sort().join(';')}`;
      
      if (!ruleMap.has(ruleKey)) {
        ruleMap.set(ruleKey, { count: 0, files: new Set() });
      }

      const entry = ruleMap.get(ruleKey)!;
      entry.count++;
      entry.files.add(rule.file);
    });

    return Array.from(ruleMap.entries())
      .filter(([_, data]) => data.count > 1)
      .map(([rule, data]) => ({
        rule: rule.split(':')[0], // Just the selector part
        count: data.count,
        files: Array.from(data.files)
      }))
      .sort((a, b) => b.count - a.count);
  }

  private analyzeFiles(): { path: string; size: number; duplicateRules: number; unusedSelectors: number }[] {
    return this.cssFiles.map(file => {
      const stats = fs.statSync(file);
      const fileRules = this.rules.filter(rule => rule.file === file);
      
      // Count duplicate rules within this file
      const selectorCounts = new Map<string, number>();
      fileRules.forEach(rule => {
        const count = selectorCounts.get(rule.selector) || 0;
        selectorCounts.set(rule.selector, count + 1);
      });

      const duplicateRules = Array.from(selectorCounts.values())
        .filter(count => count > 1)
        .reduce((sum, count) => sum + count - 1, 0);

      return {
        path: file,
        size: stats.size,
        duplicateRules,
        unusedSelectors: 0 // Would need more sophisticated analysis
      };
    });
  }

  private generateRecommendations(
    duplicateRules: { rule: string; count: number; files: string[] }[],
    fileAnalysis: { path: string; size: number; duplicateRules: number }[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for duplicate rules across files
    if (duplicateRules.length > 0) {
      recommendations.push(
        `🔄 Found ${duplicateRules.length} duplicate CSS rules across files. Consider consolidating them.`
      );
    }

    // Check for large files
    const largeFiles = fileAnalysis.filter(file => file.size > 50000); // 50KB
    if (largeFiles.length > 0) {
      recommendations.push(
        `📦 ${largeFiles.length} CSS files are larger than 50KB. Consider splitting or optimizing them.`
      );
    }

    // Check for files with many duplicates
    const filesWithDuplicates = fileAnalysis.filter(file => file.duplicateRules > 5);
    if (filesWithDuplicates.length > 0) {
      recommendations.push(
        `🔍 ${filesWithDuplicates.length} files have significant internal duplication. Review for consolidation opportunities.`
      );
    }

    // General recommendations
    recommendations.push(
      '🎯 Consider using CSS custom properties for repeated values',
      '📱 Ensure critical CSS is inlined for better performance',
      '🗜️  Use CSS minification and compression in production',
      '🧹 Remove unused CSS selectors with tools like PurgeCSS'
    );

    return recommendations;
  }

  private printAnalysis(analysis: CSSAnalysis): void {
    console.log('\n📊 CSS Bundle Analysis Results:');
    console.log(`   📏 Total size: ${this.formatBytes(analysis.totalSize)}`);
    console.log(`   🗜️  Estimated gzipped: ${this.formatBytes(analysis.gzippedSize)}`);
    console.log(`   📁 Files analyzed: ${analysis.files.length}`);
    console.log(`   🔄 Duplicate rules: ${analysis.duplicateRules.length}`);

    if (analysis.duplicateRules.length > 0) {
      console.log('\n🔄 Top Duplicate Rules:');
      analysis.duplicateRules.slice(0, 5).forEach(rule => {
        console.log(`   ${rule.rule} (${rule.count} times across ${rule.files.length} files)`);
      });
    }

    console.log('\n📋 File Analysis:');
    analysis.files
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach(file => {
        const fileName = path.basename(file.path);
        console.log(`   ${fileName}: ${this.formatBytes(file.size)} (${file.duplicateRules} duplicates)`);
      });

    console.log('\n💡 Recommendations:');
    analysis.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Performance comparison utility
class PerformanceComparator {
  async compareBeforeAfter(beforeDir: string, afterDir: string): Promise<void> {
    console.log('⚖️  Comparing CSS performance before and after migration...');

    const beforeAnalyzer = new CSSAnalyzer();
    const afterAnalyzer = new CSSAnalyzer();

    const beforeAnalysis = await beforeAnalyzer.analyzeCSSBundle(beforeDir);
    const afterAnalysis = await afterAnalyzer.analyzeCSSBundle(afterDir);

    this.printComparison(beforeAnalysis, afterAnalysis);
  }

  private printComparison(before: CSSAnalysis, after: CSSAnalysis): void {
    const sizeDiff = after.totalSize - before.totalSize;
    const sizeDiffPercent = ((sizeDiff / before.totalSize) * 100).toFixed(1);
    const duplicatesDiff = after.duplicateRules.length - before.duplicateRules.length;

    console.log('\n📈 Performance Comparison:');
    console.log(`   📏 Size change: ${this.formatBytes(Math.abs(sizeDiff))} (${sizeDiffPercent}%)`);
    console.log(`   🔄 Duplicate rules change: ${duplicatesDiff}`);
    
    if (sizeDiff < 0) {
      console.log('   ✅ Bundle size reduced! 🎉');
    } else if (sizeDiff > 0) {
      console.log('   ⚠️  Bundle size increased');
    } else {
      console.log('   ➡️  Bundle size unchanged');
    }

    if (duplicatesDiff < 0) {
      console.log('   ✅ Fewer duplicate rules! 🎉');
    } else if (duplicatesDiff > 0) {
      console.log('   ⚠️  More duplicate rules detected');
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'compare') {
    const beforeDir = args[1] || 'client/src';
    const afterDir = args[2] || 'client/src';
    const comparator = new PerformanceComparator();
    await comparator.compareBeforeAfter(beforeDir, afterDir);
  } else {
    const directory = args[0] || 'client/src';
    const analyzer = new CSSAnalyzer();
    await analyzer.analyzeCSSBundle(directory);
  }
}

// Export for programmatic use
export { CSSAnalyzer, PerformanceComparator };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}