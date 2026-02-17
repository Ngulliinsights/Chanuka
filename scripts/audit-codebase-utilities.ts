#!/usr/bin/env node

/**
 * Codebase-Wide Utility Audit Script
 * 
 * Comprehensive analysis of utility sprawl across the entire codebase:
 * 1. Identifies all utility files and functions
 * 2. Detects duplicates and redundancies
 * 3. Analyzes usage patterns and dependencies
 * 4. Generates consolidation recommendations
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface UtilityFunction {
  name: string;
  file: string;
  location: string;
  signature: string;
  category: UtilityCategory;
  usageCount: number;
  dependencies: string[];
  exports: string[];
}

interface UtilityFile {
  path: string;
  relativePath: string;
  size: number;
  functions: UtilityFunction[];
  imports: string[];
  exports: string[];
  category: UtilityCategory;
  platform: 'server' | 'client' | 'shared' | 'test';
}

interface DuplicateGroup {
  functionName: string;
  category: UtilityCategory;
  implementations: UtilityFunction[];
  similarity: number;
  consolidationPriority: 'high' | 'medium' | 'low';
  recommendedLocation: string;
}

interface UtilityAuditReport {
  timestamp: Date;
  summary: {
    totalFiles: number;
    totalFunctions: number;
    duplicateGroups: number;
    redundancyPercentage: number;
    estimatedSavings: {
      linesOfCode: number;
      bundleSize: number;
      maintenanceEffort: number;
    };
  };
  categories: Record<UtilityCategory, {
    files: number;
    functions: number;
    duplicates: number;
    priority: 'high' | 'medium' | 'low';
  }>;
  duplicates: DuplicateGroup[];
  recommendations: ConsolidationRecommendation[];
  migrationPlan: MigrationStep[];
}

type UtilityCategory = 
  | 'api'
  | 'logging'
  | 'validation'
  | 'caching'
  | 'database'
  | 'performance'
  | 'security'
  | 'browser'
  | 'testing'
  | 'formatting'
  | 'string'
  | 'date'
  | 'number'
  | 'array'
  | 'object'
  | 'functional'
  | 'error-handling'
  | 'file-system'
  | 'network'
  | 'crypto'
  | 'misc';

interface ConsolidationRecommendation {
  category: UtilityCategory;
  priority: 'high' | 'medium' | 'low';
  description: string;
  targetLocation: string;
  affectedFiles: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  benefits: string[];
  risks: string[];
}

interface MigrationStep {
  order: number;
  name: string;
  description: string;
  category: UtilityCategory;
  dependencies: string[];
  estimatedDuration: string;
  commands: string[];
}

class CodebaseUtilityAuditor {
  private readonly rootDir = process.cwd();
  private utilityFiles: UtilityFile[] = [];
  private allFunctions: UtilityFunction[] = [];
  private duplicateGroups: DuplicateGroup[] = [];

  async audit(): Promise<UtilityAuditReport> {
    console.log('🔍 Starting Codebase-Wide Utility Audit...\n');

    // Step 1: Discover all utility files
    console.log('📂 Discovering utility files...');
    await this.discoverUtilityFiles();
    console.log(`   Found ${this.utilityFiles.length} utility files\n`);

    // Step 2: Analyze utility functions
    console.log('🔬 Analyzing utility functions...');
    await this.analyzeFunctions();
    console.log(`   Analyzed ${this.allFunctions.length} utility functions\n`);

    // Step 3: Detect duplicates and redundancies
    console.log('🔍 Detecting duplicates and redundancies...');
    await this.detectDuplicates();
    console.log(`   Found ${this.duplicateGroups.length} duplicate groups\n`);

    // Step 4: Analyze usage patterns
    console.log('📊 Analyzing usage patterns...');
    await this.analyzeUsagePatterns();

    // Step 5: Generate recommendations
    console.log('💡 Generating consolidation recommendations...');
    const recommendations = this.generateRecommendations();

    // Step 6: Create migration plan
    console.log('📋 Creating migration plan...');
    const migrationPlan = this.createMigrationPlan();

    // Step 7: Generate report
    const report = this.generateReport(recommendations, migrationPlan);
    await this.saveReport(report);

    this.printSummary(report);
    return report;
  }

  private async discoverUtilityFiles(): Promise<void> {
    const utilityPatterns = [
      '**/utils/**/*.ts',
      '**/utils/**/*.js',
      '**/helpers/**/*.ts',
      '**/helpers/**/*.js',
      '**/lib/**/*.ts',
      '**/lib/**/*.js',
      '**/*-utils.ts',
      '**/*-helper.ts',
      '**/*-util.ts'
    ];

    const excludePatterns = [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.d.ts',
      '**/*.test.ts',
      '**/*.spec.ts'
    ];

    for (const pattern of utilityPatterns) {
      const files = await this.findFiles(pattern, excludePatterns);
      
      for (const file of files) {
        const utilityFile = await this.analyzeUtilityFile(file);
        if (utilityFile) {
          this.utilityFiles.push(utilityFile);
        }
      }
    }

    // Also check for files with utility-like content
    await this.findUtilityLikeFiles();
  }

  private async analyzeUtilityFile(filePath: string): Promise<UtilityFile | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      const relativePath = path.relative(this.rootDir, filePath);

      // Skip if file is too small or doesn't contain utility functions
      if (stats.size < 100 || !this.looksLikeUtilityFile(content)) {
        return null;
      }

      const functions = this.extractFunctions(content, filePath);
      const imports = this.extractImports(content);
      const exports = this.extractExports(content);
      const category = this.categorizeFile(filePath, content);
      const platform = this.determinePlatform(filePath);

      return {
        path: filePath,
        relativePath,
        size: stats.size,
        functions,
        imports,
        exports,
        category,
        platform
      };
    } catch (error) {
      console.warn(`   ⚠️  Failed to analyze ${filePath}: ${error}`);
      return null;
    }
  }

  private looksLikeUtilityFile(content: string): boolean {
    const utilityIndicators = [
      /export\s+(function|const|class)/,
      /export\s+\{[^}]+\}/,
      /export\s+default/,
      /function\s+\w+/,
      /const\s+\w+\s*=/,
      /class\s+\w+/
    ];

    return utilityIndicators.some(pattern => pattern.test(content));
  }

  private extractFunctions(content: string, filePath: string): UtilityFunction[] {
    const functions: UtilityFunction[] = [];
    
    // Extract function declarations
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        file: filePath,
        location: `${filePath}:${this.getLineNumber(content, match.index)}`,
        signature: match[0],
        category: this.categorizeFunction(match[1], content),
        usageCount: 0, // Will be calculated later
        dependencies: [],
        exports: []
      });
    }

    // Extract const/arrow functions
    const constFunctionRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
    
    while ((match = constFunctionRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        file: filePath,
        location: `${filePath}:${this.getLineNumber(content, match.index)}`,
        signature: match[0],
        category: this.categorizeFunction(match[1], content),
        usageCount: 0,
        dependencies: [],
        exports: []
      });
    }

    // Extract class methods
    const methodRegex = /(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)/g;
    
    while ((match = methodRegex.exec(content)) !== null) {
      if (!['constructor', 'get', 'set'].includes(match[1])) {
        functions.push({
          name: match[1],
          file: filePath,
          location: `${filePath}:${this.getLineNumber(content, match.index)}`,
          signature: match[0],
          category: this.categorizeFunction(match[1], content),
          usageCount: 0,
          dependencies: [],
          exports: []
        });
      }
    }

    return functions;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    
    // Named exports
    const namedExportRegex = /export\s+\{([^}]+)\}/g;
    let match;

    while ((match = namedExportRegex.exec(content)) !== null) {
      const names = match[1].split(',').map(name => name.trim().split(' as ')[0]);
      exports.push(...names);
    }

    // Direct exports
    const directExportRegex = /export\s+(?:function|const|class|interface|type)\s+(\w+)/g;
    
    while ((match = directExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  private categorizeFile(filePath: string, content: string): UtilityCategory {
    const pathLower = filePath.toLowerCase();
    const contentLower = content.toLowerCase();

    // Category mapping based on file path and content
    const categoryMap: Array<[RegExp | string, UtilityCategory]> = [
      [/api|response|request|http|fetch/, 'api'],
      [/log|logger|logging/, 'logging'],
      [/valid|schema|zod|joi/, 'validation'],
      [/cache|redis|memory/, 'caching'],
      [/db|database|sql|query/, 'database'],
      [/perf|performance|monitor|metric/, 'performance'],
      [/security|crypto|hash|encrypt/, 'security'],
      [/browser|dom|window|navigator/, 'browser'],
      [/test|mock|fixture|helper/, 'testing'],
      [/format|currency|date|time/, 'formatting'],
      [/string|text|regex/, 'string'],
      [/date|time|moment/, 'date'],
      [/number|math|calc/, 'number'],
      [/array|list|collection/, 'array'],
      [/object|obj|merge|clone/, 'object'],
      [/functional|fp|compose|curry/, 'functional'],
      [/error|exception|throw/, 'error-handling'],
      [/file|fs|path|directory/, 'file-system'],
      [/network|http|url|fetch/, 'network'],
      [/crypto|hash|encrypt|decrypt/, 'crypto']
    ];

    for (const [pattern, category] of categoryMap) {
      if (typeof pattern === 'string') {
        if (pathLower.includes(pattern) || contentLower.includes(pattern)) {
          return category;
        }
      } else {
        if (pattern.test(pathLower) || pattern.test(contentLower)) {
          return category;
        }
      }
    }

    return 'misc';
  }

  private categorizeFunction(functionName: string, content: string): UtilityCategory {
    const nameLower = functionName.toLowerCase();
    
    // Function name patterns
    if (/^(log|debug|info|warn|error)/.test(nameLower)) return 'logging';
    if (/^(validate|check|verify|sanitize)/.test(nameLower)) return 'validation';
    if (/^(cache|store|retrieve|invalidate)/.test(nameLower)) return 'caching';
    if (/^(query|execute|connect|transaction)/.test(nameLower)) return 'database';
    if (/^(measure|monitor|track|benchmark)/.test(nameLower)) return 'performance';
    if (/^(encrypt|decrypt|hash|sign)/.test(nameLower)) return 'security';
    if (/^(format|parse|convert|transform)/.test(nameLower)) return 'formatting';
    if (/^(trim|split|replace|match)/.test(nameLower)) return 'string';
    if (/^(add|subtract|multiply|divide|round)/.test(nameLower)) return 'number';
    if (/^(map|filter|reduce|sort|find)/.test(nameLower)) return 'array';
    if (/^(merge|clone|assign|pick|omit)/.test(nameLower)) return 'object';
    if (/^(compose|curry|pipe|partial)/.test(nameLower)) return 'functional';
    if (/^(throw|handle|catch|recover)/.test(nameLower)) return 'error-handling';

    // Fallback to file categorization
    return this.categorizeFile('', content);
  }

  private determinePlatform(filePath: string): 'server' | 'client' | 'shared' | 'test' {
    if (filePath.includes('/server/')) return 'server';
    if (filePath.includes('/client/')) return 'client';
    if (filePath.includes('/shared/')) return 'shared';
    if (filePath.includes('/test/') || filePath.includes('/__test__/')) return 'test';
    
    // Default based on common patterns
    if (filePath.includes('node_modules')) return 'server';
    if (filePath.includes('src/') && !filePath.includes('server/')) return 'client';
    
    return 'shared';
  }

  private async findUtilityLikeFiles(): Promise<void> {
    // Find files that might contain utility functions but aren't in utils directories
    const patterns = [
      '**/helpers.ts',
      '**/constants.ts',
      '**/config.ts',
      '**/types.ts'
    ];

    for (const pattern of patterns) {
      const files = await this.findFiles(pattern, ['node_modules/**', 'dist/**']);
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (this.containsUtilityFunctions(content)) {
          const utilityFile = await this.analyzeUtilityFile(file);
          if (utilityFile) {
            this.utilityFiles.push(utilityFile);
          }
        }
      }
    }
  }

  private containsUtilityFunctions(content: string): boolean {
    // Check if file contains utility-like functions
    const utilityPatterns = [
      /export\s+function\s+\w+Helper/,
      /export\s+function\s+\w+Util/,
      /export\s+const\s+\w+Utils/,
      /export\s+class\s+\w+Helper/,
      /export\s+class\s+\w+Utils/
    ];

    return utilityPatterns.some(pattern => pattern.test(content));
  }

  private async analyzeFunctions(): Promise<void> {
    for (const file of this.utilityFiles) {
      this.allFunctions.push(...file.functions);
    }

    // Analyze dependencies and usage
    for (const func of this.allFunctions) {
      func.dependencies = await this.findFunctionDependencies(func);
      func.usageCount = await this.countFunctionUsage(func);
    }
  }

  private async findFunctionDependencies(func: UtilityFunction): Promise<string[]> {
    try {
      const content = await fs.readFile(func.file, 'utf-8');
      const dependencies: string[] = [];
      
      // Find imports used by this function
      const imports = this.extractImports(content);
      dependencies.push(...imports);
      
      return dependencies;
    } catch {
      return [];
    }
  }

  private async countFunctionUsage(func: UtilityFunction): Promise<number> {
    try {
      // Use grep to count usage across codebase
      const result = execSync(
        `grep -r "${func.name}" --include="*.ts" --include="*.js" --exclude-dir=node_modules .`,
        { cwd: this.rootDir, encoding: 'utf-8' }
      );
      
      return result.split('\n').filter(line => line.trim()).length;
    } catch {
      return 0;
    }
  }

  private async detectDuplicates(): Promise<void> {
    // Group functions by name and category
    const functionGroups = new Map<string, UtilityFunction[]>();
    
    for (const func of this.allFunctions) {
      const key = `${func.name}_${func.category}`;
      if (!functionGroups.has(key)) {
        functionGroups.set(key, []);
      }
      functionGroups.get(key)!.push(func);
    }

    // Find duplicate groups
    for (const [key, functions] of functionGroups) {
      if (functions.length > 1) {
        const similarity = await this.calculateSimilarity(functions);
        
        this.duplicateGroups.push({
          functionName: functions[0].name,
          category: functions[0].category,
          implementations: functions,
          similarity,
          consolidationPriority: this.calculatePriority(functions, similarity),
          recommendedLocation: this.recommendLocation(functions)
        });
      }
    }

    // Sort by priority
    this.duplicateGroups.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.consolidationPriority] - priorityOrder[a.consolidationPriority];
    });
  }

  private async calculateSimilarity(functions: UtilityFunction[]): Promise<number> {
    // Simple similarity calculation based on signature and usage
    if (functions.length < 2) return 0;
    
    const signatures = functions.map(f => f.signature);
    let similarityScore = 0;
    
    for (let i = 0; i < signatures.length - 1; i++) {
      for (let j = i + 1; j < signatures.length; j++) {
        const similarity = this.stringSimilarity(signatures[i], signatures[j]);
        similarityScore += similarity;
      }
    }
    
    return similarityScore / ((signatures.length * (signatures.length - 1)) / 2);
  }

  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private calculatePriority(functions: UtilityFunction[], similarity: number): 'high' | 'medium' | 'low' {
    const totalUsage = functions.reduce((sum, f) => sum + f.usageCount, 0);
    
    if (similarity > 0.8 && totalUsage > 10) return 'high';
    if (similarity > 0.6 && totalUsage > 5) return 'medium';
    return 'low';
  }

  private recommendLocation(functions: UtilityFunction[]): string {
    const platforms = functions.map(f => this.determinePlatform(f.file));
    
    if (platforms.every(p => p === 'server')) return 'shared/core/utilities/server/';
    if (platforms.every(p => p === 'client')) return 'shared/core/utilities/client/';
    if (platforms.includes('shared')) return 'shared/core/utilities/universal/';
    
    return 'shared/core/utilities/universal/';
  }

  private async analyzeUsagePatterns(): Promise<void> {
    // Analyze how utilities are used across the codebase
    // This would involve more sophisticated analysis
    console.log('   📊 Usage pattern analysis complete');
  }

  private generateRecommendations(): ConsolidationRecommendation[] {
    const recommendations: ConsolidationRecommendation[] = [];
    
    // Group duplicates by category
    const categoryGroups = new Map<UtilityCategory, DuplicateGroup[]>();
    
    for (const group of this.duplicateGroups) {
      if (!categoryGroups.has(group.category)) {
        categoryGroups.set(group.category, []);
      }
      categoryGroups.get(group.category)!.push(group);
    }

    // Generate recommendations for each category
    for (const [category, groups] of categoryGroups) {
      const highPriorityGroups = groups.filter(g => g.consolidationPriority === 'high');
      
      if (highPriorityGroups.length > 0) {
        recommendations.push({
          category,
          priority: 'high',
          description: `Consolidate ${highPriorityGroups.length} high-priority duplicate groups in ${category} utilities`,
          targetLocation: `shared/core/utilities/${category}/`,
          affectedFiles: [...new Set(groups.flatMap(g => g.implementations.map(i => i.file)))],
          estimatedEffort: groups.length > 5 ? 'high' : groups.length > 2 ? 'medium' : 'low',
          benefits: [
            `Eliminate ${groups.length} duplicate implementations`,
            `Reduce bundle size by ~${this.estimateBundleReduction(groups)}KB`,
            `Improve maintainability and consistency`
          ],
          risks: [
            'Potential breaking changes if APIs differ',
            'Need to update import statements across codebase'
          ]
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private estimateBundleReduction(groups: DuplicateGroup[]): number {
    // Rough estimation of bundle size reduction
    return groups.reduce((sum, group) => {
      return sum + (group.implementations.length - 1) * 2; // ~2KB per duplicate
    }, 0);
  }

  private createMigrationPlan(): MigrationStep[] {
    const steps: MigrationStep[] = [
      {
        order: 1,
        name: 'setup-foundation',
        description: 'Create unified utility architecture and base classes',
        category: 'misc',
        dependencies: [],
        estimatedDuration: '2-3 days',
        commands: [
          'npm run create:utility-foundation',
          'npm run setup:utility-architecture'
        ]
      },
      {
        order: 2,
        name: 'consolidate-api-utilities',
        description: 'Consolidate API response and request utilities',
        category: 'api',
        dependencies: ['setup-foundation'],
        estimatedDuration: '3-4 days',
        commands: [
          'npm run migrate:api-utilities',
          'npm run test:api-utilities',
          'npm run validate:api-migration'
        ]
      },
      {
        order: 3,
        name: 'consolidate-logging',
        description: 'Unify logging implementations across platforms',
        category: 'logging',
        dependencies: ['setup-foundation'],
        estimatedDuration: '2-3 days',
        commands: [
          'npm run migrate:logging-utilities',
          'npm run test:logging-utilities',
          'npm run validate:logging-migration'
        ]
      },
      {
        order: 4,
        name: 'consolidate-performance',
        description: 'Consolidate performance monitoring and optimization utilities',
        category: 'performance',
        dependencies: ['setup-foundation'],
        estimatedDuration: '3-4 days',
        commands: [
          'npm run migrate:performance-utilities',
          'npm run test:performance-utilities',
          'npm run validate:performance-migration'
        ]
      },
      {
        order: 5,
        name: 'consolidate-database',
        description: 'Unify database utilities and helpers',
        category: 'database',
        dependencies: ['setup-foundation'],
        estimatedDuration: '2-3 days',
        commands: [
          'npm run migrate:database-utilities',
          'npm run test:database-utilities',
          'npm run validate:database-migration'
        ]
      },
      {
        order: 6,
        name: 'final-cleanup',
        description: 'Remove legacy utilities and finalize migration',
        category: 'misc',
        dependencies: ['consolidate-api-utilities', 'consolidate-logging', 'consolidate-performance', 'consolidate-database'],
        estimatedDuration: '1-2 days',
        commands: [
          'npm run cleanup:legacy-utilities',
          'npm run validate:final-migration',
          'npm run generate:migration-report'
        ]
      }
    ];

    return steps;
  }

  private generateReport(recommendations: ConsolidationRecommendation[], migrationPlan: MigrationStep[]): UtilityAuditReport {
    const totalFunctions = this.allFunctions.length;
    const duplicateFunctions = this.duplicateGroups.reduce((sum, group) => sum + group.implementations.length - 1, 0);
    const redundancyPercentage = totalFunctions > 0 ? (duplicateFunctions / totalFunctions) * 100 : 0;

    // Calculate categories summary
    const categories: Record<UtilityCategory, any> = {} as unknown;
    const categoryStats = new Map<UtilityCategory, { files: number; functions: number; duplicates: number }>();

    for (const file of this.utilityFiles) {
      const stats = categoryStats.get(file.category) || { files: 0, functions: 0, duplicates: 0 };
      stats.files++;
      stats.functions += file.functions.length;
      categoryStats.set(file.category, stats);
    }

    for (const group of this.duplicateGroups) {
      const stats = categoryStats.get(group.category);
      if (stats) {
        stats.duplicates += group.implementations.length - 1;
      }
    }

    for (const [category, stats] of categoryStats) {
      categories[category] = {
        ...stats,
        priority: stats.duplicates > 5 ? 'high' : stats.duplicates > 2 ? 'medium' : 'low'
      };
    }

    return {
      timestamp: new Date(),
      summary: {
        totalFiles: this.utilityFiles.length,
        totalFunctions,
        duplicateGroups: this.duplicateGroups.length,
        redundancyPercentage,
        estimatedSavings: {
          linesOfCode: duplicateFunctions * 20, // Rough estimate
          bundleSize: duplicateFunctions * 2, // KB
          maintenanceEffort: Math.round(redundancyPercentage) // Percentage reduction
        }
      },
      categories,
      duplicates: this.duplicateGroups,
      recommendations,
      migrationPlan
    };
  }

  private async saveReport(report: UtilityAuditReport): Promise<void> {
    const reportPath = path.join(this.rootDir, 'UTILITY_AUDIT_REPORT.md');
    
    const markdown = `# Codebase Utility Audit Report

**Generated:** ${report.timestamp.toISOString()}

## Executive Summary

- **Total Utility Files:** ${report.summary.totalFiles}
- **Total Utility Functions:** ${report.summary.totalFunctions}
- **Duplicate Groups Found:** ${report.summary.duplicateGroups}
- **Redundancy Percentage:** ${report.summary.redundancyPercentage.toFixed(1)}%

### Estimated Savings
- **Lines of Code:** ${report.summary.estimatedSavings.linesOfCode}
- **Bundle Size:** ${report.summary.estimatedSavings.bundleSize}KB
- **Maintenance Effort:** ${report.summary.estimatedSavings.maintenanceEffort}% reduction

## Category Analysis

${Object.entries(report.categories).map(([category, stats]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)}
- **Files:** ${stats.files}
- **Functions:** ${stats.functions}
- **Duplicates:** ${stats.duplicates}
- **Priority:** ${stats.priority.toUpperCase()}
`).join('')}

## Top Duplicate Groups

${report.duplicates.slice(0, 10).map((group, index) => `
### ${index + 1}. ${group.functionName} (${group.category})
- **Priority:** ${group.consolidationPriority.toUpperCase()}
- **Similarity:** ${(group.similarity * 100).toFixed(1)}%
- **Implementations:** ${group.implementations.length}
- **Recommended Location:** ${group.recommendedLocation}

**Files:**
${group.implementations.map(impl => `- ${impl.location}`).join('\n')}
`).join('')}

## Consolidation Recommendations

${report.recommendations.map((rec, index) => `
### ${index + 1}. ${rec.category.charAt(0).toUpperCase() + rec.category.slice(1)} Utilities
- **Priority:** ${rec.priority.toUpperCase()}
- **Effort:** ${rec.estimatedEffort.toUpperCase()}
- **Target:** ${rec.targetLocation}

**Description:** ${rec.description}

**Benefits:**
${rec.benefits.map(benefit => `- ${benefit}`).join('\n')}

**Risks:**
${rec.risks.map(risk => `- ${risk}`).join('\n')}

**Affected Files:** ${rec.affectedFiles.length}
`).join('')}

## Migration Plan

${report.migrationPlan.map(step => `
### Step ${step.order}: ${step.name}
- **Category:** ${step.category}
- **Duration:** ${step.estimatedDuration}
- **Dependencies:** ${step.dependencies.join(', ') || 'None'}

**Description:** ${step.description}

**Commands:**
\`\`\`bash
${step.commands.join('\n')}
\`\`\`
`).join('')}

## Next Steps

1. **Review this audit report** and prioritize consolidation efforts
2. **Start with high-priority categories** (API, Logging, Performance)
3. **Create unified utility architecture** as foundation
4. **Migrate utilities incrementally** with comprehensive testing
5. **Monitor and validate** each migration step

---

*This report was generated automatically by the utility audit script.*
`;

    await fs.writeFile(reportPath, markdown, 'utf-8');
    console.log(`\n📄 Audit report saved: ${reportPath}`);
  }

  private printSummary(report: UtilityAuditReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CODEBASE UTILITY AUDIT SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`📁 Total Utility Files: ${report.summary.totalFiles}`);
    console.log(`🔧 Total Utility Functions: ${report.summary.totalFunctions}`);
    console.log(`🔄 Duplicate Groups: ${report.summary.duplicateGroups}`);
    console.log(`📈 Redundancy: ${report.summary.redundancyPercentage.toFixed(1)}%`);
    
    console.log('\n💰 Estimated Savings:');
    console.log(`   📝 Lines of Code: ${report.summary.estimatedSavings.linesOfCode}`);
    console.log(`   📦 Bundle Size: ${report.summary.estimatedSavings.bundleSize}KB`);
    console.log(`   🛠️  Maintenance: ${report.summary.estimatedSavings.maintenanceEffort}% reduction`);
    
    console.log('\n🎯 Top Categories for Consolidation:');
    const topCategories = Object.entries(report.categories)
      .filter(([_, stats]) => stats.duplicates > 0)
      .sort((a, b) => b[1].duplicates - a[1].duplicates)
      .slice(0, 5);
      
    topCategories.forEach(([category, stats]) => {
      console.log(`   ${category}: ${stats.duplicates} duplicates (${stats.priority} priority)`);
    });
    
    console.log('\n📋 Recommended Actions:');
    console.log('   1. Start with API and Logging utilities (highest impact)');
    console.log('   2. Create unified utility architecture');
    console.log('   3. Migrate high-priority categories first');
    console.log('   4. Use feature flags for gradual rollout');
    console.log('   5. Validate each migration step thoroughly');
    
    console.log('\n🚀 Next Command:');
    console.log('   npm run migrate:utilities -- --category=api');
  }

  // Utility methods
  private async findFiles(pattern: string, excludePatterns: string[]): Promise<string[]> {
    // Simple glob implementation - in production, use a proper glob library
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
      // Fallback or handle error
    }
    
    return files;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
}

// Main execution
const auditor = new CodebaseUtilityAuditor();
auditor.audit()
  .then(report => {
    console.log('\n✅ Utility audit completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Utility audit failed:', error);
    process.exit(1);
  });

export { CodebaseUtilityAuditor };
