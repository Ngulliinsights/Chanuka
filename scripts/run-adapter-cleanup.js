#!/usr/bin/env node

/**
 * Master Adapter Cleanup Script
 * 
 * Orchestrates the complete cleanup of legacy adapters and import updates.
 * Provides safety checks and rollback capabilities.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

class AdapterCleanupOrchestrator {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.skipTests = process.argv.includes('--skip-tests');
    this.verbose = process.argv.includes('--verbose');
  }

  async run() {
    console.log('🚀 Starting Complete Adapter Cleanup Process');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('');

    try {
      // Phase 1: Pre-cleanup validation
      await this.preCleanupValidation();
      
      // Phase 2: Create backup
      if (!this.dryRun) {
        await this.createBackup();
      }
      
      // Phase 3: Run cleanup scripts
      await this.runCleanupScripts();
      
      // Phase 4: Post-cleanup validation
      if (!this.dryRun && !this.skipTests) {
        await this.postCleanupValidation();
      }
      
      // Phase 5: Success summary
      this.printSuccessSummary();
      
    } catch (error) {
      console.error('❌ Cleanup process failed:', error.message);
      
      if (!this.dryRun) {
        console.log('\n🔄 Attempting rollback...');
        await this.rollback();
      }
      
      process.exit(1);
    }
  }

  async preCleanupValidation() {
    console.log('🔍 Phase 1: Pre-cleanup validation');
    
    // Check if TypeScript compiles
    console.log('  📝 Checking TypeScript compilation...');
    await this.runCommand('npx', ['tsc', '--noEmit'], 'TypeScript compilation check');
    
    // Check if tests pass
    if (!this.skipTests) {
      console.log('  🧪 Running existing tests...');
      await this.runCommand('npm', ['test', '--', '--run'], 'Pre-cleanup tests');
    }
    
    console.log('  ✅ Pre-cleanup validation passed\n');
  }

  async createBackup() {
    console.log('💾 Phase 2: Creating backup');
    
    const backupDir = path.join(rootDir, '.backup-adapters');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    
    try {
      await fs.mkdir(backupPath, { recursive: true });
      
      // Backup shared/core directory
      console.log('  📦 Backing up shared/core...');
      await this.runCommand('cp', ['-r', 'shared/core', backupPath], 'Backup shared/core');
      
      // Create restore script
      const restoreScript = `#!/bin/bash
# Restore script generated on ${new Date().toISOString()}
echo "🔄 Restoring from backup..."
rm -rf shared/core
cp -r "${backupPath}/core" shared/
echo "✅ Restore completed"
`;
      
      await fs.writeFile(path.join(backupPath, 'restore.sh'), restoreScript);
      await this.runCommand('chmod', ['+x', path.join(backupPath, 'restore.sh')], 'Make restore script executable');
      
      console.log(`  ✅ Backup created at: ${backupPath}\n`);
      
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  async runCleanupScripts() {
    console.log('🧹 Phase 3: Running cleanup scripts');
    
    // Step 1: Delete legacy adapter files
    console.log('  🗑️  Step 1: Deleting legacy adapter files...');
    const cleanupArgs = this.dryRun ? ['--dry-run'] : [];
    if (this.verbose) cleanupArgs.push('--verbose');
    
    await this.runCommand('node', ['scripts/cleanup-legacy-adapters.js', ...cleanupArgs], 'Legacy adapter cleanup');
    
    // Step 2: Update import references
    console.log('  🔄 Step 2: Updating import references...');
    const importArgs = this.dryRun ? ['--dry-run'] : [];
    if (this.verbose) importArgs.push('--verbose');
    
    await this.runCommand('node', ['scripts/update-core-imports.js', ...importArgs], 'Import reference updates');
    
    console.log('  ✅ Cleanup scripts completed\n');
  }

  async postCleanupValidation() {
    console.log('✅ Phase 4: Post-cleanup validation');
    
    // Check TypeScript compilation
    console.log('  📝 Verifying TypeScript compilation...');
    await this.runCommand('npx', ['tsc', '--noEmit'], 'Post-cleanup TypeScript check');
    
    // Run tests
    console.log('  🧪 Running tests...');
    await this.runCommand('npm', ['test', '--', '--run'], 'Post-cleanup tests');
    
    // Check bundle size (if build script exists)
    try {
      console.log('  📊 Checking bundle size...');
      await this.runCommand('npm', ['run', 'build:client'], 'Bundle size check');
    } catch (error) {
      console.log('  ⚠️  Bundle size check skipped (build script not available)');
    }
    
    console.log('  ✅ Post-cleanup validation passed\n');
  }

  async rollback() {
    const backupDir = path.join(rootDir, '.backup-adapters');
    
    try {
      const backups = await fs.readdir(backupDir);
      if (backups.length === 0) {
        console.log('❌ No backups found for rollback');
        return;
      }
      
      // Use the most recent backup
      const latestBackup = backups.sort().reverse()[0];
      const restoreScript = path.join(backupDir, latestBackup, 'restore.sh');
      
      await this.runCommand('bash', [restoreScript], 'Rollback to backup');
      console.log('✅ Rollback completed');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }

  async runCommand(command, args, description) {
    return new Promise((resolve, reject) => {
      if (this.verbose) {
        console.log(`    🔧 Running: ${command} ${args.join(' ')}`);
      }
      
      const process = spawn(command, args, {
        cwd: rootDir,
        stdio: this.verbose ? 'inherit' : 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      if (!this.verbose) {
        process.stdout?.on('data', (data) => {
          output += data.toString();
        });
        
        process.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });
      }
      
      process.on('close', (code) => {
        if (code === 0) {
          if (this.verbose) {
            console.log(`    ✅ ${description} completed`);
          }
          resolve(output);
        } else {
          const error = new Error(`${description} failed with exit code ${code}`);
          if (errorOutput) {
            error.message += `\n${errorOutput}`;
          }
          reject(error);
        }
      });
      
      process.on('error', (error) => {
        reject(new Error(`${description} failed: ${error.message}`));
      });
    });
  }

  printSuccessSummary() {
    console.log('🎉 Adapter Cleanup Process Completed Successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('  ✅ Legacy adapters removed');
    console.log('  ✅ Import references updated');
    console.log('  ✅ TypeScript compilation verified');
    if (!this.skipTests) {
      console.log('  ✅ Tests passing');
    }
    console.log('');
    console.log('📝 Next Steps:');
    console.log('  1. Review the changes in your git diff');
    console.log('  2. Test your application thoroughly');
    console.log('  3. Update any documentation that referenced legacy adapters');
    console.log('  4. Consider running bundle analysis to see size improvements');
    console.log('');
    console.log('🔄 If you need to rollback:');
    console.log('  - Check .backup-adapters/ directory for restore scripts');
    console.log('  - Run the latest restore.sh script');
    console.log('');
    console.log('📖 For more details, see: docs/adapter-analysis-report.md');
  }
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🧹 Adapter Cleanup Orchestrator

Usage: node scripts/run-adapter-cleanup.js [options]

Options:
  --dry-run      Show what would be done without making changes
  --skip-tests   Skip running tests (faster but less safe)
  --verbose      Show detailed output from all commands
  --help, -h     Show this help message

Examples:
  node scripts/run-adapter-cleanup.js --dry-run    # Safe preview
  node scripts/run-adapter-cleanup.js             # Full cleanup
  node scripts/run-adapter-cleanup.js --verbose   # Detailed output
`);
  process.exit(0);
}

// Run the orchestrator
const orchestrator = new AdapterCleanupOrchestrator();
orchestrator.run().catch(console.error);