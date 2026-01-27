#!/usr/bin/env node

/**
 * TYPE CLEANUP SCRIPT
 *
 * Removes redundant type files and organizes remaining declarations into @types folder.
 * This script consolidates all type definitions from scattered locations into a centralized
 * @types directory structure for better organization and maintainability.
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { glob } from 'glob';

const CONFIG = {
    rootDir: process.cwd(),
    dryRun: process.env.DRY_RUN !== 'false',
    typesDir: '@types',

    // Source directories to scan for type files
    sourceDirs: [
        'client/src/core/api/types',
        'client/src/core/error/types',
        'client/src/core/loading/types',
        'client/src/core/storage/types',
        'client/src/core/dashboard/types',
        'client/src/core/performance/types',
        'client/src/core/browser/types',
        'client/src/core/mobile/types',
        'client/src/features/users/types',
        'client/src/features/search/types',
        'client/src/features/analytics/types',
        'client/src/features/bills/model/types',
        'client/src/lib/types',
        'client/src/lib/ui/types',
        'client/src/lib/ui/dashboard/types',
        'client/src/lib/ui/loading/types',
        'client/src/lib/ui/navigation/types',
        'client/src/lib/design-system/interactive/types',
        'client/src/types',
        'server/features/users/types',
        'server/features/analytics/types',
        'shared/core/observability/interfaces',
        'shared/core/observability/telemetry',
        'shared/core/validation/core',
        'shared/database/utils',
        'types'
    ],

    // Target organization in @types
    organization: {
        'core': ['api', 'error', 'loading', 'storage', 'dashboard', 'performance', 'browser', 'mobile'],
        'features': ['users', 'search', 'analytics', 'bills'],
        'shared': ['ui', 'design-system', 'core', 'database'],
        'server': ['features'],
        'global': ['shims', 'declarations']
    }
};

const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️  ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    fix: (msg) => console.log(`  ${msg}`)
};

async function readFile(filePath) {
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch {
        return null;
    }
}

async function writeFile(filePath, content) {
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
        return true;
    } catch (error) {
        log.error(`Failed to write ${filePath}: ${error.message}`);
        return false;
    }
}

async function findAllTypeFiles() {
    const patterns = [
        '**/*.ts',
        '**/*.tsx',
        '!node_modules/**',
        '!dist/**',
        '!build/**',
        '!@types/**' // Don't include existing @types
    ];

    const files = [];
    for (const pattern of patterns) {
        const matches = await glob(pattern, { cwd: CONFIG.rootDir });
        files.push(...matches);
    }

    // Filter to only type-related files
    return files.filter(file => {
        const filePath = path.join(CONFIG.rootDir, file);
        if (!fsSync.existsSync(filePath)) return false;

        const content = fsSync.readFileSync(filePath, 'utf-8');
        // Check if file contains type declarations
        return content.includes('interface ') ||
               content.includes('type ') ||
               content.includes('enum ') ||
               content.includes('declare ') ||
               file.includes('/types/') ||
               file.endsWith('.d.ts');
    });
}

function categorizeTypeFile(filePath) {
    const relativePath = path.relative(CONFIG.rootDir, filePath);

    // Categorize based on path
    if (relativePath.includes('client/src/core/')) {
        return { category: 'core', subcategory: relativePath.split('/')[2] };
    }
    if (relativePath.includes('client/src/features/')) {
        return { category: 'features', subcategory: relativePath.split('/')[2] };
    }
    if (relativePath.includes('client/src/lib/')) {
        return { category: 'shared', subcategory: relativePath.split('/')[2] };
    }
    if (relativePath.includes('server/')) {
        return { category: 'server', subcategory: relativePath.split('/')[1] };
    }
    if (relativePath.includes('types/') || relativePath.endsWith('.d.ts')) {
        return { category: 'global', subcategory: 'declarations' };
    }

    return { category: 'misc', subcategory: 'other' };
}

async function createTypesDirectory() {
    const typesDir = path.join(CONFIG.rootDir, CONFIG.typesDir);
    await fs.mkdir(typesDir, { recursive: true });
    log.info(`Created @types directory at ${typesDir}`);
}

async function organizeTypeFile(filePath) {
    const content = await readFile(filePath);
    if (!content) return false;

    const { category, subcategory } = categorizeTypeFile(filePath);
    const fileName = path.basename(filePath);

    // Create target path
    const targetDir = path.join(CONFIG.rootDir, CONFIG.typesDir, category, subcategory);
    const targetPath = path.join(targetDir, fileName);

    // Write to new location
    if (!CONFIG.dryRun) {
        await writeFile(targetPath, content);
    }

    log.fix(`Moved ${filePath} → @types/${category}/${subcategory}/${fileName}`);
    return true;
}

