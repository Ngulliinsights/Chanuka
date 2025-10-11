/**
 * Import Migration Helper
 * 
 * Utilities to help migrate imports from scattered utilities to core module
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';

export interface ImportMigration {
  from: string;
  to: string;
  namedImports?: string[];
  defaultImport?: string;
  namespaceImport?: string;
}

export interface MigrationRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

export class ImportMigrationHelper {
  private migrationRules: MigrationRule[] = [];

  constructor() {
    this.setupDefaultRules();
  }

  private setupDefaultRules(): void {
    // Cache service migrations
    this.addRule(
      /from ['"]\.\.\/\.\.\/shared\/services\/CacheService['"];?/g,
      "from '@core/cache';",
      'Migrate CacheService import to core cache module'
    );

    this.addRule(
      /from ['"]\.\.\/infrastructure\/cache\/UnifiedCacheManager['"];?/g,
      "from '@core/cache';",
      'Migrate UnifiedCacheManager import to core cache module'
    );

    this.addRule(
      /from ['"]\.\.\/infrastructure\/cache\/PropertyCacheService['"];?/g,
      "from '@core/cache';",
      'Migrate PropertyCacheService import to core cache module'
    );

    // Logging service migrations
    this.addRule(
      /from ['"]\.\.\/\.\.\/shared\/utils\/logger['"];?/g,
      "from '@core/logging';",
      'Migrate logger import to core logging module'
    );

    this.addRule(
      /from ['"]\.\.\/infrastructure\/monitoring\/logger['"];?/g,
      "from '@core/logging';",
      'Migrate infrastructure logger import to core logging module'
    );

    this.addRule(
      /from ['"]\.\.\/monitoring\/StructuredLogger['"];?/g,
      "from '@core/logging';",
      'Migrate StructuredLogger import to core logging module'
    );

    // Validation service migrations
    this.addRule(
      /from ['"]\.\.\/utils\/validators['"];?/g,
      "from '@core/validation';",
      'Migrate validators import to core validation module'
    );

    this.addRule(
      /from ['"]\.\.\/middleware\/validation\.middleware['"];?/g,
      "from '@core/validation';",
      'Migrate validation middleware import to core validation module'
    );

    // Error handling migrations
    this.addRule(
      /from ['"]\.\.\/tests\/api-bug-fixes['"];?/g,
      "from '@core/error-handling';",
      'Migrate error classes import to core error handling module'
    );

    this.addRule(
      /from ['"]\.\.\/utils\/response-helpers['"];?/g,
      "from '@core/error-handling';",
      'Migrate response helpers import to core error handling module'
    );
  }

  addRule(pattern: RegExp, replacement: string, description: string): void {
    this.migrationRules.push({ pattern, replacement, description });
  }

  async migrateFile(filePath: string): Promise<{
    success: boolean;
    changes: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let changes = 0;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let updatedContent = content;

      for (const rule of this.migrationRules) {
        const matches = updatedContent.match(rule.pattern);
        if (matches) {
          updatedContent = updatedContent.replace(rule.pattern, rule.replacement);
          changes += matches.length;
        }
      }

      if (changes > 0) {
        await fs.writeFile(filePath, updatedContent, 'utf-8');
      }

      return { success: true, changes, errors };
    } catch (error) {
      errors.push(`Failed to migrate ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, changes: 0, errors };
    }
  }

  async migrateDirectory(dirPath: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): Promise<{
    totalFiles: number;
    migratedFiles: number;
    totalChanges: number;
    errors: string[];
  }> {
    const results = {
      totalFiles: 0,
      migratedFiles: 0,
      totalChanges: 0,
      errors: [] as string[]
    };

    try {
      const files = await this.findFiles(dirPath, extensions);
      results.totalFiles = files.length;

      for (const file of files) {
        const result = await this.migrateFile(file);
        if (result.success && result.changes > 0) {
          results.migratedFiles++;
          results.totalChanges += result.changes;
        }
        results.errors.push(...result.errors);
      }
    } catch (error) {
      results.errors.push(`Failed to migrate directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return results;
  }

  private async findFiles(dirPath: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and other common directories
          if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
            const subFiles = await this.findFiles(fullPath, extensions);
            files.push(...subFiles);
          }
        } else if (entry.isFile()) {
          const hasValidExtension = extensions.some(ext => entry.name.endsWith(ext));
          if (hasValidExtension) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }

    return files;
  }

  async generateMigrationReport(dirPath: string): Promise<{
    potentialMigrations: Array<{
      file: string;
      imports: Array<{
        line: number;
        content: string;
        suggestedReplacement: string;
        rule: string;
      }>;
    }>;
  }> {
    const report = {
      potentialMigrations: [] as Array<{
        file: string;
        imports: Array<{
          line: number;
          content: string;
          suggestedReplacement: string;
          rule: string;
        }>;
      }>
    };

    try {
      const files = await this.findFiles(dirPath, ['.ts', '.tsx', '.js', '.jsx']);

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');
          const fileImports: Array<{
            line: number;
            content: string;
            suggestedReplacement: string;
            rule: string;
          }> = [];

          lines.forEach((line, index) => {
            for (const rule of this.migrationRules) {
              if (rule.pattern.test(line)) {
                const suggestedReplacement = line.replace(rule.pattern, rule.replacement);
                fileImports.push({
                  line: index + 1,
                  content: line.trim(),
                  suggestedReplacement: suggestedReplacement.trim(),
                  rule: rule.description
                });
              }
            }
          });

          if (fileImports.length > 0) {
            report.potentialMigrations.push({
              file,
              imports: fileImports
import { logger } from '../utils/logger';
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    } catch (error) {
      // Handle directory access errors
    }

    return report;
  }

  async createMigrationScript(outputPath: string): Promise<void> {
    const script = `#!/usr/bin/env node
/**
 * Auto-generated migration script for core utilities
 * Run this script to migrate imports from scattered utilities to core module
 */

