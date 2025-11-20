#!/usr/bin/env node

/**
 * Migration Validation Script
 * Validates that the styling migration was successful
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ValidationResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
  summary: {
    filesChecked: number;
    unifiedComponentsUsed: number;
    designTokensUsed: number;
    legacyPatternsFound: number;
  };
}

class MigrationValidator {
  private issues: string[] = [];
  private warnings: string[] = [];
  private summary = {
    filesChecked: 0,
    unifiedComponentsUsed: 0,
    designTokensUsed: 0,
    legacyPatternsFound: 0
  };

  async validateMigration(directory: string = 'client/src'): Promise<ValidationResult> {
    console.log('🔍 Validating styling migration...');

    // Check if unified components exist
    await this.checkUnifiedComponents();
    
    // Check if design tokens are properly set up
    await this.checkDesignTokens();
    
    // Scan files for migration compliance
    await this.scanFiles(directory);
    
    // Check CSS structure
    await this.checkCSSStructure();

    const passed = this.issues.length === 0;
    
    this.printResults(passed);
    
    return {
      passed,
      issues: this.issues,
      warnings: this.warnings,
      summary: this.summary
    };
  }

  private async checkUnifiedComponents(): Promise<void> {
    const unifiedComponentsPath = 'client/src/components/ui/unified-components.tsx';
    
    if (!fs.existsSync(unifiedComponentsPath)) {
      this.issues.push('❌ Unified components file not found');
      return;
    }

    const content = fs.readFileSync(unifiedComponentsPath, 'utf8');
    
    // Check for required components
    const requiredComponents = [
      'UnifiedButton',
      'UnifiedCard',
      'UnifiedBadge',
      'unifiedButtonVariants',
      'unifiedBadgeVariants'
    ];

    for (const component of requiredComponents) {
      if (!content.includes(component)) {
        this.issues.push(`❌ Missing unified component: ${component}`);
      }
    }

    console.log('✅ Unified components validation passed');
  }

  private async checkDesignTokens(): Promise<void> {
    const designTokensPath = 'client/src/styles/design-tokens.css';
    
    if (!fs.existsSync(designTokensPath)) {
      this.issues.push('❌ Design tokens file not found');
      return;
    }

    const content = fs.readFileSync(designTokensPath, 'utf8');
    
    // Check for required design tokens
    const requiredTokens = [
      '--color-primary',
      '--color-secondary',
      '--color-accent',
      '--color-success',
      '--color-warning',
      '--color-error',
      '--color-background',
      '--color-foreground',
      '--radius-md',
      '--touch-target-min'
    ];

    for (const token of requiredTokens) {
      if (!content.includes(token)) {
        this.issues.push(`❌ Missing design token: ${token}`);
      }
    }

    console.log('✅ Design tokens validation passed');
  }

  private async scanFiles(directory: string): Promise<void> {
    const files = await glob(`${directory}/**/*.{tsx,ts,jsx,js}`, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/scripts/**'
      ]
    });

    console.log(`📁 Scanning ${files.length} files...`);

    for (const file of files) {
      await this.validateFile(file);
    }
  }

  private async validateFile(filePath: string): Promise<void> {
    try {
      this.summary.filesChecked++;
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);

      // Check for unified component usage
      if (content.includes('UnifiedButton') || content.includes('UnifiedCard') || content.includes('UnifiedBadge')) {
        this.summary.unifiedComponentsUsed++;
      }

      // Check for design token usage
      if (content.includes('hsl(var(--color-') || content.includes('var(--radius-') || content.includes('var(--touch-target-')) {
        this.summary.designTokensUsed++;
      }

      // Check for legacy patterns that should be migrated
      const legacyPatterns = [
        { pattern: /className="[^"]*bg-blue-600[^"]*"/g, message: 'Hardcoded blue-600 color' },
        { pattern: /className="[^"]*bg-green-600[^"]*"/g, message: 'Hardcoded green-600 color' },
        { pattern: /className="[^"]*bg-red-600[^"]*"/g, message: 'Hardcoded red-600 color' },
        { pattern: /className="[^"]*text-gray-600[^"]*"/g, message: 'Hardcoded gray-600 text color' },
        { pattern: /<Button\s/g, message: 'Legacy Button component (should use UnifiedButton)' },
        { pattern: /<Card\s/g, message: 'Legacy Card component (should use UnifiedCard)' },
        { pattern: /<Badge\s/g, message: 'Legacy Badge component (should use UnifiedBadge)' },
        { pattern: /<button[^>]*(?!type=)/g, message: 'Button without type attribute' }
      ];

      for (const { pattern, message } of legacyPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          this.summary.legacyPatternsFound += matches.length;
          this.warnings.push(`⚠️  ${fileName}: ${message} (${matches.length} occurrences)`);
        }
      }

      // Check for proper imports
      if (content.includes("from '../components/ui/button'") && !content.includes('UnifiedButton')) {
        this.warnings.push(`⚠️  ${fileName}: Still importing legacy Button component`);
      }

      if (content.includes("from '../components/ui/card'") && !content.includes('UnifiedCard')) {
        this.warnings.push(`⚠️  ${fileName}: Still importing legacy Card component`);
      }

    } catch (error) {
      this.warnings.push(`⚠️  Could not validate ${filePath}: ${error}`);
    }
  }

  private async checkCSSStructure(): Promise<void> {
    const indexCSSPath = 'client/src/index.css';
    
    if (!fs.existsSync(indexCSSPath)) {
      this.issues.push('❌ Main CSS file not found');
      return;
    }

    const content = fs.readFileSync(indexCSSPath, 'utf8');
    
    // Check for proper import order
    const expectedOrder = [
      "import './styles/design-tokens.css'",
      '@tailwind base',
      '@tailwind components',
      '@tailwind utilities'
    ];

    let lastIndex = -1;
    for (const expectedImport of expectedOrder) {
      const index = content.indexOf(expectedImport);
      if (index === -1) {
        this.warnings.push(`⚠️  Missing or incorrectly placed: ${expectedImport}`);
      } else if (index < lastIndex) {
        this.warnings.push(`⚠️  Incorrect order: ${expectedImport} should come after previous imports`);
      }
      lastIndex = index;
    }

    // Check for duplicate Tailwind imports
    const tailwindImports = content.match(/@tailwind (base|components|utilities)/g) || [];
    const uniqueImports = new Set(tailwindImports);
    if (tailwindImports.length > uniqueImports.size) {
      this.issues.push('❌ Duplicate Tailwind imports found');
    }

    console.log('✅ CSS structure validation completed');
  }

  private printResults(passed: boolean): void {
    console.log('\n📊 Migration Validation Results:');
    console.log('═══════════════════════════════════');
    
    if (passed) {
      console.log('🎉 Migration validation PASSED!');
    } else {
      console.log('❌ Migration validation FAILED');
    }

    console.log(`\n📈 Summary:`);
    console.log(`   📁 Files checked: ${this.summary.filesChecked}`);
    console.log(`   🔧 Files using unified components: ${this.summary.unifiedComponentsUsed}`);
    console.log(`   🎨 Files using design tokens: ${this.summary.designTokensUsed}`);
    console.log(`   ⚠️  Legacy patterns found: ${this.summary.legacyPatternsFound}`);

    if (this.issues.length > 0) {
      console.log('\n❌ Issues that must be fixed:');
      this.issues.forEach(issue => console.log(`   ${issue}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings (recommended to fix):');
      this.warnings.slice(0, 10).forEach(warning => console.log(`   ${warning}`));
      
      if (this.warnings.length > 10) {
        console.log(`   ... and ${this.warnings.length - 10} more warnings`);
      }
    }

    console.log('\n💡 Next Steps:');
    if (passed) {
      console.log('   ✅ Migration is complete and validated!');
      console.log('   📚 See MIGRATION_COMPLETE.md for usage guidelines');
      console.log('   🚀 Your styling system is ready for production');
    } else {
      console.log('   🔧 Fix the issues listed above');
      console.log('   🔄 Run the migration scripts if needed');
      console.log('   ✅ Re-run validation after fixes');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const directory = args[0] || 'client/src';
  
  const validator = new MigrationValidator();
  const result = await validator.validateMigration(directory);
  
  // Exit with error code if validation failed
  process.exit(result.passed ? 0 : 1);
}

// Export for programmatic use
export { MigrationValidator, type ValidationResult };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}