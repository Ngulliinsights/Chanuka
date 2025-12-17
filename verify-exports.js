#!/usr/bin/env node

/**
 * Accurate Export Verification Tool
 * 
 * This script validates imports against actual exports with support for:
 * - Re-exports (export { X } from 'module')
 * - Export aliases (export { X as Y })
 * - Type-only exports
 * - Index file re-exports
 * 
 * Unlike the shell-based validator, this correctly handles modern TypeScript patterns
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '.next',
  '__pycache__',
];

// Cache for resolved exports
const exportCache = new Map();
const importCache = new Map();

/**
 * Get all files matching extensions
 */
function getSourceFiles(dir = '.', excludePattern = EXCLUDE_PATTERNS) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip excluded patterns
    if (excludePattern.some(pattern => fullPath.includes(pattern))) {
      continue;
    }

    if (entry.isDirectory()) {
      files = files.concat(getSourceFiles(fullPath, excludePattern));
    } else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parse JavaScript/TypeScript for export statements
 */
function parseExports(filePath) {
  // Skip if not a file
  if (!fs.statSync(filePath).isFile()) {
    return { named: new Set(), default: null, reExports: [] };
  }

  if (exportCache.has(filePath)) {
    return exportCache.get(filePath);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const exports = {
    named: new Set(),
    default: null,
    reExports: [], // Track re-exports for resolution
  };

  // Match various export patterns
  const patterns = [
    // Named exports: export const/function/interface/type Name
    /export\s+(?:const|function|interface|type|class|abstract|enum)\s+(\w+)/g,
    // Named re-exports: export { Name }
    /export\s*\{([^}]+)\}/g,
    // Default export
    /export\s+default\s+(?:const|function|interface|type|class)?\s*(\w+)?/,
    // Type-only exports
    /export\s+type\s+(\w+)/g,
  ];

  // Collect named exports
  const namedExportPattern = /export\s+(?:const|function|interface|type|class|abstract|enum|async\s+function)\s+(\w+)/g;
  let match;
  while ((match = namedExportPattern.exec(content))) {
    exports.named.add(match[1]);
  }

  // Check for export { ... } patterns
  const braceExportPattern = /export\s*\{([^}]+)\}/g;
  while ((match = braceExportPattern.exec(content))) {
    const items = match[1].split(',').map(item => {
      // Handle "import X from 'y'" within export block
      const parts = item.trim().split(/\s+as\s+/);
      return parts[parts.length - 1].trim();
    });
    items.forEach(item => {
      if (item) exports.named.add(item);
    });
  }

  // Check for default export
  const defaultMatch = content.match(/export\s+default\s+(\w+)/);
  if (defaultMatch) {
    exports.default = defaultMatch[1];
  }

  // Track re-exports from other modules
  const reExportPattern = /export\s+\{([^}]+)\}\s+from\s+['"`]([^'"`]+)['"`]/g;
  while ((match = reExportPattern.exec(content))) {
    exports.reExports.push({
      items: match[1],
      from: match[2],
    });
  }

  // Track individual re-exports
  const individualReExportPattern = /export\s+\{\s*(\w+)(?:\s+as\s+\w+)?\s*\}\s+from\s+['"`]([^'"`]+)['"`]/g;
  while ((match = individualReExportPattern.exec(content))) {
    exports.reExports.push({
      items: match[1],
      from: match[2],
    });
  }

  exportCache.set(filePath, exports);
  return exports;
}

/**
 * Parse imports from a file
 */
function parseImports(filePath) {
  if (importCache.has(filePath)) {
    return importCache.get(filePath);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];

  // Match import statements
  const importPattern = /import\s+(?:type\s+)?(?:\{([^}]+)\}|(?:(\w+)\s*(?:,\s*\{([^}]+)\})?)?|(?:\*\s+as\s+(\w+)))\s+from\s+['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = importPattern.exec(content))) {
    const [, named, defaultImport, namedWithDefault, namespace, source] = match;
    
    const importedNames = [];
    
    if (named) {
      importedNames.push(...named.split(',').map(n => {
        const [imported] = n.split(/\s+as\s+/).map(x => x.trim());
        return imported;
      }));
    }
    
    if (defaultImport) {
      importedNames.push(defaultImport);
    }
    
    if (namedWithDefault) {
      importedNames.push(...namedWithDefault.split(',').map(n => {
        const [imported] = n.split(/\s+as\s+/).map(x => x.trim());
        return imported;
      }));
    }
    
    if (namespace) {
      importedNames.push(namespace); // Namespace import
    }

    imports.push({
      source,
      names: importedNames,
      isTypeOnly: content.substring(match.index - 50, match.index).includes('import type'),
    });
  }

  importCache.set(filePath, imports);
  return imports;
}

