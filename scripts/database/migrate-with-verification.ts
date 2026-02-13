#!/usr/bin/env tsx
/**
 * Migration with Verification
 * Integrates verification framework into the migration process
 * 
 * This script:
 * 1. Runs pre-migration verification
 * 2. Applies the migration if verification passes
 * 3. Runs post-migration verification
 * 4. Generates detailed verification reports
 * 5. Fails migration if verification fails
 * 
 * Usage:
 *   npm run db:migrate-verified
 *   tsx scripts/database/migrate-with-verification.ts [migration-name]
 * 
 * Requirements: 6.1, 6.4
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { verifyMigration, MigrationVerificationReport } from './migration-verification-framework';

// ============================================================================
// Types
// ============================================================================

interface MigrationResult {
  success: boolean;
  migrationName?: string;
  preMigrationVerification: MigrationVerificationReport;
  postMigrationVerification?: MigrationVerificationReport;
  migrationOutput?: string;
  error?: string;
  timestamp: string;
}

// ============================================================================
// Migration with Verification
// ============================================================================

async function migrateWithVerification(migrationName?: string): Promise<MigrationResult> {
  const timestamp = new Date().toISOString();
  
  console.log('🚀 Starting verified migration process...\n');
  console.log('═'.repeat(60));
  console.log('STEP 1: PRE-MIGRATION VERIFICATION');
  console.log('═'.repeat(60) + '\n');

  // Step 1: Run pre-migration verification
  let preMigrationVerification: MigrationVerificationReport;
  try {
    preMigrationVerification = await verifyMigration(migrationName);
  } catch (error) {
    console.error('❌ Pre-migration verification failed with error:', error);
    return {
      success: false,
      migrationName,
      preMigrationVerification: {
        timestamp,
        migrationName,
        typeAlignment: { passed: false, errors: [], warnings: [], timestamp },
        apiContractCompatibility: { passed: false, errors: [], warnings: [], timestamp },
        validationSchemaConsistency: { passed: false, errors: [], warnings: [], timestamp },
        overallPassed: false,
        summary: {
          totalErrors: 1,
          totalWarnings: 0,
          criticalIssues: [`Pre-migration verification error: ${error}`],
        },
      },
      error: `Pre-migration verification error: ${error}`,
      timestamp,
    };
  }

  // Check if pre-migration verification passed
  if (!preMigrationVerification.overallPassed) {
    console.error('\n❌ Pre-migration verification failed!');
    console.error('   Migration will NOT be applied.\n');
    console.error('   Please fix the following issues before migrating:\n');
    
    preMigrationVerification.summary.criticalIssues.forEach(issue => {
      console.error(`   - ${issue}`);
    });
    
    console.error('\n   See migration-verification-report.json for details.\n');
    
    return {
      success: false,
      migrationName,
      preMigrationVerification,
      error: 'Pre-migration verification failed',
      timestamp,
    };
  }

  console.log('\n✅ Pre-migration verification passed!\n');
  
  // Step 2: Apply migration
  console.log('═'.repeat(60));
  console.log('STEP 2: APPLYING MIGRATION');
  console.log('═'.repeat(60) + '\n');

  let migrationOutput: string;
  try {
    console.log('   Running drizzle-kit migrate...\n');
    
    // Run the migration
    migrationOutput = execSync('npx drizzle-kit migrate', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    console.log(migrationOutput);
    console.log('\n✅ Migration applied successfully!\n');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    
    return {
      success: false,
      migrationName,
      preMigrationVerification,
      migrationOutput: error.stdout || error.message,
      error: `Migration execution failed: ${error.message}`,
      timestamp,
    };
  }

  // Step 3: Run post-migration verification
  console.log('═'.repeat(60));
  console.log('STEP 3: POST-MIGRATION VERIFICATION');
  console.log('═'.repeat(60) + '\n');

  let postMigrationVerification: MigrationVerificationReport;
  try {
    postMigrationVerification = await verifyMigration(migrationName);
  } catch (error) {
    console.error('❌ Post-migration verification failed with error:', error);
    
    return {
      success: false,
      migrationName,
      preMigrationVerification,
      migrationOutput,
      error: `Post-migration verification error: ${error}`,
      timestamp,
    };
  }

  // Check if post-migration verification passed
  if (!postMigrationVerification.overallPassed) {
    console.error('\n❌ Post-migration verification failed!');
    console.error('   Migration was applied but introduced issues.\n');
    console.error('   Critical issues:\n');
    
    postMigrationVerification.summary.criticalIssues.forEach(issue => {
      console.error(`   - ${issue}`);
    });
    
    console.error('\n   Consider rolling back the migration.\n');
    console.error('   See migration-verification-report.json for details.\n');
    
    return {
      success: false,
      migrationName,
      preMigrationVerification,
      postMigrationVerification,
      migrationOutput,
      error: 'Post-migration verification failed',
      timestamp,
    };
  }

  console.log('\n✅ Post-migration verification passed!\n');

  // Step 4: Generate final report
  console.log('═'.repeat(60));
  console.log('STEP 4: GENERATING FINAL REPORT');
  console.log('═'.repeat(60) + '\n');

  const result: MigrationResult = {
    success: true,
    migrationName,
    preMigrationVerification,
    postMigrationVerification,
    migrationOutput,
    timestamp,
  };

  const reportPath = join(process.cwd(), 'migration-result.json');
  writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(`   📄 Migration result saved to: ${reportPath}\n`);

  // Success summary
  console.log('═'.repeat(60));
  console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
  console.log('═'.repeat(60) + '\n');
  console.log('   All verifications passed:');
  console.log('   ✓ Pre-migration verification');
  console.log('   ✓ Migration execution');
  console.log('   ✓ Post-migration verification\n');

  return result;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (require.main === module) {
  const migrationName = process.argv[2];
  
  if (migrationName) {
    console.log(`\n📦 Migrating: ${migrationName}\n`);
  } else {
    console.log('\n📦 Running all pending migrations\n');
  }

  migrateWithVerification(migrationName)
    .then(result => {
      if (!result.success) {
        console.error('\n❌ Migration process failed!\n');
        process.exit(1);
      } else {
        console.log('\n✅ Migration process completed successfully!\n');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error during migration:', error);
      process.exit(1);
    });
}

export { migrateWithVerification };
