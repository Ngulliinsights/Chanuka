#!/usr/bin/env tsx

/**
 * Sprawl Consolidation Script
 * 
 * This script consolidates utility, middleware, and error handling sprawl
 * by migrating everything to the unified shared/core system.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

interface MigrationRule {
  from: string;
  to: string;
  pattern: RegExp;
  replacement: string;
}

const migrationRules: MigrationRule[] = [
  // Server utils to shared core
  {
    from: "server/utils/logger",
    to: "@shared/core/observability/logging",
    pattern: /import\s*\{\s*logger\s*\}\s*from\s*['"]\.\.\/\.\.\/utils\/logger['"];?/g,
    replacement: "import { logger } from '@shared/core/observability/logging';"
  },
  {
    from: "server/utils/api-response",
    to: "@shared/core/utils/api-utils",
    pattern: /import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/\.\.\/utils\/api-response['"];?/g,
    replacement: "import {$1} from '@shared/core/utils/api'-utils';"
  },
  {
    from: "server/utils/cache",
    to: "@shared/core/caching",
    pattern: /import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/\.\.\/utils\/cache['"];?/g,
    replacement: "import {$1} from '@shared/core/caching';"
  },
  {
    from: "server/utils/validation",
    to: "@shared/core/validation",
    pattern: /import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/\.\.\/utils\/validation['"];?/g,
    replacement: "import {$1} from '@shared/core/validation';"
  },
  // Error handling consolidation
  {
    from: "server/core/errors",
    to: "@shared/core/observability/error-management",
    pattern: /import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/\.\.\/core\/errors\/error-tracker['"];?/g,
    replacement: "import {$1} from '@shared/core/observability/error-management';"
  },
  // Middleware consolidation
  {
    from: "server/middleware",
    to: "@shared/core/middleware",
    pattern: /import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/\.\.\/middleware\/([^'"]+)['"];?/g,
    replacement: "import {$1} from '@shared/core/middleware/$2';"
  }
];

async function findTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...await findTsFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Skipping directory ${dir}: ${error}`);
  }
  
  return files;
}

async function migrateFile(filePath: string): Promise<boolean> {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;
    
    for (const rule of migrationRules) {
      const newContent = content.replace(rule.pattern, rule.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
        console.log(`  ✓ Updated imports from ${rule.from} to ${rule.to}`);
      }
    }
    
    if (modified) {
      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error migrating ${filePath}:`, error);
    return false;
  }
}

async function consolidateSprawl() {
  console.log('🚀 Starting sprawl consolidation...\n');
  
  // Find all TypeScript files in server directory
  const serverFiles = await findTsFiles(join(rootDir, 'server'));
  console.log(`Found ${serverFiles.length} TypeScript files in server directory\n`);
  
  let migratedFiles = 0;
  
  for (const file of serverFiles) {
    const relativePath = file.replace(rootDir, '').replace(/\\/g, '/');
    
    // Skip files that are already in the correct location
    if (relativePath.includes('/shared/core/')) {
      continue;
    }
    
    const wasMigrated = await migrateFile(file);
    if (wasMigrated) {
      console.log(`📝 Migrated: ${relativePath}`);
      migratedFiles++;
    }
  }
  
  console.log(`\n✅ Consolidation complete! Migrated ${migratedFiles} files.`);
  
  // Create cleanup script for removing empty directories
  await createCleanupScript();
}

async function createCleanupScript() {
  const cleanupScript = `#!/usr/bin/env tsx

/**
 * Cleanup Script - Remove empty utility directories after consolidation
 */

import { promises as fs } from 'fs';
import { join } from 'path';

const directoriesToCheck = [
  'server/utils',
  'server/core/errors',
  'shared/core/src/errors',
  'shared/core/src/error-handling'
];

async function isDirectoryEmpty(dir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dir);
    return entries.length === 0;
  } catch {
    return true; // Directory doesn't exist
  }
}

async function cleanup() {
  console.log('🧹 Starting cleanup of empty directories...');
  
  for (const dir of directoriesToCheck) {
    try {
      if (await isDirectoryEmpty(dir)) {
        await fs.rmdir(dir);
        console.log(\`✓ Removed empty directory: \${dir}\`);
      } else {
        console.log(\`⚠ Directory not empty, skipping: \${dir}\`);
      }
    } catch (error) {
      console.log(\`ℹ Directory doesn't exist or couldn't be removed: \${dir}\`);
    }
  }
  
  console.log('✅ Cleanup complete!');
}

cleanup().catch(console.error);
`;

  await fs.writeFile(join(rootDir, 'scripts/cleanup-empty-dirs.ts'), cleanupScript);
  console.log('\n📄 Created cleanup script: scripts/cleanup-empty-dirs.ts');
}

// Run the consolidation
consolidateSprawl().catch(console.error);
