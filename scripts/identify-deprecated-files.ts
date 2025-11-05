#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface DeprecatedFile {
  path: string;
  reason: string;
  details?: string;
}

interface Report {
  deprecatedByName: DeprecatedFile[];
  duplicates: { [key: string]: string[] };
  contentDuplicates: { [key: string]: string[] };
  unreferenced: string[];
  deprecationComments: DeprecatedFile[];
  redundantImplementations: DeprecatedFile[];
}

const DEPRECATED_KEYWORDS = ['legacy', 'deprecated', 'old', 'backup'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const DEPRECATION_PATTERNS = [
  /\/\/.*deprecated/i,
  /\/\*\*.*@deprecated/i,
  /\/\*.*deprecated.*\*\//i,
  /console\.warn.*deprecated/i,
];

function isSourceFile(filePath: string): boolean {
  return SOURCE_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

function hasDeprecatedName(filePath: string): boolean {
  const fileName = path.basename(filePath).toLowerCase();
  return DEPRECATED_KEYWORDS.some(keyword => fileName.includes(keyword));
}

function hasDeprecationComment(content: string): boolean {
  return DEPRECATION_PATTERNS.some(pattern => pattern.test(content));
}

function getFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function findImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1]) imports.push(match[1]);
  }
  // Also check require statements
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    if (match[1]) imports.push(match[1]);
  }
  return imports;
}

function resolveImport(importPath: string, fromDir: string): string | null {
  // Simple resolution: assume relative paths
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const resolved = path.resolve(fromDir, importPath);
    // Try different extensions
    for (const ext of SOURCE_EXTENSIONS) {
      const candidate = resolved + ext;
      if (fs.existsSync(candidate)) return candidate;
      const indexCandidate = path.join(resolved, 'index' + ext);
      if (fs.existsSync(indexCandidate)) return indexCandidate;
    }
  }
  return null;
}

function walkDirectory(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...walkDirectory(fullPath));
    } else if (stat.isFile() && isSourceFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  console.log('Starting deprecated file analysis...');
  const rootDir = process.cwd();
  console.log(`Root directory: ${rootDir}`);
  const allFiles = walkDirectory(rootDir);
  console.log(`Found ${allFiles.length} files to analyze`);

  const report: Report = {
    deprecatedByName: [],
    duplicates: {},
    contentDuplicates: {},
    unreferenced: [],
    deprecationComments: [],
    redundantImplementations: [],
  };

  // Maps for tracking
  const fileNames: { [name: string]: string[] } = {};
  const fileHashes: { [hash: string]: string[] } = {};
  const referencedFiles = new Set<string>();
  const allSourceFiles = new Set<string>();

  console.log('Analyzing files...');
  for (const file of allFiles) {
    const relativePath = path.relative(rootDir, file);
    allSourceFiles.add(relativePath);

    // Check deprecated name
    if (hasDeprecatedName(file)) {
      report.deprecatedByName.push({
        path: relativePath,
        reason: 'File name contains deprecated keywords',
      });
    }

    // Read content
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch (e) {
      continue; // Skip binary files or errors
    }

    // Check deprecation comments
    if (hasDeprecationComment(content)) {
      report.deprecationComments.push({
        path: relativePath,
        reason: 'Contains deprecation comments or warnings',
      });
    }

    // Track duplicates by name
    const fileName = path.basename(file);
    if (!fileNames[fileName]) fileNames[fileName] = [];
    fileNames[fileName]!.push(relativePath);

    // Track duplicates by content
    const hash = getFileHash(file);
    if (!fileHashes[hash]) fileHashes[hash] = [];
    fileHashes[hash]!.push(relativePath);

    // Find imports
    const imports = findImports(content);
    const dir = path.dirname(file);
    for (const imp of imports) {
      const resolved = resolveImport(imp, dir);
      if (resolved) {
        referencedFiles.add(path.relative(rootDir, resolved));
      }
    }
  }

  // Process duplicates by name (only if in different directories)
  for (const [name, paths] of Object.entries(fileNames)) {
    if (paths.length > 1) {
      const dirs = paths.map(p => path.dirname(p));
      const uniqueDirs = [...new Set(dirs)];
      if (uniqueDirs.length > 1) {
        report.duplicates[name] = paths;
      }
    }
  }

  // Process content duplicates
  for (const [hash, paths] of Object.entries(fileHashes)) {
    if (paths.length > 1) {
      report.contentDuplicates[hash] = paths;
    }
  }

  // Find unreferenced files
  for (const file of allSourceFiles) {
    if (!referencedFiles.has(file)) {
      report.unreferenced.push(file);
    }
  }

  // For redundant implementations, this is a placeholder - would need more complex analysis
  // For now, skip or add a note

  // Output report
  console.log('Analysis complete. Report:');
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}