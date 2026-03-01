#!/usr/bin/env tsx

/**
 * SQL Injection Fix Script
 * 
 * Automatically replaces sql.raw() with proper sql template tags
 * to prevent SQL injection vulnerabilities.
 * 
 * Usage:
 *   npm run fix:sql-injection
 *   npm run fix:sql-injection -- --dry-run
 *   npm run fix:sql-injection -- --file=path/to/file.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface FixResult {
  file: string;
  originalCode: string;
  fixedCode: string;
  lineNumber: number;
  success: boolean;
  error?: string;
}

interface FixSummary {
  totalFiles: number;
  filesModified: number;
  issuesFixed: number;
  issuesFailed: number;
  results: FixResult[];
}

class SQLInjectionFixer {
  private dryRun: boolean;
  private results: FixResult[] = [];

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
  }

  /**
   * Fix SQL injection issues in files
   */
  async fix(patterns: string[]): Promise<FixSummary> {
    console.log('🔍 Scanning for SQL injection vulnerabilities...\n');

    const files = await glob(patterns, {
      ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.spec.ts']
    });

    console.log(`📁 Found ${files.length} files to check\n`);

    for (const file of files) {
      await this.fixFile(file);
    }

    return this.generateSummary(files.length);
  }

  /**
   * Fix SQL injection issues in a single file
   */
  private async fixFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      let modified = false;
      const newLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for sql.raw() usage
        if (this.containsSqlRaw(line)) {
          const fixResult = this.fixSqlRawLine(line, i + 1, filePath);
          
          if (fixResult.success) {
            newLines.push(fixResult.fixedCode);
            this.results.push(fixResult);
            modified = true;
          } else {
            newLines.push(line);
            this.results.push(fixResult);
          }
        } else {
          newLines.push(line);
        }
      }

      if (modified && !this.dryRun) {
        fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
        console.log(`✅ Fixed: ${filePath}`);
      } else if (modified && this.dryRun) {
        console.log(`🔍 Would fix: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }

  /**
   * Check if line contains sql.raw()
   */
  private containsSqlRaw(line: string): boolean {
    return /sql\.raw\s*\(/.test(line);
  }

  /**
   * Fix a line containing sql.raw()
   */
  private fixSqlRawLine(line: string, lineNumber: number, file: string): FixResult {
    const result: FixResult = {
      file,
      originalCode: line.trim(),
      fixedCode: line,
      lineNumber,
      success: false
    };

    try {
      // Pattern 1: sql.raw(`...`) -> sql`...`
      if (/sql\.raw\s*\(\s*`/.test(line)) {
        result.fixedCode = line.replace(/sql\.raw\s*\(\s*`([^`]*)`\s*\)/, 'sql`$1`');
        result.success = true;
        return result;
      }

      // Pattern 2: sql.raw('...') -> sql`...`
      if (/sql\.raw\s*\(\s*'/.test(line)) {
        result.fixedCode = line.replace(/sql\.raw\s*\(\s*'([^']*)'\s*\)/, 'sql`$1`');
        result.success = true;
        return result;
      }

      // Pattern 3: sql.raw("...") -> sql`...`
      if (/sql\.raw\s*\(\s*"/.test(line)) {
        result.fixedCode = line.replace(/sql\.raw\s*\(\s*"([^"]*)"\s*\)/, 'sql`$1`');
        result.success = true;
        return result;
      }

      // Pattern 4: Multi-line or complex - needs manual review
      result.error = 'Complex sql.raw() usage - requires manual review';
      result.success = false;
      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.success = false;
      return result;
    }
  }

  /**
   * Generate summary of fixes
   */
  private generateSummary(totalFiles: number): FixSummary {
    const filesModified = new Set(
      this.results.filter(r => r.success).map(r => r.file)
    ).size;

    const issuesFixed = this.results.filter(r => r.success).length;
    const issuesFailed = this.results.filter(r => !r.success).length;

    return {
      totalFiles,
      filesModified,
      issuesFixed,
      issuesFailed,
      results: this.results
    };
  }
}

/**
 * Generate report
 */
function generateReport(summary: FixSummary, dryRun: boolean): string {
  let report = '# SQL Injection Fix Report\n\n';
  report += `**Generated**: ${new Date().toISOString()}\n`;
  report += `**Mode**: ${dryRun ? 'Dry Run' : 'Live Fix'}\n\n`;

  report += '## Summary\n\n';
  report += `- Total files scanned: ${summary.totalFiles}\n`;
  report += `- Files modified: ${summary.filesModified}\n`;
  report += `- Issues fixed: ${summary.issuesFixed}\n`;
  report += `- Issues requiring manual review: ${summary.issuesFailed}\n\n`;

  if (summary.issuesFixed > 0) {
    report += '## Fixed Issues\n\n';
    summary.results
      .filter(r => r.success)
      .forEach(result => {
        report += `### ${result.file}:${result.lineNumber}\n\n`;
        report += '**Before**:\n```typescript\n';
        report += result.originalCode + '\n';
        report += '```\n\n';
        report += '**After**:\n```typescript\n';
        report += result.fixedCode.trim() + '\n';
        report += '```\n\n';
      });
  }

  if (summary.issuesFailed > 0) {
    report += '## Issues Requiring Manual Review\n\n';
    summary.results
      .filter(r => !r.success)
      .forEach(result => {
        report += `### ${result.file}:${result.lineNumber}\n\n`;
        report += '**Code**:\n```typescript\n';
        report += result.originalCode + '\n';
        report += '```\n\n';
        report += `**Reason**: ${result.error}\n\n`;
      });
  }

  return report;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find(arg => arg.startsWith('--file='));
  
  const patterns = fileArg
    ? [fileArg.split('=')[1]]
    : ['server/**/*.ts'];

  console.log('🔧 SQL Injection Fixer\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE FIX'}\n`);

  const fixer = new SQLInjectionFixer(dryRun);
  const summary = await fixer.fix(patterns);

  console.log('\n📊 Summary\n');
  console.log(`Files scanned: ${summary.totalFiles}`);
  console.log(`Files modified: ${summary.filesModified}`);
  console.log(`Issues fixed: ${summary.issuesFixed}`);
  console.log(`Issues requiring manual review: ${summary.issuesFailed}`);

  // Generate report
  const report = generateReport(summary, dryRun);
  const reportPath = dryRun 
    ? 'SQL_INJECTION_FIX_PREVIEW.md'
    : 'SQL_INJECTION_FIX_REPORT.md';
  
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report saved to: ${reportPath}`);

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply fixes');
  } else {
    console.log('\n✅ Fixes applied! Please review changes and run tests.');
  }

  // Exit with error if there are unfixed issues
  if (summary.issuesFailed > 0) {
    console.log(`\n⚠️  ${summary.issuesFailed} issues require manual review`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('Fix script failed:', error);
  process.exit(1);
});
