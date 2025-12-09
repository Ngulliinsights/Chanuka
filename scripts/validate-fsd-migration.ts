#!/usr/bin/env tsx

/**
 * FSD Migration Validation Script
 * 
 * This script validates the current state of the Feature-Sliced Design migration
 * and identifies all remaining work needed to achieve true FSD compliance.
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  category: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: string[];
}

class FSDMigrationValidator {
  private results: ValidationResult[] = [];
  private clientSrc = 'client/src';

  async validate(): Promise<void> {
    console.log('🔍 Validating FSD Migration Status...\n');

    this.validateComponentsDirectory();
    this.validateLegacyImports();
    this.validateFSDStructure();
    this.validateFeatureBoundaries();
    this.validateSharedStructure();
    this.validateInfrastructureLayer();

    this.printResults();
  }

  private validateComponentsDirectory(): void {
    const componentsPath = join(this.clientSrc, 'components');
    
    if (!existsSync(componentsPath)) {
      this.results.push({
        category: 'Components Directory',
        status: 'PASS',
        message: 'Components directory has been removed'
      });
      return;
    }

    const componentDirs = readdirSync(componentsPath)
      .filter(item => statSync(join(componentsPath, item)).isDirectory());

    this.results.push({
      category: 'Components Directory',
      status: 'FAIL',
      message: `Components directory still exists with ${componentDirs.length} subdirectories`,
      details: componentDirs.map(dir => `- ${dir}/`)
    });
  }

  private validateLegacyImports(): void {
    try {
      // Search for imports from components/
      const legacyImports = execSync(
        `grep -r "from.*components/" ${this.clientSrc} --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".md"`,
        { encoding: 'utf8' }
      ).trim();

      if (!legacyImports) {
        this.results.push({
          category: 'Legacy Imports',
          status: 'PASS',
          message: 'No legacy component imports found'
        });
        return;
      }

      const importLines = legacyImports.split('\n');
      this.results.push({
        category: 'Legacy Imports',
        status: 'FAIL',
        message: `Found ${importLines.length} legacy component imports`,
        details: importLines.slice(0, 10).map(line => `- ${line}`)
      });

    } catch (error) {
      this.results.push({
        category: 'Legacy Imports',
        status: 'PASS',
        message: 'No legacy component imports found'
      });
    }
  }

  private validateFSDStructure(): void {
    const requiredDirs = [
      'app',
      'features',
      'shared',
      'core',
      'pages'
    ];

    const missingDirs: string[] = [];
    const existingDirs: string[] = [];

    requiredDirs.forEach(dir => {
      const dirPath = join(this.clientSrc, dir);
      if (existsSync(dirPath)) {
        existingDirs.push(dir);
      } else {
        missingDirs.push(dir);
      }
    });

    if (missingDirs.length === 0) {
      this.results.push({
        category: 'FSD Structure',
        status: 'PASS',
        message: 'All required FSD directories exist',
        details: existingDirs.map(dir => `✅ ${dir}/`)
      });
    } else {
      this.results.push({
        category: 'FSD Structure',
        status: 'WARNING',
        message: `Missing ${missingDirs.length} FSD directories`,
        details: [
          ...existingDirs.map(dir => `✅ ${dir}/`),
          ...missingDirs.map(dir => `❌ ${dir}/`)
        ]
      });
    }
  }

  private validateFeatureBoundaries(): void {
    const featuresPath = join(this.clientSrc, 'features');
    
    if (!existsSync(featuresPath)) {
      this.results.push({
        category: 'Feature Boundaries',
        status: 'FAIL',
        message: 'Features directory does not exist'
      });
      return;
    }

    const features = readdirSync(featuresPath)
      .filter(item => statSync(join(featuresPath, item)).isDirectory());

    const featureValidation: string[] = [];
    let hasIssues = false;

    features.forEach(feature => {
      const featurePath = join(featuresPath, feature);
      const hasUI = existsSync(join(featurePath, 'ui'));
      const hasModel = existsSync(join(featurePath, 'model'));
      const hasAPI = existsSync(join(featurePath, 'api'));

      if (hasUI) {
        featureValidation.push(`✅ ${feature}/ui/`);
      } else {
        featureValidation.push(`❌ ${feature}/ui/ (missing)`);
        hasIssues = true;
      }
    });

    this.results.push({
      category: 'Feature Boundaries',
      status: hasIssues ? 'WARNING' : 'PASS',
      message: `Found ${features.length} features`,
      details: featureValidation
    });
  }

  private validateSharedStructure(): void {
    const sharedPath = join(this.clientSrc, 'shared');
    
    if (!existsSync(sharedPath)) {
      this.results.push({
        category: 'Shared Structure',
        status: 'FAIL',
        message: 'Shared directory does not exist'
      });
      return;
    }

    const expectedSharedDirs = [
      'design-system',
      'ui',
      'infrastructure'
    ];

    const sharedValidation: string[] = [];
    let missingCount = 0;

    expectedSharedDirs.forEach(dir => {
      const dirPath = join(sharedPath, dir);
      if (existsSync(dirPath)) {
        sharedValidation.push(`✅ shared/${dir}/`);
      } else {
        sharedValidation.push(`❌ shared/${dir}/ (missing)`);
        missingCount++;
      }
    });

    this.results.push({
      category: 'Shared Structure',
      status: missingCount === 0 ? 'PASS' : 'WARNING',
      message: `Shared structure validation (${missingCount} missing)`,
      details: sharedValidation
    });
  }

  private validateInfrastructureLayer(): void {
    const infrastructurePath = join(this.clientSrc, 'shared', 'infrastructure');
    
    if (!existsSync(infrastructurePath)) {
      this.results.push({
        category: 'Infrastructure Layer',
        status: 'WARNING',
        message: 'Infrastructure layer not properly consolidated'
      });
      return;
    }

    // Check if system components are still in components/
    const systemInComponents = existsSync(join(this.clientSrc, 'components', 'system'));
    const compatibilityInComponents = existsSync(join(this.clientSrc, 'components', 'compatibility'));
    
    if (systemInComponents || compatibilityInComponents) {
      this.results.push({
        category: 'Infrastructure Layer',
        status: 'FAIL',
        message: 'Infrastructure components still in components/ directory',
        details: [
          systemInComponents ? '❌ components/system/ should be shared/infrastructure/system/' : '✅ system components migrated',
          compatibilityInComponents ? '❌ components/compatibility/ should be shared/infrastructure/compatibility/' : '✅ compatibility components migrated'
        ]
      });
    } else {
      this.results.push({
        category: 'Infrastructure Layer',
        status: 'PASS',
        message: 'Infrastructure layer properly consolidated'
      });
    }
  }

  private printResults(): void {
    console.log('📊 FSD Migration Validation Results\n');
    console.log('=' .repeat(50));

    let passCount = 0;
    let failCount = 0;
    let warningCount = 0;

    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`\n${icon} ${result.category}: ${result.message}`);
      
      if (result.details) {
        result.details.forEach(detail => {
          console.log(`   ${detail}`);
        });
      }

      switch (result.status) {
        case 'PASS': passCount++; break;
        case 'FAIL': failCount++; break;
        case 'WARNING': warningCount++; break;
      }
    });

    console.log('\n' + '=' .repeat(50));
    console.log(`📈 Summary: ${passCount} passed, ${warningCount} warnings, ${failCount} failed`);

    if (failCount === 0 && warningCount === 0) {
      console.log('\n🎉 FSD Migration is COMPLETE!');
    } else if (failCount === 0) {
      console.log('\n⚠️  FSD Migration has minor issues to address');
    } else {
      console.log('\n❌ FSD Migration is INCOMPLETE - significant work remaining');
    }

    console.log('\n📋 Next Steps:');
    if (failCount > 0 || warningCount > 0) {
      console.log('1. Review the FSD_COMPLETION_PLAN.md for detailed migration steps');
      console.log('2. Run the migration scripts to move remaining components');
      console.log('3. Update all import references');
      console.log('4. Remove the components/ directory when migration is complete');
      console.log('5. Re-run this validation script to verify completion');
    } else {
      console.log('1. FSD migration is complete!');
      console.log('2. Continue with feature development using FSD patterns');
      console.log('3. Maintain architectural compliance in future development');
    }
  }
}

// Run validation
const validator = new FSDMigrationValidator();
validator.validate().catch(console.error);