async function updateImports() {
    log.info('Updating import statements...');

    const allFiles = await glob('**/*.{ts,tsx,js,jsx}', {
        cwd: CONFIG.rootDir,
        ignore: ['node_modules/**', 'dist/**', 'build/**', '@types/**']
    });

    let updatedCount = 0;

    for (const file of allFiles) {
        const filePath = path.join(CONFIG.rootDir, file);
        let content = await readFile(filePath);
        if (!content) continue;

        let hasChanges = false;

        // Update imports from old type locations to @types
        const importPatterns = [
            // Core types
            { from: /from\s+['"]@client\/core\/([^/]+)\/types['"]/g, to: 'from \'@types/core/$1\'' },
            { from: /from\s+['"]\.\.\/\.\.\/core\/([^/]+)\/types['"]/g, to: 'from \'@types/core/$1\'' },

            // Feature types
            { from: /from\s+['"]@client\/features\/([^/]+)\/types['"]/g, to: 'from \'@types/features/$1\'' },

            // Shared types
            { from: /from\s+['"]@client\/shared\/([^/]+)\/types['"]/g, to: 'from \'@types/shared/$1\'' },

            // Server types
            { from: /from\s+['"]@server\/([^/]+)\/types['"]/g, to: 'from \'@types/server/$1\'' },

            // Global types
            { from: /from\s+['"]\.\.\/\.\.\/types\/([^'"]+)['"]/g, to: 'from \'@types/global/$1\'' },
        ];

        for (const pattern of importPatterns) {
            const originalContent = content;
            content = content.replace(pattern.from, pattern.to);
            if (content !== originalContent) {
                hasChanges = true;
            }
        }

        if (hasChanges) {
            if (!CONFIG.dryRun) {
                await writeFile(filePath, content);
            }
            updatedCount++;
            log.fix(`Updated imports in ${file}`);
        }
    }

    log.success(`Updated imports in ${updatedCount} files`);
}

async function removeRedundantFiles() {
    log.info('Removing redundant type files...');

    let removedCount = 0;

    for (const sourceDir of CONFIG.sourceDirs) {
        const fullSourceDir = path.join(CONFIG.rootDir, sourceDir);

        if (!fsSync.existsSync(fullSourceDir)) continue;

        // Remove the entire directory if it exists
        if (!CONFIG.dryRun) {
            try {
                await fs.rm(fullSourceDir, { recursive: true, force: true });
                log.fix(`Removed redundant directory: ${sourceDir}`);
                removedCount++;
            } catch (error) {
                log.warning(`Failed to remove ${sourceDir}: ${error.message}`);
            }
        } else {
            log.fix(`Would remove redundant directory: ${sourceDir}`);
            removedCount++;
        }
    }

    log.success(`Removed ${removedCount} redundant directories`);
}

async function createIndexFiles() {
    log.info('Creating index files for @types organization...');

    const typesDir = path.join(CONFIG.rootDir, CONFIG.typesDir);

    // Create main index.ts
    const mainIndex = `/**
 * Unified Type Definitions
 *
 * This is the main entry point for all type definitions in the project.
 * Types are organized by category and domain for better discoverability.
 */

// Core types
export * from './core';

// Feature types
export * from './features';

// Shared types
export * from './shared';

// Server types
export * from './server';

// Global declarations
export * from './global';
`;

    await writeFile(path.join(typesDir, 'index.ts'), mainIndex);

    // Create category index files
    for (const [category, subcategories] of Object.entries(CONFIG.organization)) {
        const categoryIndex = subcategories.map(sub =>
            `export * from './${sub}';`
        ).join('\n');

        await writeFile(path.join(typesDir, category, 'index.ts'), categoryIndex);
    }

    log.success('Created index files for type organization');
}

async function main() {
    console.log(`
================================================================================
🎯 TYPE CLEANUP SCRIPT
================================================================================
Mode: ${CONFIG.dryRun ? '🔍 Dry Run (Preview)' : '⚡ Live (Applied)'}
Target: Organize all type declarations into @types folder
================================================================================
`);

    // Step 1: Find all type files
    log.info('Finding all type files...');
    const typeFiles = await findAllTypeFiles();
    log.info(`Found ${typeFiles.length} type files to organize`);

    // Step 2: Create @types directory
    await createTypesDirectory();

    // Step 3: Organize type files
    log.info('Organizing type files into @types structure...');
    let organizedCount = 0;
    for (const file of typeFiles) {
        if (await organizeTypeFile(file)) {
            organizedCount++;
        }
    }
    log.success(`Organized ${organizedCount} type files`);

    // Step 4: Create index files
    await createIndexFiles();

    // Step 5: Update imports
    await updateImports();

    // Step 6: Remove redundant files
    await removeRedundantFiles();

    console.log(`
================================================================================
✅ TYPE CLEANUP COMPLETE
================================================================================
${CONFIG.dryRun ? 'ℹ️  To apply changes: DRY_RUN=false node type-cleanup.mjs' : '✅ All type files organized and imports updated'}

Summary:
- Organized ${organizedCount} type files into @types structure
- Created comprehensive index files
- Updated imports across codebase
- Removed redundant type directories

Next steps:
1. Run TypeScript compilation: pnpm run typecheck
2. Run tests to ensure everything works: pnpm test
3. Update any remaining import references manually if needed
================================================================================
`);
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});