#!/usr/bin/env node

/**
 * Legacy Adapter Cleanup Script
 * 
 * This script removes legacy adapter files and updates references to use core implementations directly.
 * Safe to run during development phase as client code already uses unified core system.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Legacy adapter files to delete
const LEGACY_ADAPTER_FILES = [
  // Error handling adapters
  'shared/core/dist/error-handling/legacy-adapters.js',
  'shared/core/dist/error-handling/legacy-adapters.d.ts',
  'shared/core/dist/error-handling/legacy-adapters.js.map',
  'shared/core/dist/error-handling/legacy-adapters.d.ts.map',
  
  // Cache adapters (duplicated)
  'shared/core/dist/cache/legacy-adapters.js',
  'shared/core/dist/cache/legacy-adapters.d.ts',
  'shared/core/dist/cache/legacy-adapters.js.map',
  'shared/core/dist/cache/legacy-adapters.d.ts.map',
  'shared/core/dist/caching/legacy-adapters.js',
  'shared/core/dist/caching/legacy-adapters.d.ts',
  'shared/core/dist/caching/legacy-adapters.js.map',
  'shared/core/dist/caching/legacy-adapters.d.ts.map',
  
  // Logging adapters
  'shared/core/dist/logging/legacy-adapters.js',
  'shared/core/dist/logging/legacy-adapters.d.ts',
  'shared/core/dist/logging/legacy-adapters.js.map',
  'shared/core/dist/logging/legacy-adapters.d.ts.map',
  
  // Observability adapters
  'shared/core/dist/observability/legacy-adapters.js',
  'shared/core/dist/observability/legacy-adapters.d.ts',
  'shared/core/dist/observability/legacy-adapters.js.map',
  'shared/core/dist/observability/legacy-adapters.d.ts.map',
  
  // Validation adapters
  'shared/core/dist/validation/legacy-adapters.js',
  'shared/core/dist/validation/legacy-adapters.d.ts',
  'shared/core/dist/validation/legacy-adapters.js.map',
  'shared/core/dist/validation/legacy-adapters.d.ts.map',
  
  // Legacy adapter directories
  'shared/core/dist/cache/legacy-adapters',
  'shared/core/dist/caching/legacy-adapters',
  'shared/core/dist/error-handling/legacy-adapters',
  'shared/core/dist/logging/legacy-adapters',
  'shared/core/dist/observability/legacy-adapters',
  'shared/core/dist/validation/legacy-adapters',
  'shared/core/dist/middleware/legacy-adapters',
];

// Rate limiting adapters (these are actual implementations, not legacy)
const RATE_LIMITING_ADAPTERS_TO_KEEP = [
  'shared/core/src/rate-limiting/adapters/token-bucket-adapter.ts',
  'shared/core/src/rate-limiting/adapters/sliding-window-adapter.ts',
  'shared/core/src/rate-limiting/adapters/memory-adapter.ts',
  'shared/core/src/rate-limiting/adapters/fixed-window-adapter.ts',
];

// Validation adapters (these are actual implementations, not legacy)
const VALIDATION_ADAPTERS_TO_KEEP = [
  'shared/core/src/validation/adapters/zod-adapter.ts',
  'shared/core/src/validation/adapters/joi-adapter.ts',
  'shared/core/src/validation/adapters/custom-adapter.ts',
  'shared/core/src/validation/core/base-adapter.ts',
];

// Files that might import legacy adapters
const FILES_TO_UPDATE = [
  'shared/core/src/index.ts',
  'shared/core/dist/index.js',
  'shared/core/dist/index.d.ts',
];

// Import patterns to remove/update
const LEGACY_IMPORT_PATTERNS = [
  /export.*from.*legacy-adapters/g,
  /import.*from.*legacy-adapters/g,
  /\.\/legacy-adapters/g,
  /legacy-adapters\//g,
];

class LegacyAdapterCleanup {
  constructor() {
    this.deletedFiles = [];
    this.updatedFiles = [];
    this.errors = [];
    this.dryRun = process.argv.includes('--dry-run');
  }

  async run() {
    console.log('🧹 Starting Legacy Adapter Cleanup...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('');

    try {
      await this.analyzeLegacyAdapters();
      await this.deleteLegacyAdapterFiles();
      await this.updateImportReferences();
      await this.cleanupEmptyDirectories();
      
      this.printSummary();
      
      if (!this.dryRun) {
        console.log('\n✅ Legacy adapter cleanup completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Run tests to ensure no broken imports');
        console.log('2. Update any remaining references manually');
        console.log('3. Rebuild the project: npm run build');
      }
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    }
  }

  async analyzeLegacyAdapters() {
    console.log('🔍 Analyzing legacy adapters...');
    
    for (const adapterFile of LEGACY_ADAPTER_FILES) {
      const fullPath = path.join(rootDir, adapterFile);
      
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          console.log(`  📄 Found legacy file: ${adapterFile}`);
        } else if (stats.isDirectory()) {
          console.log(`  📁 Found legacy directory: ${adapterFile}`);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.log(`  ⚠️  Error checking ${adapterFile}: ${error.message}`);
        }
      }
    }
    
    console.log('');
  }

  async deleteLegacyAdapterFiles() {
    console.log('🗑️  Deleting legacy adapter files...');
    
    for (const adapterFile of LEGACY_ADAPTER_FILES) {
      const fullPath = path.join(rootDir, adapterFile);
      
      try {
        const stats = await fs.stat(fullPath);
        
        if (!this.dryRun) {
          if (stats.isDirectory()) {
            await fs.rmdir(fullPath, { recursive: true });
          } else {
            await fs.unlink(fullPath);
          }
        }
        
        this.deletedFiles.push(adapterFile);
        console.log(`  ✅ ${this.dryRun ? '[DRY RUN] Would delete' : 'Deleted'}: ${adapterFile}`);
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`  ℹ️  File not found (already deleted?): ${adapterFile}`);
        } else {
          console.log(`  ❌ Error deleting ${adapterFile}: ${error.message}`);
          this.errors.push(`Failed to delete ${adapterFile}: ${error.message}`);
        }
      }
    }
    
    console.log('');
  }

  async updateImportReferences() {
    console.log('🔄 Updating import references...');
    
    for (const filePath of FILES_TO_UPDATE) {
      const fullPath = path.join(rootDir, filePath);
      
      try {
        const content = await fs.readFile(fullPath, 'utf8');
        let updatedContent = content;
        let hasChanges = false;
        
        // Remove legacy adapter imports/exports
        for (const pattern of LEGACY_IMPORT_PATTERNS) {
          const newContent = updatedContent.replace(pattern, '');
          if (newContent !== updatedContent) {
            updatedContent = newContent;
            hasChanges = true;
          }
        }
        
        // Clean up empty lines
        updatedContent = updatedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        if (hasChanges) {
          if (!this.dryRun) {
            await fs.writeFile(fullPath, updatedContent, 'utf8');
          }
          
          this.updatedFiles.push(filePath);
          console.log(`  ✅ ${this.dryRun ? '[DRY RUN] Would update' : 'Updated'}: ${filePath}`);
        }
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`  ℹ️  File not found: ${filePath}`);
        } else {
          console.log(`  ❌ Error updating ${filePath}: ${error.message}`);
          this.errors.push(`Failed to update ${filePath}: ${error.message}`);
        }
      }
    }
    
    console.log('');
  }

  async cleanupEmptyDirectories() {
    console.log('🧹 Cleaning up empty directories...');
    
    const dirsToCheck = [
      'shared/core/dist/cache/legacy-adapters',
      'shared/core/dist/caching/legacy-adapters',
      'shared/core/dist/error-handling/legacy-adapters',
      'shared/core/dist/logging/legacy-adapters',
      'shared/core/dist/observability/legacy-adapters',
      'shared/core/dist/validation/legacy-adapters',
      'shared/core/dist/middleware/legacy-adapters',
    ];
    
    for (const dir of dirsToCheck) {
      const fullPath = path.join(rootDir, dir);
      
      try {
        const files = await fs.readdir(fullPath);
        if (files.length === 0) {
          if (!this.dryRun) {
            await fs.rmdir(fullPath);
          }
          console.log(`  ✅ ${this.dryRun ? '[DRY RUN] Would remove' : 'Removed'} empty directory: ${dir}`);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.log(`  ⚠️  Error checking directory ${dir}: ${error.message}`);
        }
      }
    }
    
    console.log('');
  }

  printSummary() {
    console.log('📊 Cleanup Summary:');
    console.log(`  📄 Files deleted: ${this.deletedFiles.length}`);
    console.log(`  🔄 Files updated: ${this.updatedFiles.length}`);
    console.log(`  ❌ Errors: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n📋 Files kept (actual implementations, not legacy):');
    [...RATE_LIMITING_ADAPTERS_TO_KEEP, ...VALIDATION_ADAPTERS_TO_KEEP].forEach(file => {
      console.log(`  ✅ ${file}`);
    });
  }
}

// Run the cleanup
const cleanup = new LegacyAdapterCleanup();
cleanup.run().catch(console.error);