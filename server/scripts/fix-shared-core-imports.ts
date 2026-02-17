/**
 * Fix @shared/core imports that have been moved to server layer
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Fix {
  file: string;
  from: string;
  to: string;
}

const fixes: Fix[] = [];

/**
 * Fix logger imports from @shared/core to @server/infrastructure/observability
 */
function fixLoggerImports(content: string, filePath: string): string {
  let modified = content;
  
  // Pattern 1: import { logger } from '@server/infrastructure/observability'
  const pattern1 = /import\s*{\s*([^}]*\blogger\b[^}]*)\s*}\s*from\s*['"]@shared\/core['"]/g;
  modified = modified.replace(pattern1, (match, imports) => {
    // Extract other imports
    const importList = imports.split(',').map((i: string) => i.trim()).filter((i: string) => i);
    const loggerIndex = importList.findIndex((i: string) => i === 'logger');
    
    if (loggerIndex !== -1) {
      importList.splice(loggerIndex, 1);
      fixes.push({
        file: filePath,
        from: '@shared/core (logger)',
        to: '@server/infrastructure/observability'
      });
      
      // If there are other imports, keep them
      if (importList.length > 0) {
        return `import { ${importList.join(', ')} } from '@shared/core';\nimport { logger } from '@server/infrastructure/observability'`;
      } else {
        return `import { logger } from '@server/infrastructure/observability'`;
      }
    }
    
    return match;
  });
  
  // Pattern 2: import { logger as something } from '@server/infrastructure/observability'
  modified = modified.replace(
    /import\s*{\s*logger\s+as\s+(\w+)\s*}\s*from\s*['"]@shared\/core['"]/g,
    (match, alias) => {
      fixes.push({
        file: filePath,
        from: `@shared/core (logger as ${alias})`,
        to: '@server/infrastructure/observability'
      });
      return `import { logger as ${alias} } from '@server/infrastructure/observability'`;
    }
  );
  
  return modified;
}

/**
 * Fix database imports from @shared/core to @server/infrastructure/database
 */
function fixDatabaseImports(content: string, filePath: string): string {
  let modified = content;
  
  // Pattern: import { pool as db } from '@server/infrastructure/database/pool'
  const pattern = /import\s*{\s*([^}]*\b(?:db|database)\b[^}]*)\s*}\s*from\s*['"]@shared\/core['"]/g;
  modified = modified.replace(pattern, (match, imports) => {
    const importList = imports.split(',').map((i: string) => i.trim()).filter((i: string) => i);
    const dbImports = importList.filter((i: string) => i === 'db' || i === 'database');
    const otherImports = importList.filter((i: string) => i !== 'db' && i !== 'database');
    
    if (dbImports.length > 0) {
      fixes.push({
        file: filePath,
        from: `@shared/core (${dbImports.join(', ')})`,
        to: '@server/infrastructure/database/pool'
      });
      
      let result = `import { pool as db } from '@server/infrastructure/database/pool'`;
      if (otherImports.length > 0) {
        result = `import { ${otherImports.join(', ')} } from '@shared/core';\n${result}`;
      }
      return result;
    }
    
    return match;
  });
  
  return modified;
}

/**
 * Fix cache imports from @shared/core to @server/infrastructure/cache
 */
function fixCacheImports(content: string, filePath: string): string {
  let modified = content;
  
  // Pattern: import { cache, cacheKeys } from '@server/infrastructure/cache'
  const pattern = /import\s*{\s*([^}]*\b(?:cache|cacheKeys)\b[^}]*)\s*}\s*from\s*['"]@shared\/core['"]/g;
  modified = modified.replace(pattern, (match, imports) => {
    const importList = imports.split(',').map((i: string) => i.trim()).filter((i: string) => i);
    const cacheImports = importList.filter((i: string) => i.includes('cache'));
    const otherImports = importList.filter((i: string) => !i.includes('cache'));
    
    if (cacheImports.length > 0) {
      fixes.push({
        file: filePath,
        from: `@shared/core (${cacheImports.join(', ')})`,
        to: '@server/infrastructure/cache'
      });
      
      let result = `import { ${cacheImports.join(', ')} } from '@server/infrastructure/cache'`;
      if (otherImports.length > 0) {
        result = `import { ${otherImports.join(', ')} } from '@shared/core';\n${result}`;
      }
      return result;
    }
    
    return match;
  });
  
  return modified;
}

/**
 * Process a single file
 */
function processFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let modified = content;
    
    // Apply fixes
    modified = fixLoggerImports(modified, filePath);
    modified = fixDatabaseImports(modified, filePath);
    modified = fixCacheImports(modified, filePath);
    
    // Write back if changed
    if (modified !== content) {
      fs.writeFileSync(filePath, modified, 'utf-8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

/**
 * Recursively find all TypeScript files
 */
function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git', '.nx'].includes(entry.name)) {
        findTypeScriptFiles(fullPath, files);
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      if (!/\.(test|spec|d)\.tsx?$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Main execution
 */
function main() {
  const serverDir = path.join(__dirname, '..');
  console.log(`Scanning ${serverDir} for TypeScript files...`);
  
  const files = findTypeScriptFiles(serverDir);
  console.log(`Found ${files.length} TypeScript files`);
  
  let filesModified = 0;
  for (const file of files) {
    if (processFile(file)) {
      filesModified++;
    }
  }
  
  console.log(`\nProcessing complete!`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`Total fixes applied: ${fixes.length}`);
  
  // Group fixes by type
  const byType = new Map<string, Fix[]>();
  for (const fix of fixes) {
    const key = `${fix.from} -> ${fix.to}`;
    if (!byType.has(key)) {
      byType.set(key, []);
    }
    byType.get(key)!.push(fix);
  }
  
  console.log(`\nFix Summary:`);
  for (const [type, fixList] of byType.entries()) {
    console.log(`  ${type}: ${fixList.length} fixes`);
  }
}

main();
