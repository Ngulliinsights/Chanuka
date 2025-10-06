#!/usr/bin/env node

/**
 * Simple Migration Script
 * Updates import references to use the new core utilities
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface MigrationRule {
  from: string;
  to: string;
  description: string;
}

const migrationRules: MigrationRule[] = [
  // Cache Service Migrations
  {
    from: 'server/cache/CacheService',
    to: '@triplecheck/core/cache',
    description: 'Server cache service imports'
  },
  {
    from: 'src/shared/services/CacheService',
    to: '@triplecheck/core/cache',
    description: 'Shared cache service imports'
  },
  {
    from: 'server/infrastructure/cache/CacheService',
    to: '@triplecheck/core/cache',
    description: 'Infrastructure cache service imports'
  },

  // Logging Service Migrations
  {
    from: 'server/infrastructure/monitoring/logger',
    to: '@triplecheck/core/logging',
    description: 'Infrastructure logger imports'
  },
  {
    from: 'src/shared/services/logger',
    to: '@triplecheck/core/logging',
    description: 'Shared logger imports'
  },

  // Validation Migrations
  {
    from: 'server/middleware/data-validation',
    to: '@triplecheck/core/validation',
    description: 'Data validation middleware imports'
  },
  {
    from: 'src/shared/validation',
    to: '@triplecheck/core/validation',
    description: 'Shared validation imports'
  },

  // Middleware Migrations
  {
    from: 'server/middleware/auth.middleware',
    to: '@triplecheck/core/middleware',
    description: 'Auth middleware imports'
  },
  {
    from: 'server/middleware/cache.middleware',
    to: '@triplecheck/core/middleware',
    description: 'Cache middleware imports'
  },
  {
    from: 'server/middleware/validation.middleware',
    to: '@triplecheck/core/validation',
    description: 'Validation middleware imports'
  },

  // Error Handling Migrations
  {
    from: 'server/middleware/error',
    to: '@triplecheck/core/error-handling',
    description: 'Error middleware imports'
  },
  {
    from: 'src/shared/error-handling',
    to: '@triplecheck/core/error-handling',
    description: 'Shared error handling imports'
  }
];

async function runMigration() {
  console.log('🚀 Starting simple migration...\n');

  let totalChanges = 0;
  let modifiedFiles = 0;

  for (const rule of migrationRules) {
    console.log(`📝 Processing: ${rule.description}`);
    
    try {
      // Use grep to find files with the old import
      const grepCommand = `grep -r "from.*${rule.from.replace(/\//g, '\\/')}" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules`;
      
      try {
        const result = execSync(grepCommand, { 
          encoding: 'utf8',
          cwd: process.cwd()
        });
        
        if (result.trim()) {
          const lines = result.trim().split('\n');
          console.log(`   Found ${lines.length} references`);
          
          // Process each file
          const files = new Set<string>();
          for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const filePath = line.substring(0, colonIndex);
              files.add(filePath);
            }
          }

          for (const filePath of files) {
            await updateFile(filePath, rule);
            modifiedFiles++;
            totalChanges++;
          }
        } else {
          console.log('   No references found');
        }
      } catch (error) {
        // grep returns non-zero exit code when no matches found
        console.log('   No references found');
      }
    } catch (error) {
      console.warn(`   Warning: ${error}`);
    }
    
    console.log('');
  }

  // Update package.json
  await updatePackageJson();

  console.log(`✅ Migration completed!`);
  console.log(`   Modified files: ${modifiedFiles}`);
  console.log(`   Total changes: ${totalChanges}`);
  
  // Validate migration
  await validateMigration();
}

async function updateFile(filePath: string, rule: MigrationRule) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Create regex patterns for different import styles
    const patterns = [
      new RegExp(`from\\s+['"].*?${rule.from.replace(/\//g, '\\/')}['"];?`, 'g'),
      new RegExp(`import\\s+.*?from\\s+['"].*?${rule.from.replace(/\//g, '\\/')}['"];?`, 'g')
    ];

    let modifiedContent = content;
    let hasChanges = false;

    for (const pattern of patterns) {
      if (pattern.test(modifiedContent)) {
        modifiedContent = modifiedContent.replace(pattern, (match) => {
          hasChanges = true;
          return match.replace(rule.from, rule.to);
        });
      }
    }

    if (hasChanges) {
      await fs.writeFile(filePath, modifiedContent, 'utf8');
      console.log(`   ✏️  Updated: ${filePath}`);
    }
  } catch (error) {
    console.warn(`   ⚠️  Failed to update ${filePath}: ${error}`);
  }
}

async function updatePackageJson() {
  const packageJsonPath = join(process.cwd(), 'package.json');
  
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    // Add core utilities dependency if not present
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    
    if (!packageJson.dependencies['@triplecheck/core']) {
      packageJson.dependencies['@triplecheck/core'] = 'workspace:*';
      
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      console.log('📦 Updated package.json with @triplecheck/core dependency');
    }
  } catch (error) {
    console.warn('⚠️  Could not update package.json:', error);
  }
}

async function validateMigration() {
  console.log('\n🔍 Validating migration...');
  
  const oldPatterns = [
    'server/cache/CacheService',
    'shared/services/CacheService',
    'infrastructure/cache/CacheService',
    'infrastructure/monitoring/logger'
  ];
  
  let foundOldImports = false;
  
  for (const pattern of oldPatterns) {
    try {
      const result = execSync(`grep -r "from.*${pattern}" . --include="*.ts" --exclude-dir=node_modules`, {
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      if (result.trim()) {
        console.log(`❌ Found remaining old imports: ${pattern}`);
        foundOldImports = true;
      }
    } catch (error) {
      // No matches found, which is good
    }
  }
  
  if (!foundOldImports) {
    console.log('✅ No old imports found - migration appears successful!');
  }
  
  // Check for new imports
  try {
    const result = execSync('grep -r "@triplecheck/core" . --include="*.ts" --exclude-dir=node_modules', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    if (result.trim()) {
      const lines = result.trim().split('\n');
      console.log(`✅ Found ${lines.length} new core utility imports`);
    }
  } catch (error) {
    console.log('⚠️  No new core utility imports found');
  }
}

// Run migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration };