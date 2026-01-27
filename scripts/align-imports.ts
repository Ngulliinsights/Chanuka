#!/usr/bin/env npx tsx

/**
 * Import Alignment Script - Clean Version
 * 
 * Modernizes import statements by converting relative imports to path-mapped
 * shortcuts throughout your codebase.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ImportTransform {
  from: RegExp;
  to: (match: string, ...groups: string[]) => string;
  description: string;
  applyTo: 'client' | 'server' | 'shared' | 'all';
  priority: number;
}

interface FileChange {
  file: string;
  changes: number;
  preview: string[];
}

interface AlignmentReport {
  timestamp: string;
  filesScanned: number;
  filesModified: number;
  totalChanges: number;
  changes: FileChange[];
  executionTime: number;
}

class ImportAligner {
  private projectRoot: string;
  private isDryRun: boolean;
  private transforms: ImportTransform[];
  private changes: FileChange[] = [];
  private startTime: number;

  constructor(isDryRun = false) {
    this.projectRoot = process.cwd();
    this.isDryRun = isDryRun;
    this.transforms = this.buildTransforms();
    this.startTime = Date.now();
  }

  private buildTransforms(): ImportTransform[] {
    return [
      // Fix incorrect nested src paths in shortcuts first
      {
        from: /from\s+['"]@shared\/core\/src\/([^'"]+)['"]/g,
        to: (_match, importPath) => `from '@shared/core/${importPath}'`,
        description: 'Remove redundant /src/ from @shared/core imports',
        applyTo: 'all',
        priority: 100
      },

      // Convert deep relative imports to shortcuts
      {
        from: /from\s+['"]((?:\.\.\/){3,})([^'"]+)['"]/g,
        to: (match, levels, importPath) => {
          const upCount = (levels.match(/\.\.\//g) || []).length;
          
          if (importPath.startsWith('shared/core/')) {
            const cleanPath = importPath.replace(/^shared\/core\/(?:src\/)?/, '');
            return `from '@shared/core/${cleanPath}'`;
          }
          if (importPath.startsWith('shared/schema/')) {
            const cleanPath = importPath.replace(/^shared\/schema\//, '');
            return `from '@server/infrastructure/schema/${cleanPath}'`;
          }
          if (importPath.startsWith('shared/database/')) {
            const cleanPath = importPath.replace(/^shared\/database\//, '');
            return cleanPath === 'connection' || cleanPath === 'connection.ts'
              ? `from '@server/infrastructure/database'`
              : `from '@server/infrastructure/database/${cleanPath}'`;
          }
          if (importPath.startsWith('server/')) {
            const cleanPath = importPath.replace(/^server\//, '');
            return `from '@server/${cleanPath}'`;
          }
          
          if (upCount >= 3) {
            const cleanPath = importPath.replace(/^(client\/)?src\//, '');
            return `from '@/${cleanPath}'`;
          }
          
          return match;
        },
        description: 'Convert deep relative imports (3+ levels) to @ shortcuts',
        applyTo: 'all',
        priority: 90
      },

      // Server-specific import standardization
      {
        from: /from\s+['"]((?:\.\.\/){2,})shared\/core\/src\/([^'"]+)['"]/g,
        to: (_match, _levels, importPath) => `from '@shared/core/${importPath}'`,
        description: 'Standardize server imports of shared/core',
        applyTo: 'server',
        priority: 80
      },
      {
        from: /from\s+['"]((?:\.\.\/){2,})shared\/schema\/([^'"]+)['"]/g,
        to: (_match, _levels, importPath) => `from '@server/infrastructure/schema/${importPath}'`,
        description: 'Standardize server imports of shared/schema',
        applyTo: 'server',
        priority: 80
      }
    ];
  }

  async align(): Promise<AlignmentReport> {
    console.log('🔧 Import Alignment Script - Clean Version\n');
    console.log('='.repeat(70) + '\n');
    
    if (this.isDryRun) {
      console.log('👀 DRY RUN MODE - No files will be modified');
      console.log('   All changes will be previewed without writing to disk\n');
    }

    const files = await this.gatherFiles();
    console.log(`📂 Scanning ${files.length} files for import optimization\n`);

    let filesModified = 0;
    let totalChanges = 0;

    for (const file of files) {
      const result = await this.processFile(file);
      
      if (result && result.changes > 0) {
        this.changes.push(result);
        filesModified++;
        totalChanges += result.changes;
        
        console.log(`✏️  ${file}: ${result.changes} change${result.changes > 1 ? 's' : ''}`);
      }
    }

    const executionTime = Date.now() - this.startTime;

    console.log('\n✅ Alignment Analysis Complete\n');
    console.log(`   Files Scanned: ${files.length}`);
    console.log(`   Files Modified: ${filesModified}`);
    console.log(`   Total Changes: ${totalChanges}`);
    console.log(`   Execution Time: ${(executionTime / 1000).toFixed(2)}s\n`);

    return {
      timestamp: new Date().toISOString(),
      filesScanned: files.length,
      filesModified,
      totalChanges,
      changes: this.changes,
      executionTime
    };
  }

  private async gatherFiles(): Promise<string[]> {
    const patterns = [
      'client/src/**/*.{ts,tsx}',
      'server/**/*.{ts,js}',
      'shared/**/*.{ts,js}'
    ];

    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/*.test.*',
          '**/*.spec.*',
          '**/__tests__/**'
        ]
      });

      files.push(...matches);
    }

    return files.sort();
  }

  private async processFile(relativePath: string): Promise<FileChange | null> {
    const filePath = path.join(this.projectRoot, relativePath);
    
    if (!fs.existsSync(filePath)) return null;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let changeCount = 0;
      const previews: string[] = [];

      const fileContext = this.getFileContext(relativePath);

      // Sort transforms by priority (highest first)
      const sortedTransforms = [...this.transforms].sort((a, b) => b.priority - a.priority);

      // Apply each relevant transform in priority order
      for (const transform of sortedTransforms) {
        if (transform.applyTo !== 'all' && transform.applyTo !== fileContext) {
          continue;
        }

        content = content.replace(transform.from, (...args) => {
          const result = transform.to(...args);
          
          if (result !== args[0]) {
            changeCount++;
            
            previews.push(
              `  ${args[0].trim()}\n` +
              `  → ${result.trim()}`
            );
          }
          
          return result;
        });
      }

      // Write changes if not in dry-run mode
      if (changeCount > 0 && !this.isDryRun) {
        fs.writeFileSync(filePath, content, 'utf8');
      }

      if (changeCount > 0) {
        return {
          file: relativePath,
          changes: changeCount,
          preview: previews.slice(0, 3) // Limit preview to first 3 changes per file
        };
      }

      return null;
    } catch (error) {
      console.error(`\n   ❌ Error processing ${relativePath}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  private getFileContext(filePath: string): 'client' | 'server' | 'shared' {
    if (filePath.startsWith('client/')) return 'client';
    if (filePath.startsWith('server/')) return 'server';
    if (filePath.startsWith('shared/')) return 'shared';
    return 'server';
  }

  printReport(report: AlignmentReport): void {
    console.log('='.repeat(70));
    console.log('📊 IMPORT ALIGNMENT REPORT');
    console.log('='.repeat(70));
    console.log(`\n📅 Generated: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`⚡ Execution Time: ${(report.executionTime / 1000).toFixed(2)} seconds`);
    console.log(`📂 Files Scanned: ${report.filesScanned}`);
    console.log(`✏️  Files Modified: ${report.filesModified}`);
    console.log(`🔄 Total Changes: ${report.totalChanges}`);

    if (report.changes.length > 0) {
      console.log(`\n🔍 Modified Files (showing first 10):`);

      const previewCount = Math.min(10, report.changes.length);
      for (let i = 0; i < previewCount; i++) {
        const change = report.changes[i];
        if (!change) continue;
        console.log(`\n   ${i + 1}. ${change.file}`);
        console.log(`      Changes: ${change.changes}`);

        const previewLimit = Math.min(2, change.preview.length);
        for (let j = 0; j < previewLimit; j++) {
          console.log(`\n${change.preview[j]}`);
        }

        if (change.preview.length > 2) {
          console.log(`\n      ... and ${change.preview.length - 2} more changes in this file`);
        }
      }

      if (report.changes.length > 10) {
        console.log(`\n   ... and ${report.changes.length - 10} more modified files`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 Recommended Next Steps:\n');
    
    if (this.isDryRun && report.totalChanges > 0) {
      console.log('   1. Review the changes above to ensure they look correct');
      console.log('   2. Run without --dry-run to apply the transformations');
      console.log('   3. Test your application after applying changes\n');
    } else if (report.filesModified > 0) {
      console.log('   1. Verify the changes with: git diff');
      console.log('   2. Run your TypeScript compiler: npm run build');
      console.log('   3. Execute your test suite: npm test');
      console.log('   4. Commit the improvements once verified\n');
    } else {
      console.log('   ✨ No changes needed - your imports are already optimized!\n');
    }
    
    console.log('='.repeat(70) + '\n');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('--preview');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔧 Import Alignment Script - Clean Version

Usage:
  npx tsx scripts/align-imports-clean.ts [options]

Options:
  --dry-run, --preview    Preview changes without modifying files
  --help, -h              Display this help message

Examples:
  npx tsx scripts/align-imports-clean.ts --dry-run
  npx tsx scripts/align-imports-clean.ts
`);
    return;
  }

  try {
    const aligner = new ImportAligner(isDryRun);
    const report = await aligner.align();
    aligner.printReport(report);

    if (isDryRun && report.totalChanges > 0) {
      console.log('🚀 Ready to apply? Run again without --dry-run flag\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Alignment failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

export { ImportAligner };