/**
 * Phase 2: Import Path Updates
 * 
 * This script generates and applies import path update fixes based on
 * the module relocations discovered in Phase 1.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ErrorAnalyzer } from '../core/error-analyzer';
import { FixGenerator } from '../core/fix-generator';
import { BatchProcessor } from '../core/batch-processor';
import { TypeValidator } from '../core/type-validator';
import { ProgressTracker } from '../core/progress-tracker';
import { defaultConfig } from '../config';
import {
  ModuleRelocationMap,
  FSDLocation,
  ErrorCategory,
  FixPhase,
  ImportPathFix
} from '../types';

/**
 * Load module relocations from Phase 1 report
 */
function loadModuleRelocations(): ModuleRelocationMap {
  const reportPath = path.join(
    defaultConfig.progressTracking.reportDirectory,
    'phase1-module-discovery.md'
  );

  if (!fs.existsSync(reportPath)) {
    throw new Error('Phase 1 report not found. Please run Phase 1 first.');
  }

  const reportContent = fs.readFileSync(reportPath, 'utf-8');
  
  // Parse the markdown table to extract relocations
  const relocations = new Map<string, FSDLocation>();
  const deletedModules: string[] = [];
  const consolidations = new Map<string, string[]>();

  // Extract relocations from the table
  const tableRegex = /\| `([^`]+)` \| `([^`]+)` \| (\w+) \| ([^|]*) \| ([^|]*) \|/g;
  let match;

  while ((match = tableRegex.exec(reportContent)) !== null) {
    const [, oldPath, newPath, layer, feature, segment] = match;
    
    // Clean up the paths
    const cleanNewPath = newPath.replace(/\\/g, '/');
    const cleanFeature = feature.trim() === '-' ? undefined : feature.trim();
    const cleanSegment = segment.trim() === '-' ? undefined : segment.trim();

    relocations.set(oldPath, {
      path: cleanNewPath,
      layer: layer as FSDLocation['layer'],
      feature: cleanFeature,
      segment: cleanSegment
    });
  }

  // Extract deleted modules (if any)
  const deletedSection = reportContent.match(/## Deleted Modules\n\n([\s\S]*?)\n\n##/);
  if (deletedSection && !deletedSection[1].includes('No deleted modules')) {
    const deletedRegex = /- `([^`]+)`/g;
    let deletedMatch;
    while ((deletedMatch = deletedRegex.exec(deletedSection[1])) !== null) {
      deletedModules.push(deletedMatch[1]);
    }
  }

  // Extract consolidations
  const consolidationSection = reportContent.match(/## Potential Consolidations\n\n([\s\S]*?)(?:\n\n##|$)/);
  if (consolidationSection) {
    const consolidationBlocks = consolidationSection[1].split(/###\s+`([^`]+)`\s+\(Canonical\)/);
    
    for (let i = 1; i < consolidationBlocks.length; i += 2) {
      const canonical = consolidationBlocks[i];
      const duplicatesText = consolidationBlocks[i + 1];
      
      const duplicates: string[] = [];
      const duplicateRegex = /- `([^`]+)`/g;
      let dupMatch;
      
      while ((dupMatch = duplicateRegex.exec(duplicatesText)) !== null) {
        duplicates.push(dupMatch[1]);
      }
      
      if (duplicates.length > 0) {
        consolidations.set(canonical, duplicates);
      }
    }
  }

  console.log(`✅ Loaded ${relocations.size} module relocations from Phase 1 report`);
  console.log(`📋 Found ${deletedModules.length} deleted modules`);
  console.log(`🔄 Found ${consolidations.size} potential consolidations`);

  return {
    relocations,
    deletedModules,
    consolidations
  };
}

/**
 * Main execution function for Phase 2
 */
async function executePhase2() {
  console.log('='.repeat(80));
  console.log('Phase 2: Import Path Updates');
  console.log('='.repeat(80));
  console.log();

  // Initialize components
  const analyzer = new ErrorAnalyzer(defaultConfig);
  const generator = new FixGenerator(defaultConfig);
  const processor = new BatchProcessor(defaultConfig);
  const validator = new TypeValidator(defaultConfig);
  const tracker = new ProgressTracker();

  try {
    // Step 1: Load module relocations from Phase 1
    console.log('📖 Step 1: Loading module relocations from Phase 1...');
    const relocations = loadModuleRelocations();
    console.log();

    // Step 2: Analyze current errors
    console.log('🔍 Step 2: Analyzing current TypeScript errors...');
    const errorReport = await analyzer.analyzeErrors();
    console.log(`   Found ${errorReport.totalErrors} total errors`);
    
    const moduleErrors = errorReport.errorsByCategory.get(ErrorCategory.MODULE_RESOLUTION) || [];
    const exportErrors = errorReport.errorsByCategory.get(ErrorCategory.EXPORT_PATH) || [];
    const relevantErrors = [...moduleErrors, ...exportErrors];
    
    console.log(`   ${moduleErrors.length} module resolution errors (TS2307)`);
    console.log(`   ${exportErrors.length} export path errors (TS2305, TS2724, TS2614)`);
    console.log();

    // Step 3: Generate import path update fixes
    console.log('🔧 Step 3: Generating import path update fixes...');
    const fixes = generator.generateImportPathUpdateFixes(relocations, relevantErrors);
    console.log(`   Generated ${fixes.length} import path update fixes`);
    console.log();

    if (fixes.length === 0) {
      console.log('✅ No import path updates needed. Phase 2 complete!');
      return;
    }

    // Step 4: Display fix summary
    console.log('📋 Step 4: Fix Summary');
    console.log('-'.repeat(80));
    
    // Group fixes by file
    const fixesByFile = new Map<string, ImportPathFix[]>();
    for (const fix of fixes) {
      if (!fixesByFile.has(fix.file)) {
        fixesByFile.set(fix.file, []);
      }
      fixesByFile.get(fix.file)!.push(fix);
    }

    console.log(`   Files to be modified: ${fixesByFile.size}`);
    console.log();
    
    // Show first 10 fixes as examples
    console.log('   Example fixes:');
    for (let i = 0; i < Math.min(10, fixes.length); i++) {
      const fix = fixes[i];
      console.log(`   ${i + 1}. ${path.basename(fix.file)}`);
      console.log(`      ${fix.oldImportPath} → ${fix.newImportPath}`);
    }
    
    if (fixes.length > 10) {
      console.log(`   ... and ${fixes.length - 10} more fixes`);
    }
    console.log();

    // Step 5: Apply fixes in batches
    console.log('⚙️  Step 5: Applying fixes in batches...');
    console.log('   (with validation and rollback capability)');
    console.log();

    const batchResult = await processor.processBatch(fixes);

    // Step 6: Report results
    console.log('📊 Step 6: Results');
    console.log('-'.repeat(80));
    console.log(`   Success: ${batchResult.success ? '✅ Yes' : '❌ No'}`);
    console.log(`   Fixes applied: ${batchResult.fixesApplied}`);
    console.log(`   Errors fixed: ${batchResult.errorsFixed}`);
    console.log(`   New errors: ${batchResult.newErrors}`);
    console.log();

    if (batchResult.validationResult.errors.length > 0) {
      console.log('⚠️  Validation Errors:');
      for (const error of batchResult.validationResult.errors.slice(0, 5)) {
        console.log(`   - ${error.code}: ${error.message}`);
        console.log(`     ${error.file}:${error.line}`);
      }
      if (batchResult.validationResult.errors.length > 5) {
        console.log(`   ... and ${batchResult.validationResult.errors.length - 5} more errors`);
      }
      console.log();
    }

    // Step 7: Run final validation
    console.log('✅ Step 7: Running final validation...');
    const finalValidation = await validator.validateTypeScript();
    console.log(`   Total errors remaining: ${finalValidation.errorCount}`);
    console.log();

    // Step 8: Generate Phase 2 report
    console.log('📝 Step 8: Generating Phase 2 completion report...');
    const reportPath = path.join(
      defaultConfig.progressTracking.reportDirectory,
      'phase2-import-updates.md'
    );

    const report = generatePhase2Report(
      relocations,
      fixes,
      batchResult,
      finalValidation,
      fixesByFile
    );

    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`   Report saved to: ${reportPath}`);
    console.log();

    // Step 9: Update progress tracker
    tracker.recordPhaseProgress(FixPhase.IMPORT_PATH_UPDATES, batchResult);

    console.log('='.repeat(80));
    if (batchResult.success) {
      console.log('✅ Phase 2: Import Path Updates - COMPLETE');
    } else {
      console.log('❌ Phase 2: Import Path Updates - FAILED');
      console.log('   Please review the errors above and fix manually if needed.');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during Phase 2 execution:', error);
    throw error;
  }
}

/**
 * Generate Phase 2 completion report
 */
function generatePhase2Report(
  relocations: ModuleRelocationMap,
  fixes: ImportPathFix[],
  batchResult: any,
  finalValidation: any,
  fixesByFile: Map<string, ImportPathFix[]>
): string {
  const timestamp = new Date().toISOString();
  
  let report = `# Phase 2: Import Path Updates Report

**Generated:** ${timestamp}

## Executive Summary

Phase 2 has ${batchResult.success ? 'successfully' : 'attempted to'} update import paths based on module relocations discovered in Phase 1.

### Key Metrics

- **Total Relocations:** ${relocations.relocations.size}
- **Import Path Fixes Generated:** ${fixes.length}
- **Files Modified:** ${fixesByFile.size}
- **Fixes Applied:** ${batchResult.fixesApplied}
- **Errors Fixed:** ${batchResult.errorsFixed}
- **New Errors:** ${batchResult.newErrors}
- **Remaining Errors:** ${finalValidation.errorCount}

**Phase 2 Status:** ${batchResult.success ? '✅ Complete' : '❌ Failed'}

## Import Path Updates Applied

The following import paths were updated:

| File | Old Import | New Import | Status |
|------|------------|------------|--------|
`;

  // Add first 50 fixes to the table
  const fixesToShow = Array.from(fixes).slice(0, 50);
  for (const fix of fixesToShow) {
    const fileName = path.basename(fix.file);
    const status = '✅';
    report += `| \`${fileName}\` | \`${fix.oldImportPath}\` | \`${fix.newImportPath}\` | ${status} |\n`;
  }

  if (fixes.length > 50) {
    report += `\n... and ${fixes.length - 50} more import path updates\n`;
  }

  report += `
## Files Modified

${fixesByFile.size} files were modified during Phase 2:

`;

  // List all modified files
  for (const [file, fileFixes] of fixesByFile) {
    const relativePath = path.relative(process.cwd(), file);
    report += `- \`${relativePath}\` (${fileFixes.length} import${fileFixes.length > 1 ? 's' : ''} updated)\n`;
  }

  report += `
## Validation Results

`;

  if (batchResult.success && finalValidation.errorCount === 0) {
    report += `✅ All import path updates applied successfully with zero errors!\n\n`;
  } else if (batchResult.success) {
    report += `✅ Import path updates applied successfully.\n\n`;
    report += `⚠️  ${finalValidation.errorCount} errors remain (not related to import paths).\n\n`;
  } else {
    report += `❌ Some import path updates failed validation.\n\n`;
    report += `**New Errors:** ${batchResult.newErrors}\n\n`;
  }

  if (finalValidation.errors && finalValidation.errors.length > 0) {
    report += `### Remaining Errors\n\n`;
    report += `The following errors remain after Phase 2:\n\n`;
    
    const errorsByCategory = new Map<string, number>();
    for (const error of finalValidation.errors) {
      const category = error.category || 'UNKNOWN';
      errorsByCategory.set(category, (errorsByCategory.get(category) || 0) + 1);
    }

    report += `| Category | Count |\n`;
    report += `|----------|-------|\n`;
    for (const [category, count] of errorsByCategory) {
      report += `| ${category} | ${count} |\n`;
    }
    report += `\n`;
  }

  report += `
## Next Steps

`;

  if (batchResult.success) {
    report += `1. ✅ **Review this report** - Verify all import paths were updated correctly\n`;
    report += `2. ➡️ **Proceed to Phase 3** - Begin type standardization\n`;
    report += `3. 🧪 **Run tests** - Ensure functionality is preserved\n`;
  } else {
    report += `1. 🔍 **Review validation errors** - Identify why fixes failed\n`;
    report += `2. 🔧 **Fix manually** - Address any issues that couldn't be automated\n`;
    report += `3. 🔄 **Re-run Phase 2** - After manual fixes are complete\n`;
  }

  report += `
---

**Phase 2 Status:** ${batchResult.success ? '✅ Complete' : '❌ Failed'}

**Ready for Phase 3:** ${batchResult.success ? 'Yes' : 'No'}
`;

  return report;
}

// Execute Phase 2
if (require.main === module) {
  executePhase2()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { executePhase2, loadModuleRelocations };
