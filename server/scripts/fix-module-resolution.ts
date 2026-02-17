/**
 * Module Resolution Fix Script
 * Automatically fixes common module resolution errors
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FixResult {
  file: string;
  originalImport: string;
  fixedImport: string;
  reason: string;
}

const fixes: FixResult[] = [];
const manualReview: { file: string; import: string; reason: string }[] = [];

/**
 * Remove file extensions from imports
 */
function removeFileExtensions(content: string, filePath: string): string {
  let modified = content;
  let changed = false;
  
  // Pattern: import ... from '....(\.ts|\.js|\.tsx|\.jsx)'
  const importPattern = /(import\s+(?:[\w{},\s*]+\s+from\s+)?['"])([^'"]+\.(ts|js|tsx|jsx))(['"])/g;
  
  modified = modified.replace(importPattern, (match, prefix, importPath, ext, suffix) => {
    // Don't modify .json or .css imports
    if (importPath.endsWith('.json') || importPath.endsWith('.css')) {
      return match;
    }
    
    const fixedPath = importPath.replace(/\.(ts|js|tsx|jsx)$/, '');
    fixes.push({
      file: filePath,
      originalImport: importPath,
      fixedImport: fixedPath,
      reason: 'Removed file extension'
    });
    changed = true;
    return `${prefix}${fixedPath}${suffix}`;
  });
  
  return changed ? modified : content;
}

/**
 * Fix legacy @chanuka/* imports to @server/* or @shared/*
 */
function fixLegacyAliases(content: string, filePath: string): string {
  let modified = content;
  
  // @chanuka/shared/* -> @shared/*
  modified = modified.replace(
    /(import\s+(?:[\w{},\s*]+\s+from\s+)?['"])@chanuka\/shared\/([^'"]+)(['"])/g,
    (match, prefix, rest, suffix) => {
      fixes.push({
        file: filePath,
        originalImport: `@chanuka/shared/${rest}`,
        fixedImport: `@shared/${rest}`,
        reason: 'Fixed legacy @chanuka alias'
      });
      return `${prefix}@shared/${rest}${suffix}`;
    }
  );
  
  // @/* -> @server/* (for server files)
  if (filePath.includes('/server/')) {
    modified = modified.replace(
      /(import\s+(?:[\w{},\s*]+\s+from\s+)?['"])@\/([^'"]+)(['"])/g,
      (match, prefix, rest, suffix) => {
        // Skip if it's already @shared
        if (rest.startsWith('shared')) {
          const newPath = `@shared/${rest.substring(7)}`;
          fixes.push({
            file: filePath,
            originalImport: `@/${rest}`,
            fixedImport: newPath,
            reason: 'Fixed legacy @/ alias to @shared'
          });
          return `${prefix}${newPath}${suffix}`;
        }
        
        fixes.push({
          file: filePath,
          originalImport: `@/${rest}`,
          fixedImport: `@server/${rest}`,
          reason: 'Fixed legacy @/ alias to @server'
        });
        return `${prefix}@server/${rest}${suffix}`;
      }
    );
  }
  
  return modified;
}

/**
 * Fix common incorrect relative paths
 */
function fixCommonRelativePaths(content: string, filePath: string): string {
  let modified = content;
  
  // Remove obviously wrong imports
  const badImports = [
    '../../4-personas-implementation-guide',
    '../../../query-executor',
    '../../boom-error-middleware',
    '../../../shared/core/src/index.js',
    '../../api-response-fixer',
    '../../batching-service',
    '../../common-utils',
    '../../deploy-websocket-migration',
    '../../final-migration-validation',
    '../../legacy-websocket-cleanup',
    '../../missing-modules-fallback',
    '../../redis-adapter',
    '../error-adapter-v2',
    '../retry-utils'
  ];
  
  for (const badImport of badImports) {
    const pattern = new RegExp(
      `(import\\s+(?:[\\w{},\\s*]+\\s+from\\s+)?['"])${badImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`,
      'g'
    );
    
    if (pattern.test(modified)) {
      manualReview.push({
        file: filePath,
        import: badImport,
        reason: 'Legacy/non-existent import - needs manual review'
      });
    }
  }
  
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
    modified = removeFileExtensions(modified, filePath);
    modified = fixLegacyAliases(modified, filePath);
    modified = fixCommonRelativePaths(modified, filePath);
    
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
      // Skip node_modules, dist, .git
      if (!['node_modules', 'dist', '.git', '.nx'].includes(entry.name)) {
        findTypeScriptFiles(fullPath, files);
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      // Skip test files and declaration files
      if (!/\.(test|spec|d)\.tsx?$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Generate fix report
 */
function generateReport(): string {
  const lines: string[] = [];
  
  lines.push('# Module Resolution Fix Report');
  lines.push('');
  lines.push(`**Date:** ${new Date().toISOString()}`);
  lines.push(`**Total Fixes Applied:** ${fixes.length}`);
  lines.push(`**Files Requiring Manual Review:** ${manualReview.length}`);
  lines.push('');
  
  if (fixes.length > 0) {
    lines.push('## Automatic Fixes Applied');
    lines.push('');
    
    // Group by reason
    const byReason = new Map<string, FixResult[]>();
    for (const fix of fixes) {
      if (!byReason.has(fix.reason)) {
        byReason.set(fix.reason, []);
      }
      byReason.get(fix.reason)!.push(fix);
    }
    
    for (const [reason, fixList] of byReason.entries()) {
      lines.push(`### ${reason} (${fixList.length} fixes)`);
      lines.push('');
      
      // Show first 10 examples
      const examples = fixList.slice(0, 10);
      for (const fix of examples) {
        lines.push(`- **${path.relative(process.cwd(), fix.file)}**`);
        lines.push(`  - From: \`${fix.originalImport}\``);
        lines.push(`  - To: \`${fix.fixedImport}\``);
      }
      
      if (fixList.length > 10) {
        lines.push(`  - ... and ${fixList.length - 10} more`);
      }
      lines.push('');
    }
  }
  
  if (manualReview.length > 0) {
    lines.push('## Files Requiring Manual Review');
    lines.push('');
    
    for (const item of manualReview) {
      lines.push(`- **${path.relative(process.cwd(), item.file)}**`);
      lines.push(`  - Import: \`${item.import}\``);
      lines.push(`  - Reason: ${item.reason}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
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
  console.log(`Files requiring manual review: ${manualReview.length}`);
  
  // Write report
  const report = generateReport();
  const reportPath = path.join(serverDir, 'module-resolution-fix-report.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\nReport written to: ${reportPath}`);
}

main();
