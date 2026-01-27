#!/usr/bin/env node

/**
 * Automated Component Migration Script
 * Migrates components from legacy styling to unified system
 */

import fs from 'fs';
import path from 'path';

import { glob } from 'glob';

interface MigrationRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

interface FileStats {
  processed: number;
  modified: number;
  errors: number;
}

// Migration rules for component updates
const COMPONENT_MIGRATIONS: MigrationRule[] = [
  // Import migrations
  {
    pattern: /import\s*{\s*Button\s*}\s*from\s*['"]\.\.\/components\/ui\/button['"];?/g,
    replacement: "import { UnifiedButton } from '@client/lib/design-system';",
    description: 'Migrate Button import to UnifiedButton',
  },
  {
    pattern:
      /import\s*{\s*Card,\s*CardContent,\s*CardDescription,\s*CardHeader,\s*CardTitle\s*}\s*from\s*['"]\.\.\/components\/ui\/card['"];?/g,
    replacement:
      "import { UnifiedCard, UnifiedCardContent, UnifiedCardDescription, UnifiedCardHeader, UnifiedCardTitle } from '@client/lib/design-system';",
    description: 'Migrate Card imports to Unified components',
  },
  {
    pattern: /import\s*{\s*Badge\s*}\s*from\s*['"]\.\.\/components\/ui\/badge['"];?/g,
    replacement: "import { UnifiedBadge } from '@client/lib/design-system';",
    description: 'Migrate Badge import to UnifiedBadge',
  },

  // Component usage migrations
  {
    pattern: /<Button\b/g,
    replacement: '<UnifiedButton',
    description: 'Replace Button with UnifiedButton',
  },
  {
    pattern: /<\/Button>/g,
    replacement: '</UnifiedButton>',
    description: 'Replace Button closing tag',
  },
  {
    pattern: /<Card\b/g,
    replacement: '<UnifiedCard',
    description: 'Replace Card with UnifiedCard',
  },
  {
    pattern: /<\/Card>/g,
    replacement: '</UnifiedCard>',
    description: 'Replace Card closing tag',
  },
  {
    pattern: /<CardHeader\b/g,
    replacement: '<UnifiedCardHeader',
    description: 'Replace CardHeader with UnifiedCardHeader',
  },
  {
    pattern: /<\/CardHeader>/g,
    replacement: '</UnifiedCardHeader>',
    description: 'Replace CardHeader closing tag',
  },
  {
    pattern: /<CardTitle\b/g,
    replacement: '<UnifiedCardTitle',
    description: 'Replace CardTitle with UnifiedCardTitle',
  },
  {
    pattern: /<\/CardTitle>/g,
    replacement: '</UnifiedCardTitle>',
    description: 'Replace CardTitle closing tag',
  },
  {
    pattern: /<CardDescription\b/g,
    replacement: '<UnifiedCardDescription',
    description: 'Replace CardDescription with UnifiedCardDescription',
  },
  {
    pattern: /<\/CardDescription>/g,
    replacement: '</UnifiedCardDescription>',
    description: 'Replace CardDescription closing tag',
  },
  {
    pattern: /<CardContent\b/g,
    replacement: '<UnifiedCardContent',
    description: 'Replace CardContent with UnifiedCardContent',
  },
  {
    pattern: /<\/CardContent>/g,
    replacement: '</UnifiedCardContent>',
    description: 'Replace CardContent closing tag',
  },
  {
    pattern: /<CardFooter\b/g,
    replacement: '<UnifiedCardFooter',
    description: 'Replace CardFooter with UnifiedCardFooter',
  },
  {
    pattern: /<\/CardFooter>/g,
    replacement: '</UnifiedCardFooter>',
    description: 'Replace CardFooter closing tag',
  },
  {
    pattern: /<Badge\b/g,
    replacement: '<UnifiedBadge',
    description: 'Replace Badge with UnifiedBadge',
  },
  {
    pattern: /<\/Badge>/g,
    replacement: '</UnifiedBadge>',
    description: 'Replace Badge closing tag',
  },
];

// Style migrations for design tokens
const STYLE_MIGRATIONS: MigrationRule[] = [
  // Color migrations
  {
    pattern: /className="([^"]*?)bg-blue-600([^"]*?)"/g,
    replacement: 'className="$1bg-[hsl(var(--color-primary))]$2"',
    description: 'Replace hardcoded blue-600 with primary color token',
  },
  {
    pattern: /className="([^"]*?)text-blue-600([^"]*?)"/g,
    replacement: 'className="$1text-[hsl(var(--color-primary))]$2"',
    description: 'Replace hardcoded blue-600 text with primary color token',
  },
  {
    pattern: /className="([^"]*?)bg-green-600([^"]*?)"/g,
    replacement: 'className="$1bg-[hsl(var(--color-success))]$2"',
    description: 'Replace hardcoded green-600 with success color token',
  },
  {
    pattern: /className="([^"]*?)text-green-600([^"]*?)"/g,
    replacement: 'className="$1text-[hsl(var(--color-success))]$2"',
    description: 'Replace hardcoded green-600 text with success color token',
  },
  {
    pattern: /className="([^"]*?)bg-red-600([^"]*?)"/g,
    replacement: 'className="$1bg-[hsl(var(--color-error))]$2"',
    description: 'Replace hardcoded red-600 with error color token',
  },
  {
    pattern: /className="([^"]*?)text-red-600([^"]*?)"/g,
    replacement: 'className="$1text-[hsl(var(--color-error))]$2"',
    description: 'Replace hardcoded red-600 text with error color token',
  },
  {
    pattern: /className="([^"]*?)text-gray-600([^"]*?)"/g,
    replacement: 'className="$1text-[hsl(var(--color-muted-foreground))]$2"',
    description: 'Replace hardcoded gray-600 with muted foreground token',
  },
  {
    pattern: /className="([^"]*?)bg-gray-100([^"]*?)"/g,
    replacement: 'className="$1bg-[hsl(var(--color-muted))]$2"',
    description: 'Replace hardcoded gray-100 with muted background token',
  },

  // Border radius migrations
  {
    pattern: /className="([^"]*?)rounded-lg([^"]*?)"/g,
    replacement: 'className="$1rounded-[var(--radius-lg)]$2"',
    description: 'Replace hardcoded rounded-lg with radius token',
  },
  {
    pattern: /className="([^"]*?)rounded-md([^"]*?)"/g,
    replacement: 'className="$1rounded-[var(--radius-md)]$2"',
    description: 'Replace hardcoded rounded-md with radius token',
  },

  // Touch target improvements
  {
    pattern: /<button([^>]*?)className="([^"]*?)"([^>]*?)>/g,
    replacement: '<button$1className="$2 min-h-[var(--touch-target-min)]"$3>',
    description: 'Add touch-friendly minimum height to buttons',
  },
];

// Accessibility improvements
const ACCESSIBILITY_MIGRATIONS: MigrationRule[] = [
  {
    pattern: /<button([^>]*?)>/g,
    replacement: '<button$1 type="button">',
    description: 'Add type="button" to buttons without explicit type',
  },
  {
    pattern: /<button([^>]*?)type="button"([^>]*?)type="button"([^>]*?)>/g,
    replacement: '<button$1type="button"$2$3>',
    description: 'Remove duplicate type attributes',
  },
];

class ComponentMigrator {
  private stats: FileStats = { processed: 0, modified: 0, errors: 0 };
  private dryRun: boolean;
  private verbose: boolean;

  constructor(options: { dryRun?: boolean; verbose?: boolean } = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
  }

  async migrateDirectory(directory: string): Promise<FileStats> {
    console.log(`🔄 Starting migration of ${directory}...`);
    console.log(`📋 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);

    const files = await glob(`${directory}/**/*.{tsx,ts,jsx,js}`, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/unified-components.tsx', // Don't migrate the unified components themselves
        '**/migration-*.ts', // Don't migrate migration scripts
      ],
    });

    console.log(`📁 Found ${files.length} files to process`);

    for (const file of files) {
      await this.migrateFile(file);
    }

    this.printSummary();
    return this.stats;
  }

  private async migrateFile(filePath: string): Promise<void> {
    try {
      this.stats.processed++;

      const originalContent = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = originalContent;
      let hasChanges = false;

      // Apply component migrations
      for (const rule of COMPONENT_MIGRATIONS) {
        const newContent = modifiedContent.replace(rule.pattern, rule.replacement);
        if (newContent !== modifiedContent) {
          hasChanges = true;
          if (this.verbose) {
            console.log(`  ✅ ${rule.description} in ${path.basename(filePath)}`);
          }
          modifiedContent = newContent;
        }
      }

      // Apply style migrations
      for (const rule of STYLE_MIGRATIONS) {
        const newContent = modifiedContent.replace(rule.pattern, rule.replacement);
        if (newContent !== modifiedContent) {
          hasChanges = true;
          if (this.verbose) {
            console.log(`  🎨 ${rule.description} in ${path.basename(filePath)}`);
          }
          modifiedContent = newContent;
        }
      }

      // Apply accessibility migrations
      for (const rule of ACCESSIBILITY_MIGRATIONS) {
        const newContent = modifiedContent.replace(rule.pattern, rule.replacement);
        if (newContent !== modifiedContent) {
          hasChanges = true;
          if (this.verbose) {
            console.log(`  ♿ ${rule.description} in ${path.basename(filePath)}`);
          }
          modifiedContent = newContent;
        }
      }

      if (hasChanges) {
        this.stats.modified++;

        if (!this.dryRun) {
          fs.writeFileSync(filePath, modifiedContent, 'utf8');
          console.log(`✅ Migrated: ${filePath}`);
        } else {
          console.log(`🔍 Would migrate: ${filePath}`);
        }
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }

  private printSummary(): void {
    console.log('\n📊 Migration Summary:');
    console.log(`   📁 Files processed: ${this.stats.processed}`);
    console.log(`   ✅ Files modified: ${this.stats.modified}`);
    console.log(`   ❌ Errors: ${this.stats.errors}`);

    if (this.dryRun) {
      console.log('\n🔍 This was a dry run. No files were actually modified.');
      console.log('   Run without --dry-run to apply changes.');
    } else {
      console.log('\n🎉 Migration completed!');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const directory = args.find(arg => !arg.startsWith('--')) || 'client/src';

  const migrator = new ComponentMigrator({ dryRun, verbose });
  await migrator.migrateDirectory(directory);
}

// Export for programmatic use
export { ComponentMigrator, COMPONENT_MIGRATIONS, STYLE_MIGRATIONS, ACCESSIBILITY_MIGRATIONS };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
