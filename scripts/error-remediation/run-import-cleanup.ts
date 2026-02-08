/**
 * Run Import Cleanup - Phase 6 Task 16.1
 * 
 * Analyzes and removes unused imports and corrects incorrect import paths.
 */

import { ImportAnalyzer } from './core/import-analyzer';
import { TypeValidator } from './core/type-validator';
import { RemediationConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

async function runImportCleanup() {
  console.log('='.repeat(80));
  console.log('Phase 6: Import Cleanup and Validation - Task 16.1');
  console.log('='.repeat(80));
  console.log();

  // Load configuration
  const config = new RemediationConfig();
  
  // Initialize analyzers
  const importAnalyzer = new ImportAnalyzer(config);
  const typeValidator = new TypeValidator(config);

  console.log('Step 1: Analyzing imports...');
  console.log('-'.repeat(80));
  
  const analysisResult = await importAnalyzer.analyzeImports();
  
  console.log(`Files analyzed: ${analysisResult.filesAnalyzed}`);
  console.log(`Total imports: ${analysisResult.totalImports}`);
  console.log(`Unused imports found: ${analysisResult.unusedImports.length}`);
  console.log(`Incorrect paths found: ${analysisResult.incorrectPaths.length}`);
  console.log();

  // Save analysis report
  const reportDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const analysisReportPath = path.join(reportDir, 'import-analysis-report.json');
  fs.writeFileSync(
    analysisReportPath,
    JSON.stringify(analysisResult, null, 2)
  );
  console.log(`Analysis report saved to: ${analysisReportPath}`);
  console.log();

  // Display unused imports
  if (analysisResult.unusedImports.length > 0) {
    console.log('Unused Imports:');
    console.log('-'.repeat(80));
    
    // Group by file
    const byFile = new Map<string, typeof analysisResult.unusedImports>();
    for (const unused of analysisResult.unusedImports) {
      if (!byFile.has(unused.file)) {
        byFile.set(unused.file, []);
      }
      byFile.get(unused.file)!.push(unused);
    }

    for (const [file, imports] of byFile.entries()) {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`\n${relativePath}:`);
      for (const imp of imports) {
        console.log(`  Line ${imp.line}: ${imp.importPath}`);
        console.log(`    Unused: ${imp.importedNames.join(', ')}`);
      }
    }
    console.log();
  }

  // Display incorrect paths
  if (analysisResult.incorrectPaths.length > 0) {
    console.log('Incorrect Import Paths:');
    console.log('-'.repeat(80));
    
    for (const incorrect of analysisResult.incorrectPaths) {
      const relativePath = path.relative(process.cwd(), incorrect.file);
      console.log(`\n${relativePath}:`);
      console.log(`  Line ${incorrect.line}: ${incorrect.importPath}`);
      console.log(`  Reason: ${incorrect.reason}`);
      if (incorrect.suggestedFix) {
        console.log(`  Suggested fix: ${incorrect.suggestedFix}`);
      }
    }
    console.log();
  }

  // Get baseline error count
  console.log('Step 2: Getting baseline error count...');
  console.log('-'.repeat(80));
  
  const baselineValidation = await typeValidator.validateTypeScript();
  console.log(`Baseline errors: ${baselineValidation.errorCount}`);
  console.log();

  // Generate fixes
  console.log('Step 3: Generating fixes...');
  console.log('-'.repeat(80));
  
  const removalFixes = importAnalyzer.generateImportRemovalFixes(
    analysisResult.unusedImports
  );
  const correctionFixes = importAnalyzer.generateImportCorrectionFixes(
    analysisResult.incorrectPaths
  );
  
  console.log(`Import removal fixes: ${removalFixes.length}`);
  console.log(`Import correction fixes: ${correctionFixes.length}`);
  console.log();

  // Apply removal fixes
  if (removalFixes.length > 0) {
    console.log('Step 4: Applying import removal fixes...');
    console.log('-'.repeat(80));
    
    const removalResult = await importAnalyzer.applyImportRemovalFixes(removalFixes);
    
    console.log(`Success: ${removalResult.success}`);
    console.log(`Files modified: ${removalResult.filesModified.length}`);
    console.log(`Fixes applied: ${removalResult.fixesApplied}`);
    
    if (removalResult.errors.length > 0) {
      console.log('\nErrors:');
      for (const error of removalResult.errors) {
        console.log(`  - ${error}`);
      }
    }
    console.log();

    // Validate after removal
    console.log('Step 5: Validating after removal...');
    console.log('-'.repeat(80));
    
    const afterRemovalValidation = await typeValidator.validateTypeScript();
    console.log(`Errors after removal: ${afterRemovalValidation.errorCount}`);
    
    const errorDelta = afterRemovalValidation.errorCount - baselineValidation.errorCount;
    if (errorDelta > 0) {
      console.log(`⚠️  WARNING: ${errorDelta} new errors introduced!`);
    } else if (errorDelta < 0) {
      console.log(`✅ ${Math.abs(errorDelta)} errors fixed!`);
    } else {
      console.log(`✅ No new errors introduced`);
    }
    console.log();
  }

  // Apply correction fixes
  if (correctionFixes.length > 0) {
    console.log('Step 6: Applying import correction fixes...');
    console.log('-'.repeat(80));
    
    const correctionResult = await importAnalyzer.applyImportCorrectionFixes(correctionFixes);
    
    console.log(`Success: ${correctionResult.success}`);
    console.log(`Files modified: ${correctionResult.filesModified.length}`);
    console.log(`Fixes applied: ${correctionResult.fixesApplied}`);
    
    if (correctionResult.errors.length > 0) {
      console.log('\nErrors:');
      for (const error of correctionResult.errors) {
        console.log(`  - ${error}`);
      }
    }
    console.log();

    // Validate after correction
    console.log('Step 7: Validating after correction...');
    console.log('-'.repeat(80));
    
    const afterCorrectionValidation = await typeValidator.validateTypeScript();
    console.log(`Errors after correction: ${afterCorrectionValidation.errorCount}`);
    
    const errorDelta = afterCorrectionValidation.errorCount - baselineValidation.errorCount;
    if (errorDelta > 0) {
      console.log(`⚠️  WARNING: ${errorDelta} new errors introduced!`);
    } else if (errorDelta < 0) {
      console.log(`✅ ${Math.abs(errorDelta)} errors fixed!`);
    } else {
      console.log(`✅ No new errors introduced`);
    }
    console.log();
  }

  // Final summary
  console.log('='.repeat(80));
  console.log('Import Cleanup Complete');
  console.log('='.repeat(80));
  console.log(`Unused imports removed: ${removalFixes.length}`);
  console.log(`Incorrect paths corrected: ${correctionFixes.length}`);
  console.log();
}

// Run the cleanup
runImportCleanup().catch(error => {
  console.error('Error running import cleanup:', error);
  process.exit(1);
});
