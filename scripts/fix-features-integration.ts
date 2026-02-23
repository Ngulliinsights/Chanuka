#!/usr/bin/env tsx

/**
 * Features-Core Integration Fix Script
 * 
 * This script identifies and fixes common integration issues between
 * features and core modules, ensuring optimal architecture.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface IntegrationIssue {
  file: string;
  line: number;
  type: 'circular-dependency' | 'deprecated-import' | 'missing-export' | 'type-mismatch';
  description: string;
  suggestion: string;
  severity: 'error' | 'warning' | 'info';
}

interface FeatureAnalysis {
  name: string;
  path: string;
  structure: {
    hasApi: boolean;
    hasModel: boolean;
    hasUi: boolean;
    hasServices: boolean;
    hasIndex: boolean;
  };
  coreIntegration: {
    usesAuth: boolean;
    usesApi: boolean;
    usesError: boolean;
    usesPerformance: boolean;
    usesLoading: boolean;
  };
  issues: IntegrationIssue[];
}

class FeaturesIntegrationFixer {
  private featuresDir = 'client/src/features';
  private coreDir = 'client/src/infrastructure';
  private issues: IntegrationIssue[] = [];
  private features: FeatureAnalysis[] = [];

  async run(): Promise<void> {
    console.log('🔍 Analyzing features-core integration...\n');

    await this.analyzeFeatures();
    await this.detectCircularDependencies();
    await this.validateCoreIntegration();
    await this.checkDeprecatedPatterns();
    
    this.generateReport();
    await this.applyFixes();
  }

  private async analyzeFeatures(): Promise<void> {
    const featureDirs = await fs.readdir(this.featuresDir, { withFileTypes: true });
    
    for (const dir of featureDirs) {
      if (!dir.isDirectory()) continue;
      
      const featurePath = path.join(this.featuresDir, dir.name);
      const analysis = await this.analyzeFeature(dir.name, featurePath);
      this.features.push(analysis);
    }
  }

  private async analyzeFeature(name: string, featurePath: string): Promise<FeatureAnalysis> {
    const analysis: FeatureAnalysis = {
      name,
      path: featurePath,
      structure: {
        hasApi: await this.pathExists(path.join(featurePath, 'api')),
        hasModel: await this.pathExists(path.join(featurePath, 'model')),
        hasUi: await this.pathExists(path.join(featurePath, 'ui')),
        hasServices: await this.pathExists(path.join(featurePath, 'services')),
        hasIndex: await this.pathExists(path.join(featurePath, 'index.ts')),
      },
      coreIntegration: {
        usesAuth: false,
        usesApi: false,
        usesError: false,
        usesPerformance: false,
        usesLoading: false,
      },
      issues: [],
    };

    // Analyze core integration
    const files = await glob(`${featurePath}/**/*.{ts,tsx}`, { ignore: ['**/node_modules/**'] });
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Check core imports
      if (content.includes('@client/infrastructure/auth') || content.includes('../../../core/auth')) {
        analysis.coreIntegration.usesAuth = true;
      }
      if (content.includes('@client/infrastructure/api') || content.includes('../../../core/api')) {
        analysis.coreIntegration.usesApi = true;
      }
      if (content.includes('@client/infrastructure/error') || content.includes('../../../core/error')) {
        analysis.coreIntegration.usesError = true;
      }
      if (content.includes('@client/infrastructure/performance') || content.includes('../../../core/performance')) {
        analysis.coreIntegration.usesPerformance = true;
      }
      if (content.includes('@client/infrastructure/loading') || content.includes('../../../core/loading')) {
        analysis.coreIntegration.usesLoading = true;
      }

      // Check for issues
      await this.analyzeFileForIssues(file, content, analysis);
    }

    return analysis;
  }

  private async analyzeFileForIssues(
    filePath: string, 
    content: string, 
    analysis: FeatureAnalysis
  ): Promise<void> {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for circular dependencies
      if (line.includes('from \'@client/infrastructure/') && 
          filePath.includes('/core/') && 
          line.includes(`/features/${analysis.name}`)) {
        this.issues.push({
          file: filePath,
          line: index + 1,
          type: 'circular-dependency',
          description: 'Circular dependency detected between core and feature',
          suggestion: 'Use dependency injection or move shared code to shared module',
          severity: 'error',
        });
      }

      // Check for deprecated imports
      if (line.includes('from \'@/features/users/hooks/useAuth\'')) {
        this.issues.push({
          file: filePath,
          line: index + 1,
          type: 'deprecated-import',
          description: 'Using deprecated useAuth import',
          suggestion: 'Replace with: import { useAuth } from \'@client/infrastructure/auth\'',
          severity: 'warning',
        });
      }

      // Check for direct feature-to-feature imports
      if (line.includes('from \'@client/features/') && 
          !filePath.includes('/features/') && 
          !line.includes(`/features/${analysis.name}/`)) {
        this.issues.push({
          file: filePath,
          line: index + 1,
          type: 'circular-dependency',
          description: 'Direct feature-to-feature import detected',
          suggestion: 'Use core services or shared modules for cross-feature communication',
          severity: 'warning',
        });
      }
    });
  }

  private async detectCircularDependencies(): Promise<void> {
    // Check core modules for feature imports
    const coreFiles = await glob(`${this.coreDir}/**/*.{ts,tsx}`, { ignore: ['**/node_modules/**'] });
    
    for (const file of coreFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.includes('from \'@client/features/') || line.includes('../features/')) {
          this.issues.push({
            file,
            line: index + 1,
            type: 'circular-dependency',
            description: 'Core module importing from features',
            suggestion: 'Use dependency injection or move shared code to shared module',
            severity: 'error',
          });
        }
      });
    }
  }

  private async validateCoreIntegration(): Promise<void> {
    for (const feature of this.features) {
      // Check if feature has proper structure
      if (!feature.structure.hasIndex) {
        this.issues.push({
          file: path.join(feature.path, 'index.ts'),
          line: 0,
          type: 'missing-export',
          description: 'Feature missing index.ts barrel export',
          suggestion: 'Create index.ts with proper exports',
          severity: 'warning',
        });
      }

      // Check if feature uses core services appropriately
      if (feature.structure.hasApi && !feature.coreIntegration.usesApi) {
        this.issues.push({
          file: feature.path,
          line: 0,
          type: 'missing-export',
          description: 'Feature has API layer but doesn\'t use core API services',
          suggestion: 'Consider using @client/infrastructure/api for consistency',
          severity: 'info',
        });
      }
    }
  }

  private async checkDeprecatedPatterns(): Promise<void> {
    const allFiles = await glob(`${this.featuresDir}/**/*.{ts,tsx}`, { ignore: ['**/node_modules/**'] });
    
    for (const file of allFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for old auth patterns
        if (line.includes('useAuth') && line.includes('@/features/users')) {
          this.issues.push({
            file,
            line: index + 1,
            type: 'deprecated-import',
            description: 'Using deprecated auth import',
            suggestion: 'Replace with: import { useAuth } from \'@client/infrastructure/auth\'',
            severity: 'warning',
          });
        }

        // Check for direct API calls instead of using core services
        if (line.includes('fetch(') && !line.includes('// TODO:') && !line.includes('// FIXME:')) {
          this.issues.push({
            file,
            line: index + 1,
            type: 'deprecated-import',
            description: 'Direct fetch usage instead of core API services',
            suggestion: 'Consider using @client/infrastructure/api services for consistency',
            severity: 'info',
          });
        }
      });
    }
  }

  private generateReport(): void {
    console.log('📊 Integration Analysis Report\n');
    console.log('='.repeat(50));
    
    // Feature structure summary
    console.log('\n🏗️  Feature Structure Analysis:');
    this.features.forEach(feature => {
      const structure = feature.structure;
      const completeness = Object.values(structure).filter(Boolean).length / Object.keys(structure).length * 100;
      
      console.log(`\n  ${feature.name}:`);
      console.log(`    Structure: ${completeness.toFixed(0)}% complete`);
      console.log(`    API: ${structure.hasApi ? '✅' : '❌'} | Model: ${structure.hasModel ? '✅' : '❌'} | UI: ${structure.hasUi ? '✅' : '❌'}`);
      console.log(`    Services: ${structure.hasServices ? '✅' : '❌'} | Index: ${structure.hasIndex ? '✅' : '❌'}`);
      
      const integration = feature.coreIntegration;
      const integrationCount = Object.values(integration).filter(Boolean).length;
      console.log(`    Core Integration: ${integrationCount}/5 services used`);
    });

    // Issues summary
    console.log('\n🚨 Issues Found:');
    const errorCount = this.issues.filter(i => i.severity === 'error').length;
    const warningCount = this.issues.filter(i => i.severity === 'warning').length;
    const infoCount = this.issues.filter(i => i.severity === 'info').length;
    
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Warnings: ${warningCount}`);
    console.log(`  Info: ${infoCount}`);
    console.log(`  Total: ${this.issues.length}`);

    // Detailed issues
    if (this.issues.length > 0) {
      console.log('\n📋 Detailed Issues:');
      this.issues.forEach((issue, index) => {
        const severity = issue.severity === 'error' ? '🔴' : 
                        issue.severity === 'warning' ? '🟡' : '🔵';
        console.log(`\n  ${index + 1}. ${severity} ${issue.type.toUpperCase()}`);
        console.log(`     File: ${issue.file}:${issue.line}`);
        console.log(`     Issue: ${issue.description}`);
        console.log(`     Fix: ${issue.suggestion}`);
      });
    }

    console.log('\n' + '='.repeat(50));
  }

  private async applyFixes(): Promise<void> {
    console.log('\n🔧 Applying automatic fixes...\n');

    let fixedCount = 0;
    
    for (const issue of this.issues) {
      if (issue.type === 'deprecated-import' && issue.file.endsWith('.ts') || issue.file.endsWith('.tsx')) {
        try {
          await this.fixDeprecatedImport(issue);
          fixedCount++;
          console.log(`✅ Fixed: ${issue.description} in ${path.basename(issue.file)}`);
        } catch (error) {
          console.log(`❌ Failed to fix: ${issue.description} in ${path.basename(issue.file)}`);
        }
      }
      
      if (issue.type === 'missing-export' && issue.file.endsWith('index.ts')) {
        try {
          await this.createMissingIndex(issue);
          fixedCount++;
          console.log(`✅ Created: index.ts for ${path.dirname(issue.file)}`);
        } catch (error) {
          console.log(`❌ Failed to create: index.ts for ${path.dirname(issue.file)}`);
        }
      }
    }

    console.log(`\n🎉 Applied ${fixedCount} automatic fixes!`);
    
    const remainingIssues = this.issues.length - fixedCount;
    if (remainingIssues > 0) {
      console.log(`⚠️  ${remainingIssues} issues require manual attention.`);
    }
  }

  private async fixDeprecatedImport(issue: IntegrationIssue): Promise<void> {
    const content = await fs.readFile(issue.file, 'utf-8');
    const lines = content.split('\n');
    
    // Fix deprecated auth imports
    if (lines[issue.line - 1].includes('@/features/users/hooks/useAuth')) {
      lines[issue.line - 1] = lines[issue.line - 1].replace(
        '@/features/users/hooks/useAuth',
        '@client/infrastructure/auth'
      );
      
      await fs.writeFile(issue.file, lines.join('\n'));
    }
  }

  private async createMissingIndex(issue: IntegrationIssue): Promise<void> {
    const featureDir = path.dirname(issue.file);
    const featureName = path.basename(featureDir);
    
    // Check what directories exist
    const hasApi = await this.pathExists(path.join(featureDir, 'api'));
    const hasModel = await this.pathExists(path.join(featureDir, 'model'));
    const hasUi = await this.pathExists(path.join(featureDir, 'ui'));
    const hasServices = await this.pathExists(path.join(featureDir, 'services'));
    
    let indexContent = `/**\n * ${featureName} Feature\n * Feature-Sliced Design exports\n */\n\n`;
    
    if (hasApi) indexContent += `// API layer\nexport * from './api';\n\n`;
    if (hasModel) indexContent += `// Model layer\nexport * from './model';\n\n`;
    if (hasServices) indexContent += `// Services layer\nexport * from './services';\n\n`;
    if (hasUi) indexContent += `// UI layer\nexport * from './ui';\n`;
    
    await fs.writeFile(issue.file, indexContent);
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

// Run the fixer
const fixer = new FeaturesIntegrationFixer();
fixer.run().catch(console.error);

export { FeaturesIntegrationFixer };