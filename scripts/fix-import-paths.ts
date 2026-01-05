#!/usr/bin/env tsx

/**
 * Import Path Standardization Script
 * Fixes inconsistent import paths across the codebase
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';

interface ImportFix {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const IMPORT_FIXES: ImportFix[] = [
  // Fix @shared imports to @shared
  {
    pattern: /from ['"]@chanuka\/shared(['"])/g,
    replacement: "from '@shared$1",
    description: 'Replace @shared with @shared'
  },
  {
    pattern: /from ['"]@chanuka\/shared\/([^'"]+)(['"])/g,
    replacement: "from '@shared/$1$2",
    description: 'Replace @shared/* with @shared/*'
  },
  {
    pattern: /import\s*\(\s*['"]@chanuka\/shared([^'"]*)['"]\s*\)/g,
    replacement: "import('@shared$1')",
    description: 'Replace dynamic @shared imports with @shared'
  },

  // Fix inconsistent @shared/core/src paths
  {
    pattern: /from ['"]@shared\/core\/src\/([^'"]+)(['"])/g,
    replacement: "from '@shared/core/$1$2",
    description: 'Simplify @shared/core/src/* to @shared/core/*'
  },
  {
    pattern: /import\s*\(\s*['"]@shared\/core\/src\/([^'"]+)['"]\s*\)/g,
    replacement: "import('@shared/core/$1')",
    description: 'Simplify dynamic @shared/core/src/* imports'
  },

  // Fix relative imports that should use aliases (from shared to other modules)
  {
    pattern: /from ['"]\.\.\/\.\.\/server\/([^'"]+)(['"])/g,
    replacement: "from '@server/$1$2",
    description: 'Replace ../../server/* with @server/*'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/client\/src\/([^'"]+)(['"])/g,
    replacement: "from '@client/$1$2",
    description: 'Replace ../../client/src/* with @client/*'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/shared\/([^'"]+)(['"])/g,
    replacement: "from '@shared/$1$2",
    description: 'Replace ../../shared/* with @shared/*'
  },

  // Fix relative imports within shared module
  {
    pattern: /from ['"]\.\.\/([^'"]+)(['"])/g,
    replacement: (match: string, path: string, quote: string, offset: number, fullString: string) => {
      // Only replace if we're in a shared module file and the path doesn't start with a dot
      if (fullString.includes('shared/') && !path.startsWith('.')) {
        return `from '@shared/${path}${quote}`;
      }
      return match;
    },
    description: 'Replace relative imports within shared module with @shared/*'
  },
];

function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, and other build directories
      if (!['node_modules', 'dist', 'build', 'coverage', '.git'].includes(entry)) {
        findTypeScriptFiles(fullPath, files);
      }
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      // Skip test files and declaration files
      if (!entry.includes('.test.') && !entry.includes('.spec.') && !entry.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function fixImportsInFile(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let modifiedContent = content;
    let hasChanges = false;

    for (const fix of IMPORT_FIXES) {
      const originalContent = modifiedContent;

      if (typeof fix.replacement === 'string') {
        modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
      } else {
        modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement as any);
      }

      if (modifiedContent !== originalContent) {
        hasChanges = true;
        console.log(`  ✓ ${fix.description}`);
      }
    }

    if (hasChanges) {
      writeFileSync(filePath, modifiedContent, 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

function main() {
  console.log('🔧 Standardizing import paths across the codebase...\n');

  const rootDir = process.cwd();
  const tsFiles = findTypeScriptFiles(rootDir);

  console.log(`Found ${tsFiles.length} TypeScript files to process\n`);

  let processedFiles = 0;
  let modifiedFiles = 0;

  for (const filePath of tsFiles) {
    const relativePath = relative(rootDir, filePath);

    console.log(`Processing: ${relativePath}`);

    const wasModified = fixImportsInFile(filePath);
    processedFiles++;

    if (wasModified) {
      modifiedFiles++;
      console.log(`  ✅ Modified\n`);
    } else {
      console.log(`  ⏭️  No changes needed\n`);
    }
  }

  console.log('📊 Summary:');
  console.log(`  • Files processed: ${processedFiles}`);
  console.log(`  • Files modified: ${modifiedFiles}`);
  console.log(`  • Files unchanged: ${processedFiles - modifiedFiles}`);

  if (modifiedFiles > 0) {
    console.log('\n✅ Import path standardization completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('  1. Run TypeScript compilation to check for any remaining issues');
    console.log('  2. Run tests to ensure functionality is preserved');
    console.log('  3. Run ESLint to check for any import-related warnings');
  } else {
    console.log('\n✅ All import paths are already standardized!');
  }
}

// Run the script
main();
