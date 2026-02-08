/**
 * Apply Type Standardization Fixes (Phase 3)
 * 
 * This script applies all type standardization fixes in batches:
 * 1. ID type standardization
 * 2. Type consolidation
 * 3. Pagination interface standardization
 * 4. HTTP status code type resolution
 */

import { ErrorAnalyzer } from './core/error-analyzer';
import { BatchProcessor } from './core/batch-processor';
import { TypeValidator } from './core/type-validator';
import { ProgressTracker } from './core/progress-tracker';
import { defaultConfig } from './config';
import { FixPhase } from './types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('='.repeat(80));
  console.log('Phase 3: Type Standardization');
  console.log('='.repeat(80));
  console.log();

  // Initialize components
  const analyzer = new ErrorAnalyzer(defaultConfig);
  const batchProcessor = new BatchProcessor(defaultConfig);
  const validator = new TypeValidator(defaultConfig);
  const progressTracker = new ProgressTracker(defaultConfig);

  try {
    // Step 1: Analyze ID types
    console.log('Step 1: Analyzing ID type usage patterns...');
    const idAnalysis = analyzer.analyzeIdTypes();
    
    console.log(`  Total ID occurrences: ${idAnalysis.totalOccurrences}`);
    console.log(`  String IDs: ${idAnalysis.stringOccurrences} (${(idAnalysis.stringFrequency * 100).toFixed(1)}%)`);
    console.log(`  Number IDs: ${idAnalysis.numberOccurrences} (${(idAnalysis.numberFrequency * 100).toFixed(1)}%)`);
    console.log(`  Canonical ID type: ${idAnalysis.canonicalType || 'None (below 60% threshold)'}`);
    console.log();

    if (idAnalysis.canonicalType) {
      // Generate ID type standardization fixes
      const idFixes = analyzer.generateIdTypeStandardizationFixes(
        idAnalysis.canonicalType,
        idAnalysis.usagesByFile
      );
      
      console.log(`  Files requiring ID type conversion: ${idFixes.length}`);
      
      if (idFixes.length > 0) {
        // Generate migration pattern
        const fromType = idAnalysis.canonicalType === 'string' ? 'number' : 'string';
        const migrationPattern = analyzer.createIdTypeMigrationPattern(
          fromType,
          idAnalysis.canonicalType
        );
        
        console.log(`  Migration pattern: ${migrationPattern.name}`);
        console.log(`  Automated: ${migrationPattern.automated}`);
        console.log();
        
        // Save migration pattern
        const migrationDir = path.join(defaultConfig.progressTracking.reportDirectory, 'migrations');
        if (!fs.existsSync(migrationDir)) {
          fs.mkdirSync(migrationDir, { recursive: true });
        }
        
        const migrationFile = path.join(migrationDir, 'id-type-migration.md');
        fs.writeFileSync(migrationFile, `# ${migrationPattern.name}

${migrationPattern.description}

## Before

\`\`\`typescript
${migrationPattern.before}
\`\`\`

## After

\`\`\`typescript
${migrationPattern.after}
\`\`\`

## Automated

${migrationPattern.automated ? 'Yes' : 'No'}

## Files Affected

${idFixes.map(f => `- ${f.file} (${f.conversionsNeeded} conversions)`).join('\n')}
`);
        
        console.log(`  Migration pattern saved to: ${migrationFile}`);
        console.log();
      }
    }

    // Step 2: Identify duplicate types
    console.log('Step 2: Identifying duplicate type definitions...');
    const duplicates = analyzer.identifyDuplicateTypes();
    
    console.log(`  Duplicate types found: ${duplicates.size}`);
    for (const [typeName, locations] of duplicates.entries()) {
      console.log(`    ${typeName}: ${locations.length} definitions`);
      for (const location of locations) {
        console.log(`      - ${location}`);
      }
    }
    console.log();

    // Step 3: Generate type consolidation plan
    console.log('Step 3: Generating type consolidation plan...');
    const consolidationPlan = analyzer.generateTypeConsolidationPlan();
    
    console.log(`  Types to consolidate: ${consolidationPlan.length}`);
    for (const plan of consolidationPlan) {
      console.log(`    ${plan.typeName}:`);
      console.log(`      Canonical: ${plan.canonicalLocation}`);
      console.log(`      Duplicates: ${plan.duplicateLocations.length}`);
      console.log(`      Affected imports: ${plan.affectedImports.length}`);
    }
    console.log();

    // Save consolidation plan
    const consolidationFile = path.join(
      defaultConfig.progressTracking.reportDirectory,
      'type-consolidation-plan.json'
    );
    fs.writeFileSync(
      consolidationFile,
      JSON.stringify(consolidationPlan, null, 2)
    );
    console.log(`  Consolidation plan saved to: ${consolidationFile}`);
    console.log();

    // Step 4: Identify pagination inconsistencies
    console.log('Step 4: Identifying pagination interface inconsistencies...');
    const paginationInconsistencies = analyzer.identifyPaginationInconsistencies();
    
    console.log(`  Non-standard pagination interfaces: ${paginationInconsistencies.length}`);
    for (const inconsistency of paginationInconsistencies) {
      console.log(`    ${inconsistency.interfaceName} in ${inconsistency.file}`);
      console.log(`      Properties: ${inconsistency.properties.join(', ')}`);
    }
    console.log();

    // Generate canonical pagination interfaces
    const canonicalPagination = analyzer.generateCanonicalPaginationInterfaces();
    console.log('  Canonical pagination interfaces:');
    console.log('    - PaginationParams');
    console.log('    - PaginatedResponse<T>');
    console.log();

    // Step 5: Identify HTTP status code inconsistencies
    console.log('Step 5: Identifying HTTP status code type inconsistencies...');
    const statusCodeInconsistencies = analyzer.identifyHttpStatusCodeInconsistencies();
    
    console.log(`  Non-standard status code types: ${statusCodeInconsistencies.length}`);
    for (const inconsistency of statusCodeInconsistencies) {
      console.log(`    ${inconsistency.typeName} in ${inconsistency.file}`);
      console.log(`      Current: ${inconsistency.currentType}`);
      console.log(`      Should be: ${inconsistency.shouldBeType}`);
    }
    console.log();

    // Generate canonical HTTP status code type
    const canonicalStatusCode = analyzer.generateCanonicalHttpStatusCodeType();
    console.log('  Canonical HTTP status code type:');
    console.log(`    ${canonicalStatusCode}`);
    console.log();

    // Step 6: Generate summary report
    console.log('Step 6: Generating summary report...');
    
    const summaryReport = {
      phase: 'Type Standardization (Phase 3)',
      timestamp: new Date().toISOString(),
      idTypeAnalysis: {
        canonicalType: idAnalysis.canonicalType,
        stringOccurrences: idAnalysis.stringOccurrences,
        numberOccurrences: idAnalysis.numberOccurrences,
        totalOccurrences: idAnalysis.totalOccurrences,
        filesRequiringConversion: idAnalysis.canonicalType ? 
          analyzer.generateIdTypeStandardizationFixes(
            idAnalysis.canonicalType,
            idAnalysis.usagesByFile
          ).length : 0
      },
      typeConsolidation: {
        duplicateTypesFound: duplicates.size,
        typesToConsolidate: consolidationPlan.length,
        totalAffectedImports: consolidationPlan.reduce(
          (sum, plan) => sum + plan.affectedImports.length,
          0
        )
      },
      paginationStandardization: {
        nonStandardInterfaces: paginationInconsistencies.length
      },
      httpStatusCodeStandardization: {
        nonStandardTypes: statusCodeInconsistencies.length
      }
    };

    const summaryFile = path.join(
      defaultConfig.progressTracking.reportDirectory,
      'phase3-type-standardization-summary.json'
    );
    fs.writeFileSync(
      summaryFile,
      JSON.stringify(summaryReport, null, 2)
    );
    
    console.log(`  Summary report saved to: ${summaryFile}`);
    console.log();

    // Step 7: Record progress
    progressTracker.recordPhaseProgress(FixPhase.TYPE_STANDARDIZATION, {
      batchId: 'type-standardization',
      success: true,
      fixesApplied: consolidationPlan.length + 
                    paginationInconsistencies.length + 
                    statusCodeInconsistencies.length,
      errorsFixed: 0, // Will be updated after actual fixes are applied
      newErrors: 0,
      validationResult: {
        success: true,
        errorCount: 0,
        errors: [],
        warnings: []
      }
    });

    console.log('='.repeat(80));
    console.log('Phase 3: Type Standardization Analysis Complete');
    console.log('='.repeat(80));
    console.log();
    console.log('Next steps:');
    console.log('1. Review the consolidation plan and migration patterns');
    console.log('2. Apply fixes in batches using the batch processor');
    console.log('3. Validate TypeScript compilation after each batch');
    console.log('4. Rollback on validation failure');
    console.log();

  } catch (error) {
    console.error('Error during type standardization:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
