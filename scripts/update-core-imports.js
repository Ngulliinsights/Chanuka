#!/usr/bin/env node

/**
 * Core Import Update Script
 * 
 * Updates imports to use core implementations directly instead of legacy adapters.
 * Ensures client code uses the most efficient, modern interfaces.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import mapping from legacy adapters to core implementations
const IMPORT_MAPPINGS = {
  // Error handling
  'UnifiedErrorTracker': '@shared/core/error-handling',
  'ErrorBoundaryAdapter': '@shared/core/error-handling/platform/client',
  'EnhancedErrorBoundary': '@shared/core/error-handling/platform/client',
  'withErrorBoundary': '@shared/core/error-handling/platform/client',
  'ErrorReportingService': '@shared/core/error-handling/services',
  
  // Logging
  'SimpleLoggerAdapter': '@shared/core/logging',
  'InfrastructureLoggerAdapter': '@shared/core/logging',
  'StructuredLoggerAdapter': '@shared/core/logging',
  
  // Caching
  'LegacyCacheServiceAdapter': '@shared/core/caching',
  'UnifiedCacheManagerAdapter': '@shared/core/caching',
  'PropertyCacheServiceAdapter': '@shared/core/caching',
  
  // Validation
  'LegacyValidatorsAdapter': '@shared/core/validation',
  'ValidationMiddlewareAdapter': '@shared/core/validation/middleware',
  'ZodValidationService': '@shared/core/validation/adapters/zod-adapter',
  'JoiValidationService': '@shared/core/validation/adapters/joi-adapter',
  
  // Observability
  'SimpleHealthCheckAdapter': '@shared/core/observability/health',
  'SimpleCounterAdapter': '@shared/core/observability/metrics',
  'SimpleGaugeAdapter': '@shared/core/observability/metrics',
  'TimingAdapter': '@shared/core/observability/metrics',
  'SimpleTracingAdapter': '@shared/core/observability/tracing',
};

// Files to scan and update
const SCAN_PATTERNS = [
  'client/src/**/*.ts',
  'client/src/**/*.tsx',
  'server/**/*.ts',
  'shared/**/*.ts',
];

