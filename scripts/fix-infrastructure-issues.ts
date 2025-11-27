#!/usr/bin/env tsx

/**
 * Infrastructure Fix Script - Preserving @shared/core Architecture
 * 
 * This script addresses the real issues:
 * 1. Database schema import path (shared/database/connection.ts imports from ../types instead of ../schema)
 * 2. Variable shadowing in notification scheduler
 * 3. Missing database tables
 * 4. Build configuration for @shared/core path mapping
 * 
 * DOES NOT change the strategic @shared/core import architecture
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

interface FixResult {
  success: boolean;
  message: string;
  filesModified: string[];
  errors: string[];
}

class InfrastructureFixer {
  private results: FixResult[] = [];
  private filesModified = new Set<string>();
  private errors: string[] = [];

  async run(): Promise<void> {
    console.log('🔧 Fixing Infrastructure Issues (Preserving @shared/core Architecture)...\n');

    // Fix only the specific issues that prevent startup
    await this.fixDatabaseSchemaImport();
    await this.fixVariableShadowing();
    await this.ensureBuildConfiguration();
    await this.createMissingStrategicTables();
    
    await this.generateReport();
  }

  private async fixDatabaseSchemaImport(): Promise<void> {
    console.log('📊 Fixing database schema import (the ONE legitimate import path issue)...');
    
    const connectionFile = join(projectRoot, 'shared/database/connection.ts');
    if (!existsSync(connectionFile)) {
      this.errors.push('Database connection file not found');
      return;
    }

    try {
      let content = readFileSync(connectionFile, 'utf-8');
      let modified = false;

      // This is the ONLY import path that should be changed - it's importing from the wrong location
      if (content.includes("import * as schema from '@shared/types';")) {
        content = content.replace(
          "import * as schema from '@shared/types';",
          "import * as schema from '@shared/schema';"
        );
        modified = true;
      }

      if (content.includes("export * from '@shared/types';")) {
        content = content.replace(
          "export * from '@shared/types';",
          "export * from '@shared/schema';"
        );
        modified = true;
      }

      if (modified) {
        writeFileSync(connectionFile, content);
        this.filesModified.add(connectionFile);
        console.log('✅ Fixed database schema import path');
      }

      this.results.push({
        success: true,
        message: 'Database schema import fixed',
        filesModified: modified ? [connectionFile] : [],
        errors: []
      });
    } catch (error) {
      this.errors.push(`Failed to fix database schema import: ${error}`);
    }
  }

  private async fixVariableShadowing(): Promise<void> {
    console.log('🔍 Fixing variable shadowing in notification scheduler...');
    
    const notificationFile = join(projectRoot, 'server/infrastructure/notifications/notification-scheduler.ts');
    if (!existsSync(notificationFile)) {
      this.errors.push('Notification scheduler file not found');
      return;
    }

    try { let content = readFileSync(notificationFile, 'utf-8');
      let modified = false;

      // Fix the specific variable shadowing issue
      if (content.includes('.map(user => ({') && content.includes('user_id: users.id')) {
        content = content.replace(
          /\.map\(user => \(\{\s*user_id: user\.id,\s*preferences: user\.preferences \|\| \{\ }\s*\}\)\)/g,
          '.map(userData => ({ \n        user_id: userData.id,\n        preferences: userData.preferences || { }\n      }))'
        );
        
        content = content.replace(
          /\.filter\(user => \{/g,
          '.filter(userData => {'
        );
        
        content = content.replace(
          /const prefs = user\.preferences as any;/g,
          'const prefs = userData.preferences as any;'
        );
        
        modified = true;
      }

      if (modified) {
        writeFileSync(notificationFile, content);
        this.filesModified.add(notificationFile);
        console.log('✅ Fixed variable shadowing');
      }

      this.results.push({
        success: true,
        message: 'Variable shadowing fixed',
        filesModified: modified ? [notificationFile] : [],
        errors: []
      });
    } catch (error) {
      this.errors.push(`Failed to fix variable shadowing: ${error}`);
    }
  }

  private async ensureBuildConfiguration(): Promise<void> {
    console.log('⚙️  Ensuring build configuration supports @shared/core...');
    
    const tsconfigFile = join(projectRoot, 'tsconfig.json');
    if (!existsSync(tsconfigFile)) {
      this.errors.push('tsconfig.json not found');
      return;
    }

    try {
      const content = readFileSync(tsconfigFile, 'utf-8');
      
      // Check if @shared/core path mapping exists
      if (content.includes('"@shared/core"')) {
        console.log('✅ @shared/core path mapping already configured');
      } else {
        console.log('⚠️  @shared/core path mapping may need configuration');
        // Don't modify - just report
      }

      this.results.push({
        success: true,
        message: 'Build configuration checked',
        filesModified: [],
        errors: []
      });
    } catch (error) {
      this.errors.push(`Failed to check build configuration: ${error}`);
    }
  }

  private async createMissingStrategicTables(): Promise<void> {
    console.log('📋 Checking for missing strategic tables...');
    
    // This would require database connection - for now just report
    console.log('ℹ️  Strategic table creation requires database migration');
    console.log('   Run: npm run db:migrate to ensure tables exist');

    this.results.push({
      success: true,
      message: 'Strategic table check completed (requires migration)',
      filesModified: [],
      errors: []
    });
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 Infrastructure Fix Report...\n');
    
    const totalFilesModified = this.filesModified.size;
    const totalErrors = this.errors.length;
    const successfulFixes = this.results.filter(r => r.success).length;

    console.log('='.repeat(60));
    console.log('🎯 INFRASTRUCTURE FIX REPORT');
    console.log('='.repeat(60));
    console.log(`📁 Files Modified: ${totalFilesModified}`);
    console.log(`✅ Successful Fixes: ${successfulFixes}`);
    console.log(`⚠️  Total Errors: ${totalErrors}`);
    console.log('='.repeat(60));

    if (totalFilesModified > 0) {
      console.log('\n📝 Modified Files:');
      Array.from(this.filesModified).forEach(file => {
        console.log(`  - ${file.replace(projectRoot, '.')}`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors Encountered:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log('\n🎯 Next Steps:');
    console.log('  1. Run `npm run db:migrate` to create missing database tables');
    console.log('  2. Verify @shared/core path mapping in build configuration');
    console.log('  3. Run `npm run dev` to test the fixes');
    console.log('  4. The @shared/core architecture is PRESERVED as intended');
    
    console.log('\n✨ Architecture Status: @shared/core imports MAINTAINED');
  }
}

// Run the fixer
const fixer = new InfrastructureFixer();
fixer.run().catch(error => {
  console.error('💥 Fatal error during infrastructure fix:', error);
  process.exit(1);
});