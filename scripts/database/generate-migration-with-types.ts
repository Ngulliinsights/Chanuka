#!/usr/bin/env tsx
/**
 * Generate Migration with Automatic Type Generation
 * 
 * This script:
 * 1. Generates a Drizzle migration from schema changes
 * 2. Automatically generates TypeScript types from the new schema
 * 3. Verifies type alignment
 * 
 * Usage:
 *   npm run db:generate -- --name "add_user_preferences"
 *   tsx scripts/database/generate-migration-with-types.ts --name "migration_name"
 * 
 * Requirements: 1.2, 2.1
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

interface GenerateOptions {
  name?: string;
  skipTypes?: boolean;
  skipVerify?: boolean;
}

/**
 * Main generation function
 */
async function generateMigrationWithTypes() {
  console.log('🔄 Generating migration with automatic type generation...\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const options: GenerateOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      options.name = args[i + 1];
      i++;
    } else if (args[i] === '--skip-types') {
      options.skipTypes = true;
    } else if (args[i] === '--skip-verify') {
      options.skipVerify = true;
    }
  }

  try {
    // Step 1: Generate Drizzle migration
    console.log('📝 Step 1: Generating Drizzle migration...');
    const migrationName = options.name || `migration_${Date.now()}`;
    
    try {
      execSync(`drizzle-kit generate --name ${migrationName}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('✅ Migration generated successfully\n');
    } catch (error) {
      console.error('❌ Migration generation failed:', error);
      process.exit(1);
    }

    // Step 2: Generate TypeScript types
    if (!options.skipTypes) {
      console.log('📝 Step 2: Generating TypeScript types from schema...');
      
      try {
        execSync('npm run db:generate-types', {
          stdio: 'inherit',
          cwd: process.cwd(),
        });
        console.log('✅ Types generated successfully\n');
      } catch (error) {
        console.error('❌ Type generation failed:', error);
        console.error('   You can manually run: npm run db:generate-types');
      }
    } else {
      console.log('⏭️  Step 2: Skipped type generation (--skip-types flag)\n');
    }

    // Step 3: Verify type alignment
    if (!options.skipVerify) {
      console.log('📝 Step 3: Verifying type alignment...');
      
      const verifyScript = join(process.cwd(), 'scripts', 'database', 'verify-schema-type-alignment.ts');
      if (existsSync(verifyScript)) {
        try {
          execSync('npm run db:verify-schema-alignment', {
            stdio: 'inherit',
            cwd: process.cwd(),
          });
          console.log('✅ Type alignment verified\n');
        } catch (error) {
          console.warn('⚠️  Type alignment verification failed');
          console.warn('   Review the errors above and fix any misalignments');
        }
      } else {
        console.log('ℹ️  Type alignment verification script not found (will be created in task 2.2)\n');
      }
    } else {
      console.log('⏭️  Step 3: Skipped type alignment verification (--skip-verify flag)\n');
    }

    // Success summary
    console.log('✨ Migration generation complete!\n');
    console.log('📋 Next steps:');
    console.log('   1. Review the generated migration in drizzle/');
    console.log('   2. Review the generated types in shared/types/database/generated-tables.ts');
    console.log('   3. Update any transformers in shared/utils/transformers/ if needed');
    console.log('   4. Run npm run db:migrate to apply the migration');
    console.log('   5. Test your changes\n');

  } catch (error) {
    console.error('❌ Migration generation failed:', error);
    process.exit(1);
  }
}

// Run the generator
generateMigrationWithTypes().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