// Legacy import patterns to detect and replace
const LEGACY_PATTERNS = [
  {
    pattern: /from\s+['"].*\/legacy-adapters['"];?/g,
    description: 'Direct legacy adapter imports'
  },
  {
    pattern: /import\s+.*\s+from\s+['"].*\/legacy-adapters['"];?/g,
    description: 'Named imports from legacy adapters'
  },
  {
    pattern: /getLegacyErrorTracker\(\)/g,
    replacement: 'errorHandler',
    description: 'Legacy error tracker usage'
  },
  {
    pattern: /errorTracker\./g,
    replacement: 'errorHandler.',
    description: 'Legacy error tracker references'
  },
];

class CoreImportUpdater {
  constructor() {
    this.scannedFiles = 0;
    this.updatedFiles = [];
    this.errors = [];
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
  }

  async run() {
    console.log('🔄 Starting Core Import Update...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('');

    try {
      await this.scanAndUpdateFiles();
      await this.updateSharedCoreIndex();
      
      this.printSummary();
      
      if (!this.dryRun) {
        console.log('\n✅ Core import update completed successfully!');
        console.log('\n📝 Recommended next steps:');
        console.log('1. Run TypeScript compilation: npx tsc --noEmit');
        console.log('2. Run tests: npm test');
        console.log('3. Check for any remaining legacy references');
      }
      
    } catch (error) {
      console.error('❌ Update failed:', error.message);
      process.exit(1);
    }
  }

  async scanAndUpdateFiles() {
    console.log('🔍 Scanning files for legacy imports...');
    
    const filesToScan = await this.getFilesToScan();
    
    for (const filePath of filesToScan) {
      await this.processFile(filePath);
    }
    
    console.log(`\n📊 Scanned ${this.scannedFiles} files`);
  }

  async getFilesToScan() {
    const files = [];
    
    // Get all TypeScript files in client, server, and shared directories
    const directories = ['client/src', 'server', 'shared'];
    
    for (const dir of directories) {
      const dirPath = path.join(rootDir, dir);
      try {
        await this.scanDirectory(dirPath, files);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.log(`⚠️  Error scanning ${dir}: ${error.message}`);
        }
      }
    }
    
    return files;
  }

  async scanDirectory(dirPath, files) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await this.scanDirectory(fullPath, files);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }

  async processFile(filePath) {
    this.scannedFiles++;
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const updatedContent = this.updateFileContent(content, filePath);
      
      if (updatedContent !== content) {
        if (!this.dryRun) {
          await fs.writeFile(filePath, updatedContent, 'utf8');
        }
        
        const relativePath = path.relative(rootDir, filePath);
        this.updatedFiles.push(relativePath);
        
        if (this.verbose) {
          console.log(`  ✅ ${this.dryRun ? '[DRY RUN] Would update' : 'Updated'}: ${relativePath}`);
        }
      }
      
    } catch (error) {
      const relativePath = path.relative(rootDir, filePath);
      console.log(`  ❌ Error processing ${relativePath}: ${error.message}`);
      this.errors.push(`Failed to process ${relativePath}: ${error.message}`);
    }
  }

  updateFileContent(content, filePath) {
    let updatedContent = content;
    let hasChanges = false;
    
    // Replace legacy import patterns
    for (const legacyPattern of LEGACY_PATTERNS) {
      if (legacyPattern.replacement) {
        const newContent = updatedContent.replace(legacyPattern.pattern, legacyPattern.replacement);
        if (newContent !== updatedContent) {
          updatedContent = newContent;
          hasChanges = true;
          if (this.verbose) {
            console.log(`    🔄 Applied pattern: ${legacyPattern.description}`);
          }
        }
      } else {
        // For patterns without replacement, remove the import and add proper import
        const matches = updatedContent.match(legacyPattern.pattern);
        if (matches) {
          // Remove legacy imports
          updatedContent = updatedContent.replace(legacyPattern.pattern, '');
          hasChanges = true;
          
          // Add proper imports at the top
          updatedContent = this.addProperImports(updatedContent, matches);
          
          if (this.verbose) {
            console.log(`    🔄 Removed legacy pattern: ${legacyPattern.description}`);
          }
        }
      }
    }
    
    // Clean up multiple empty lines
    if (hasChanges) {
      updatedContent = updatedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    }
    
    return updatedContent;
  }

  addProperImports(content, legacyMatches) {
    // Extract what was being imported from legacy adapters
    const importsToAdd = new Set();
    
    for (const match of legacyMatches) {
      // Parse the import to see what was being imported
      const importMatch = match.match(/import\s+\{([^}]+)\}/);
      if (importMatch) {
        const imports = importMatch[1].split(',').map(imp => imp.trim());
        for (const imp of imports) {
          if (IMPORT_MAPPINGS[imp]) {
            importsToAdd.add(`import { ${imp} } from '${IMPORT_MAPPINGS[imp]}';`);
          }
        }
      }
    }
    
    // Add new imports at the top of the file
    if (importsToAdd.size > 0) {
      const newImports = Array.from(importsToAdd).join('\n');
      const lines = content.split('\n');
      
      // Find the best place to insert imports (after existing imports)
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ') || lines[i].startsWith('export ')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() === '' && insertIndex > 0) {
          insertIndex = i;
          break;
        } else if (lines[i].trim() !== '' && !lines[i].startsWith('//') && insertIndex > 0) {
          break;
        }
      }
      
      lines.splice(insertIndex, 0, newImports, '');
      return lines.join('\n');
    }
    
    return content;
  }

  async updateSharedCoreIndex() {
    console.log('\n🔄 Updating shared/core index exports...');
    
    const indexPath = path.join(rootDir, 'shared/core/src/index.ts');
    
    try {
      const content = await fs.readFile(indexPath, 'utf8');
      
      // Remove legacy adapter exports
      let updatedContent = content.replace(/export.*legacy-adapters.*/g, '');
      
      // Add core exports if not present
      const coreExports = [
        "export * from './error-handling';",
        "export * from './logging';",
        "export * from './caching';",
        "export * from './validation';",
        "export * from './observability';",
        "export * from './rate-limiting';",
      ];
      
      for (const coreExport of coreExports) {
        if (!updatedContent.includes(coreExport)) {
          updatedContent += '\n' + coreExport;
        }
      }
      
      // Clean up
      updatedContent = updatedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      if (updatedContent !== content) {
        if (!this.dryRun) {
          await fs.writeFile(indexPath, updatedContent, 'utf8');
        }
        console.log(`  ✅ ${this.dryRun ? '[DRY RUN] Would update' : 'Updated'}: shared/core/src/index.ts`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error updating shared/core index: ${error.message}`);
      this.errors.push(`Failed to update shared/core index: ${error.message}`);
    }
  }

  printSummary() {
    console.log('\n📊 Update Summary:');
    console.log(`  📄 Files scanned: ${this.scannedFiles}`);
    console.log(`  🔄 Files updated: ${this.updatedFiles.length}`);
    console.log(`  ❌ Errors: ${this.errors.length}`);
    
    if (this.updatedFiles.length > 0 && this.verbose) {
      console.log('\n📝 Updated files:');
      this.updatedFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎯 Import mapping used:');
    Object.entries(IMPORT_MAPPINGS).forEach(([legacy, modern]) => {
      console.log(`  ${legacy} → ${modern}`);
    });
  }
}

// Run the updater
const updater = new CoreImportUpdater();
updater.run().catch(console.error);