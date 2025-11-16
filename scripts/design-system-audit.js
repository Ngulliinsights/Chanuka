#!/usr/bin/env node

/**
 * Design System Compliance Audit Script
 * 
 * Scans the codebase for design system compliance issues:
 * - Inline styles in components
 * - CSS module imports
 * - Hardcoded colors/spacing
 * - Missing accessibility attributes
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class DesignSystemAuditor {
  constructor() {
    this.issues = [];
    this.stats = {
      filesScanned: 0,
      componentsWithInlineStyles: 0,
      hardcodedColors: 0,
      missingAriaLabels: 0,
      cssModuleImports: 0
    };
  }

  async audit() {
    console.log('🔍 Starting Design System Compliance Audit...\n');
    
    const componentFiles = glob.sync('client/src/components/**/*.{ts,tsx}');
    
    for (const file of componentFiles) {
      await this.auditFile(file);
    }
    
    this.generateReport();
  }

  async auditFile(filePath) {
    this.stats.filesScanned++;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Check for inline styles
      this.checkInlineStyles(content, relativePath);
      
      // Check for CSS module imports
      this.checkCSSModuleImports(content, relativePath);
      
      // Check for hardcoded colors
      this.checkHardcodedColors(content, relativePath);
      
      // Check for missing ARIA labels on interactive elements
      this.checkAccessibility(content, relativePath);
      
    } catch (error) {
      this.addIssue('error', filePath, `Failed to read file: ${error.message}`);
    }
  }

  checkInlineStyles(content, filePath) {
    const inlineStyleRegex = /style=\{[^}]+\}/g;
    const matches = content.match(inlineStyleRegex);
    
    if (matches) {
      this.stats.componentsWithInlineStyles++;
      matches.forEach(match => {
        this.addIssue(
          'warning',
          filePath,
          `Inline style found: ${match.substring(0, 50)}... - Use design system classes instead`
        );
      });
    }
  }

  checkCSSModuleImports(content, filePath) {
    const cssModuleRegex = /import\s+.*\s+from\s+['"][^'"]*\.module\.css['"];?/g;
    const matches = content.match(cssModuleRegex);
    
    if (matches) {
      this.stats.cssModuleImports++;
      matches.forEach(match => {
        this.addIssue(
          'error',
          filePath,
          `CSS module import found: ${match} - Use design system classes instead`
        );
      });
    }
  }

  checkHardcodedColors(content, filePath) {
    // Check for hex colors, rgb(), rgba(), hsl() that aren't using CSS variables
    const colorRegex = /#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)(?!.*var\()/g;
    const matches = content.match(colorRegex);
    
    if (matches) {
      this.stats.hardcodedColors += matches.length;
      matches.forEach(match => {
        this.addIssue(
          'warning',
          filePath,
          `Hardcoded color found: ${match} - Use design tokens like hsl(var(--primary)) instead`
        );
      });
    }
  }

  checkAccessibility(content, filePath) {
    // Check for buttons without aria-label or accessible text
    const buttonRegex = /<button[^>]*>/g;
    const buttons = content.match(buttonRegex) || [];
    
    buttons.forEach(button => {
      if (!button.includes('aria-label') && !button.includes('aria-labelledby')) {
        // Check if button has text content (simplified check)
        const hasTextContent = />.*[a-zA-Z].*<\/button>/.test(content.substring(content.indexOf(button)));
        
        if (!hasTextContent) {
          this.stats.missingAriaLabels++;
          this.addIssue(
            'error',
            filePath,
            `Button without accessible label: ${button.substring(0, 50)}... - Add aria-label or text content`
          );
        }
      }
    });

    // Check for loading states without proper ARIA
    if (content.includes('loading') || content.includes('spinner')) {
      if (!content.includes('aria-live') && !content.includes('role="status"')) {
        this.addIssue(
          'warning',
          filePath,
          'Loading state detected without proper ARIA attributes - Add role="status" and aria-live="polite"'
        );
      }
    }
  }

  addIssue(severity, file, message) {
    this.issues.push({ severity, file, message });
  }

  generateReport() {
    console.log('📊 Design System Audit Results');
    console.log('================================\n');
    
    // Summary statistics
    console.log('📈 Statistics:');
    console.log(`   Files scanned: ${this.stats.filesScanned}`);
    console.log(`   Components with inline styles: ${this.stats.componentsWithInlineStyles}`);
    console.log(`   CSS module imports: ${this.stats.cssModuleImports}`);
    console.log(`   Hardcoded colors: ${this.stats.hardcodedColors}`);
    console.log(`   Missing ARIA labels: ${this.stats.missingAriaLabels}`);
    console.log(`   Total issues: ${this.issues.length}\n`);
    
    // Compliance score
    const maxPossibleIssues = this.stats.filesScanned * 4; // Rough estimate
    const complianceScore = Math.max(0, Math.round((1 - this.issues.length / maxPossibleIssues) * 100));
    console.log(`🎯 Design System Compliance Score: ${complianceScore}%\n`);
    
    // Group issues by severity
    const errors = this.issues.filter(issue => issue.severity === 'error');
    const warnings = this.issues.filter(issue => issue.severity === 'warning');
    
    if (errors.length > 0) {
      console.log('❌ Errors (Must Fix):');
      errors.forEach(issue => {
        console.log(`   ${issue.file}: ${issue.message}`);
      });
      console.log();
    }
    
    if (warnings.length > 0) {
      console.log('⚠️  Warnings (Should Fix):');
      warnings.forEach(issue => {
        console.log(`   ${issue.file}: ${issue.message}`);
      });
      console.log();
    }
    
    if (this.issues.length === 0) {
      console.log('✅ No design system compliance issues found!');
      console.log('🎉 Your codebase is fully compliant with the design system.\n');
    } else {
      console.log('🔧 Recommendations:');
      console.log('   1. Replace inline styles with design system classes');
      console.log('   2. Remove CSS module imports');
      console.log('   3. Use design tokens for colors (hsl(var(--primary)))');
      console.log('   4. Add proper ARIA attributes for accessibility');
      console.log('   5. See client/src/shared/design-system/README.md for guidance\n');
    }
    
    // Exit with error code if there are errors
    if (errors.length > 0) {
      console.log('💥 Audit failed due to errors. Please fix the issues above.');
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log('⚠️  Audit completed with warnings. Consider fixing them for better compliance.');
      process.exit(0);
    } else {
      console.log('✅ Audit passed! Design system compliance is excellent.');
      process.exit(0);
    }
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new DesignSystemAuditor();
  auditor.audit().catch(error => {
    console.error('💥 Audit failed:', error);
    process.exit(1);
  });
}

module.exports = DesignSystemAuditor;