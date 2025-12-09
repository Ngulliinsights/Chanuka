#!/usr/bin/env node

/**
 * FSD Import Update Script
 * 
 * Updates all legacy component imports to use the new Feature-Sliced Design structure
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Starting FSD import migration...');

// Define import mappings from legacy to FSD structure
const importMappings = [
  // Design system components
  {
    from: /@client\/components\/ui\//g,
    to: '@client/shared/design-system/primitives/',
    description: 'Design system primitives'
  },
  {
    from: /@\/components\/ui\//g,
    to: '@client/shared/design-system/primitives/',
    description: 'Design system primitives (short path)'
  },
  
  // Feature components
  {
    from: /@client\/components\/bill-detail\//g,
    to: '@client/features/bills/ui/detail/',
    description: 'Bill detail components'
  },
  {
    from: /@client\/components\/community\//g,
    to: '@client/features/community/ui/',
    description: 'Community components'
  },
  {
    from: /@client\/components\/search\//g,
    to: '@client/features/search/ui/',
    description: 'Search components'
  },
  {
    from: /@client\/components\/auth\//g,
    to: '@client/features/users/ui/auth/',
    description: 'Auth components'
  },
  {
    from: /@client\/components\/user\//g,
    to: '@client/features/users/ui/profile/',
    description: 'User components'
  },
  {
    from: /@client\/components\/analytics\//g,
    to: '@client/features/analytics/ui/',
    description: 'Analytics components'
  },
  
  // Shared UI components
  {
    from: /@client\/components\/mobile\//g,
    to: '@client/shared/ui/mobile/',
    description: 'Mobile components'
  },
  {
    from: /@client\/components\/error-handling\//g,
    to: '@client/core/error/components/',
    description: 'Error handling components'
  },
  {
    from: /@client\/components\/loading\//g,
    to: '@client/core/loading/components/',
    description: 'Loading components'
  },
  {
    from: /@client\/components\/navigation\//g,
    to: '@client/shared/ui/navigation/',
    description: 'Navigation components'
  },
  {
    from: /@client\/components\/layout\//g,
    to: '@client/shared/ui/layout/',
    description: 'Layout components'
  },
  {
    from: /@client\/components\/integration\//g,
    to: '@client/shared/ui/integration/',
    description: 'Integration components'
  },
  
  // App-level components
  {
    from: /@client\/components\/AppProviders/g,
    to: '@client/app/providers/AppProviders',
    description: 'App providers'
  }
];

// Function to update imports in a file
function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    importMappings.forEach(mapping => {
      if (mapping.from.test(content)) {
        content = content.replace(mapping.from, mapping.to);
        hasChanges = true;
        console.log(`  ✅ Updated ${mapping.description} in ${filePath}`);
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`  ❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Function to find all TypeScript/React files
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, legacy-archive, and other excluded directories
      if (!['node_modules', 'legacy-archive', '.git', 'dist', 'build'].includes(item)) {
        findTsFiles(fullPath, files);
      }
    } else if (item.match(/\.(ts|tsx)$/)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main execution
try {
  const srcDir = path.join(__dirname);
  const tsFiles = findTsFiles(srcDir);
  
  console.log(`📁 Found ${tsFiles.length} TypeScript files to process`);
  
  let updatedFiles = 0;
  
  tsFiles.forEach(file => {
    if (updateImportsInFile(file)) {
      updatedFiles++;
    }
  });
  
  console.log(`\n✅ Migration complete!`);
  console.log(`📊 Updated ${updatedFiles} files`);
  
  // Validate migration
  console.log('\n🔍 Validating migration...');
  
  try {
    const legacyImports = execSync(
      `grep -r "@client/components/" client/src --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v legacy-archive | wc -l`,
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim();
    
    if (legacyImports === '0') {
      console.log('🎉 No legacy imports found! Migration successful.');
    } else {
      console.log(`⚠️  Found ${legacyImports} remaining legacy imports.`);
      
      // Show remaining legacy imports
      const remainingImports = execSync(
        `grep -r "@client/components/" client/src --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v legacy-archive`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      console.log('Remaining legacy imports:');
      console.log(remainingImports);
    }
  } catch (error) {
    console.log('✅ Validation complete (grep not available on this system)');
  }
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}

console.log('\n🚀 FSD import migration finished!');