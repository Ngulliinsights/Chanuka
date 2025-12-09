#!/usr/bin/env tsx
/**
 * Migration Validation Script
 * Validates that all migrations are complete and no legacy patterns remain
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  score: number;
  recommendations: string[];
}

interface ValidationIssue {
  category: 'imports' | 'duplicates' | 'structure' | 'build';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
}

class MigrationValidator {
  private clientDir = 'client/src';
  private issues: ValidationIssue[] = [];

  async validateComplete(): Promise<ValidationResult> {
    console.log('🔍 Validating Migration Completion...\n');

    // Run all validation checks
    await this.validateImportPatterns();
    await this.validateDesignSystemUsage();
    await this.validateComponentStructure();
    await this.validateErrorHandling();
    await this.validateBuildProcess();
    await this.validateLegacyCleanup();

    const score = this.calculateScore();
    const recommendations = this.generateRecommendations();

    const result: ValidationResult = {
      passed: this.issues.filter(i => i.severity === 'critical').length === 0,
      issues: this.issues,
      score,
      recommendations
    };

    this.printResults(result);
    return result;
  }

  private async validateImportPatterns(): Promise<void> {
    console.log('📦 Validating import patterns...');

    const problematicPatterns = [
      {
        pattern: /from\s+['"]\.\.\/\.\.\/ui\/['"]/g,
        message: 'Old relative UI import pattern detected'
      },
      {
        pattern: /from\s+['"]\.\.\/primitives\/['"]/g,
        message: 'Old primitives import pattern detected'
      },
      {
        pattern: /from\s+['"]@client\/shared\/design-system\/primitives\/['"]/g,
        message: 'Old design system primitives import detected'
      },
      {
        pattern: /from\s+['"]@client\/lib\/utils['"]/g,
        message: 'Old lib/utils import detected, should use design system'
      }
    ];

    const files = await this.getAllTsxFiles();
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          for (const { pattern, message } of problematicPatterns) {
            if (pattern.test(lines[i])) {
              this.issues.push({
                category: 'imports',
                severity: 'critical',
                message,
                file: file.replace(this.clientDir + '/', ''),
                line: i + 1
              });
            }
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    console.log(`  Found ${this.issues.filter(i => i.category === 'imports').length} import issues`);
  }

  private async validateDesignSystemUsage(): Promise<void> {
    console.log('🎨 Validating design system usage...');

    const files = await this.getAllTsxFiles();
    const designSystemImports = new Set<string>();
    const componentUsage = new Map<string, number>();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        // Check for proper design system imports
        const dsImportMatch = content.match(/from\s+['"]@client\/shared\/design-system['"]/g);
        if (dsImportMatch) {
          designSystemImports.add(file);
        }

        // Count component usage
        const componentMatches = content.match(/\b(Button|Input|Card|Alert|Badge)\b/g);
        if (componentMatches) {
          componentMatches.forEach(comp => {
            componentUsage.set(comp, (componentUsage.get(comp) || 0) + 1);
          });
        }

        // Check for duplicate component definitions
        const componentDefMatch = content.match(/export\s+(const|function)\s+(Button|Input|Card|Alert|Badge)/g);
        if (componentDefMatch) {
          this.issues.push({
            category: 'duplicates',
            severity: 'warning',
            message: `Potential duplicate component definition: ${componentDefMatch.join(', ')}`,
            file: file.replace(this.clientDir + '/', '')
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    console.log(`  Design system used in ${designSystemImports.size} files`);
    console.log(`  Component usage: ${Array.from(componentUsage.entries()).map(([k, v]) => `${k}(${v})`).join(', ')}`);
  }

  private async validateComponentStructure(): Promise<void> {
    console.log('🏗️ Validating component structure...');

    // Check FSD structure compliance
    const expectedDirs = [
      'features',
      'shared/ui',
      'shared/design-system',
      'core'
    ];

    for (const dir of expectedDirs) {
      const fullPath = join(this.clientDir, dir);
      try {
        const stat = await fs.stat(fullPath);
        if (!stat.isDirectory()) {
          this.issues.push({
            category: 'structure',
            severity: 'critical',
            message: `Missing required directory: ${dir}`
          });
        }
      } catch (error) {
        this.issues.push({
          category: 'structure',
          severity: 'critical',
          message: `Missing required directory: ${dir}`
        });
      }
    }

    // Check for legacy directories that should be removed
    const legacyDirs = [
      '.design-system-backup',
      '.cleanup-backup',
      'utils/archive',
      'components' // If FSD migration is complete
    ];

    for (const dir of legacyDirs) {
      const fullPath = join(this.clientDir, dir);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          this.issues.push({
            category: 'structure',
            severity: 'warning',
            message: `Legacy directory still exists: ${dir}`
          });
        }
      } catch (error) {
        // Directory doesn't exist, which is good
      }
    }

    console.log(`  Found ${this.issues.filter(i => i.category === 'structure').length} structure issues`);
  }

  private async validateErrorHandling(): Promise<void> {
    console.log('🚨 Validating error handling...');

    const files = await this.getAllTsxFiles();
    let unifiedErrorUsage = 0;
    let legacyErrorUsage = 0;

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        // Check for unified error handling usage
        if (content.includes('UIComponentError') || content.includes('createUIError')) {
          unifiedErrorUsage++;
        }

        // Check for legacy error patterns
        if (content.includes('throw new Error(') && !content.includes('UIComponentError')) {
          legacyErrorUsage++;
          
          // Only flag UI components, not utility files
          if (file.includes('/components/') || file.includes('/ui/')) {
            this.issues.push({
              category: 'imports',
              severity: 'warning',
              message: 'UI component uses legacy error handling',
              file: file.replace(this.clientDir + '/', '')
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    console.log(`  Unified error handling: ${unifiedErrorUsage} files`);
    console.log(`  Legacy error handling: ${legacyErrorUsage} files`);
  }

  private async validateBuildProcess(): Promise<void> {
    console.log('🔨 Validating build process...');

    try {
      // Test TypeScript compilation
      execSync('npx tsc --noEmit', { cwd: 'client', stdio: 'pipe' });
      console.log('  ✓ TypeScript compilation successful');
    } catch (error) {
      this.issues.push({
        category: 'build',
        severity: 'critical',
        message: 'TypeScript compilation failed'
      });
    }

    try {
      // Test build process
      execSync('npm run build', { cwd: 'client', stdio: 'pipe' });
      console.log('  ✓ Build process successful');
    } catch (error) {
      this.issues.push({
        category: 'build',
        severity: 'critical',
        message: 'Build process failed'
      });
    }

    // Check for design system validation
    try {
      execSync('npm run tsx scripts/test-design-system-architecture.ts', { stdio: 'pipe' });
      console.log('  ✓ Design system validation passed');
    } catch (error) {
      this.issues.push({
        category: 'build',
        severity: 'warning',
        message: 'Design system validation failed'
      });
    }
  }

  private async validateLegacyCleanup(): Promise<void> {
    console.log('🧹 Validating legacy cleanup...');

    // Check for backup directories in archive
    const archiveDirs = ['archive'];
    
    for (const dir of archiveDirs) {
      try {
        const stat = await fs.stat(dir);
        if (stat.isDirectory()) {
          console.log(`  ✓ Archive directory exists: ${dir}`);
        }
      } catch (error) {
        this.issues.push({
          category: 'structure',
          severity: 'info',
          message: 'No archive directory found - legacy code may not have been properly archived'
        });
      }
    }

    // Check for orphaned files
    const orphanedPatterns = [
      '*.backup',
      '*.old',
      '*.legacy',
      '*-old.*',
      '*-backup.*'
    ];

    // This is a simplified check - in practice you'd use glob patterns
    const files = await this.getAllTsxFiles();
    for (const file of files) {
      if (orphanedPatterns.some(pattern => 
        file.includes(pattern.replace('*', '')) || 
        file.includes('.backup') || 
        file.includes('.old')
      )) {
        this.issues.push({
          category: 'structure',
          severity: 'warning',
          message: 'Potential orphaned file detected',
          file: file.replace(this.clientDir + '/', '')
        });
      }
    }
  }

  private calculateScore(): number {
    const criticalIssues = this.issues.filter(i => i.severity === 'critical').length;
    const warningIssues = this.issues.filter(i => i.severity === 'warning').length;
    const infoIssues = this.issues.filter(i => i.severity === 'info').length;

    // Score out of 100
    const maxScore = 100;
    const criticalPenalty = criticalIssues * 20;
    const warningPenalty = warningIssues * 5;
    const infoPenalty = infoIssues * 1;

    return Math.max(0, maxScore - criticalPenalty - warningPenalty - infoPenalty);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const criticalIssues = this.issues.filter(i => i.severity === 'critical');
    const importIssues = this.issues.filter(i => i.category === 'imports');
    const structureIssues = this.issues.filter(i => i.category === 'structure');
    const buildIssues = this.issues.filter(i => i.category === 'build');

    if (criticalIssues.length > 0) {
      recommendations.push('🚨 Address critical issues immediately before deployment');
    }

    if (importIssues.length > 0) {
      recommendations.push('📦 Run import standardization scripts to fix remaining import issues');
    }

    if (structureIssues.length > 0) {
      recommendations.push('🏗️ Complete directory structure cleanup and archiving');
    }

    if (buildIssues.length > 0) {
      recommendations.push('🔨 Fix build issues before proceeding with deployment');
    }

    if (this.issues.length === 0) {
      recommendations.push('🎉 Migration is complete! Ready for comprehensive testing and deployment');
    }

    return recommendations;
  }

  private printResults(result: ValidationResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n🎯 Overall Score: ${result.score}/100`);
    console.log(`✅ Migration Status: ${result.passed ? 'PASSED' : 'NEEDS ATTENTION'}`);
    
    if (result.issues.length === 0) {
      console.log('\n🎉 No issues found! Migration is complete.');
    } else {
      console.log(`\n📊 Issues Summary:`);
      const critical = result.issues.filter(i => i.severity === 'critical').length;
      const warning = result.issues.filter(i => i.severity === 'warning').length;
      const info = result.issues.filter(i => i.severity === 'info').length;
      
      console.log(`  🚨 Critical: ${critical}`);
      console.log(`  ⚠️  Warning: ${warning}`);
      console.log(`  ℹ️  Info: ${info}`);

      console.log('\n📝 Detailed Issues:');
      for (const issue of result.issues) {
        const icon = issue.severity === 'critical' ? '🚨' : 
                    issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} ${issue.message}`);
        if (issue.file) {
          console.log(`     📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        }
      }
    }

    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      for (const rec of result.recommendations) {
        console.log(`  ${rec}`);
      }
    }

    console.log('\n' + '='.repeat(60));
  }

  private async getAllTsxFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDir = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDir(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };
    
    await scanDir(this.clientDir);
    return files;
  }
}

// Main execution
async function main() {
  const validator = new MigrationValidator();
  const result = await validator.validateComplete();
  
  // Exit with error code if critical issues found
  if (!result.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { MigrationValidator };