const { ImportMigrationHelper } = require('./core/src/migration/import-migration-helper');

async function main() {
  const migrationHelper = new ImportMigrationHelper();
  
  logger.info('Starting import migration...', { component: 'SimpleTool' });
  
  // Migrate server directory
  logger.info('Migrating server directory...', { component: 'SimpleTool' });
  const serverResults = await migrationHelper.migrateDirectory('./server');
  console.log(\`Server: \${serverResults.migratedFiles}/\${serverResults.totalFiles} files migrated, \${serverResults.totalChanges} changes\`);
  
  // Migrate src directory
  logger.info('Migrating src directory...', { component: 'SimpleTool' });
  const srcResults = await migrationHelper.migrateDirectory('./src');
  console.log(\`Src: \${srcResults.migratedFiles}/\${srcResults.totalFiles} files migrated, \${srcResults.totalChanges} changes\`);
  
  // Report errors
  const allErrors = [...serverResults.errors, ...srcResults.errors];
  if (allErrors.length > 0) {
    logger.info('\\nErrors encountered:', { component: 'SimpleTool' });
    allErrors.forEach(error => console.log(\`  - \${error}\`));
  }
  
  logger.info('\\nMigration completed!', { component: 'SimpleTool' });
  console.log(\`Total files migrated: \${serverResults.migratedFiles + srcResults.migratedFiles}\`);
  console.log(\`Total changes made: \${serverResults.totalChanges + srcResults.totalChanges}\`);
}

main().catch(console.error);
`;

    await fs.writeFile(outputPath, script, 'utf-8');
    
    // Make script executable on Unix systems
    try {
      await fs.chmod(outputPath, '755');
    } catch (error) {
      // Ignore chmod errors on Windows
    }
  }
}

// Export singleton instance
export const importMigrationHelper = new ImportMigrationHelper();






