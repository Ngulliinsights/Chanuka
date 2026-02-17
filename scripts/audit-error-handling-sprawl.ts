#!/usr/bin/env node

/**
 * Error Handling Sprawl Audit Script
 * 
 * Comprehensive analysis of error handling patterns across the entire codebase
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface ErrorHandlingPattern {
  type: 'try-catch' | 'error-middleware' | 'error-class' | 'error-handler' | 'async-wrapper';
  file: string;
  location: string;
  pattern: string;
  category: ErrorCategory;
  consistency: 'consistent' | 'inconsistent' | 'legacy';
}

interface ErrorHandlingFile {
  path: string;
  relativePath: string;
  patterns: ErrorHandlingPattern[];
  errorClasses: string[];
  errorHandlers: string[];
  tryCatchBlocks: number;
  consistency: 'high' | 'medium' | 'low';
}

interface ErrorHandlingAuditReport {
  timestamp: Date;
  summary: {
    totalFiles: number;
    totalPatterns: number;
    tryCatchBlocks: number;
    errorClasses: number;
    errorHandlers: number;
    consistencyScore: number;
    estimatedSavings: {
      linesOfCode: number;
      errorHandlingOverhead: number;
      maintenanceEffort: number;
    };
  };
  categories: Record<ErrorCategory, {
    patterns: number;
    consistency: 'high' | 'medium' | 'low';
    priority: 'high' | 'medium' | 'low';
  }>;
  recommendations: ErrorHandlingRecommendation[];
}

type ErrorCategory = 
  | 'api-errors'
  | 'database-errors'
  | 'validation-errors'
  | 'authentication-errors'
  | 'authorization-errors'
  | 'network-errors'
  | 'file-system-errors'
  | 'business-logic-errors'
  | 'system-errors'
  | 'unknown-errors';

interface ErrorHandlingRecommendation {
  category: ErrorCategory;
  priority: 'high' | 'medium' | 'low';
  description: string;
  currentPatterns: number;
  targetPattern: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  benefits: string[];
}

class ErrorHandlingSprawlAuditor {
  private readonly rootDir = process.cwd();
  private errorFiles: ErrorHandlingFile[] = [];
  private allPatterns: ErrorHandlingPattern[] = [];

  async audit(): Promise<ErrorHandlingAuditReport> {
    console.log('🔍 Starting Error Handling Sprawl Audit...\n');

    await this.discoverErrorHandlingFiles();
    await this.analyzeErrorPatterns();
    const recommendations = this.generateRecommendations();
    const report = this.generateReport(recommendations);
    await this.saveReport(report);
    this.printSummary(report);

    return report;
  }

  private async discoverErrorHandlingFiles(): Promise<void> {
    console.log('📂 Discovering error handling patterns...');
    
    const files = await this.findAllSourceFiles();
    
    for (const file of files) {
      const errorFile = await this.analyzeErrorHandlingFile(file);
      if (errorFile && errorFile.patterns.length > 0) {
        this.errorFiles.push(errorFile);
      }
    }
    
    console.log(`   Found ${this.errorFiles.length} files with error handling\n`);
  }

  private async findAllSourceFiles(): Promise<string[]> {
    const patterns = ['**/*.ts', '**/*.js'];
    const excludePatterns = ['node_modules/**', 'dist/**', '**/*.d.ts'];
    
    const files: string[] = [];
    for (const pattern of patterns) {
      const foundFiles = await this.findFiles(pattern, excludePatterns);
      files.push(...foundFiles);
    }
    
    return files;
  }

  private async analyzeErrorHandlingFile(filePath: string): Promise<ErrorHandlingFile | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(this.rootDir, filePath);

      const patterns = this.extractErrorPatterns(content, filePath);
      const errorClasses = this.extractErrorClasses(content);
      const errorHandlers = this.extractErrorHandlers(content);
      const tryCatchBlocks = this.countTryCatchBlocks(content);
      const consistency = this.assessConsistency(patterns);

      if (patterns.length === 0 && tryCatchBlocks === 0 && errorClasses.length === 0) {
        return null;
      }

      return {
        path: filePath,
        relativePath,
        patterns,
        errorClasses,
        errorHandlers,
        tryCatchBlocks,
        consistency
      };
    } catch (error) {
      return null;
    }
  }

  private extractErrorPatterns(content: string, filePath: string): ErrorHandlingPattern[] {
    const patterns: ErrorHandlingPattern[] = [];
    
    // Find try-catch blocks
    const tryCatchRegex = /try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{[\s\S]*?}/g;
    let match;
    while ((match = tryCatchRegex.exec(content)) !== null) {
      patterns.push({
        type: 'try-catch',
        file: filePath,
        location: `${filePath}:${this.getLineNumber(content, match.index)}`,
        pattern: match[0].substring(0, 100) + '...',
        category: this.categorizeErrorPattern(match[0]),
        consistency: this.assessPatternConsistency(match[0])
      });
    }

    // Find error middleware
    const middlewareRegex = /\(.*error.*req.*res.*next.*\)|errorHandler|error.*middleware/gi;
    while ((match = middlewareRegex.exec(content)) !== null) {
      patterns.push({
        type: 'error-middleware',
        file: filePath,
        location: `${filePath}:${this.getLineNumber(content, match.index)}`,
        pattern: match[0],
        category: 'api-errors',
        consistency: 'consistent'
      });
    }

    return patterns;
  }

  private extractErrorClasses(content: string): string[] {
    const errorClasses: string[] = [];
    const classRegex = /class\s+(\w*Error)\s+extends/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      errorClasses.push(match[1]);
    }
    
    return errorClasses;
  }

  private extractErrorHandlers(content: string): string[] {
    const handlers: string[] = [];
    const handlerRegex = /(?:function|const)\s+(\w*[Ee]rror[Hh]andler?\w*)/g;
    let match;
    
    while ((match = handlerRegex.exec(content)) !== null) {
      handlers.push(match[1]);
    }
    
    return handlers;
  }

  private countTryCatchBlocks(content: string): number {
    const matches = content.match(/try\s*{/g);
    return matches ? matches.length : 0;
  }

  private categorizeErrorPattern(pattern: string): ErrorCategory {
    const patternLower = pattern.toLowerCase();
    
    if (patternLower.includes('validation') || patternLower.includes('zod')) return 'validation-errors';
    if (patternLower.includes('auth') || patternLower.includes('token')) return 'authentication-errors';
    if (patternLower.includes('permission') || patternLower.includes('forbidden')) return 'authorization-errors';
    if (patternLower.includes('database') || patternLower.includes('sql')) return 'database-errors';
    if (patternLower.includes('network') || patternLower.includes('fetch')) return 'network-errors';
    if (patternLower.includes('file') || patternLower.includes('fs')) return 'file-system-errors';
    if (patternLower.includes('api') || patternLower.includes('response')) return 'api-errors';
    
    return 'unknown-errors';
  }

  private assessPatternConsistency(pattern: string): 'consistent' | 'inconsistent' | 'legacy' {
    // Simple heuristic for consistency
    if (pattern.includes('logger.error') || pattern.includes('ApiError')) return 'consistent';
    if (pattern.includes('console.log') || pattern.includes('console.error')) return 'legacy';
    return 'inconsistent';
  }

  private assessConsistency(patterns: ErrorHandlingPattern[]): 'high' | 'medium' | 'low' {
    if (patterns.length === 0) return 'high';
    
    const consistentPatterns = patterns.filter(p => p.consistency === 'consistent').length;
    const consistencyRatio = consistentPatterns / patterns.length;
    
    if (consistencyRatio > 0.8) return 'high';
    if (consistencyRatio > 0.5) return 'medium';
    return 'low';
  }

  private async analyzeErrorPatterns(): Promise<void> {
    console.log('🔬 Analyzing error handling patterns...');
    
    for (const file of this.errorFiles) {
      this.allPatterns.push(...file.patterns);
    }
    
    console.log(`   Analyzed ${this.allPatterns.length} error handling patterns\n`);
  }

  private generateRecommendations(): ErrorHandlingRecommendation[] {
    const recommendations: ErrorHandlingRecommendation[] = [];
    
    // Group patterns by category
    const categoryGroups = new Map<ErrorCategory, ErrorHandlingPattern[]>();
    
    for (const pattern of this.allPatterns) {
      if (!categoryGroups.has(pattern.category)) {
        categoryGroups.set(pattern.category, []);
      }
      categoryGroups.get(pattern.category)!.push(pattern);
    }

    // Generate recommendations for each category
    for (const [category, patterns] of categoryGroups) {
      const inconsistentPatterns = patterns.filter(p => p.consistency !== 'consistent').length;
      
      if (inconsistentPatterns > 5 || patterns.length > 10) {
        recommendations.push({
          category,
          priority: inconsistentPatterns > 10 ? 'high' : 'medium',
          description: `Standardize ${patterns.length} ${category.replace('-', ' ')} patterns`,
          currentPatterns: patterns.length,
          targetPattern: 'UnifiedErrorSystem.wrapAsync() with centralized error handling',
          estimatedEffort: patterns.length > 20 ? 'high' : patterns.length > 10 ? 'medium' : 'low',
          benefits: [
            `Eliminate ${inconsistentPatterns} inconsistent error patterns`,
            `Reduce error handling code by ~${patterns.length * 5} lines`,
            'Improve error correlation and debugging',
            'Standardize error response formats'
          ]
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private generateReport(recommendations: ErrorHandlingRecommendation[]): ErrorHandlingAuditReport {
    const totalPatterns = this.allPatterns.length;
    const tryCatchBlocks = this.errorFiles.reduce((sum, f) => sum + f.tryCatchBlocks, 0);
    const errorClasses = this.errorFiles.reduce((sum, f) => sum + f.errorClasses.length, 0);
    const errorHandlers = this.errorFiles.reduce((sum, f) => sum + f.errorHandlers.length, 0);
    
    const consistentPatterns = this.allPatterns.filter(p => p.consistency === 'consistent').length;
    const consistencyScore = totalPatterns > 0 ? (consistentPatterns / totalPatterns) * 100 : 100;

    // Calculate categories
    const categories: Record<ErrorCategory, any> = {} as unknown;
    const categoryStats = new Map<ErrorCategory, { patterns: number; consistency: string }>();

    for (const pattern of this.allPatterns) {
      const stats = categoryStats.get(pattern.category) || { patterns: 0, consistency: 'high' };
      stats.patterns++;
      categoryStats.set(pattern.category, stats);
    }

    for (const [category, stats] of categoryStats) {
      const categoryPatterns = this.allPatterns.filter(p => p.category === category);
      const categoryConsistent = categoryPatterns.filter(p => p.consistency === 'consistent').length;
      const categoryConsistency = categoryPatterns.length > 0 
        ? (categoryConsistent / categoryPatterns.length) > 0.8 ? 'high' 
        : (categoryConsistent / categoryPatterns.length) > 0.5 ? 'medium' : 'low'
        : 'high';

      categories[category] = {
        patterns: stats.patterns,
        consistency: categoryConsistency,
        priority: stats.patterns > 10 ? 'high' : stats.patterns > 5 ? 'medium' : 'low'
      };
    }

    return {
      timestamp: new Date(),
      summary: {
        totalFiles: this.errorFiles.length,
        totalPatterns,
        tryCatchBlocks,
        errorClasses,
        errorHandlers,
        consistencyScore,
        estimatedSavings: {
          linesOfCode: tryCatchBlocks * 8, // Average lines per try-catch
          errorHandlingOverhead: Math.round((100 - consistencyScore) / 2), // Percentage reduction
          maintenanceEffort: Math.round(100 - consistencyScore) // Percentage reduction
        }
      },
      categories,
      recommendations
    };
  }

  private async saveReport(report: ErrorHandlingAuditReport): Promise<void> {
    const reportPath = path.join(this.rootDir, 'ERROR_HANDLING_SPRAWL_AUDIT_REPORT.md');
    
    const markdown = `# Error Handling Sprawl Audit Report

**Generated:** ${report.timestamp.toISOString()}

## Executive Summary

- **Files with Error Handling:** ${report.summary.totalFiles}
- **Total Error Patterns:** ${report.summary.totalPatterns}
- **Try-Catch Blocks:** ${report.summary.tryCatchBlocks}
- **Error Classes:** ${report.summary.errorClasses}
- **Error Handlers:** ${report.summary.errorHandlers}
- **Consistency Score:** ${report.summary.consistencyScore.toFixed(1)}%

### Estimated Savings
- **Lines of Code:** ${report.summary.estimatedSavings.linesOfCode}
- **Error Handling Overhead:** ${report.summary.estimatedSavings.errorHandlingOverhead}% reduction
- **Maintenance Effort:** ${report.summary.estimatedSavings.maintenanceEffort}% reduction

## Category Analysis

${Object.entries(report.categories).map(([category, stats]) => `
### ${category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
- **Patterns:** ${stats.patterns}
- **Consistency:** ${stats.consistency.toUpperCase()}
- **Priority:** ${stats.priority.toUpperCase()}
`).join('')}

## Consolidation Recommendations

${report.recommendations.map((rec, index) => `
### ${index + 1}. ${rec.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
- **Priority:** ${rec.priority.toUpperCase()}
- **Current Patterns:** ${rec.currentPatterns}
- **Target Pattern:** ${rec.targetPattern}
- **Effort:** ${rec.estimatedEffort.toUpperCase()}

**Description:** ${rec.description}

**Benefits:**
${rec.benefits.map(benefit => `- ${benefit}`).join('\n')}
`).join('')}

## Next Steps

1. **Implement unified error handling system**
2. **Replace manual try-catch blocks with error wrappers**
3. **Standardize error response formats**
4. **Add error correlation and tracking**
5. **Create centralized error recovery mechanisms**

---

*Generated by error handling sprawl audit script*
`;

    await fs.writeFile(reportPath, markdown, 'utf-8');
    console.log(`📄 Report saved: ${reportPath}`);
  }

  private printSummary(report: ErrorHandlingAuditReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ERROR HANDLING SPRAWL AUDIT SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`📁 Files with Error Handling: ${report.summary.totalFiles}`);
    console.log(`🔧 Total Error Patterns: ${report.summary.totalPatterns}`);
    console.log(`🔄 Try-Catch Blocks: ${report.summary.tryCatchBlocks}`);
    console.log(`📈 Consistency Score: ${report.summary.consistencyScore.toFixed(1)}%`);
    
    console.log('\n💰 Estimated Savings:');
    console.log(`   📝 Lines of Code: ${report.summary.estimatedSavings.linesOfCode}`);
    console.log(`   ⚡ Error Overhead: ${report.summary.estimatedSavings.errorHandlingOverhead}% reduction`);
    console.log(`   🛠️  Maintenance: ${report.summary.estimatedSavings.maintenanceEffort}% reduction`);
    
    console.log('\n🚀 Next Command:');
    console.log('   npm run migrate:error-handling');
  }

  // Utility methods
  private async findFiles(pattern: string, excludePatterns: string[]): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const result = execSync(`find . -name "${pattern}" -type f`, { 
        cwd: this.rootDir, 
        encoding: 'utf-8' 
      });
      
      const foundFiles = result.split('\n').filter(f => f.trim());
      
      for (const file of foundFiles) {
        const shouldExclude = excludePatterns.some(exclude => 
          file.includes(exclude.replace('/**', ''))
        );
        
        if (!shouldExclude) {
          files.push(path.resolve(this.rootDir, file));
        }
      }
    } catch {
      // Handle error
    }
    
    return files;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
}

// Main execution
const auditor = new ErrorHandlingSprawlAuditor();
auditor.audit()
  .then(() => {
    console.log('\n✅ Error handling sprawl audit completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  });

export { ErrorHandlingSprawlAuditor };
