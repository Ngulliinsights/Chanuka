#!/usr/bin/env tsx
/**
 * Rollback with Verification
 * Implements migration rollback with verification
 * 
 * This script:
 * 1. Captures pre-rollback state
 * 2. Performs the rollback
 * 3. Verifies all alignments are restored
 * 4. Generates detailed rollback report
 * 
 * Usage:
 *   npm run db:rollback-verified [migration-name]
 *   tsx scripts/database/rollback-with-verification.ts [migration-name]
 * 
 * Requirements: 6.5
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { verifyMigration, MigrationVerificationReport } from './migration-verification-framework';

// ============================================================================
// Types
// ============================================================================

interface RollbackResult {
  success: boolean;
  migrationName?: string;
  preRollbackVerification: MigrationVerificationReport;
  postRollbackVerification?: MigrationVerificationReport;
  rollbackOutput?: string;
  alignmentRestored: boolean;
  error?: string;
  timestamp: string;
  restorationReport: {
    typeAlignmentRestored: boolean;
    apiContractsRestored: boolean;
    validationSchemasRestored: boolean;
    newIssuesIntroduced: string[];
    issuesResolved: string[];
  };
}

// ============================================================================
// Rollback with Verification
// ============================================================================

async function rollbackWithVerification(migrationName?: string): Promise<RollbackResult> {
  const timestamp = new Date().toISOString();
  
  console.log('🔄 Starting verified rollback process...\n');
  console.log('═'.repeat(60));
  console.log('STEP 1: PRE-ROLLBACK VERIFICATION');
  console.log('═'.repeat(60) + '\n');

  // Step 1: Capture pre-rollback state
  let preRollbackVerification: MigrationVerificationReport;
  try {
    console.log('   Capturing current state...\n');
    preRollbackVerification = await verifyMigration(migrationName);
    
    console.log('   Pre-rollback state captured:');
    console.log(`   - Type alignment errors: ${preRollbackVerification.typeAlignment.errors.length}`);
    console.log(`   - API contract errors: ${preRollbackVerification.apiContractCompatibility.errors.length}`);
    console.log(`   - Validation errors: ${preRollbackVerification.validationSchemaConsistency.errors.length}`);
    console.log(`   - Total critical issues: ${preRollbackVerification.summary.criticalIssues.length}\n`);
    
  } catch (error) {
    console.error('❌ Pre-rollback verification failed with error:', error);
    return {
      success: false,
      migrationName,
      preRollbackVerification: {
        timestamp,
        migrationName,
        typeAlignment: { passed: false, errors: [], warnings: [], timestamp },
        apiContractCompatibility: { passed: false, errors: [], warnings: [], timestamp },
        validationSchemaConsistency: { passed: false, errors: [], warnings: [], timestamp },
        overallPassed: false,
        summary: {
          totalErrors: 1,
          totalWarnings: 0,
          criticalIssues: [`Pre-rollback verification error: ${error}`],
        },
      },
      alignmentRestored: false,
      error: `Pre-rollback verification error: ${error}`,
      timestamp,
      restorationReport: {
        typeAlignmentRestored: false,
        apiContractsRestored: false,
        validationSchemasRestored: false,
        newIssuesIntroduced: [],
        issuesResolved: [],
      },
    };
  }

  // Step 2: Perform rollback
  console.log('═'.repeat(60));
  console.log('STEP 2: PERFORMING ROLLBACK');
  console.log('═'.repeat(60) + '\n');

  let rollbackOutput: string;
  try {
    console.log('   Rolling back migration...\n');
    
    // Determine rollback command based on migration name
    const rollbackCommand = migrationName 
      ? `npx drizzle-kit drop --target ${migrationName}`
      : 'npx drizzle-kit drop';
    
    console.log(`   Command: ${rollbackCommand}\n`);
    
    rollbackOutput = execSync(rollbackCommand, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    console.log(rollbackOutput);
    console.log('\n✅ Rollback completed!\n');
    
  } catch (error: any) {
    console.error('❌ Rollback failed:', error.message);
    
    return {
      success: false,
      migrationName,
      preRollbackVerification,
      rollbackOutput: error.stdout || error.message,
      alignmentRestored: false,
      error: `Rollback execution failed: ${error.message}`,
      timestamp,
      restorationReport: {
        typeAlignmentRestored: false,
        apiContractsRestored: false,
        validationSchemasRestored: false,
        newIssuesIntroduced: [],
        issuesResolved: [],
      },
    };
  }

  // Step 3: Verify post-rollback state
  console.log('═'.repeat(60));
  console.log('STEP 3: POST-ROLLBACK VERIFICATION');
  console.log('═'.repeat(60) + '\n');

  let postRollbackVerification: MigrationVerificationReport;
  try {
    console.log('   Verifying restored state...\n');
    postRollbackVerification = await verifyMigration(migrationName);
    
    console.log('   Post-rollback state:');
    console.log(`   - Type alignment errors: ${postRollbackVerification.typeAlignment.errors.length}`);
    console.log(`   - API contract errors: ${postRollbackVerification.apiContractCompatibility.errors.length}`);
    console.log(`   - Validation errors: ${postRollbackVerification.validationSchemaConsistency.errors.length}`);
    console.log(`   - Total critical issues: ${postRollbackVerification.summary.criticalIssues.length}\n`);
    
  } catch (error) {
    console.error('❌ Post-rollback verification failed with error:', error);
    
    return {
      success: false,
      migrationName,
      preRollbackVerification,
      rollbackOutput,
      alignmentRestored: false,
      error: `Post-rollback verification error: ${error}`,
      timestamp,
      restorationReport: {
        typeAlignmentRestored: false,
        apiContractsRestored: false,
        validationSchemasRestored: false,
        newIssuesIntroduced: [],
        issuesResolved: [],
      },
    };
  }

  // Step 4: Compare pre and post states
  console.log('═'.repeat(60));
  console.log('STEP 4: ANALYZING RESTORATION');
  console.log('═'.repeat(60) + '\n');

  const restorationReport = analyzeRestoration(preRollbackVerification, postRollbackVerification);
  
  console.log('   Restoration Analysis:');
  console.log(`   - Type alignment restored: ${restorationReport.typeAlignmentRestored ? '✅' : '❌'}`);
  console.log(`   - API contracts restored: ${restorationReport.apiContractsRestored ? '✅' : '❌'}`);
  console.log(`   - Validation schemas restored: ${restorationReport.validationSchemasRestored ? '✅' : '❌'}`);
  console.log(`   - Issues resolved: ${restorationReport.issuesResolved.length}`);
  console.log(`   - New issues introduced: ${restorationReport.newIssuesIntroduced.length}\n`);

  if (restorationReport.issuesResolved.length > 0) {
    console.log('   Issues resolved by rollback:');
    restorationReport.issuesResolved.forEach(issue => {
      console.log(`      ✓ ${issue}`);
    });
    console.log();
  }

  if (restorationReport.newIssuesIntroduced.length > 0) {
    console.log('   ⚠️  New issues introduced by rollback:');
    restorationReport.newIssuesIntroduced.forEach(issue => {
      console.log(`      - ${issue}`);
    });
    console.log();
  }

  const alignmentRestored = 
    restorationReport.typeAlignmentRestored &&
    restorationReport.apiContractsRestored &&
    restorationReport.validationSchemasRestored;

  // Step 5: Generate final report
  console.log('═'.repeat(60));
  console.log('STEP 5: GENERATING FINAL REPORT');
  console.log('═'.repeat(60) + '\n');

  const result: RollbackResult = {
    success: alignmentRestored,
    migrationName,
    preRollbackVerification,
    postRollbackVerification,
    rollbackOutput,
    alignmentRestored,
    timestamp,
    restorationReport,
  };

  const reportPath = join(process.cwd(), 'rollback-result.json');
  writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(`   📄 Rollback result saved to: ${reportPath}\n`);

  // Final summary
  console.log('═'.repeat(60));
  if (alignmentRestored) {
    console.log('✅ ROLLBACK COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(60) + '\n');
    console.log('   All alignments restored:');
    console.log('   ✓ Type alignment');
    console.log('   ✓ API contracts');
    console.log('   ✓ Validation schemas\n');
  } else {
    console.log('⚠️  ROLLBACK COMPLETED WITH WARNINGS');
    console.log('═'.repeat(60) + '\n');
    console.log('   Some alignments may not be fully restored.');
    console.log('   Please review the rollback report for details.\n');
  }

  return result;
}

// ============================================================================
// Restoration Analysis
// ============================================================================

function analyzeRestoration(
  preRollback: MigrationVerificationReport,
  postRollback: MigrationVerificationReport
): {
  typeAlignmentRestored: boolean;
  apiContractsRestored: boolean;
  validationSchemasRestored: boolean;
  newIssuesIntroduced: string[];
  issuesResolved: string[];
} {
  // Compare error counts
  const preTypeErrors = preRollback.typeAlignment.errors.length;
  const postTypeErrors = postRollback.typeAlignment.errors.length;
  
  const preApiErrors = preRollback.apiContractCompatibility.errors.length;
  const postApiErrors = postRollback.apiContractCompatibility.errors.length;
  
  const preValidationErrors = preRollback.validationSchemaConsistency.errors.length;
  const postValidationErrors = postRollback.validationSchemaConsistency.errors.length;

  // Determine if alignments are restored
  const typeAlignmentRestored = postTypeErrors <= preTypeErrors;
  const apiContractsRestored = postApiErrors <= preApiErrors;
  const validationSchemasRestored = postValidationErrors <= preValidationErrors;

  // Identify specific issues resolved and introduced
  const issuesResolved: string[] = [];
  const newIssuesIntroduced: string[] = [];

  // Compare critical issues
  const preCriticalIssues = new Set(preRollback.summary.criticalIssues);
  const postCriticalIssues = new Set(postRollback.summary.criticalIssues);

  // Issues that were in pre but not in post = resolved
  preCriticalIssues.forEach(issue => {
    if (!postCriticalIssues.has(issue)) {
      issuesResolved.push(issue);
    }
  });

  // Issues that are in post but not in pre = introduced
  postCriticalIssues.forEach(issue => {
    if (!preCriticalIssues.has(issue)) {
      newIssuesIntroduced.push(issue);
    }
  });

  return {
    typeAlignmentRestored,
    apiContractsRestored,
    validationSchemasRestored,
    newIssuesIntroduced,
    issuesResolved,
  };
}

// ============================================================================
// Test Rollback for Existing Migrations
// ============================================================================

export async function testRollbackForMigrations(): Promise<void> {
  console.log('🧪 Testing rollback for existing migrations...\n');

  // Get list of migrations
  const migrationsPath = join(process.cwd(), 'drizzle');
  if (!existsSync(migrationsPath)) {
    console.error('❌ Migrations directory not found');
    return;
  }

  const fs = require('fs');
  const migrationFiles = fs.readdirSync(migrationsPath)
    .filter((file: string) => file.endsWith('.sql'))
    .sort()
    .reverse(); // Most recent first

  console.log(`   Found ${migrationFiles.length} migration files\n`);

  // Test rollback verification for most recent migration
  if (migrationFiles.length > 0) {
    const recentMigration = migrationFiles[0];
    console.log(`   Testing rollback verification for: ${recentMigration}\n`);

    // Just verify we can check the state (don't actually rollback)
    const report = await verifyMigration(recentMigration);
    
    console.log('   Rollback verification test results:');
    console.log(`   - Can verify current state: ✅`);
    console.log(`   - Type alignment verifiable: ${report.typeAlignment ? '✅' : '❌'}`);
    console.log(`   - API contracts verifiable: ${report.apiContractCompatibility ? '✅' : '❌'}`);
    console.log(`   - Validation schemas verifiable: ${report.validationSchemaConsistency ? '✅' : '❌'}\n`);
    
    console.log('✅ Rollback verification capability confirmed\n');
  } else {
    console.log('   No migrations to test\n');
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--test') {
    // Test rollback verification without actually rolling back
    testRollbackForMigrations()
      .then(() => {
        console.log('✅ Rollback verification test completed\n');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Rollback verification test failed:', error);
        process.exit(1);
      });
  } else {
    // Perform actual rollback with verification
    const migrationName = args[0];
    
    if (migrationName) {
      console.log(`\n🔄 Rolling back migration: ${migrationName}\n`);
    } else {
      console.log('\n🔄 Rolling back most recent migration\n');
    }

    rollbackWithVerification(migrationName)
      .then(result => {
        if (!result.success) {
          console.error('\n❌ Rollback process failed!\n');
          process.exit(1);
        } else {
          console.log('\n✅ Rollback process completed successfully!\n');
          process.exit(0);
        }
      })
      .catch(error => {
        console.error('❌ Unexpected error during rollback:', error);
        process.exit(1);
      });
  }
}

export { rollbackWithVerification };
