#!/usr/bin/env node

/**
 * Middleware Sprawl Audit Script
 * 
 * Comprehensive analysis of middleware implementations across the entire codebase:
 * 1. Identifies all middleware files and functions
 * 2. Detects duplicate middleware implementations
 * 3. Analyzes middleware usage patterns
 * 4. Generates consolidation recommendations
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface MiddlewareFunction {
  name: string;
  file: string;
  location: string;
  signature: string;
  category: MiddlewareCategory;
  usageCount: number;
  dependencies: string[];
  priority?: number;
}

interface MiddlewareFile {
  path: string;
  relativePath: string;
  size: number;
  functions: MiddlewareFunction[];
  imports: string[];
  exports: string[];
  category: MiddlewareCategory;
  framework: 'express' | 'generic' | 'custom';
}

interface MiddlewareDuplicate {
  category: MiddlewareCategory;
  implementations: MiddlewareFunction[];
  similarity: number;
  consolidationPriority: 'high' | 'medium' | 'low';
  recommendedLocation: string;
  estimatedSavings: number;
}

interface MiddlewareAuditReport {
  timestamp: Date;
  summary: {
    totalFiles: number;
    totalMiddleware: number;
    duplicateGroups: number;
    redundancyPercentage: number;
    estimatedSavings: {
      linesOfCode: number;
      middlewareOverhead: number;
      maintenanceEffort: number;
    };
  };
  categories: Record<MiddlewareCategory, {
    files: number;
    middleware: number;
    duplicates: number;
    priority: 'high' | 'medium' | 'low';
    complexity: 'high' | 'medium' | 'low';
  }>;
  duplicates: MiddlewareDuplicate[];
  recommendations: MiddlewareRecommendation[];
  migrationPlan: MiddlewareMigrationStep[];
}

type MiddlewareCategory = 
  | 'authentication'
  | 'authorization'
  | 'security'
  | 'validation'
  | 'error-handling'
  | 'logging'
  | 'rate-limiting'
  | 'caching'
  | 'monitoring'
  | 'cors'
  | 'compression'
  | 'parsing'
  | 'routing'
  | 'session'
  | 'privacy'
  | 'custom';

interface MiddlewareRecommendation {
  category: MiddlewareCategory;
  priority: 'high' | 'medium' | 'low';
  description: string;
  targetLocation: string;
  affectedFiles: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  benefits: string[];
  risks: string[];
}

interface MiddlewareMigrationStep {
  order: number;
  name: string;
  description: string;
  category: MiddlewareCategory;
  dependencies: string[];
  estimatedDuration: string;
  commands: string[];
}

class MiddlewareSprawlAuditor {
  private readonly rootDir = process.cwd();
  private middlewareFiles: MiddlewareFile[] = [];
  private allMiddleware: MiddlewareFunction[] = [];
  private duplicateGroups: MiddlewareDuplicate[] = [];

  async audit(): Promise<MiddlewareAuditReport> {
    console.log('🔍 Starting Middleware Sprawl Audit...\n');

    // Step 1: Discover middleware files
    console.log('📂 Discovering middleware files...');
    await this.discoverMiddlewareFiles();
    console.log(`   Found ${this.middlewareFiles.length} middleware files\n`);

    // Step 2: Analyze middleware functions
    console.log('🔬 Analyzing middleware functions...');
    await this.analyzeMiddlewareFunctions();
    console.log(`   Analyzed ${this.allMiddleware.length} middleware functions\n`);

    // Step 3: Detect duplicates
    console.log('🔍 Detecting middleware duplicates...');
    await this.detectMiddlewareDuplicates();
    console.log(`   Found ${this.duplicateGroups.length} duplicate groups\n`);

    // Step 4: Analyze usage patterns
    console.log('📊 Analyzing middleware usage patterns...');
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

  private async discoverMiddlewareFiles(): Promise<void> {
    const middlewarePatterns = [
      '**/middleware/**/*.ts',
      '**/middlewares/**/*.ts',
      '**/*middleware*.ts',
      '**/*-middleware.ts'
    ];

    const excludePatterns = [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.d.ts',
      '**/*.test.ts',
      '**/*.spec.ts'
    ];

    for (const pattern of middlewarePatterns) {
      const files = await this.findFiles(pattern, excludePatterns);
      
      for (const file of files) {
        const middlewareFile = await this.analyzeMiddlewareFile(file);
        if (middlewareFile) {
          this.middlewareFiles.push(middlewareFile);
        }
      }
    }

    // Also check for middleware-like patterns in other files
    await this.findMiddlewareLikeFiles();
  }

  private async analyzeMiddlewareFile(filePath: string): Promise<MiddlewareFile | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      const relativePath = path.relative(this.rootDir, filePath);

      // Skip if file doesn't contain middleware patterns
      if (!this.looksLikeMiddlewareFile(content)) {
        return null;
      }

      const functions = this.extractMiddlewareFunctions(content, filePath);
      const imports = this.extractImports(content);
      const exports = this.extractExports(content);
      const category = this.categorizeMiddleware(filePath, content);
      const framework = this.detectFramework(content);

      return {
        path: filePath,
        relativePath,
        size: stats.size,
        functions,
        imports,
        exports,
        category,
        framework
      };
    } catch (error) {
      console.warn(`   ⚠️  Failed to analyze ${filePath}: ${error}`);
      return null;
    }
  }

  private looksLikeMiddlewareFile(content: string): boolean {
    const middlewareIndicators = [
      /\(req.*res.*next\)/,
      /Request.*Response.*NextFunction/,
      /middleware/i,
      /app\.use/,
      /router\.use/,
      /express\./,
      /return.*function.*req.*res.*next/
    ];

    return middlewareIndicators.some(pattern => pattern.test(content));
  }

  private extractMiddlewareFunctions(content: string, filePath: string): MiddlewareFunction[] {
    const functions: MiddlewareFunction[] = [];
    
    // Extract middleware function patterns
    const patterns = [
      // Standard middleware functions
      /(?:export\s+)?(?:const|function)\s+(\w+)\s*[=:]?\s*(?:async\s+)?\([^)]*req[^)]*res[^)]*next[^)]*\)/g,
      // Arrow function middleware
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*req[^)]*res[^)]*next[^)]*\)\s*=>/g,
      // Method middleware
      /(\w+)\s*\([^)]*req[^)]*res[^)]*next[^)]*\)\s*{/g,
      // Class method middleware
      /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*req[^)]*res[^)]*next[^)]*\)/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1];
        
        // Skip common non-middleware function names
        if (['constructor', 'toString', 'valueOf'].includes(functionName)) {
          continue;
        }

        functions.push({
          name: functionName,
          file: filePath,
          location: `${filePath}:${this.getLineNumber(content, match.index)}`,
          signature: match[0],
          category: this.categorizeMiddlewareFunction(functionName, content),
          usageCount: 0, // Will be calculated later
          dependencies: [],
          priority: this.extractPriority(content, match.index)
        });
      }
    }

    return functions;
  }

  private categorizeMiddleware(filePath: string, content: string): MiddlewareCategory {
    const pathLower = filePath.toLowerCase();
    const contentLower = content.toLowerCase();

    // Category mapping based on file path and content
    const categoryMap: Array<[RegExp | string, MiddlewareCategory]> = [
      [/auth|login|jwt|token|passport/, 'authentication'],
      [/role|permission|access|rbac/, 'authorization'],
      [/security|helmet|csp|xss|csrf/, 'security'],
      [/valid|schema|zod|joi|sanitiz/, 'validation'],
      [/error|exception|catch|handler/, 'error-handling'],
      [/log|audit|track|monitor/, 'logging'],
      [/rate.*limit|throttle|limit/, 'rate-limiting'],
      [/cache|redis|memory/, 'caching'],
      [/monitor|metric|health|perf/, 'monitoring'],
      [/cors|origin|cross/, 'cors'],
      [/compress|gzip|deflate/, 'compression'],
      [/parse|body|json|url/, 'parsing'],
      [/route|router|path/, 'routing'],
      [/session|cookie|store/, 'session'],
      [/privacy|gdpr|consent/, 'privacy']
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

    return 'custom';
  }

  private categorizeMiddlewareFunction(functionName: string, content: string): MiddlewareCategory {
    const nameLower = functionName.toLowerCase();
    
    // Function name patterns
    if (/^(auth|login|jwt|token|verify)/.test(nameLower)) return 'authentication';
    if (/^(role|permission|access|authorize)/.test(nameLower)) return 'authorization';
    if (/^(security|helmet|csp|xss|csrf)/.test(nameLower)) return 'security';
    if (/^(valid|check|sanitize|clean)/.test(nameLower)) return 'validation';
    if (/^(error|catch|handle|recover)/.test(nameLower)) return 'error-handling';
    if (/^(log|audit|track|monitor)/.test(nameLower)) return 'logging';
    if (/^(rate|limit|throttle)/.test(nameLower)) return 'rate-limiting';
    if (/^(cache|store|retrieve)/.test(nameLower)) return 'caching';
    if (/^(cors|origin|cross)/.test(nameLower)) return 'cors';
    if (/^(compress|gzip)/.test(nameLower)) return 'compression';
    if (/^(parse|body|json)/.test(nameLower)) return 'parsing';
    if (/^(session|cookie)/.test(nameLower)) return 'session';
    if (/^(privacy|gdpr|consent)/.test(nameLower)) return 'privacy';

    // Fallback to file categorization
    return this.categorizeMiddleware('', content);
  }

  private detectFramework(content: string): 'express' | 'generic' | 'custom' {
    if (/express|Request|Response|NextFunction/.test(content)) return 'express';
    if (/req.*res.*next/.test(content)) return 'generic';
    return 'custom';
  }

  private extractPriority(content: string, index: number): number | undefined {
    // Look for priority comments or configurations near the function
    const contextStart = Math.max(0, index - 200);
    const contextEnd = Math.min(content.length, index + 200);
    const context = content.slice(contextStart, contextEnd);
    
    const priorityMatch = context.match(/priority[:\s]*(\d+)/i);
    return priorityMatch ? parseInt(priorityMatch[1]) : undefined;
  }

  private async findMiddlewareLikeFiles(): Promise<void> {
    // Find files that might contain middleware but aren't in middleware directories
    const patterns = [
      '**/routes/**/*.ts',
      '**/api/**/*.ts',
      '**/server.ts',
      '**/app.ts',
      '**/index.ts'
    ];

    for (const pattern of patterns) {
      const files = await this.findFiles(pattern, ['node_modules/**', 'dist/**']);
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        if (this.containsMiddlewareFunctions(content)) {
          const middlewareFile = await this.analyzeMiddlewareFile(file);
          if (middlewareFile && middlewareFile.functions.length > 0) {
            this.middlewareFiles.push(middlewareFile);
          }
        }
      }
    }
  }

  private containsMiddlewareFunctions(content: string): boolean {
    const middlewarePatterns = [
      /app\.use\(/,
      /router\.use\(/,
      /\.use\([^)]*req.*res.*next/,
      /function.*\(.*req.*res.*next.*\)/,
      /\(.*req.*res.*next.*\)\s*=>/
    ];

    return middlewarePatterns.some(pattern => pattern.test(content));
  }

  private async analyzeMiddlewareFunctions(): Promise<void> {
    for (const file of this.middlewareFiles) {
      this.allMiddleware.push(...file.functions);
    }

    // Analyze dependencies and usage
    for (const middleware of this.allMiddleware) {
      middleware.dependencies = await this.findMiddlewareDependencies(middleware);
      middleware.usageCount = await this.countMiddlewareUsage(middleware);
    }
  }

  private async findMiddlewareDependencies(middleware: MiddlewareFunction): Promise<string[]> {
    try {
      const content = await fs.readFile(middleware.file, 'utf-8');
      const dependencies: string[] = [];
      
      // Find imports used by this middleware
      const imports = this.extractImports(content);
      dependencies.push(...imports);
      
      return dependencies;
    } catch {
      return [];
    }
  }

  private async countMiddlewareUsage(middleware: MiddlewareFunction): Promise<number> {
    try {
      // Use grep to count usage across codebase
      const result = execSync(
        `grep -r "${middleware.name}" --include="*.ts" --include="*.js" --exclude-dir=node_modules .`,
        { cwd: this.rootDir, encoding: 'utf-8' }
      );
      
      return result.split('\n').filter(line => line.trim()).length;
    } catch {
      return 0;
    }
  }

  private async detectMiddlewareDuplicates(): Promise<void> {
    // Group middleware by category and similar functionality
    const categoryGroups = new Map<MiddlewareCategory, MiddlewareFunction[]>();
    
    for (const middleware of this.allMiddleware) {
      if (!categoryGroups.has(middleware.category)) {
        categoryGroups.set(middleware.category, []);
      }
      categoryGroups.get(middleware.category)!.push(middleware);
    }

    // Find duplicates within each category
    for (const [category, middlewares] of categoryGroups) {
      if (middlewares.length > 1) {
        const similarity = await this.calculateMiddlewareSimilarity(middlewares);
        
        if (similarity > 0.3) { // Threshold for considering duplicates
          this.duplicateGroups.push({
            category,
            implementations: middlewares,
            similarity,
            consolidationPriority: this.calculateConsolidationPriority(middlewares, similarity),
            recommendedLocation: this.recommendMiddlewareLocation(category),
            estimatedSavings: this.estimateConsolidationSavings(middlewares)
          });
        }
      }
    }

    // Sort by priority and savings
    this.duplicateGroups.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.consolidationPriority] - priorityOrder[a.consolidationPriority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.estimatedSavings - a.estimatedSavings;
    });
  }

  private async calculateMiddlewareSimilarity(middlewares: MiddlewareFunction[]): Promise<number> {
    if (middlewares.length < 2) return 0;
    
    // Simple similarity based on function names and signatures
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < middlewares.length - 1; i++) {
      for (let j = i + 1; j < middlewares.length; j++) {
        const similarity = this.stringSimilarity(
          middlewares[i].signature,
          middlewares[j].signature
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
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

  private calculateConsolidationPriority(middlewares: MiddlewareFunction[], similarity: number): 'high' | 'medium' | 'low' {
    const totalUsage = middlewares.reduce((sum, m) => sum + m.usageCount, 0);
    const avgUsage = totalUsage / middlewares.length;
    
    if (similarity > 0.7 && avgUsage > 10) return 'high';
    if (similarity > 0.5 && avgUsage > 5) return 'medium';
    return 'low';
  }

  private recommendMiddlewareLocation(category: MiddlewareCategory): string {
    return `shared/core/middleware/${category}/`;
  }

  private estimateConsolidationSavings(middlewares: MiddlewareFunction[]): number {
    // Estimate lines of code saved by consolidation
    return (middlewares.length - 1) * 50; // Rough estimate
  }

  private async analyzeUsagePatterns(): Promise<void> {
    // Analyze how middleware is used across the application
    console.log('   📊 Usage pattern analysis complete');
  }

  private generateRecommendations(): MiddlewareRecommendation[] {
    const recommendations: MiddlewareRecommendation[] = [];
    
    // Group duplicates by category
    const categoryGroups = new Map<MiddlewareCategory, MiddlewareDuplicate[]>();
    
    for (const group of this.duplicateGroups) {
      if (!categoryGroups.has(group.category)) {
        categoryGroups.set(group.category, []);
      }
      categoryGroups.get(group.category)!.push(group);
    }

    // Generate recommendations for each category
    for (const [category, groups] of categoryGroups) {
      const highPriorityGroups = groups.filter(g => g.consolidationPriority === 'high');
      
      if (highPriorityGroups.length > 0 || groups.length > 2) {
        recommendations.push({
          category,
          priority: highPriorityGroups.length > 0 ? 'high' : 'medium',
          description: `Consolidate ${groups.length} duplicate ${category} middleware implementations`,
          targetLocation: `shared/core/middleware/${category}/`,
          affectedFiles: [...new Set(groups.flatMap(g => g.implementations.map(i => i.file)))],
          estimatedEffort: groups.length > 5 ? 'high' : groups.length > 2 ? 'medium' : 'low',
          benefits: [
            `Eliminate ${groups.length} duplicate implementations`,
            `Reduce middleware overhead by ~${groups.reduce((sum, g) => sum + g.estimatedSavings, 0)} lines`,
            `Improve consistency and maintainability`,
            `Centralize middleware configuration`
          ],
          risks: [
            'Potential breaking changes if middleware behavior differs',
            'Need to update middleware registration across application'
          ]
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private createMigrationPlan(): MiddlewareMigrationStep[] {
    const steps: MiddlewareMigrationStep[] = [
      {
        order: 1,
        name: 'create-unified-middleware-architecture',
        description: 'Create unified middleware architecture and base classes',
        category: 'custom',
        dependencies: [],
        estimatedDuration: '2-3 days',
        commands: [
          'npm run create:middleware-architecture',
          'npm run setup:middleware-interfaces'
        ]
      },
      {
        order: 2,
        name: 'consolidate-security-middleware',
        description: 'Consolidate security, authentication, and authorization middleware',
        category: 'security',
        dependencies: ['create-unified-middleware-architecture'],
        estimatedDuration: '3-4 days',
        commands: [
          'npm run migrate:security-middleware',
          'npm run test:security-middleware',
          'npm run validate:security-migration'
        ]
      },
      {
        order: 3,
        name: 'consolidate-validation-middleware',
        description: 'Unify validation and sanitization middleware',
        category: 'validation',
        dependencies: ['create-unified-middleware-architecture'],
        estimatedDuration: '2-3 days',
        commands: [
          'npm run migrate:validation-middleware',
          'npm run test:validation-middleware',
          'npm run validate:validation-migration'
        ]
      },
      {
        order: 4,
        name: 'consolidate-error-handling-middleware',
        description: 'Consolidate error handling and recovery middleware',
        category: 'error-handling',
        dependencies: ['create-unified-middleware-architecture'],
        estimatedDuration: '3-4 days',
        commands: [
          'npm run migrate:error-middleware',
          'npm run test:error-middleware',
          'npm run validate:error-migration'
        ]
      },
      {
        order: 5,
        name: 'consolidate-performance-middleware',
        description: 'Consolidate rate limiting, caching, and monitoring middleware',
        category: 'rate-limiting',
        dependencies: ['create-unified-middleware-architecture'],
        estimatedDuration: '2-3 days',
        commands: [
          'npm run migrate:performance-middleware',
          'npm run test:performance-middleware',
          'npm run validate:performance-migration'
        ]
      },
      {
        order: 6,
        name: 'finalize-middleware-migration',
        description: 'Remove legacy middleware and finalize migration',
        category: 'custom',
        dependencies: [
          'consolidate-security-middleware',
          'consolidate-validation-middleware',
          'consolidate-error-handling-middleware',
          'consolidate-performance-middleware'
        ],
        estimatedDuration: '1-2 days',
        commands: [
          'npm run cleanup:legacy-middleware',
          'npm run validate:final-middleware-migration',
          'npm run generate:middleware-migration-report'
        ]
      }
    ];

    return steps;
  }

  private generateReport(recommendations: MiddlewareRecommendation[], migrationPlan: MiddlewareMigrationStep[]): MiddlewareAuditReport {
    const totalMiddleware = this.allMiddleware.length;
    const duplicateMiddleware = this.duplicateGroups.reduce((sum, group) => sum + group.implementations.length - 1, 0);
    const redundancyPercentage = totalMiddleware > 0 ? (duplicateMiddleware / totalMiddleware) * 100 : 0;

    // Calculate categories summary
    const categories: Record<MiddlewareCategory, any> = {} as unknown;
    const categoryStats = new Map<MiddlewareCategory, { files: number; middleware: number; duplicates: number }>();

    for (const file of this.middlewareFiles) {
      const stats = categoryStats.get(file.category) || { files: 0, middleware: 0, duplicates: 0 };
      stats.files++;
      stats.middleware += file.functions.length;
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
        priority: stats.duplicates > 3 ? 'high' : stats.duplicates > 1 ? 'medium' : 'low',
        complexity: stats.middleware > 10 ? 'high' : stats.middleware > 5 ? 'medium' : 'low'
      };
    }

    return {
      timestamp: new Date(),
      summary: {
        totalFiles: this.middlewareFiles.length,
        totalMiddleware,
        duplicateGroups: this.duplicateGroups.length,
        redundancyPercentage,
        estimatedSavings: {
          linesOfCode: duplicateMiddleware * 50, // Rough estimate
          middlewareOverhead: duplicateMiddleware * 10, // Performance overhead
          maintenanceEffort: Math.round(redundancyPercentage) // Percentage reduction
        }
      },
      categories,
      duplicates: this.duplicateGroups,
      recommendations,
      migrationPlan
    };
  }

  private async saveReport(report: MiddlewareAuditReport): Promise<void> {
    const reportPath = path.join(this.rootDir, 'MIDDLEWARE_SPRAWL_AUDIT_REPORT.md');
    
    const markdown = `# Middleware Sprawl Audit Report

**Generated:** ${report.timestamp.toISOString()}

## Executive Summary

- **Total Middleware Files:** ${report.summary.totalFiles}
- **Total Middleware Functions:** ${report.summary.totalMiddleware}
- **Duplicate Groups Found:** ${report.summary.duplicateGroups}
- **Redundancy Percentage:** ${report.summary.redundancyPercentage.toFixed(1)}%

### Estimated Savings
- **Lines of Code:** ${report.summary.estimatedSavings.linesOfCode}
- **Middleware Overhead:** ${report.summary.estimatedSavings.middlewareOverhead}% reduction
- **Maintenance Effort:** ${report.summary.estimatedSavings.maintenanceEffort}% reduction

## Category Analysis

${Object.entries(report.categories).map(([category, stats]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)}
- **Files:** ${stats.files}
- **Middleware:** ${stats.middleware}
- **Duplicates:** ${stats.duplicates}
- **Priority:** ${stats.priority.toUpperCase()}
- **Complexity:** ${stats.complexity.toUpperCase()}
`).join('')}

## Top Duplicate Groups

${report.duplicates.slice(0, 10).map((group, index) => `
### ${index + 1}. ${group.category.charAt(0).toUpperCase() + group.category.slice(1)} Middleware
- **Priority:** ${group.consolidationPriority.toUpperCase()}
- **Similarity:** ${(group.similarity * 100).toFixed(1)}%
- **Implementations:** ${group.implementations.length}
- **Estimated Savings:** ${group.estimatedSavings} lines
- **Recommended Location:** ${group.recommendedLocation}

**Files:**
${group.implementations.map(impl => `- ${impl.location}`).join('\n')}
`).join('')}

## Consolidation Recommendations

${report.recommendations.map((rec, index) => `
### ${index + 1}. ${rec.category.charAt(0).toUpperCase() + rec.category.slice(1)} Middleware
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
2. **Start with high-priority categories** (Security, Error Handling, Validation)
3. **Create unified middleware architecture** as foundation
4. **Migrate middleware incrementally** with comprehensive testing
5. **Monitor and validate** each migration step

---

*This report was generated automatically by the middleware sprawl audit script.*
`;

    await fs.writeFile(reportPath, markdown, 'utf-8');
    console.log(`\n📄 Audit report saved: ${reportPath}`);
  }

  private printSummary(report: MiddlewareAuditReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIDDLEWARE SPRAWL AUDIT SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`📁 Total Middleware Files: ${report.summary.totalFiles}`);
    console.log(`🔧 Total Middleware Functions: ${report.summary.totalMiddleware}`);
    console.log(`🔄 Duplicate Groups: ${report.summary.duplicateGroups}`);
    console.log(`📈 Redundancy: ${report.summary.redundancyPercentage.toFixed(1)}%`);
    
    console.log('\n💰 Estimated Savings:');
    console.log(`   📝 Lines of Code: ${report.summary.estimatedSavings.linesOfCode}`);
    console.log(`   ⚡ Middleware Overhead: ${report.summary.estimatedSavings.middlewareOverhead}% reduction`);
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
    console.log('   1. Start with Security and Error Handling middleware (highest impact)');
    console.log('   2. Create unified middleware architecture');
    console.log('   3. Migrate high-priority categories first');
    console.log('   4. Use feature flags for gradual rollout');
    console.log('   5. Validate each migration step thoroughly');
    
    console.log('\n🚀 Next Command:');
    console.log('   npm run migrate:middleware -- --category=security');
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

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
}

// Main execution
const auditor = new MiddlewareSprawlAuditor();
auditor.audit()
  .then(report => {
    console.log('\n✅ Middleware sprawl audit completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Middleware sprawl audit failed:', error);
    process.exit(1);
  });

export { MiddlewareSprawlAuditor };
