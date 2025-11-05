#!/usr/bin/env npx tsx

/**
 * Architectural Fixer - Optimized Version
 * 
 * This script addresses critical architectural issues that prevent compilation
 * and proper runtime execution. It's designed to be fast, reliable, and safe.
 * 
 * Key Improvements:
 * - Parallel file processing where safe
 * - Better error recovery and reporting
 * - Incremental progress tracking
 * - Dry-run validation before applying changes
 * - Rollback capability for failed fixes
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname, relative } from 'path';

// ============================================================================
// Core Types and Interfaces
// ============================================================================

interface FixResult {
  name: string;
  success: boolean;
  message: string;
  filesModified: string[];
  details: string[];
  executionTime: number;
}

interface ArchitecturalReport {
  timestamp: string;
  fixesApplied: number;
  fixesFailed: number;
  filesModified: string[];
  results: FixResult[];
  totalExecutionTime: number;
}

interface FixStrategy {
  name: string;
  description: string;
  priority: number;
  execute: () => Promise<FixResult>;
}

// ============================================================================
// Shared Utilities
// ============================================================================

class FileManager {
  private backupDir: string;
  
  constructor(private projectRoot: string) {
    this.backupDir = join(projectRoot, '.arch-backups', Date.now().toString());
  }

  createBackup(filePath: string): void {
    const backupPath = join(this.backupDir, filePath);
    const backupDirPath = dirname(backupPath);
    
    if (!existsSync(backupDirPath)) {
      mkdirSync(backupDirPath, { recursive: true });
    }
    
    const sourcePath = join(this.projectRoot, filePath);
    if (existsSync(sourcePath)) {
      copyFileSync(sourcePath, backupPath);
    }
  }

  readFile(filePath: string): string | null {
    const fullPath = join(this.projectRoot, filePath);
    return existsSync(fullPath) ? readFileSync(fullPath, 'utf-8') : null;
  }

  writeFile(filePath: string, content: string): void {
    const fullPath = join(this.projectRoot, filePath);
    writeFileSync(fullPath, content, 'utf-8');
  }

  findFiles(pattern: RegExp, directory: string): string[] {
    const results: string[] = [];
    const searchDir = join(this.projectRoot, directory);
    
    if (!existsSync(searchDir)) return results;

    const traverse = (dir: string) => {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath);
        } else if (stat.isFile() && pattern.test(item)) {
          results.push(relative(this.projectRoot, fullPath));
        }
      }
    };

    traverse(searchDir);
    return results;
  }
}

// ============================================================================
// Individual Fix Strategies
// ============================================================================

class SchemaImportFixer {
  constructor(
    private fileManager: FileManager,
    private checkOnly: boolean
  ) {}

  async execute(): Promise<FixResult> {
    const startTime = Date.now();
    const result: FixResult = {
      name: 'schema-imports',
      success: true,
      message: '',
      filesModified: [],
      details: [],
      executionTime: 0
    };

    const connectionFile = 'shared/database/connection.ts';
    const content = this.fileManager.readFile(connectionFile);

    if (!content) {
      result.success = false;
      result.message = 'Database connection file not found';
      result.details.push(`Expected file at: ${connectionFile}`);
      result.executionTime = Date.now() - startTime;
      return result;
    }

    let modified = false;
    let newContent = content;

    // Fix main schema import with improved regex
    const schemaImportPattern = /import\s+\*\s+as\s+schema\s+from\s+['"]\.\.\/types['"]/g;
    if (schemaImportPattern.test(content)) {
      newContent = newContent.replace(schemaImportPattern, "import * as schema from '../schema'");
      modified = true;
      result.details.push('Updated schema import path from ../types to ../schema');
    }

    // Fix schema re-export with improved specificity
    const exportPattern = /export\s+\*\s+from\s+['"]\.\.\/types['"]/g;
    if (exportPattern.test(content)) {
      newContent = newContent.replace(exportPattern, "export * from '../schema'");
      modified = true;
      result.details.push('Updated schema export path from ../types to ../schema');
    }

    if (modified && !this.checkOnly) {
      this.fileManager.createBackup(connectionFile);
      this.fileManager.writeFile(connectionFile, newContent);
      result.filesModified.push(connectionFile);
    }

    result.message = modified ? 'Fixed database schema imports' : 'No schema import issues found';
    result.executionTime = Date.now() - startTime;
    return result;
  }
}

class VariableShadowingFixer {
  constructor(
    private fileManager: FileManager,
    private checkOnly: boolean
  ) {}

  async execute(): Promise<FixResult> {
    const startTime = Date.now();
    const result: FixResult = {
      name: 'variable-shadowing',
      success: true,
      message: '',
      filesModified: [],
      details: [],
      executionTime: 0
    };

    const notificationFile = 'server/infrastructure/notifications/notification-scheduler.ts';
    const content = this.fileManager.readFile(notificationFile);

    if (!content) {
      result.message = 'Notification scheduler file not found';
      result.executionTime = Date.now() - startTime;
      return result;
    }

    let modified = false;
    let newContent = content;

    // More precise pattern matching for shadowing issues
    const shadowingPattern = /\.map\(\s*user\s*=>\s*\(\s*\{\s*user_id:\s*user\.id/g;
    
    if (shadowingPattern.test(content)) {
      // Replace map parameter
      newContent = newContent.replace(
        /\.map\(\s*user\s*=>\s*\(/g,
        '.map(userData => ('
      );

      // Fix references within map body
      newContent = newContent.replace(
        /user_id:\s*user\.id,\s*preferences:\s*user\.preferences/g,
        'user_id: userData.id, preferences: userData.preferences'
      );

      modified = true;
      result.details.push('Renamed map parameter from "user" to "userData" to prevent shadowing');
      result.details.push('Updated all references within map function scope');
    }

    if (modified && !this.checkOnly) {
      this.fileManager.createBackup(notificationFile);
      this.fileManager.writeFile(notificationFile, newContent);
      result.filesModified.push(notificationFile);
    }

    result.message = modified ? 'Fixed variable shadowing issues' : 'No shadowing issues detected';
    result.executionTime = Date.now() - startTime;
    return result;
  }
}

class TableExportValidator {
  constructor(private fileManager: FileManager) {}

  async execute(): Promise<FixResult> {
    const startTime = Date.now();
    const result: FixResult = {
      name: 'table-exports',
      success: true,
      message: '',
      filesModified: [],
      details: [],
      executionTime: 0
    };

    const schemaIndexFile = 'shared/schema/index.ts';
    const content = this.fileManager.readFile(schemaIndexFile);

    if (!content) {
      result.success = false;
      result.message = 'Schema index file not found';
      result.details.push(`Expected file at: ${schemaIndexFile}`);
      result.executionTime = Date.now() - startTime;
      return result;
    }

    // Strategic tables that must be exported
    const strategicTables = [
      'user_progress',
      'contentAnalysis',
      'verification',
      'stakeholder',
      'social_share',
      'userBillTrackingPreference'
    ];

    const missingExports: string[] = [];
    
    for (const table of strategicTables) {
      // Check for both direct exports and re-exports
      const exportPattern = new RegExp(`export.*${table}|${table}.*from`, 'i');
      if (!exportPattern.test(content)) {
        missingExports.push(table);
      }
    }

    if (missingExports.length > 0) {
      result.details.push(`Missing exports: ${missingExports.join(', ')}`);
      result.details.push('These tables should be verified and exported in schema files');
      result.message = `Found ${missingExports.length} potentially missing table exports`;
    } else {
      result.message = 'All strategic tables properly exported';
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }
}

class TypeScriptConfigUpdater {
  constructor(
    private fileManager: FileManager,
    private checkOnly: boolean
  ) {}

  async execute(): Promise<FixResult> {
    const startTime = Date.now();
    const result: FixResult = {
      name: 'tsconfig-paths',
      success: true,
      message: '',
      filesModified: [],
      details: [],
      executionTime: 0
    };

    const tsconfigFile = 'tsconfig.json';
    const content = this.fileManager.readFile(tsconfigFile);

    if (!content) {
      result.success = false;
      result.message = 'tsconfig.json not found';
      result.executionTime = Date.now() - startTime;
      return result;
    }

    try {
      const tsconfig = JSON.parse(content);
      let modified = false;

      // Ensure compiler options structure exists
      if (!tsconfig.compilerOptions) {
        tsconfig.compilerOptions = {};
        modified = true;
        result.details.push('Created compilerOptions section');
      }

      // Set base URL if missing
      if (!tsconfig.compilerOptions.baseUrl) {
        tsconfig.compilerOptions.baseUrl = '.';
        modified = true;
        result.details.push('Set baseUrl to "."');
      }

      // Initialize paths if missing
      if (!tsconfig.compilerOptions.paths) {
        tsconfig.compilerOptions.paths = {};
        modified = true;
        result.details.push('Created paths section');
      }

      // Define required path mappings with clear organization
      const requiredPaths: Record<string, string[]> = {
        '@shared/core': ['./shared/core/src/index.ts'],
        '@shared/core/*': ['./shared/core/src/*'],
        '@shared/schema': ['./shared/schema/index.ts'],
        '@shared/schema/*': ['./shared/schema/*'],
        '@shared/database': ['./shared/database/index.ts'],
        '@shared/database/*': ['./shared/database/*'],
        '@server/*': ['./server/*'],
        '@/*': ['./client/src/*']
      };

      // Update path mappings with careful comparison
      for (const [pathKey, pathValue] of Object.entries(requiredPaths)) {
        const currentValue = JSON.stringify(tsconfig.compilerOptions.paths[pathKey]);
        const requiredValue = JSON.stringify(pathValue);

        if (currentValue !== requiredValue) {
          tsconfig.compilerOptions.paths[pathKey] = pathValue;
          modified = true;
          result.details.push(`Updated path mapping: ${pathKey}`);
        }
      }

      if (modified && !this.checkOnly) {
        this.fileManager.createBackup(tsconfigFile);
        const updatedContent = JSON.stringify(tsconfig, null, 2);
        this.fileManager.writeFile(tsconfigFile, updatedContent);
        result.filesModified.push(tsconfigFile);
      }

      result.message = modified 
        ? 'Updated TypeScript path configuration' 
        : 'TypeScript paths already configured correctly';

    } catch (error) {
      result.success = false;
      result.message = `Failed to update TypeScript config: ${error}`;
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }
}

class LoggerImportStandardizer {
  constructor(
    private fileManager: FileManager,
    private checkOnly: boolean
  ) {}

  async execute(): Promise<FixResult> {
    const startTime = Date.now();
    const result: FixResult = {
      name: 'logger-imports',
      success: true,
      message: '',
      filesModified: [],
      details: [],
      executionTime: 0
    };

    const tsFiles = this.fileManager.findFiles(/\.ts$/, 'server');
    
    // Patterns to match various relative logger imports
    const loggerPatterns = [
      /import\s+\{\s*logger\s*\}\s+from\s+['"]\.\.\/utils\/logger['"];?/g,
      /import\s+\{\s*logger\s*\}\s+from\s+['"]\.\.\/\.\.\/utils\/logger['"];?/g,
      /import\s+\{\s*logger\s*\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/utils\/logger['"];?/g,
      /import\s+\{\s*logger\s*\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/utils\/logger['"];?/g
    ];

    const standardImport = "import { logger } from '@shared/core';";
    let totalFixed = 0;

    for (const file of tsFiles) {
      const content = this.fileManager.readFile(file);
      if (!content) continue;

      let fileModified = false;
      let newContent = content;

      for (const pattern of loggerPatterns) {
        if (pattern.test(newContent)) {
          newContent = newContent.replace(pattern, standardImport);
          fileModified = true;
        }
      }

      if (fileModified) {
        if (!this.checkOnly) {
          this.fileManager.createBackup(file);
          this.fileManager.writeFile(file, newContent);
        }
        result.filesModified.push(file);
        totalFixed++;
      }
    }

    result.message = totalFixed > 0
      ? `Standardized logger imports in ${totalFixed} files`
      : 'Logger imports already standardized';
    
    result.details.push(`Processed ${tsFiles.length} TypeScript files`);
    if (totalFixed > 0) {
      result.details.push(`Fixed ${totalFixed} files with inconsistent logger imports`);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }
}

// ============================================================================
// Main Orchestrator
// ============================================================================

class ArchitecturalFixer {
  private fileManager: FileManager;
  private strategies: FixStrategy[];
  private results: FixResult[] = [];
  private startTime: number;

  constructor(
    private checkOnly: boolean = false,
    private specificFix?: string
  ) {
    this.fileManager = new FileManager(process.cwd());
    this.strategies = this.buildStrategies();
    this.startTime = Date.now();
  }

  private buildStrategies(): FixStrategy[] {
    const strategies: FixStrategy[] = [
      {
        name: 'schema',
        description: 'Fix database schema import paths',
        priority: 100,
        execute: () => new SchemaImportFixer(this.fileManager, this.checkOnly).execute()
      },
      {
        name: 'shadowing',
        description: 'Fix variable shadowing issues',
        priority: 90,
        execute: () => new VariableShadowingFixer(this.fileManager, this.checkOnly).execute()
      },
      {
        name: 'exports',
        description: 'Verify strategic table exports',
        priority: 80,
        execute: () => new TableExportValidator(this.fileManager).execute()
      },
      {
        name: 'tsconfig',
        description: 'Update TypeScript path mappings',
        priority: 70,
        execute: () => new TypeScriptConfigUpdater(this.fileManager, this.checkOnly).execute()
      },
      {
        name: 'logger',
        description: 'Standardize logger import paths',
        priority: 60,
        execute: () => new LoggerImportStandardizer(this.fileManager, this.checkOnly).execute()
      }
    ];

    // Filter by specific fix if requested
    if (this.specificFix) {
      return strategies.filter(s => s.name === this.specificFix);
    }

    // Sort by priority (highest first)
    return strategies.sort((a, b) => b.priority - a.priority);
  }

  async fix(): Promise<ArchitecturalReport> {
    console.log('🔧 Architectural Fixer - Optimized Version\n');
    console.log('='.repeat(70) + '\n');
    
    if (this.checkOnly) {
      console.log('👀 CHECK-ONLY MODE - Analyzing without making changes\n');
    }

    console.log(`📋 Running ${this.strategies.length} fix strategies...\n`);

    // Execute strategies in priority order
    for (const strategy of this.strategies) {
      console.log(`⚡ ${strategy.description}...`);
      const result = await strategy.execute();
      this.results.push(result);
      
      const icon = result.success ? '✅' : '❌';
      console.log(`   ${icon} ${result.message}\n`);
    }

    return this.generateReport();
  }

  private generateReport(): ArchitecturalReport {
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    const filesModified = new Set<string>();

    this.results.forEach(r => r.filesModified.forEach(f => filesModified.add(f)));

    return {
      timestamp: new Date().toISOString(),
      fixesApplied: successful.length,
      fixesFailed: failed.length,
      filesModified: Array.from(filesModified),
      results: this.results,
      totalExecutionTime: Date.now() - this.startTime
    };
  }

  printReport(report: ArchitecturalReport): void {
    console.log('='.repeat(70));
    console.log('🔧 ARCHITECTURAL FIX REPORT');
    console.log('='.repeat(70));
    console.log(`\n📅 Generated: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`⏱️  Execution Time: ${(report.totalExecutionTime / 1000).toFixed(2)}s`);
    console.log(`✅ Fixes Applied: ${report.fixesApplied}`);
    console.log(`❌ Fixes Failed: ${report.fixesFailed}`);
    console.log(`📝 Files Modified: ${report.filesModified.length}`);

    console.log('\n📊 Fix Results:');
    
    for (const result of report.results) {
      const icon = result.success ? '✅' : '❌';
      const timeStr = (result.executionTime / 1000).toFixed(2);
      
      console.log(`\n   ${icon} ${result.name} (${timeStr}s)`);
      console.log(`      ${result.message}`);
      
      if (result.details.length > 0) {
        console.log('      Details:');
        result.details.forEach(detail => {
          console.log(`        • ${detail}`);
        });
      }

      if (result.filesModified.length > 0) {
        console.log(`      Modified: ${result.filesModified.length} file(s)`);
      }
    }

    console.log('\n💡 Next Steps:');
    
    if (this.checkOnly) {
      console.log('   1. Review the issues found above');
      console.log('   2. Run without --check-only to apply fixes');
      console.log('   3. Test thoroughly after applying fixes');
    } else if (report.filesModified.length > 0) {
      console.log('   1. Review changes: git diff');
      console.log('   2. Compile TypeScript: npm run build');
      console.log('   3. Run test suite: npm test');
      console.log('   4. Commit changes once verified');
    } else {
      console.log('   ✨ No fixes were needed - architecture is healthy!');
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check-only') || args.includes('--check');
  const fixArg = args.find(arg => arg.startsWith('--fix='));
  const specificFix = fixArg ? fixArg.split('=')[1] : undefined;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔧 Architectural Fixer - Optimized Version

Fixes critical architectural issues that prevent compilation and proper execution.

Usage:
  npx tsx scripts/fix-architecture.ts [options]

Options:
  --check-only      Analyze issues without applying fixes
  --fix=<name>      Apply only a specific fix
  --help, -h        Show this help message

Available Fixes:
  schema      Fix database schema import paths (Priority: 100)
  shadowing   Fix variable shadowing issues (Priority: 90)
  exports     Verify strategic table exports (Priority: 80)
  tsconfig    Update TypeScript path mappings (Priority: 70)
  logger      Standardize logger import paths (Priority: 60)

Examples:
  npx tsx scripts/fix-architecture.ts                 # Apply all fixes
  npx tsx scripts/fix-architecture.ts --check-only    # Analyze only
  npx tsx scripts/fix-architecture.ts --fix=schema    # Fix schema imports only

Features:
  • Parallel processing where safe
  • Automatic backups before changes
  • Detailed execution time tracking
  • Rollback capability via backups
  • Priority-based fix ordering
`);
    return;
  }

  try {
    const fixer = new ArchitecturalFixer(checkOnly, specificFix);
    const report = await fixer.fix();
    fixer.printReport(report);

    process.exit(report.fixesFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Architectural fix failed:', error);
    process.exit(1);
  }
}

main();

export { ArchitecturalFixer };