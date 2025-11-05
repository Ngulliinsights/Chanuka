import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

/**
 * Core References Update Script
 * 
 * Updates all references in the codebase to use the new consolidated
 * shared/core/src structure after the consistency improvements.
 */

class CoreReferencesUpdater {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
    this.updatedFiles = [];
    this.errors = [];
    
    // Define the reference mappings for the consolidation
    this.referenceMappings = [
      // Utilities consolidation - utilities/* -> utils/*
      {
        pattern: /from ['"]@shared\/core\/utilities\/api['"]/g,
        replacement: "from '@shared/core/utils/api-utils'",
        description: 'Update utilities/api to utils/api-utils'
      },
      {
        pattern: /from ['"]@shared\/core\/utilities\/cache['"]/g,
        replacement: "from '@shared/core/utils/cache-utils'",
        description: 'Update utilities/cache to utils/cache-utils'
      },
      {
        pattern: /from ['"]@shared\/core\/utilities\/performance['"]/g,
        replacement: "from '@shared/core/utils/performance-utils'",
        description: 'Update utilities/performance to utils/performance-utils'
      },
      {
        pattern: /from ['"]\.\.\/utilities\/api['"]/g,
        replacement: "from '../utils/api-utils'",
        description: 'Update relative utilities/api to utils/api-utils'
      },
      {
        pattern: /from ['"]\.\.\/utilities\/cache['"]/g,
        replacement: "from '../utils/cache-utils'",
        description: 'Update relative utilities/cache to utils/cache-utils'
      },
      {
        pattern: /from ['"]\.\.\/utilities\/performance['"]/g,
        replacement: "from '../utils/performance-utils'",
        description: 'Update relative utilities/performance to utils/performance-utils'
      },
      {
        pattern: /from ['"]\.\.\/\.\.\/utilities\/api['"]/g,
        replacement: "from '../../utils/api-utils'",
        description: 'Update nested relative utilities/api to utils/api-utils'
      },
      {
        pattern: /from ['"]\.\.\/\.\.\/utilities\/cache['"]/g,
        replacement: "from '../../utils/cache-utils'",
        description: 'Update nested relative utilities/cache to utils/cache-utils'
      },
      {
        pattern: /from ['"]\.\.\/\.\.\/utilities\/performance['"]/g,
        replacement: "from '../../utils/performance-utils'",
        description: 'Update nested relative utilities/performance to utils/performance-utils'
      },
      
      // Import path updates for utilities directory removal
      {
        pattern: /import.*from ['"]shared\/core\/src\/utilities\/.*['"]/g,
        replacement: (match) => {
          if (match.includes('/api')) return match.replace('/utilities/api', '/utils/api-utils');
          if (match.includes('/cache')) return match.replace('/utilities/cache', '/utils/cache-utils');
          if (match.includes('/performance')) return match.replace('/utilities/performance', '/utils/performance-utils');
          return match.replace('/utilities/', '/utils/');
        },
        description: 'Update direct imports from utilities to utils'
      },
      
      // Schema directory removal (if any references exist)
      {
        pattern: /from ['"]@shared\/core\/schema['"]/g,
        replacement: "from '@shared/core/types'",
        description: 'Update schema references to types'
      },
      {
        pattern: /from ['"]\.\.\/schema['"]/g,
        replacement: "from '../types'",
        description: 'Update relative schema references to types'
      },
      
      // Ensure primitives exports are used correctly
      {
        pattern: /from ['"]@shared\/core\/primitives\/types['"]/g,
        replacement: "from '@shared/core/primitives'",
        description: 'Update primitives/types to primitives (barrel export)'
      },
      
      // Update any remaining utilities references
      {
        pattern: /shared\/core\/src\/utilities\//g,
        replacement: 'shared/core/src/utils/',
        description: 'Update file paths from utilities to utils'
      },
      
      // Update require statements
      {
        pattern: /require\(['"]@shared\/core\/utilities\/api['"]\)/g,
        replacement: "require('@shared/core/src/utils/api-utils')",
        description: 'Update require utilities/api to utils/api-utils'
      },
      {
        pattern: /require\(['"]@shared\/core\/utilities\/cache['"]\)/g,
        replacement: "require('@shared/core/src/utils/cache-utils')",
        description: 'Update require utilities/cache to utils/cache-utils'
      },
      {
        pattern: /require\(['"]@shared\/core\/utilities\/performance['"]\)/g,
        replacement: "require('@shared/core/src/utils/performance-utils')",
        description: 'Update require utilities/performance to utils/performance-utils'
      }
    ];
  }

  async updateReferences() {
    console.log('🔄 Updating core references across the codebase...\n');
    
    try {
      // Find all files that might contain references
      const filesToUpdate = await this.findFilesToUpdate();
      
      console.log(`Found ${filesToUpdate.length} files to check for references\n`);
      
      // Update each file
      for (const filePath of filesToUpdate) {
        await this.updateFileReferences(filePath);
      }
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Reference update failed:', error);
      throw error;
    }
  }

  async findFilesToUpdate() {
    const files = [];
    
    // Search in these directories for files that might import from shared/core
    const searchDirs = [
      'server',
      'client/src',
      'shared',
      'scripts',
      'tests'
    ];
    
    for (const dir of searchDirs) {
      const fullDir = path.resolve(projectRoot, dir);
      if (fs.existsSync(fullDir)) {
        this.walkDirectory(fullDir, files, /\.(ts|tsx|js|jsx|mjs|cjs)$/);
      }
    }
    
    return files;
  }

  walkDirectory(dir, files, pattern) {
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist' && entry !== 'build') {
          this.walkDirectory(fullPath, files, pattern);
        } else if (stat.isFile() && pattern.test(entry)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      if (this.verbose) {
        console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
      }
    }
  }

  async updateFileReferences(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let updatedContent = content;
      let hasChanges = false;
      const appliedMappings = [];
      
      // Apply each mapping
      for (const mapping of this.referenceMappings) {
        let newContent;
        
        if (typeof mapping.replacement === 'function') {
          newContent = updatedContent.replace(mapping.pattern, mapping.replacement);
        } else {
          newContent = updatedContent.replace(mapping.pattern, mapping.replacement);
        }
        
        if (newContent !== updatedContent) {
          hasChanges = true;
          appliedMappings.push(mapping.description);
          updatedContent = newContent;
        }
      }
      
      // Write changes if any
      if (hasChanges && !this.dryRun) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        this.updatedFiles.push({
          path: path.relative(projectRoot, filePath),
          mappings: appliedMappings
        });
        
        if (this.verbose) {
          console.log(`✅ Updated: ${path.relative(projectRoot, filePath)}`);
          appliedMappings.forEach(mapping => {
            console.log(`   - ${mapping}`);
          });
        }
      } else if (hasChanges && this.dryRun) {
        console.log(`[DRY RUN] Would update: ${path.relative(projectRoot, filePath)}`);
        appliedMappings.forEach(mapping => {
          console.log(`   - ${mapping}`);
        });
      }
      
    } catch (error) {
      this.errors.push({
        file: path.relative(projectRoot, filePath),
        error: error.message
      });
      
      if (this.verbose) {
        console.error(`❌ Error updating ${path.relative(projectRoot, filePath)}: ${error.message}`);
      }
    }
  }

  generateReport() {
    console.log('\n📊 CORE REFERENCES UPDATE REPORT');
    console.log('=================================\n');
    
    // Summary
    console.log('📈 SUMMARY');
    console.log(`Files updated: ${this.updatedFiles.length}`);
    console.log(`Errors: ${this.errors.length}`);
    
    if (this.dryRun) {
      console.log('Mode: DRY RUN (no changes made)');
    }
    console.log('');
    
    // Updated files
    if (this.updatedFiles.length > 0) {
      console.log('✅ UPDATED FILES');
      this.updatedFiles.forEach(file => {
        console.log(`📄 ${file.path}`);
        file.mappings.forEach(mapping => {
          console.log(`   └─ ${mapping}`);
        });
      });
      console.log('');
    }
    
    // Errors
    if (this.errors.length > 0) {
      console.log('❌ ERRORS');
      this.errors.forEach(error => {
        console.log(`📄 ${error.file}: ${error.error}`);
      });
      console.log('');
    }
    
    // Next steps
    console.log('🎯 NEXT STEPS');
    if (this.updatedFiles.length > 0) {
      console.log('1. Run tests to verify all references work correctly');
      console.log('2. Check for any remaining manual references that need updating');
      console.log('3. Update any documentation that references the old structure');
    } else {
      console.log('No references needed updating - structure is already consistent!');
    }
    
    if (this.dryRun) {
      console.log('\n💡 Run without --dry-run to apply changes');
    }
  }
}

// Run the updater
const updater = new CoreReferencesUpdater();
updater.updateReferences().catch(error => {
  console.error('Update failed:', error);
  process.exit(1);
});