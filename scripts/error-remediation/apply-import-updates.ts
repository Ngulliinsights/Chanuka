/**
 * Apply Import Path Updates
 * 
 * This script applies import path updates in batches based on discovered module relocations.
 * It implements Phase 2 of the error remediation workflow.
 */

import { ErrorAnalyzer } from './core/error-analyzer';
import { FixGenerator } from './core/fix-generator';
import { BatchProcessor } from './core/batch-processor';
import { TypeValidator } from './core/type-validator';
import { ProgressTracker } from './core/progress-tracker';
import { defaultConfig } from './config';
import { ErrorCategory, FixPhase, ModuleRelocationMap } from './types';
import * as fs from 'fs';
import * as path from 'path';

async function applyImportUpdates() {
  console.log('=== Phase 2: Import Path Updates ===\n');
  
  // Initialize components
  const analyzer = new ErrorAnalyzer(defaultConfig);
  const generator = new FixGenerator(defaultConfig);
  const processor = new BatchProcessor(defaultConfig);
  const validator = new TypeValidator(defaultConfig);
  const tracker = new ProgressTracker(defaultConfig);
  
  // Step 1: Analyze current errors
  console.log('Step 1: Analyzing current TypeScript errors...');
  const initialReport = await analyzer.analyzeErrors();
  console.log(`Total errors: ${initialReport.totalErrors}\n`);
  
  // Step 2: Get module resolution errors
  const moduleResolutionErrors = initialReport.errorsByCategory.get(ErrorCategory.MODULE_RESOLUTION) || [];
  const exportPathErrors = initialReport.errorsByCategory.get(ErrorCategory.EXPORT_PATH) || [];
  
  console.log(`Module resolution errors: ${moduleResolutionErrors.length}`);
  console.log(`Export path errors: ${exportPathErrors.length}`);
  
  const totalImportErrors = moduleResolutionErrors.length + exportPathErrors.length;
  
  if (totalImportErrors === 0) {
    console.log('\n✓ No import path errors found. Phase 2 is already complete.');
    return;
  }
  
  // Step 3: Load or discover module relocations
  console.log('\nStep 2: Loading module relocations...');
  
  // Check if we have a saved relocation map from Phase 1
  const relocationMapPath = path.join(
    defaultConfig.progressTracking.reportDirectory,
    'module-relocations.json'
  );
  
  let relocations: ModuleRelocationMap;
  
  if (fs.existsSync(relocationMapPath)) {
    console.log('Loading saved relocation map...');
    const savedData = JSON.parse(fs.readFileSync(relocationMapPath, 'utf-8'));
    
    // Convert plain objects back to Maps
    relocations = {
      relocations: new Map(Object.entries(savedData.relocations)),
      deletedModules: savedData.deletedModules,
      consolidations: new Map(Object.entries(savedData.consolidations))
    };
    
    console.log(`Loaded ${relocations.relocations.size} relocations`);
  } else {
    console.log('No saved relocation map found. Discovering relocations...');
    
    // Extract missing module paths
    const missingModules = moduleResolutionErrors
      .map(error => {
        const match = error.message.match(/Cannot find module '([^']+)'/);
        return match ? match[1] : null;
      })
      .filter((m): m is string => m !== null);
    
    const uniqueModules = Array.from(new Set(missingModules));
    relocations = await analyzer.discoverModuleRelocations(uniqueModules);
    
    // Save the relocation map for future use
    const reportDir = defaultConfig.progressTracking.reportDirectory;
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const saveData = {
      relocations: Object.fromEntries(relocations.relocations),
      deletedModules: relocations.deletedModules,
      consolidations: Object.fromEntries(relocations.consolidations)
    };
    
    fs.writeFileSync(relocationMapPath, JSON.stringify(saveData, null, 2));
    console.log(`Saved relocation map to ${relocationMapPath}`);
  }
  
  // Step 4: Generate import path update fixes
  console.log('\nStep 3: Generating import path update fixes...');
  const fixes = generator.generateImportPathUpdateFixes(
    relocations,
    [...moduleResolutionErrors, ...exportPathErrors]
  );
  
  console.log(`Generated ${fixes.length} import path update fixes\n`);
  
  if (fixes.length === 0) {
    console.log('⚠ No fixes generated. This may indicate:');
    console.log('  - All modules have been relocated but imports are already updated');
    console.log('  - Some modules were deleted and have no relocation');
    console.log('  - The relocation discovery needs manual review');
    return;
  }
  
  // Display sample fixes
  console.log('Sample fixes:');
  for (let i = 0; i < Math.min(5, fixes.length); i++) {
    const fix = fixes[i];
    console.log(`  ${i + 1}. ${fix.description}`);
  }
  console.log('');
  
  // Step 5: Apply fixes in batches
  console.log('Step 4: Applying fixes in batches...');
  console.log(`Batch size: ${defaultConfig.batchProcessing.maxBatchSize}`);
  console.log(`Validation after each batch: ${defaultConfig.batchProcessing.validateAfterEachBatch}`);
  console.log(`Rollback on failure: ${defaultConfig.batchProcessing.rollbackOnFailure}\n`);
  
  const startTime = Date.now();
  const result = await processor.processBatch(fixes);
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Step 6: Display results
  console.log('\n=== Batch Processing Results ===');
  console.log(`Success: ${result.success ? '✓' : '✗'}`);
  console.log(`Fixes applied: ${result.fixesApplied}/${fixes.length}`);
  console.log(`Errors fixed: ${result.errorsFixed}`);
  console.log(`New errors: ${result.newErrors}`);
  console.log(`Duration: ${duration}s`);
  
  if (result.validationResult) {
    console.log(`\nValidation:`);
    console.log(`  Success: ${result.validationResult.success ? '✓' : '✗'}`);
    console.log(`  Error count: ${result.validationResult.errorCount}`);
    console.log(`  Warnings: ${result.validationResult.warnings.length}`);
  }
  
  // Step 7: Run final validation
  console.log('\nStep 5: Running final validation...');
  const finalReport = await analyzer.analyzeErrors();
  
  console.log(`\n=== Final Error Count ===`);
  console.log(`Initial errors: ${initialReport.totalErrors}`);
  console.log(`Final errors: ${finalReport.totalErrors}`);
  console.log(`Errors eliminated: ${initialReport.totalErrors - finalReport.totalErrors}`);
  
  const remainingModuleErrors = finalReport.errorsByCategory.get(ErrorCategory.MODULE_RESOLUTION) || [];
  const remainingExportErrors = finalReport.errorsByCategory.get(ErrorCategory.EXPORT_PATH) || [];
  
  console.log(`\nRemaining import-related errors:`);
  console.log(`  Module resolution: ${remainingModuleErrors.length}`);
  console.log(`  Export path: ${remainingExportErrors.length}`);
  
  // Step 8: Record progress
  tracker.recordPhaseProgress(FixPhase.IMPORT_PATH_UPDATES, result);
  
  // Step 9: Generate report
  console.log('\nStep 6: Generating phase report...');
  const report = tracker.generateReport();
  
  const reportPath = path.join(
    defaultConfig.progressTracking.reportDirectory,
    `phase-2-import-updates-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  
  const reportData = {
    phase: 'IMPORT_PATH_UPDATES',
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    initialErrors: initialReport.totalErrors,
    finalErrors: finalReport.totalErrors,
    errorsEliminated: initialReport.totalErrors - finalReport.totalErrors,
    fixesGenerated: fixes.length,
    fixesApplied: result.fixesApplied,
    batchResult: {
      success: result.success,
      errorsFixed: result.errorsFixed,
      newErrors: result.newErrors
    },
    remainingImportErrors: {
      moduleResolution: remainingModuleErrors.length,
      exportPath: remainingExportErrors.length
    },
    summary: report.summary
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`Report saved to: ${reportPath}`);
  
  // Step 10: Summary and next steps
  console.log('\n=== Phase 2 Summary ===');
  
  if (result.success && remainingModuleErrors.length === 0 && remainingExportErrors.length === 0) {
    console.log('✓ Phase 2 complete! All import path errors have been resolved.');
    console.log('\nNext steps:');
    console.log('  1. Review the changes in your version control system');
    console.log('  2. Run tests to ensure functionality is preserved');
    console.log('  3. Proceed to Phase 3: Type Standardization');
  } else if (result.success) {
    console.log('⚠ Phase 2 partially complete. Some import errors remain.');
    console.log('\nRemaining issues:');
    
    if (remainingModuleErrors.length > 0) {
      console.log(`  - ${remainingModuleErrors.length} module resolution errors`);
      console.log('    These may require manual intervention or indicate deleted modules');
    }
    
    if (remainingExportErrors.length > 0) {
      console.log(`  - ${remainingExportErrors.length} export path errors`);
      console.log('    These may require adding missing exports or updating export paths');
    }
    
    console.log('\nRecommendations:');
    console.log('  1. Review the remaining errors in the generated report');
    console.log('  2. Manually fix any errors that could not be automated');
    console.log('  3. Re-run this script to verify all import errors are resolved');
  } else {
    console.log('✗ Phase 2 failed. Fixes were rolled back.');
    console.log('\nPossible causes:');
    console.log('  - Validation detected new errors after applying fixes');
    console.log('  - Some fixes introduced breaking changes');
    console.log('  - Module relocations may need manual review');
    
    console.log('\nRecommendations:');
    console.log('  1. Review the validation errors in the report');
    console.log('  2. Check the relocation map for accuracy');
    console.log('  3. Consider applying fixes in smaller batches');
    console.log('  4. Manually review and fix problematic imports');
  }
  
  return result;
}

// Run the import updates
applyImportUpdates()
  .then((result) => {
    if (result && result.success) {
      console.log('\n✓ Import path updates complete');
      process.exit(0);
    } else {
      console.log('\n⚠ Import path updates completed with issues');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n✗ Import path updates failed:', error);
    console.error(error.stack);
    process.exit(1);
  });
