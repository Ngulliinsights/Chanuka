#!/usr/bin/env node

/**
 * Strategic Contrast Migration Script
 * 
 * Identifies and migrates components that would benefit from design system
 * contrast improvements while preserving legitimate dynamic styling.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class StrategicContrastMigrator {
  constructor() {
    this.migrations = [];
    this.stats = {
      filesScanned: 0,
      staticStylesFound: 0,
      dynamicStylesPreserved: 0,
      contrastIssuesFound: 0,
      migrationsApplied: 0
    };
  }

  async migrate() {
    console.log('🎨 Starting Strategic Contrast Migration...\n');
    
    const componentFiles = glob.sync('client/src/components/**/*.{ts,tsx}');
    
    for (const file of componentFiles) {
      await this.analyzeFile(file);
    }
    
    this.generateMigrationReport();
  }

  async analyzeFile(filePath) {
    this.stats.filesScanned++;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Identify static styles that could use design system
      this.identifyStaticStyles(content, relativePath);
      
      // Identify dynamic styles to preserve
      this.identifyDynamicStyles(content, relativePath);
      
      // Check for contrast issues
      this.checkContrastIssues(content, relativePath);
      
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
    }
  }

  identifyStaticStyles(content, filePath) {
    // Static padding/margin patterns
    const staticPaddingRegex = /style=\{\s*\{\s*padding:\s*['"`][\d\w\s]+['"`]/g;
    const staticColorRegex = /style=\{\s*\{\s*(?:background)?[Cc]olor:\s*['"`](#[0-9a-fA-F]{3,6}|rgb\([^)]+\))['"`]/g;
    const staticDisplayRegex = /style=\{\s*\{\s*display:\s*['"`](flex|block|inline)['"`]/g;
    
    const staticPadding = content.match(staticPaddingRegex) || [];
    const staticColors = content.match(staticColorRegex) || [];
    const staticDisplay = content.match(staticDisplayRegex) || [];
    
    if (staticPadding.length > 0 || staticColors.length > 0 || staticDisplay.length > 0) {
      this.stats.staticStylesFound += staticPadding.length + staticColors.length + staticDisplay.length;
      
      this.migrations.push({
        type: 'static-styles',
        file: filePath,
        priority: 'medium',
        issues: [
          ...staticPadding.map(match => ({ type: 'padding', code: match, suggestion: 'Use chanuka-spacing classes' })),
          ...staticColors.map(match => ({ type: 'color', code: match, suggestion: 'Use design tokens: hsl(var(--primary))' })),
          ...staticDisplay.map(match => ({ type: 'layout', code: match, suggestion: 'Use chanuka-loading-overlay or similar' }))
        ]
      });
    }
  }

  identifyDynamicStyles(content, filePath) {
    // Dynamic styles to preserve (these are legitimate)
    const dynamicPatterns = [
      /style=\{\s*\{\s*width:\s*`[^`]*\$\{[^}]+\}[^`]*`/g,  // Dynamic width
      /style=\{\s*\{\s*transform:\s*`[^`]*\$\{[^}]+\}[^`]*`/g,  // Dynamic transforms
      /style=\{\s*\{\s*backgroundColor:\s*[a-zA-Z_$][a-zA-Z0-9_$]*\([^)]*\)/g,  // Function-based colors
      /style=\{\s*\{\s*height:\s*[a-zA-Z_$][a-zA-Z0-9_$]*\}/g,  // Variable heights
      /style=\{\s*\{\s*['"`]--[^'"`]+['"`]:\s*[^,}]+/g,  // CSS custom properties
    ];
    
    let dynamicCount = 0;
    dynamicPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      dynamicCount += matches.length;
    });
    
    if (dynamicCount > 0) {
      this.stats.dynamicStylesPreserved += dynamicCount;
      
      this.migrations.push({
        type: 'dynamic-styles-preserved',
        file: filePath,
        priority: 'info',
        message: `${dynamicCount} dynamic styles preserved (correct approach)`
      });
    }
  }

  checkContrastIssues(content, filePath) {
    // Look for hardcoded colors that might have contrast issues
    const colorPatterns = [
      /#[0-9a-fA-F]{3,6}/g,  // Hex colors
      /rgb\([^)]+\)/g,       // RGB colors
      /rgba\([^)]+\)/g,      // RGBA colors
    ];
    
    let potentialIssues = [];
    
    colorPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(color => {
        // Check if it's a potentially problematic color
        if (this.isPotentialContrastIssue(color)) {
          potentialIssues.push(color);
        }
      });
    });
    
    if (potentialIssues.length > 0) {
      this.stats.contrastIssuesFound += potentialIssues.length;
      
      this.migrations.push({
        type: 'contrast-issues',
        file: filePath,
        priority: 'high',
        issues: potentialIssues.map(color => ({
          color,
          suggestion: 'Verify contrast ratio and consider using design tokens'
        }))
      });
    }
  }

  isPotentialContrastIssue(color) {
    // Simple heuristic for colors that might have contrast issues
    const problematicColors = [
      '#ffff00', '#yellow',  // Yellow on white
      '#00ff00', '#lime',    // Bright green
      '#ff00ff', '#magenta', // Magenta
      '#00ffff', '#cyan',    // Cyan
    ];
    
    return problematicColors.some(problematic => 
      color.toLowerCase().includes(problematic.toLowerCase())
    );
  }

  generateMigrationReport() {
    console.log('📊 Strategic Contrast Migration Report');
    console.log('=====================================\n');
    
    // Summary statistics
    console.log('📈 Analysis Summary:');
    console.log(`   Files scanned: ${this.stats.filesScanned}`);
    console.log(`   Static styles found: ${this.stats.staticStylesFound}`);
    console.log(`   Dynamic styles preserved: ${this.stats.dynamicStylesPreserved}`);
    console.log(`   Potential contrast issues: ${this.stats.contrastIssuesFound}`);
    console.log(`   Migration opportunities: ${this.migrations.length}\n`);
    
    // Group migrations by priority
    const highPriority = this.migrations.filter(m => m.priority === 'high');
    const mediumPriority = this.migrations.filter(m => m.priority === 'medium');
    const infoPriority = this.migrations.filter(m => m.priority === 'info');
    
    if (highPriority.length > 0) {
      console.log('🚨 High Priority (Contrast Issues):');
      highPriority.forEach(migration => {
        console.log(`   ${migration.file}:`);
        if (migration.issues) {
          migration.issues.forEach(issue => {
            console.log(`     • ${issue.color} - ${issue.suggestion}`);
          });
        }
      });
      console.log();
    }
    
    if (mediumPriority.length > 0) {
      console.log('⚠️  Medium Priority (Static Styles):');
      mediumPriority.forEach(migration => {
        console.log(`   ${migration.file}:`);
        if (migration.issues) {
          migration.issues.slice(0, 3).forEach(issue => {
            console.log(`     • ${issue.type}: ${issue.suggestion}`);
          });
          if (migration.issues.length > 3) {
            console.log(`     • ... and ${migration.issues.length - 3} more`);
          }
        }
      });
      console.log();
    }
    
    if (infoPriority.length > 0) {
      console.log('ℹ️  Info (Dynamic Styles Preserved):');
      console.log(`   ${infoPriority.length} files with correctly preserved dynamic styles\n`);
    }
    
    // Strategic recommendations
    console.log('🎯 Strategic Recommendations:');
    console.log('   1. Focus on HIGH priority contrast issues first');
    console.log('   2. PRESERVE all dynamic styling (width, transform, calculated values)');
    console.log('   3. Migrate static colors to design tokens: hsl(var(--primary))');
    console.log('   4. Use chanuka-loading-overlay for repeated loading patterns');
    console.log('   5. Test all changes with screen readers and high contrast mode\n');
    
    // Migration commands
    console.log('🔧 Next Steps:');
    console.log('   1. Run contrast validation: npm run design-system:validate');
    console.log('   2. Test high contrast mode: Toggle in accessibility settings');
    console.log('   3. Verify WCAG compliance: Use browser accessibility tools');
    console.log('   4. Update components gradually, testing each change\n');
    
    // Success criteria
    const successScore = Math.round(
      ((this.stats.dynamicStylesPreserved / Math.max(1, this.stats.dynamicStylesPreserved + this.stats.staticStylesFound)) * 100)
    );
    
    console.log(`🎉 Dynamic Styling Preservation Score: ${successScore}%`);
    
    if (successScore >= 80) {
      console.log('✅ Excellent! Your codebase follows modern dynamic styling patterns.');
    } else if (successScore >= 60) {
      console.log('⚠️  Good, but consider migrating some static styles to design system.');
    } else {
      console.log('🔄 Consider strategic migration of static styles while preserving dynamic ones.');
    }
    
    // Exit with appropriate code
    if (highPriority.length > 0) {
      console.log('\n💥 High priority contrast issues found. Please address them for accessibility.');
      process.exit(1);
    } else {
      console.log('\n✅ No critical contrast issues found. Great job!');
      process.exit(0);
    }
  }
}

// Run the migration analysis
if (require.main === module) {
  const migrator = new StrategicContrastMigrator();
  migrator.migrate().catch(error => {
    console.error('💥 Migration analysis failed:', error);
    process.exit(1);
  });
}

module.exports = StrategicContrastMigrator;