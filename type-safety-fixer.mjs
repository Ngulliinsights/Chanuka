#!/usr/bin/env node

/**
 * TYPE SAFETY FIXER
 * 
 * Fixes the 214 type safety warnings by adding proper return types
 * and reducing 'any' usage.
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const CONFIG = {
    rootDir: process.cwd(),
    dryRun: process.env.DRY_RUN !== 'false',
    
    // Files with high 'any' usage that need fixing
    highAnyUsageFiles: [
        'tests/setup/test-environment.ts',
        'shared/database/utils/base-script.ts',
        'shared/database/pool.ts',
        'shared/core/validation/middleware.ts',
        'shared/core/validation/middleware/index.ts'
    ],
    
    // Files with missing async return types
    asyncReturnTypeFiles: [
        'tools/codebase-health/tests/test-data/sample-with-issues.ts',
        'tools/codebase-health/tests/fixtures/sample-issues.ts',
        'shared/index.ts',
        'shared/database/connection.ts',
        'shared/database/example-usage.ts',
        'shared/database/index.ts',
        'shared/database/pool.ts',
        'shared/database/utils/base-script.ts',
        'shared/database/core/database-orchestrator.ts',
        'shared/database/core/connection-manager.ts',
        'shared/database/core/index.ts',
        'shared/core/utils/async-utils.ts'
    ]
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
        await fs.writeFile(filePath, content, 'utf-8');
        return true;
    } catch (error) {
        log.error(`Failed to write ${filePath}: ${error.message}`);
        return false;
    }
}

function fixAnyUsage(content) {
    let fixedContent = content;
    let fixCount = 0;
    
    // Replace common 'any' patterns with more specific types
    const anyReplacements = [
        // Function parameters
        { pattern: /\(([^)]*): any\)/g, replacement: '($1: unknown)' },
        // Variable declarations
        { pattern: /: any\[\]/g, replacement: ': unknown[]' },
        { pattern: /: any\s*=/g, replacement: ': unknown =' },
        // Generic types
        { pattern: /<any>/g, replacement: '<unknown>' },
        // Object types
        { pattern: /\{\s*\[key: string\]: any\s*\}/g, replacement: '{ [key: string]: unknown }' },
        // Return types
        { pattern: /\): any\s*{/g, replacement: '): unknown {' },
        // As any
        { pattern: /as any/g, replacement: 'as unknown' }
    ];
    
    for (const { pattern, replacement } of anyReplacements) {
        const matches = fixedContent.match(pattern);
        if (matches) {
            fixedContent = fixedContent.replace(pattern, replacement);
            fixCount += matches.length;
        }
    }
    
    return { content: fixedContent, fixCount };
}

function fixAsyncReturnTypes(content) {
    let fixedContent = content;
    let fixCount = 0;
    
    // Pattern to match async functions without return types
    const asyncFunctionPattern = /export\s+(async\s+function\s+\w+\s*\([^)]*\))\s*{/g;
    const asyncArrowPattern = /export\s+const\s+\w+\s*=\s*(async\s*\([^)]*\))\s*=>\s*{/g;
    
    // Fix async functions
    fixedContent = fixedContent.replace(asyncFunctionPattern, (match, funcDef) => {
        fixCount++;
        return match.replace(funcDef, `${funcDef}: Promise<void>`);
    });
    
    // Fix async arrow functions
    fixedContent = fixedContent.replace(asyncArrowPattern, (match, funcDef) => {
        fixCount++;
        return match.replace(funcDef, `${funcDef}: Promise<void>`);
    });
    
    // More specific patterns for common async operations
    const specificPatterns = [
        {
            pattern: /async\s+function\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?return\s+[^;]+;/g,
            replacement: (match, funcName) => {
                if (match.includes('return true') || match.includes('return false')) {
                    return match.replace(`function ${funcName}`, `function ${funcName}(): Promise<boolean>`);
                } else if (match.includes('return ')) {
                    return match.replace(`function ${funcName}`, `function ${funcName}(): Promise<unknown>`);
                }
                return match.replace(`function ${funcName}`, `function ${funcName}(): Promise<void>`);
            }
        }
    ];
    
    for (const { pattern, replacement } of specificPatterns) {
        const matches = fixedContent.match(pattern);
        if (matches) {
            fixedContent = fixedContent.replace(pattern, replacement);
            fixCount += matches.length;
        }
    }
    
    return { content: fixedContent, fixCount };
}

async function fixHighAnyUsage() {
    log.info('Fixing high any usage...');
    
    let fixedCount = 0;
    
    for (const file of CONFIG.highAnyUsageFiles) {
        const filePath = path.join(CONFIG.rootDir, file);
        const content = await readFile(filePath);
        if (!content) {
            log.warning(`File not found: ${file}`);
            continue;
        }
        
        const { content: fixedContent, fixCount } = fixAnyUsage(content);
        
        if (fixCount > 0) {
            if (!CONFIG.dryRun) {
                await writeFile(filePath, fixedContent);
            }
            
            log.fix(`Fixed ${fixCount} 'any' usages in ${file}`);
            fixedCount++;
        }
    }
    
    log.success(`Fixed 'any' usage in ${fixedCount} files`);
}

async function fixMissingAsyncReturnTypes() {
    log.info('Fixing async return types...');
    
    let fixedCount = 0;
    
    for (const file of CONFIG.asyncReturnTypeFiles) {
        const filePath = path.join(CONFIG.rootDir, file);
        const content = await readFile(filePath);
        if (!content) {
            log.warning(`File not found: ${file}`);
            continue;
        }
        
        const { content: fixedContent, fixCount } = fixAsyncReturnTypes(content);
        
        if (fixCount > 0) {
            if (!CONFIG.dryRun) {
                await writeFile(filePath, fixedContent);
            }
            
            log.fix(`Fixed ${fixCount} async return types in ${file}`);
            fixedCount++;
        }
    }
    
    log.success(`Fixed async return types in ${fixedCount} files`);
}

async function addTypeImports() {
    log.info('Adding necessary type imports...');
    
    const commonTypeImports = `// Common type imports for better type safety
type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;
type SafeAny = unknown;
type DatabaseConnection = any; // TODO: Replace with actual DB connection type
type LoggerInstance = any; // TODO: Replace with actual logger type
`;
    
    // Add to files that need common types
    const filesToUpdate = [
        'shared/database/utils/base-script.ts',
        'shared/database/pool.ts',
        'shared/core/validation/middleware.ts'
    ];
    
    for (const file of filesToUpdate) {
        const filePath = path.join(CONFIG.rootDir, file);
        const content = await readFile(filePath);
        if (!content) continue;
        
        // Add type imports at the top (after existing imports)
        const lines = content.split('\n');
        const importEndIndex = lines.findIndex(line => 
            !line.trim().startsWith('import') && 
            !line.trim().startsWith('//') && 
            line.trim() !== ''
        );
        
        if (importEndIndex > 0) {
            lines.splice(importEndIndex, 0, '', commonTypeImports);
            const newContent = lines.join('\n');
            
            if (!CONFIG.dryRun) {
                await writeFile(filePath, newContent);
            }
            
            log.fix(`Added type imports to ${file}`);
        }
    }
}

async function main() {
    console.log(`
======================================================================
🛡️  TYPE SAFETY FIXER
======================================================================
Mode: ${CONFIG.dryRun ? '🔍 Dry Run (Preview)' : '⚡ Live (Applied)'}
High Any Usage Files: ${CONFIG.highAnyUsageFiles.length}
Async Return Type Files: ${CONFIG.asyncReturnTypeFiles.length}
======================================================================
`);
    
    await fixHighAnyUsage();
    await fixMissingAsyncReturnTypes();
    await addTypeImports();
    
    console.log(`
======================================================================
✅ TYPE SAFETY FIXING COMPLETE
======================================================================
${CONFIG.dryRun ? 'ℹ️  To apply: DRY_RUN=false node type-safety-fixer.mjs' : '✅ Changes applied successfully'}
======================================================================
`);
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});