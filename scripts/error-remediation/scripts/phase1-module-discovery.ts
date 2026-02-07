/**
 * Phase 1: Module Location Discovery
 * 
 * Discovers all relocated modules in the FSD structure and builds a relocation map.
 */

import { ErrorAnalyzer } from '../core/error-analyzer';
import { defaultConfig, RemediationConfig } from '../config';
import { ErrorCategory, TypeScriptError, ModuleRelocationMap } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class Phase1ModuleDiscovery {
  private analyzer: ErrorAnalyzer;
  private config: RemediationConfig;

  constructor(config: RemediationConfig = defaultConfig) {
    this.config = config;
    this.analyzer = new ErrorAnalyzer(config);
  }

  /**
   * Execute Phase 1: Module Location Discovery
   */
  async execute(): Promise<Phase1Result> {
    console.log('=== Phase 1: Module Location Discovery ===\n');

    // Step 1: Analyze errors and find TS2307 errors
    console.log('Step 1: Scanning for TS2307 errors (cannot find module)...');
    const errorReport = await this.analyzer.analyzeErrors();
    
    const moduleResolutionErrors = errorReport.errorsByCategory.get(ErrorCategory.MODULE_RESOLUTION) || [];
    console.log(`Found ${moduleResolutionErrors.length} module resolution errors\n`);

    if (moduleResolutionErrors.length === 0) {
      console.log('No module resolution errors found. Phase 1 complete.');
      return {
        success: true,
        relocations: {
          relocations: new Map(),
          deletedModules: [],
          consolidations: new Map()
        },
        missingModules: [],
        report: this.generateEmptyReport()
      };
    }

    // Step 2: Extract missing module paths
    console.log('Step 2: Extracting missing module paths...');
    const missingModules = this.extractMissingModules(moduleResolutionErrors);
    console.log(`Identified ${missingModules.length} unique missing modules:\n`);
    missingModules.forEach(mod => console.log(`  - ${mod}`));
    console.log();

    // Step 3: Search FSD structure for relocated modules
    console.log('Step 3: Searching FSD structure for relocated modules...');
    const relocations = await this.analyzer.discoverModuleRelocations(missingModules);
    
    console.log(`\nDiscovery Results:`);
    console.log(`  - Relocations found: ${relocations.relocations.size}`);
    console.log(`  - Deleted modules: ${relocations.deletedModules.length}`);
    console.log(`  - Potential consolidations: ${relocations.consolidations.size}\n`);

    // Step 4: Generate detailed report
    console.log('Step 4: Generating module relocation report...');
    const report = this.generateReport(relocations, missingModules, moduleResolutionErrors);
    
    // Save report to file
    const reportPath = path.join(this.config.progressTracking.reportDirectory, 'phase1-module-discovery.md');
    this.saveReport(report, reportPath);
    console.log(`Report saved to: ${reportPath}\n`);

    console.log('=== Phase 1 Complete ===\n');

    return {
      success: true,
      relocations,
      missingModules,
      report
    };
  }

  /**
   * Extract missing module paths from TS2307 errors
   */
  private extractMissingModules(errors: TypeScriptError[]): string[] {
    const modules = new Set<string>();

    for (const error of errors) {
      // Extract module path from error message
      // Message format: "Cannot find module 'MODULE_PATH' or its corresponding type declarations."
      const match = error.message.match(/Cannot find module ['"]([^'"]+)['"]/);
      if (match && match[1]) {
        modules.add(match[1]);
      }
    }

    return Array.from(modules).sort();
  }

  /**
   * Generate detailed module relocation report
   */
  private generateReport(
    relocations: ModuleRelocationMap,
    missingModules: string[],
    errors: TypeScriptError[]
  ): string {
    const lines: string[] = [];

    lines.push('# Phase 1: Module Location Discovery Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`Phase 1 has successfully analyzed the codebase and discovered module relocations in the FSD structure.`);
    lines.push('');
    lines.push('### Key Metrics');
    lines.push('');
    lines.push(`- **Total TS2307 Errors:** ${errors.length}`);
    lines.push(`- **Unique Missing Modules:** ${missingModules.length}`);
    lines.push(`- **Relocations Discovered:** ${relocations.relocations.size}`);
    lines.push(`- **Deleted Modules:** ${relocations.deletedModules.length}`);
    lines.push(`- **Potential Consolidations:** ${relocations.consolidations.size}`);
    lines.push('');
    
    const successRate = missingModules.length > 0 
      ? ((relocations.relocations.size / missingModules.length) * 100).toFixed(1)
      : '100.0';
    lines.push(`**Discovery Success Rate:** ${successRate}% (${relocations.relocations.size}/${missingModules.length} modules located)`);
    lines.push('');

    // Discovered Relocations
    lines.push('## Discovered Relocations');
    lines.push('');
    if (relocations.relocations.size > 0) {
      lines.push('The following modules have been relocated in the FSD structure:');
      lines.push('');
      lines.push('| Old Path | New Location | Layer | Feature | Segment |');
      lines.push('|----------|--------------|-------|---------|---------|');
      
      for (const [oldPath, location] of relocations.relocations.entries()) {
        const feature = location.feature || '-';
        const segment = location.segment || '-';
        lines.push(`| \`${oldPath}\` | \`${location.path}\` | ${location.layer} | ${feature} | ${segment} |`);
      }
      lines.push('');
      
      // Add layer distribution
      const layerCounts = new Map<string, number>();
      for (const location of relocations.relocations.values()) {
        layerCounts.set(location.layer, (layerCounts.get(location.layer) || 0) + 1);
      }
      
      lines.push('### Distribution by FSD Layer');
      lines.push('');
      for (const [layer, count] of Array.from(layerCounts.entries()).sort((a, b) => b[1] - a[1])) {
        lines.push(`- **${layer}**: ${count} module${count > 1 ? 's' : ''}`);
      }
      lines.push('');
    } else {
      lines.push('No relocations discovered.');
      lines.push('');
    }

    // Deleted Modules
    lines.push('## Deleted Modules');
    lines.push('');
    if (relocations.deletedModules.length > 0) {
      lines.push('The following modules were not found in the FSD structure and appear to have been intentionally deleted:');
      lines.push('');
      for (const module of relocations.deletedModules) {
        lines.push(`- \`${module}\``);
        
        // Find which files import this deleted module
        const importingFiles = errors
          .filter(e => e.message.includes(module))
          .map(e => e.file);
        
        if (importingFiles.length > 0) {
          lines.push(`  - Imported by: ${importingFiles.length} file${importingFiles.length > 1 ? 's' : ''}`);
        }
      }
      lines.push('');
      lines.push('**Action Required:** Remove imports of these deleted modules from the codebase.');
      lines.push('');
    } else {
      lines.push('✅ No deleted modules identified. All missing modules have been located in the FSD structure.');
      lines.push('');
    }

    // Potential Consolidations
    lines.push('## Potential Consolidations');
    lines.push('');
    if (relocations.consolidations.size > 0) {
      lines.push('The following modules have multiple locations and may need consolidation:');
      lines.push('');
      lines.push('> **Note:** These consolidations indicate that similar modules exist in multiple locations.');
      lines.push('> Review each case to determine if they are truly duplicates or serve different purposes.');
      lines.push('');
      
      for (const [canonical, duplicates] of relocations.consolidations.entries()) {
        lines.push(`### \`${canonical}\` (Canonical)`);
        lines.push('');
        lines.push(`Found ${duplicates.length} potential duplicate location${duplicates.length > 1 ? 's' : ''}:`);
        lines.push('');
        for (const duplicate of duplicates) {
          lines.push(`- \`${duplicate}\``);
        }
        lines.push('');
      }
      lines.push('**Action Required:** Review these consolidations and determine if duplicates should be removed.');
      lines.push('');
    } else {
      lines.push('✅ No consolidations needed. Each module has a single location.');
      lines.push('');
    }

    // Affected Files
    lines.push('## Affected Files');
    lines.push('');
    lines.push('Files with TS2307 errors that will be fixed in Phase 2:');
    lines.push('');
    
    const fileErrorCounts = new Map<string, number>();
    const fileModules = new Map<string, Set<string>>();
    
    for (const error of errors) {
      fileErrorCounts.set(error.file, (fileErrorCounts.get(error.file) || 0) + 1);
      
      // Extract module from error message
      const match = error.message.match(/Cannot find module ['"]([^'"]+)['"]/);
      if (match && match[1]) {
        if (!fileModules.has(error.file)) {
          fileModules.set(error.file, new Set());
        }
        fileModules.get(error.file)!.add(match[1]);
      }
    }
    
    const sortedFiles = Array.from(fileErrorCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [file, count] of sortedFiles) {
      const modules = fileModules.get(file);
      const moduleList = modules ? Array.from(modules).map(m => `\`${m}\``).join(', ') : '';
      lines.push(`- \`${file}\` (${count} error${count > 1 ? 's' : ''})`);
      if (moduleList) {
        lines.push(`  - Missing: ${moduleList}`);
      }
    }
    lines.push('');

    // Recommendations
    lines.push('## Recommendations');
    lines.push('');
    lines.push('### High Priority');
    lines.push('');
    if (relocations.relocations.size > 0) {
      lines.push('1. ✅ **Proceed to Phase 2**: All missing modules have been located. Import path updates can begin.');
    }
    if (relocations.deletedModules.length > 0) {
      lines.push(`2. ⚠️ **Review Deleted Modules**: ${relocations.deletedModules.length} module${relocations.deletedModules.length > 1 ? 's' : ''} could not be located. Verify these are intentionally deleted.`);
    }
    lines.push('');
    
    lines.push('### Medium Priority');
    lines.push('');
    if (relocations.consolidations.size > 0) {
      lines.push(`1. 📋 **Review Consolidations**: ${relocations.consolidations.size} module${relocations.consolidations.size > 1 ? 's have' : ' has'} multiple locations. Consider consolidating duplicates.`);
    }
    lines.push('');

    // Next Steps
    lines.push('## Next Steps');
    lines.push('');
    lines.push('1. ✅ **Review this report** - Verify the discovered relocations are correct');
    lines.push('2. 🔍 **Check ambiguous cases** - For modules with multiple locations, confirm the canonical location');
    lines.push('3. 🗑️ **Handle deleted modules** - Identify which imports should be removed');
    lines.push('4. ➡️ **Proceed to Phase 2** - Begin import path updates using the relocation map');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('**Phase 1 Status:** ✅ Complete');
    lines.push('');
    lines.push('**Ready for Phase 2:** Yes');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate empty report when no errors found
   */
  private generateEmptyReport(): string {
    const lines: string[] = [];
    
    lines.push('# Phase 1: Module Location Discovery Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('No module resolution errors (TS2307) found in the codebase.');
    lines.push('');
    lines.push('Phase 1 is complete. No action required.');
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Save report to file
   */
  private saveReport(report: string, reportPath: string): void {
    // Ensure report directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Write report
    fs.writeFileSync(reportPath, report, 'utf-8');
  }
}

export interface Phase1Result {
  success: boolean;
  relocations: ModuleRelocationMap;
  missingModules: string[];
  report: string;
}

// CLI execution
if (require.main === module) {
  const discovery = new Phase1ModuleDiscovery();
  discovery.execute()
    .then(result => {
      if (result.success) {
        console.log('Phase 1 completed successfully!');
        process.exit(0);
      } else {
        console.error('Phase 1 failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Phase 1 execution error:', error);
      process.exit(1);
    });
}
