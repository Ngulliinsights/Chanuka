// ============================================================================
// TYPE MIGRATION SCRIPT - Automated Type System Migration
// ============================================================================
// Applies migration rules to update type definitions across the codebase
// Handles deprecation and type consolidation

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

interface MigrationRule {
  readonly pattern: RegExp;
  readonly replacement: string;
  readonly description: string;
  readonly filePatterns: string[];
  readonly dryRun?: boolean;
}

interface MigrationResult {
  readonly rule: string;
  readonly filesMatched: string[];
  readonly filesModified: string[];
  readonly changesApplied: number;
}

/**
 * Type migration rules for automated refactoring
 * Each rule targets specific patterns and applies replacements
 */
export const MIGRATION_RULES: readonly MigrationRule[] = [
  {
    pattern: /import\s+{\s*([^}]*)\s*}\s+from\s+['"]@\/shared\/types\/core['"];/g,
    replacement: "import { $1 } from '@/shared/types/core/common';",
    description: 'Update imports from @/shared/types/core to @/shared/types/core/common',
    filePatterns: ['client/src/**/*.ts', 'client/src/**/*.tsx', 'server/**/*.ts', 'shared/**/*.ts'],
  },
  {
    pattern: /type\s+DashboardState\s*=\s*DashboardData;/g,
    replacement: 'type DashboardState = DashboardData;',
    description: 'Consolidate duplicate DashboardState definitions',
    filePatterns: ['client/src/shared/types/**/*.ts'],
  },
  {
    pattern: /WidgetTabsProps(?!Layout)/g,
    replacement: 'WidgetTabsPropsLayout',
    description: 'Rename WidgetTabsProps to WidgetTabsPropsLayout to avoid collisions',
    filePatterns: ['client/src/**/*.tsx'],
  },
  {
    pattern: /from\s+['"]\.\/core\.ts['"]/g,
    replacement: "from './domains'",
    description: 'Update imports from ./core.ts to ./domains for standardized types',
    filePatterns: ['client/src/shared/types/**/*.ts'],
  },
];

/**
 * Migrate types using predefined rules
 * Returns detailed results for each migration rule applied
 */
export async function runMigrations(options: {
  readonly dryRun?: boolean;
  readonly verbose?: boolean;
} = {}): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  for (const rule of MIGRATION_RULES) {
    if (options.verbose) {
      console.log(`\n📋 Applying: ${rule.description}`);
    }

    try {
      const migrationResult = await applyMigrationRule(rule, options.dryRun ?? false);
      results.push({
        rule: rule.description,
        filesMatched: migrationResult.filesMatched,
        filesModified: migrationResult.filesModified,
        changesApplied: migrationResult.changesApplied,
      });

      if (options.verbose) {
        console.log(`  ✅ Files matched: ${migrationResult.filesMatched.length}`);
        console.log(`  ✅ Files modified: ${migrationResult.filesModified.length}`);
        console.log(`  ✅ Changes applied: ${migrationResult.changesApplied}`);
      }
    } catch (error) {
      console.error(`  ❌ Error applying rule: ${rule.description}`);
      console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return results;
}

/**
 * Apply a single migration rule to all matching files
 */
async function applyMigrationRule(
  rule: MigrationRule,
  dryRun: boolean
): Promise<{
  filesMatched: string[];
  filesModified: string[];
  changesApplied: number;
}> {
  const filesMatched: string[] = [];
  const filesModified: string[] = [];
  let changesApplied = 0;

  // Find all files matching the patterns
  for (const pattern of rule.filePatterns) {
    const files = await glob(pattern, {
      ignore: ['node_modules/**', 'dist/**', '.next/**', 'build/**'],
    });

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');

        // Check if file matches the pattern
        if (rule.pattern.test(content)) {
          filesMatched.push(file);

          // Apply replacement
          const updated = content.replace(rule.pattern, rule.replacement);

          // Count changes (simple heuristic: different line count or content)
          if (content !== updated) {
            changesApplied++;

            // Apply changes unless dry run
            if (!dryRun) {
              await fs.writeFile(file, updated, 'utf-8');
              filesModified.push(file);
            } else {
              filesMatched.push(file);
            }
          }
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
  }

  return {
    filesMatched,
    filesModified: dryRun ? [] : filesModified,
    changesApplied,
  };
}

/**
 * Get migration status and summary
 */
export async function getMigrationStatus(): Promise<{
  readonly totalRules: number;
  readonly rules: Array<{ name: string; status: string }>;
}> {
  return {
    totalRules: MIGRATION_RULES.length,
    rules: MIGRATION_RULES.map((rule) => ({
      name: rule.description,
      status: 'Ready',
    })),
  };
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run');
  const verbose = process.argv.includes('--verbose');

  console.log('🚀 Starting type migrations...\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY CHANGES'}\n`);

  runMigrations({ dryRun, verbose })
    .then((results) => {
      console.log('\n📊 Migration Summary:');
      console.log(`Total rules processed: ${results.length}`);
      const totalFiles = results.reduce((sum, r) => sum + r.filesModified.length, 0);
      const totalChanges = results.reduce((sum, r) => sum + r.changesApplied, 0);
      console.log(`Total files modified: ${totalFiles}`);
      console.log(`Total changes applied: ${totalChanges}`);
      console.log(dryRun ? '\n✨ Dry run completed (no changes applied)' : '\n✅ Migrations completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
