/**
 * Dependency Verification Script
 * 
 * This script verifies that the type system follows the correct dependency hierarchy
 * and has no circular dependencies.
 * 
 * Usage: npx tsx shared/types/verify-dependencies.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the allowed dependency hierarchy
const LAYER_HIERARCHY: Record<string, string[]> = {
  core: [], // Core can't import from any other layer
  domains: ['core'], // Domains can only import from core
  api: ['core', 'domains'], // API can import from core and domains
  database: ['core', 'domains'], // Database can import from core and domains
  validation: ['core', 'domains', 'api'], // Validation can import from core, domains, and api
};

// Define layer directories
const LAYER_DIRS = ['core', 'domains', 'api', 'database', 'validation'];

interface ImportInfo {
  file: string;
  layer: string;
  imports: string[];
  violations: string[];
}

/**
 * Get the layer name from a file path
 */
function getLayer(filePath: string): string | null {
  for (const layer of LAYER_DIRS) {
    if (filePath.includes(`/types/${layer}/`)) {
      return layer;
    }
  }
  return null;
}

/**
 * Extract import statements from a TypeScript file
 */
function extractImports(content: string): string[] {
  const importRegex = /import\s+(?:type\s+)?(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Resolve relative import to layer
 */
function resolveImportToLayer(importPath: string, currentFile: string): string | null {
  // Skip external imports
  if (!importPath.startsWith('.') && !importPath.startsWith('@shared')) {
    return null;
  }

  // Handle @shared/types imports
  if (importPath.startsWith('@shared/types')) {
    const parts = importPath.split('/');
    if (parts.length >= 3) {
      const layer = parts[2];
      if (LAYER_DIRS.includes(layer)) {
        return layer;
      }
    }
    return null;
  }

  // Handle relative imports
  const currentDir = path.dirname(currentFile);
  const resolvedPath = path.resolve(currentDir, importPath);

  // Extract layer from resolved path
  for (const layer of LAYER_DIRS) {
    if (resolvedPath.includes(`/types/${layer}/`)) {
      return layer;
    }
  }

  return null;
}

/**
 * Check if an import violates the dependency hierarchy
 */
function isViolation(fromLayer: string, toLayer: string): boolean {
  const allowedDeps = LAYER_HIERARCHY[fromLayer] || [];
  return !allowedDeps.includes(toLayer) && fromLayer !== toLayer;
}

/**
 * Scan a directory recursively for TypeScript files
 */
function scanDirectory(dir: string): string[] {
  const files: string[] = [];

  function scan(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and dist
        if (entry.name !== 'node_modules' && entry.name !== 'dist') {
          scan(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

/**
 * Analyze a single file for dependency violations
 */
function analyzeFile(filePath: string): ImportInfo | null {
  const layer = getLayer(filePath);
  if (!layer) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = extractImports(content);
  const violations: string[] = [];

  for (const importPath of imports) {
    const importedLayer = resolveImportToLayer(importPath, filePath);
    if (importedLayer && isViolation(layer, importedLayer)) {
      violations.push(`${layer} → ${importedLayer} (import: ${importPath})`);
    }
  }

  return {
    file: filePath,
    layer,
    imports,
    violations,
  };
}

/**
 * Main verification function
 */
function verifyDependencies() {
  console.log('🔍 Verifying type system dependencies...\n');

  const typesDir = path.join(__dirname);
  const files = scanDirectory(typesDir);

  console.log(`📁 Found ${files.length} TypeScript files\n`);

  const results: ImportInfo[] = [];
  let totalViolations = 0;

  for (const file of files) {
    const result = analyzeFile(file);
    if (result) {
      results.push(result);
      totalViolations += result.violations.length;
    }
  }

  // Print results
  console.log('📊 Analysis Results:\n');
  console.log('Layer Hierarchy:');
  for (const [layer, deps] of Object.entries(LAYER_HIERARCHY)) {
    const depsStr = deps.length > 0 ? deps.join(', ') : '(none)';
    console.log(`  ${layer} → ${depsStr}`);
  }
  console.log();

  if (totalViolations === 0) {
    console.log('✅ No dependency violations found!');
    console.log('✅ All imports follow the correct layer hierarchy.');
    return true;
  } else {
    console.log(`❌ Found ${totalViolations} dependency violations:\n`);

    for (const result of results) {
      if (result.violations.length > 0) {
        console.log(`File: ${path.relative(typesDir, result.file)}`);
        console.log(`Layer: ${result.layer}`);
        console.log('Violations:');
        for (const violation of result.violations) {
          console.log(`  ❌ ${violation}`);
        }
        console.log();
      }
    }

    return false;
  }
}

/**
 * Generate a dependency graph
 */
function generateDependencyGraph() {
  console.log('\n📈 Dependency Graph:\n');
  console.log('```');
  console.log('Core Types (base, branded, enums)');
  console.log('     ↓');
  console.log('Domain Types (user, bill, comment)');
  console.log('     ↓');
  console.log('API Types (requests, responses)');
  console.log('     ↓');
  console.log('Database Types (tables)');
  console.log('     ↓');
  console.log('Validation Types (schemas)');
  console.log('```');
  console.log();
}

// Run verification
const success = verifyDependencies();
generateDependencyGraph();

if (!success) {
  console.log('💡 Tips to fix violations:');
  console.log('  1. Move shared types to a lower layer (e.g., from API to domains)');
  console.log('  2. Use type-only imports: import type { ... }');
  console.log('  3. Refactor to remove the dependency');
  console.log('  4. Check if the import is necessary');
  console.log();
  process.exit(1);
}

process.exit(0);