/**
 * Resolve import path to actual file
 */
function resolveImportPath(fromFile, importSource) {
  const fromDir = path.dirname(fromFile);
  
  // Handle absolute paths
  if (importSource.startsWith('@client/')) {
    const resolved = path.join(process.cwd(), 'client/src', importSource.replace('@client/', ''));
    return findSourceFile(resolved);
  }
  
  if (importSource.startsWith('@server/')) {
    const resolved = path.join(process.cwd(), 'server/src', importSource.replace('@server/', ''));
    return findSourceFile(resolved);
  }
  
  if (importSource.startsWith('@shared/')) {
    const resolved = path.join(process.cwd(), 'shared/src', importSource.replace('@shared/', ''));
    return findSourceFile(resolved);
  }

  // Handle relative paths
  const resolved = path.resolve(fromDir, importSource);
  return findSourceFile(resolved);
}

/**
 * Find source file with various extensions
 */
function findSourceFile(basePath) {
  // Try exact file first
  if (fs.existsSync(basePath)) {
    return basePath;
  }

  // Try with extensions
  for (const ext of SOURCE_EXTENSIONS) {
    const pathWithExt = basePath + ext;
    if (fs.existsSync(pathWithExt)) {
      return pathWithExt;
    }
  }

  // Try index files
  if (fs.existsSync(basePath)) {
    const isDir = fs.statSync(basePath).isDirectory();
    if (isDir) {
      for (const ext of SOURCE_EXTENSIONS) {
        const indexPath = path.join(basePath, `index${ext}`);
        if (fs.existsSync(indexPath)) {
          return indexPath;
        }
      }
    }
  }

  return null;
}

/**
 * Check if an export exists in a file (with re-export resolution)
 */
function hasExport(filePath, exportName, visited = new Set()) {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  if (visited.has(filePath)) {
    return false; // Prevent infinite loops
  }
  visited.add(filePath);

  const exports = parseExports(filePath);

  // Check direct exports
  if (exports.named.has(exportName) || exports.default === exportName) {
    return true;
  }

  // Check re-exports
  for (const reExport of exports.reExports) {
    const names = reExport.items.split(',').map(n => {
      const [imported] = n.split(/\s+as\s+/).map(x => x.trim());
      return imported;
    });

    if (names.includes(exportName) || names.some(n => n.includes(exportName))) {
      const reExportPath = resolveImportPath(filePath, reExport.from);
      if (hasExport(reExportPath, exportName, visited)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate all imports in codebase
 */
function validateImports() {
  let files = [];
  
  // Get client files
  if (fs.existsSync('client/src')) {
    files = files.concat(getSourceFiles('client/src'));
  }
  
  // Get server files (no src subdirectory)
  if (fs.existsSync('server')) {
    files = files.concat(getSourceFiles('server'));
  }

  const errors = [];
  const validated = [];

  console.log(`\n📊 Validating ${files.length} files...\n`);

  for (const filePath of files) {
    const imports = parseImports(filePath);

    for (const importData of imports) {
      const targetPath = resolveImportPath(filePath, importData.source);

      for (const importName of importData.names) {
        // Skip namespace imports
        if (importName === '*') continue;

        const exported = hasExport(targetPath, importName);

        if (!exported) {
          errors.push({
            source: filePath,
            target: importData.source,
            targetPath,
            name: importName,
          });
        } else {
          validated.push({ source: filePath, target: importData.source, name: importName });
        }
      }
    }
  }

  return { errors, validated };
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Accurate Export Verification Tool\n');
  console.log('=' .repeat(60));

  const { errors, validated } = validateImports();

  console.log(`\n✅ Valid imports: ${validated.length}`);
  console.log(`❌ Invalid imports: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n⚠️  ACTUAL IMPORT/EXPORT MISMATCHES:\n');
    
    const grouped = {};
    for (const error of errors) {
      const key = `${error.source} -> ${error.target}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(error.name);
    }

    for (const [key, names] of Object.entries(grouped)) {
      console.log(`${key}`);
      console.log(`  Missing exports: ${names.join(', ')}`);
    }
  } else {
    console.log('\n🎉 All imports resolve correctly!');
  }

  console.log('\n' + '='.repeat(60));
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
