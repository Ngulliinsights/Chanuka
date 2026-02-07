/**
 * Phase 2: Generate Import Path Update Fixes
 * 
 * Generates fixes for all discovered module relocations from Phase 1.
 * This script creates ImportPathFix objects that can be applied in batches.
 */

import { Phase1ModuleDiscovery } from './phase1-module-discovery';
import { FixGenerator } from '../core/fix-generator';
import { defaultConfig, RemediationConfig } from '../config';
import { ImportPathFix, ErrorCategory } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class Phase2FixGeneration {
  private config: RemediationConfig;
  private fixGenerator: FixGenerator;

  constructor(config: RemediationConfig = defaultConfig) {
    this.config = config;
    this.fixGenerator = new FixGenerator(config);
  }

  /**
   * Execute Phase 2: Generate Import Path Update Fixes
   */
  async execute(): Promise<Phase2Result> {
    console.log('=== Phase 2: Generate Import Path Update Fixes ===\n');

    // Step 1: Run Phase 1 to get module relocations
    console.log('Step 1: Discovering module relocations (running Phase 1)...');
    const phase1 = new Phase1ModuleDiscovery(this.config);
    const phase1Result = await phase1.execute();

    if (!phase1Result.success) {
      console.error('Phase 1 failed. Cannot proceed with Phase 2.');
      return {
        success: false,
        fixes: [],
        summary: {
          totalFixes: 0,
          byFile: new Map(),
          byOldPath: new Map()
        },
        report: ''
      };
    }

    const relocations = phase1Result.relocations;
    console.log(`\nPhase 1 Results:`);
    console.log(`  - Relocations found: ${relocations.relocations.size}`);
    console.log(`  - Deleted modules: ${relocations.deletedModules.length}`);
    console.log();

    if (relocations.relocations.size === 0) {
      console.log('No relocations found. Phase 2 complete (no fixes needed).');
      return {
        success: true,
        fixes: [],
        summary: {
          totalFixes: 0,
          byFile: new Map(),
          byOldPath: new Map()
        },
        report: this.generateEmptyReport()
      };
    }

    // Step 2: Generate import path update fixes
    console.log('Step 2: Generating import path update fixes...');
    const fixes = this.fixGenerator.generateImportPathUpdateFixes(
      relocations,
      [] // We don't need the errors array for fix generation
    );

    console.log(`Generated ${fixes.length} import path update fixes\n`);

    // Step 3: Analyze and summarize fixes
    console.log('Step 3: Analyzing generated fixes...');
    const summary = this.analyzeFixes(fixes);
    
    console.log(`\nFix Summary:`);
    console.log(`  - Total fixes: ${summary.totalFixes}`);
    console.log(`  - Files affected: ${summary.byFile.size}`);
    console.log(`  - Unique old paths: ${summary.byOldPath.size}`);
    console.log();

    // Step 4: Generate detailed report
    console.log('Step 4: Generating fix generation report...');
    const report = this.generateReport(fixes, summary, relocations);
    
    // Save report to file
    const reportPath = path.join(
      this.config.progressTracking.reportDirectory,
      'phase2-fix-generation.md'
    );
    this.saveReport(report, reportPath);
    console.log(`Report saved to: ${reportPath}\n`);

    // Step 5: Save fixes to JSON for Phase 2 application
    console.log('Step 5: Saving fixes to JSON...');
    const fixesPath = path.join(
      this.config.progressTracking.reportDirectory,
      'phase2-fixes.json'
    );
    this.saveFixes(fixes, fixesPath);
    console.log(`Fixes saved to: ${fixesPath}\n`);

    console.log('=== Phase 2 Fix Generation Complete ===\n');

    return {
      success: true,
      fixes,
      summary,
      report
    };
  }

  /**
   * Analyze generated fixes and create summary
   */
  private analyzeFixes(fixes: ImportPathFix[]): FixSummary {
    const byFile = new Map<string, ImportPathFix[]>();
    const byOldPath = new Map<string, ImportPathFix[]>();

    for (const fix of fixes) {
      // Group by file
      if (!byFile.has(fix.file)) {
        byFile.set(fix.file, []);
      }
      byFile.get(fix.file)!.push(fix);

      // Group by old path
      if (!byOldPath.has(fix.oldImportPath)) {
        byOldPath.set(fix.oldImportPath, []);
      }
      byOldPath.get(fix.oldImportPath)!.push(fix);
    }

    return {
      totalFixes: fixes.length,
      byFile,
      byOldPath
    };
  }

  /**
   * Generate detailed fix generation report
   */
  private generateReport(
    fixes: ImportPathFix[],
    summary: FixSummary,
    relocations: any
  ): string {
    const lines: string[] = [];

    lines.push('# Phase 2: Import Path Update Fix Generation Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push('Phase 2 has successfully generated import path update fixes for all discovered module relocations.');
    lines.push('');
    lines.push('### Key Metrics');
    lines.push('');
    lines.push(`- **Total Fixes Generated:** ${summary.totalFixes}`);
    lines.push(`- **Files Affected:** ${summary.byFile.size}`);
    lines.push(`- **Unique Import Paths Updated:** ${summary.byOldPath.size}`);
    lines.push(`- **Module Relocations:** ${relocations.relocations.size}`);
    lines.push('');

    // Fixes by Old Path
    lines.push('## Fixes by Import Path');
    lines.push('');
    lines.push('The following import paths will be updated:');
    lines.push('');
    lines.push('| Old Import Path | New Import Path | Files Affected |');
    lines.push('|----------------|-----------------|----------------|');

    // Get unique old paths and their new paths
    const pathMappings = new Map<string, { newPath: string; count: number }>();
    for (const [oldPath, pathFixes] of summary.byOldPath.entries()) {
      const newPath = pathFixes[0].newImportPath;
      pathMappings.set(oldPath, {
        newPath,
        count: pathFixes.length
      });
    }

    // Sort by number of affected files (descending)
    const sortedPaths = Array.from(pathMappings.entries())
      .sort((a, b) => b[1].count - a[1].count);

    for (const [oldPath, { newPath, count }] of sortedPaths) {
      lines.push(`| \`${oldPath}\` | \`${newPath}\` | ${count} |`);
    }
    lines.push('');

    // Most Affected Files
    lines.push('## Most Affected Files');
    lines.push('');
    lines.push('Files with the most import path updates:');
    lines.push('');

    const sortedFiles = Array.from(summary.byFile.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 20); // Top 20 files

    for (const [file, fileFixes] of sortedFiles) {
      const fileName = path.basename(file);
      const relativePath = file.replace(/\\/g, '/');
      lines.push(`### ${fileName}`);
      lines.push('');
      lines.push(`**Path:** \`${relativePath}\``);
      lines.push('');
      lines.push(`**Fixes:** ${fileFixes.length}`);
      lines.push('');
      lines.push('Import updates:');
      for (const fix of fileFixes) {
        lines.push(`- \`${fix.oldImportPath}\` → \`${fix.newImportPath}\``);
        if (fix.importedNames.length > 0) {
          lines.push(`  - Imports: ${fix.importedNames.join(', ')}`);
        }
      }
      lines.push('');
    }

    // Fix Distribution
    lines.push('## Fix Distribution');
    lines.push('');
    
    // Count fixes by directory
    const dirCounts = new Map<string, number>();
    for (const fix of fixes) {
      const dir = path.dirname(fix.file).replace(/\\/g, '/');
      const parts = dir.split('/');
      
      // Get the main directory (e.g., client/src/features, client/src/lib)
      let mainDir = parts.slice(0, 3).join('/');
      if (parts.length > 3 && parts[2] === 'features') {
        // Include feature name for features
        mainDir = parts.slice(0, 4).join('/');
      }
      
      dirCounts.set(mainDir, (dirCounts.get(mainDir) || 0) + 1);
    }

    const sortedDirs = Array.from(dirCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    lines.push('Fixes by directory:');
    lines.push('');
    for (const [dir, count] of sortedDirs) {
      const percentage = ((count / summary.totalFixes) * 100).toFixed(1);
      lines.push(`- **${dir}**: ${count} fixes (${percentage}%)`);
    }
    lines.push('');

    // Validation
    lines.push('## Validation');
    lines.push('');
    lines.push('### Pre-Application Checks');
    lines.push('');
    lines.push('Before applying these fixes, verify:');
    lines.push('');
    lines.push('1. ✅ All relocated modules exist at their new locations');
    lines.push('2. ✅ New import paths are correctly calculated');
    lines.push('3. ✅ No circular dependencies will be introduced');
    lines.push('4. ✅ Path aliases in tsconfig.json are up to date');
    lines.push('');

    // Next Steps
    lines.push('## Next Steps');
    lines.push('');
    lines.push('1. ✅ **Review this report** - Verify the generated fixes are correct');
    lines.push('2. 🔍 **Check path aliases** - Ensure tsconfig.json has correct path mappings');
    lines.push('3. ➡️ **Proceed to Phase 2 Application** - Apply fixes in batches with validation');
    lines.push('4. ✅ **Verify TS2307 errors eliminated** - Run TypeScript compilation after application');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('**Phase 2 Fix Generation Status:** ✅ Complete');
    lines.push('');
    lines.push('**Ready for Application:** Yes');
    lines.push('');
    lines.push('**Fixes File:** `phase2-fixes.json`');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate empty report when no fixes needed
   */
  private generateEmptyReport(): string {
    const lines: string[] = [];
    
    lines.push('# Phase 2: Import Path Update Fix Generation Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('No import path updates needed. All modules are correctly resolved.');
    lines.push('');
    lines.push('Phase 2 is complete. No action required.');
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Save report to file
   */
  private saveReport(report: string, reportPath: string): void {
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(reportPath, report, 'utf-8');
  }

  /**
   * Save fixes to JSON file
   */
  private saveFixes(fixes: ImportPathFix[], fixesPath: string): void {
    const reportDir = path.dirname(fixesPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Convert fixes to serializable format
    const serializableFixes = fixes.map(fix => ({
      id: fix.id,
      category: fix.category,
      description: fix.description,
      file: fix.file,
      oldImportPath: fix.oldImportPath,
      newImportPath: fix.newImportPath,
      importedNames: fix.importedNames
    }));

    fs.writeFileSync(
      fixesPath,
      JSON.stringify(serializableFixes, null, 2),
      'utf-8'
    );
  }
}

export interface FixSummary {
  totalFixes: number;
  byFile: Map<string, ImportPathFix[]>;
  byOldPath: Map<string, ImportPathFix[]>;
}

export interface Phase2Result {
  success: boolean;
  fixes: ImportPathFix[];
  summary: FixSummary;
  report: string;
}

// CLI execution
if (require.main === module) {
  const fixGeneration = new Phase2FixGeneration();
  fixGeneration.execute()
    .then(result => {
      if (result.success) {
        console.log('Phase 2 fix generation completed successfully!');
        console.log(`Generated ${result.fixes.length} fixes`);
        process.exit(0);
      } else {
        console.error('Phase 2 fix generation failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Phase 2 execution error:', error);
      process.exit(1);
    });
}
