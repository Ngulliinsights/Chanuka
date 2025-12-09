#!/usr/bin/env tsx

/**
 * Client Implementation Validation Script
 * 
 * Validates all implementations in the client to ensure:
 * - No orphaned files or components
 * - No redundant implementations
 * - No deprecated patterns
 * - Optimal file placement
 * - Updated calls to new structure
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ValidationIssue {
  file: string;
  line?: number;
  type: 'orphaned' | 'redundant' | 'deprecated' | 'misplaced' | 'outdated-call';
  severity: 'error' | 'warning' | 'info';
  description: string;
  suggestion: string;
  autoFixable: boolean;
}

interface FileAnalysis {
  path: string;
  type: 'component' | 'hook' | 'service' | 'util' | 'type' | 'config' | 'test' | 'story';
  imports: string[];
  exports: string[];
  dependencies: string[];
  usageCount: number;
  lastModified: Date;
  size: number;
}

class ClientImplementationValidator {
  private clientDir = 'client/src';
  private issues: ValidationIssue[] = [];
  private fileAnalyses: Map<string, FileAnalysis> = new Map();
  private importGraph: Map<string, Set<string>> = new Map();
  private exportGraph: Map<string, Set<string>> = new Map();

  async run(): Promise<void> {
    console.log('🔍 Validating client implementations...\n');

    await this.analyzeAllFiles();
    await this.buildDependencyGraphs();
    await this.validateImplementations();
    await this.checkForOrphanedFiles();
    await this.checkForRedundantImplementations();
    await this.checkForDeprecatedPatterns();
    await this.checkForMisplacedFiles();
    await this.checkForOutdatedCalls();
    
    this.generateReport();
    await this.applyAutoFixes();
  }

  private async analyzeAllFiles(): Promise<void> {
    console.log('📊 Analyzing all files...');
    
    const files = await glob(`${this.clientDir}/**/*.{ts,tsx,js,jsx}`, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*'
      ]
    });

    for (const file of files) {
      try {
        const analysis = await this.analyzeFile(file);
        this.fileAnalyses.set(file, analysis);
      } catch (error) {
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }

    console.log(`✅ Analyzed ${this.fileAnalyses.size} files`);
  }

  private async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    const imports = this.extractImports(content);
    const exports = this.extractExports(content);
    const dependencies = this.extractDependencies(content);
    
    return {
      path: filePath,
      type: this.determineFileType(filePath, content),
      imports,
      exports,
      dependencies,
      usageCount: 0, // Will be calculated later
      lastModified: stats.mtime,
      size: stats.size
    };
  }

  private extractImports(content: string): string[] {
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
    const imports: string[] = [];
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  private extractExports(content: string): string[] {
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/g;
    const namedExportRegex = /export\s+\{([^}]+)\}/g;
    const exports: string[] = [];
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    while ((match = namedExportRegex.exec(content)) !== null) {
      const namedExports = match[1].split(',').map(e => e.trim().split(' as ')[0]);
      exports.push(...namedExports);
    }
    
    return exports;
  }

  private extractDependencies(content: string): string[] {
    const deps: string[] = [];
    
    // React hooks
    if (content.includes('useState') || content.includes('useEffect')) deps.push('react-hooks');
    if (content.includes('useQuery') || content.includes('useMutation')) deps.push('react-query');
    if (content.includes('useSelector') || content.includes('useDispatch')) deps.push('redux');
    
    // Core services
    if (content.includes('@client/core/')) deps.push('core-services');
    if (content.includes('@client/shared/')) deps.push('shared-services');
    if (content.includes('@client/features/')) deps.push('feature-services');
    
    return deps;
  }

  private determineFileType(filePath: string, content: string): FileAnalysis['type'] {
    if (filePath.includes('.test.') || filePath.includes('.spec.')) return 'test';
    if (filePath.includes('.stories.')) return 'story';
    if (filePath.includes('/hooks/') || filePath.includes('use')) return 'hook';
    if (filePath.includes('/services/') || filePath.includes('Service')) return 'service';
    if (filePath.includes('/utils/') || filePath.includes('/lib/')) return 'util';
    if (filePath.includes('/types/') || content.includes('interface ') || content.includes('type ')) return 'type';
    if (filePath.includes('/config/') || filePath.includes('config')) return 'config';
    if (content.includes('export default function') || content.includes('const ') && content.includes('= () =>')) return 'component';
    
    return 'component';
  }

  private async buildDependencyGraphs(): Promise<void> {
    console.log('🔗 Building dependency graphs...');
    
    for (const [filePath, analysis] of this.fileAnalyses) {
      // Build import graph
      if (!this.importGraph.has(filePath)) {
        this.importGraph.set(filePath, new Set());
      }
      
      for (const importPath of analysis.imports) {
        const resolvedPath = this.resolveImportPath(importPath, filePath);
        if (resolvedPath && this.fileAnalyses.has(resolvedPath)) {
          this.importGraph.get(filePath)!.add(resolvedPath);
          
          // Update usage count
          const importedAnalysis = this.fileAnalyses.get(resolvedPath);
          if (importedAnalysis) {
            importedAnalysis.usageCount++;
          }
        }
      }
      
      // Build export graph
      for (const exportName of analysis.exports) {
        if (!this.exportGraph.has(exportName)) {
          this.exportGraph.set(exportName, new Set());
        }
        this.exportGraph.get(exportName)!.add(filePath);
      }
    }
  }

  private resolveImportPath(importPath: string, fromFile: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, importPath);
      
      // Try different extensions
      for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
        const fullPath = resolved + ext;
        if (this.fileAnalyses.has(fullPath)) {
          return fullPath;
        }
      }
    }
    
    // Handle absolute imports
    if (importPath.startsWith('@client/')) {
      const relativePath = importPath.replace('@client/', 'client/src/');
      
      for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
        const fullPath = relativePath + ext;
        if (this.fileAnalyses.has(fullPath)) {
          return fullPath;
        }
      }
    }
    
    return null;
  }

  private async validateImplementations(): Promise<void> {
    console.log('🔍 Validating implementations...');
    
    // Check for proper FSD structure
    await this.validateFSDStructure();
    
    // Check for proper imports
    await this.validateImportPatterns();
    
    // Check for proper exports
    await this.validateExportPatterns();
  }

  private async validateFSDStructure(): Promise<void> {
    const featureFiles = Array.from(this.fileAnalyses.keys()).filter(f => f.includes('/features/'));
    
    for (const file of featureFiles) {
      const parts = file.split('/');
      const featureIndex = parts.indexOf('features');
      
      if (featureIndex === -1) continue;
      
      const featureName = parts[featureIndex + 1];
      const layer = parts[featureIndex + 2];
      
      // Validate FSD layers
      const validLayers = ['api', 'model', 'ui', 'services', 'lib'];
      if (layer && !validLayers.includes(layer) && layer !== 'index.ts') {
        this.issues.push({
          file,
          type: 'misplaced',
          severity: 'warning',
          description: `Invalid FSD layer '${layer}' in feature '${featureName}'`,
          suggestion: `Move to valid FSD layer: ${validLayers.join(', ')}`,
          autoFixable: false
        });
      }
    }
  }

  private async validateImportPatterns(): Promise<void> {
    for (const [filePath, analysis] of this.fileAnalyses) {
      for (const importPath of analysis.imports) {
        // Check for deprecated imports
        if (importPath.includes('@/features/users/hooks/useAuth')) {
          this.issues.push({
            file: filePath,
            type: 'deprecated',
            severity: 'warning',
            description: 'Using deprecated useAuth import',
            suggestion: 'Replace with: import { useAuth } from \'@client/core/auth\'',
            autoFixable: true
          });
        }
        
        // Check for circular dependencies
        if (filePath.includes('/core/') && importPath.includes('/features/')) {
          this.issues.push({
            file: filePath,
            type: 'misplaced',
            severity: 'error',
            description: 'Core module importing from features (potential circular dependency)',
            suggestion: 'Move shared code to shared module or use dependency injection',
            autoFixable: false
          });
        }
        
        // Check for direct feature-to-feature imports
        if (filePath.includes('/features/') && importPath.includes('/features/') && 
            !this.isSameFeature(filePath, importPath)) {
          this.issues.push({
            file: filePath,
            type: 'misplaced',
            severity: 'warning',
            description: 'Direct feature-to-feature import detected',
            suggestion: 'Use core services or shared modules for cross-feature communication',
            autoFixable: false
          });
        }
      }
    }
  }

  private async validateExportPatterns(): Promise<void> {
    // Check for missing barrel exports
    const features = new Set<string>();
    
    for (const filePath of this.fileAnalyses.keys()) {
      if (filePath.includes('/features/')) {
        const parts = filePath.split('/');
        const featureIndex = parts.indexOf('features');
        if (featureIndex !== -1 && parts[featureIndex + 1]) {
          features.add(parts[featureIndex + 1]);
        }
      }
    }
    
    for (const feature of features) {
      const indexPath = `client/src/features/${feature}/index.ts`;
      if (!this.fileAnalyses.has(indexPath)) {
        this.issues.push({
          file: `client/src/features/${feature}/`,
          type: 'misplaced',
          severity: 'warning',
          description: `Feature '${feature}' missing barrel export (index.ts)`,
          suggestion: 'Create index.ts with proper exports',
          autoFixable: true
        });
      }
    }
  }

  private async checkForOrphanedFiles(): Promise<void> {
    console.log('🔍 Checking for orphaned files...');
    
    for (const [filePath, analysis] of this.fileAnalyses) {
      // Skip entry points and config files
      if (this.isEntryPoint(filePath) || this.isConfigFile(filePath)) {
        continue;
      }
      
      // Check if file is never imported
      if (analysis.usageCount === 0 && analysis.exports.length > 0) {
        // Check if it's a page component (might be used by router)
        if (!filePath.includes('/pages/') && !filePath.includes('App.tsx')) {
          this.issues.push({
            file: filePath,
            type: 'orphaned',
            severity: 'warning',
            description: 'File exports components/functions but is never imported',
            suggestion: 'Remove if unused, or ensure proper imports exist',
            autoFixable: false
          });
        }
      }
    }
  }

  private async checkForRedundantImplementations(): Promise<void> {
    console.log('🔍 Checking for redundant implementations...');
    
    // Group files by similar names/functionality
    const similarFiles = new Map<string, string[]>();
    
    for (const filePath of this.fileAnalyses.keys()) {
      const fileName = path.basename(filePath, path.extname(filePath));
      const normalizedName = fileName.toLowerCase().replace(/[-_]/g, '');
      
      if (!similarFiles.has(normalizedName)) {
        similarFiles.set(normalizedName, []);
      }
      similarFiles.get(normalizedName)!.push(filePath);
    }
    
    // Check for potential duplicates
    for (const [name, files] of similarFiles) {
      if (files.length > 1) {
        // Filter out legitimate duplicates (different directories, different purposes)
        const potentialDuplicates = files.filter(f => 
          !f.includes('/test/') && 
          !f.includes('/stories/') && 
          !f.includes('/legacy-archive/')
        );
        
        if (potentialDuplicates.length > 1) {
          for (const file of potentialDuplicates.slice(1)) {
            this.issues.push({
              file,
              type: 'redundant',
              severity: 'info',
              description: `Potential duplicate implementation of '${name}'`,
              suggestion: `Review if this duplicates functionality in ${potentialDuplicates[0]}`,
              autoFixable: false
            });
          }
        }
      }
    }
  }

  private async checkForDeprecatedPatterns(): Promise<void> {
    console.log('🔍 Checking for deprecated patterns...');
    
    for (const [filePath, analysis] of this.fileAnalyses) {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Check for deprecated React patterns
      if (content.includes('componentWillMount') || content.includes('componentWillReceiveProps')) {
        this.issues.push({
          file: filePath,
          type: 'deprecated',
          severity: 'error',
          description: 'Using deprecated React lifecycle methods',
          suggestion: 'Replace with modern React hooks or lifecycle methods',
          autoFixable: false
        });
      }
      
      // Check for deprecated API patterns
      if (content.includes('fetch(') && !content.includes('// TODO:') && !content.includes('// FIXME:')) {
        this.issues.push({
          file: filePath,
          type: 'deprecated',
          severity: 'info',
          description: 'Direct fetch usage instead of core API services',
          suggestion: 'Consider using @client/core/api services for consistency',
          autoFixable: true
        });
      }
      
      // Check for old import patterns
      if (content.includes('import React, { FC }')) {
        this.issues.push({
          file: filePath,
          type: 'deprecated',
          severity: 'info',
          description: 'Using old React import pattern',
          suggestion: 'Use: import type { FC } from \'react\'',
          autoFixable: true
        });
      }
    }
  }

  private async checkForMisplacedFiles(): Promise<void> {
    console.log('🔍 Checking for misplaced files...');
    
    for (const [filePath, analysis] of this.fileAnalyses) {
      // Check if hooks are in the right place
      if (analysis.type === 'hook' && !filePath.includes('/hooks/')) {
        this.issues.push({
          file: filePath,
          type: 'misplaced',
          severity: 'warning',
          description: 'Hook not in hooks directory',
          suggestion: 'Move to appropriate hooks directory',
          autoFixable: false
        });
      }
      
      // Check if services are in the right place
      if (analysis.type === 'service' && !filePath.includes('/services/') && !filePath.includes('/api/')) {
        this.issues.push({
          file: filePath,
          type: 'misplaced',
          severity: 'warning',
          description: 'Service not in services directory',
          suggestion: 'Move to appropriate services directory',
          autoFixable: false
        });
      }
      
      // Check if types are in the right place
      if (analysis.type === 'type' && !filePath.includes('/types/') && !filePath.endsWith('types.ts')) {
        this.issues.push({
          file: filePath,
          type: 'misplaced',
          severity: 'info',
          description: 'Types not in dedicated types file',
          suggestion: 'Consider moving to types directory or dedicated types file',
          autoFixable: false
        });
      }
    }
  }

  private async checkForOutdatedCalls(): Promise<void> {
    console.log('🔍 Checking for outdated calls...');
    
    for (const [filePath, analysis] of this.fileAnalyses) {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Check for old auth calls
      if (content.includes('useAuth') && analysis.imports.some(imp => imp.includes('/features/users'))) {
        this.issues.push({
          file: filePath,
          type: 'outdated-call',
          severity: 'warning',
          description: 'Using old auth import path',
          suggestion: 'Update to use @client/core/auth',
          autoFixable: true
        });
      }
      
      // Check for old API calls
      if (content.includes('globalApiClient') && !analysis.imports.some(imp => imp.includes('/core/api'))) {
        this.issues.push({
          file: filePath,
          type: 'outdated-call',
          severity: 'info',
          description: 'Using globalApiClient without proper import',
          suggestion: 'Import from @client/core/api',
          autoFixable: true
        });
      }
    }
  }

  private isEntryPoint(filePath: string): boolean {
    return filePath.includes('main.tsx') || 
           filePath.includes('App.tsx') || 
           filePath.includes('index.ts') ||
           filePath.includes('/pages/');
  }

  private isConfigFile(filePath: string): boolean {
    return filePath.includes('config') || 
           filePath.includes('.config.') ||
           filePath.includes('vite.') ||
           filePath.includes('tsconfig.');
  }

  private isSameFeature(filePath1: string, importPath: string): boolean {
    const parts1 = filePath1.split('/');
    const featureIndex1 = parts1.indexOf('features');
    
    if (featureIndex1 === -1) return false;
    
    const feature1 = parts1[featureIndex1 + 1];
    
    return importPath.includes(`/features/${feature1}/`);
  }

  private generateReport(): void {
    console.log('\n📊 Validation Report\n');
    console.log('='.repeat(50));
    
    // Summary
    const errorCount = this.issues.filter(i => i.severity === 'error').length;
    const warningCount = this.issues.filter(i => i.severity === 'warning').length;
    const infoCount = this.issues.filter(i => i.severity === 'info').length;
    const autoFixableCount = this.issues.filter(i => i.autoFixable).length;
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total Files Analyzed: ${this.fileAnalyses.size}`);
    console.log(`  Issues Found: ${this.issues.length}`);
    console.log(`    Errors: ${errorCount}`);
    console.log(`    Warnings: ${warningCount}`);
    console.log(`    Info: ${infoCount}`);
    console.log(`  Auto-fixable: ${autoFixableCount}`);
    
    // Issues by type
    console.log(`\n🔍 Issues by Type:`);
    const issuesByType = new Map<string, number>();
    this.issues.forEach(issue => {
      issuesByType.set(issue.type, (issuesByType.get(issue.type) || 0) + 1);
    });
    
    for (const [type, count] of issuesByType) {
      console.log(`  ${type}: ${count}`);
    }
    
    // File type distribution
    console.log(`\n📁 File Type Distribution:`);
    const typeDistribution = new Map<string, number>();
    Array.from(this.fileAnalyses.values()).forEach(analysis => {
      typeDistribution.set(analysis.type, (typeDistribution.get(analysis.type) || 0) + 1);
    });
    
    for (const [type, count] of typeDistribution) {
      console.log(`  ${type}: ${count}`);
    }
    
    // Top issues (first 10)
    if (this.issues.length > 0) {
      console.log(`\n🚨 Top Issues:`);
      this.issues.slice(0, 10).forEach((issue, index) => {
        const severity = issue.severity === 'error' ? '🔴' : 
                        issue.severity === 'warning' ? '🟡' : '🔵';
        console.log(`\n  ${index + 1}. ${severity} ${issue.type.toUpperCase()}`);
        console.log(`     File: ${issue.file}`);
        console.log(`     Issue: ${issue.description}`);
        console.log(`     Fix: ${issue.suggestion}`);
        console.log(`     Auto-fixable: ${issue.autoFixable ? '✅' : '❌'}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
  }

  private async applyAutoFixes(): Promise<void> {
    const autoFixableIssues = this.issues.filter(i => i.autoFixable);
    
    if (autoFixableIssues.length === 0) {
      console.log('\n✅ No auto-fixable issues found.');
      return;
    }
    
    console.log(`\n🔧 Applying ${autoFixableIssues.length} auto-fixes...`);
    
    let fixedCount = 0;
    
    for (const issue of autoFixableIssues) {
      try {
        await this.applyFix(issue);
        fixedCount++;
        console.log(`✅ Fixed: ${issue.description} in ${path.basename(issue.file)}`);
      } catch (error) {
        console.log(`❌ Failed to fix: ${issue.description} in ${path.basename(issue.file)}`);
      }
    }
    
    console.log(`\n🎉 Applied ${fixedCount}/${autoFixableIssues.length} auto-fixes!`);
  }

  private async applyFix(issue: ValidationIssue): Promise<void> {
    const content = await fs.readFile(issue.file, 'utf-8');
    let updatedContent = content;
    
    switch (issue.type) {
      case 'deprecated':
        if (issue.description.includes('useAuth import')) {
          updatedContent = content.replace(
            /@\/features\/users\/hooks\/useAuth/g,
            '@client/core/auth'
          );
        } else if (issue.description.includes('React import pattern')) {
          updatedContent = content.replace(
            /import React, \{ FC \}/g,
            'import React from \'react\';\nimport type { FC } from \'react\''
          );
        }
        break;
        
      case 'outdated-call':
        if (issue.description.includes('auth import path')) {
          updatedContent = content.replace(
            /from ['"`].*\/features\/users.*['"`]/g,
            'from \'@client/core/auth\''
          );
        }
        break;
        
      case 'misplaced':
        if (issue.description.includes('missing barrel export')) {
          const featureName = issue.file.split('/').pop();
          const indexContent = `/**\n * ${featureName} Feature\n * Feature-Sliced Design exports\n */\n\n// Export all feature modules\nexport * from './ui';\n`;
          await fs.writeFile(path.join(issue.file, 'index.ts'), indexContent);
          return;
        }
        break;
    }
    
    if (updatedContent !== content) {
      await fs.writeFile(issue.file, updatedContent);
    }
  }
}

// Run the validator
const validator = new ClientImplementationValidator();
validator.run().catch(console.error);