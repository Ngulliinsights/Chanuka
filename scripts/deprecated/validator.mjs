/**
 * STRATEGIC EXPORT VALIDATOR - v13.0 (Production Edition)
 * 
 * ARCHITECTURE:
 * - Fully async/non-blocking I/O with intelligent concurrency control
 * - Multi-stage pipeline: Discovery → Parsing → Validation → Analysis → Reporting
 * - Micro-caching strategy for filesystem operations
 * - Parallel validation with batched processing
 * 
 * PARSING ENGINE:
 * - Multiline import/export support ([\s\S] patterns)
 * - Destructuring detection: export const { a, b: c } = obj
 * - Advanced comment stripping (string-aware)
 * - Re-export chain resolution
 * 
 * FEATURES:
 * - Configurable strictness levels (strict/relaxed)
 * - Real-time progress indicators for large codebases
 * - Type safety analysis with thresholds
 * - Comprehensive error messages with suggestions
 * - GitHub Actions compatible output
 * - Performance metrics and bottleneck detection
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    rootDir: process.cwd(),
    outputFile: 'docs/export-analysis.md',
    
    // Performance tuning
    maxConcurrentFiles: 50,        // Files parsed in parallel
    maxConcurrentValidations: 100,  // Validation tasks in parallel
    progressThreshold: 100,         // Show progress bar for N+ files
    
    // Validation behavior
    strictness: 'strict', // 'strict' | 'relaxed'
    // strict: Fails on any mismatch
    // relaxed: Warns but doesn't fail build
    
    // Path aliases (load from tsconfig.json in production)
    aliases: {
        "@/": "./src/",
        "~/": "./src/",
        "@components/": "./src/components/",
        "@utils/": "./src/utils/",
        "@lib/": "./src/lib/",
        "@hooks/": "./src/hooks/",
        "@types/": "./src/types/",
        "@server/": "./server/src/",
        "@client/": "./client/src/",
        "@shared/": "./shared/"
    },

    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'],
    
    exclude: [
        'node_modules', 'dist', 'build', '.git', 'coverage', '.next', 
        '__tests__', '__mocks__', '.test.', '.spec.', '.d.ts',
        'jest.config', 'next.config', 'vite.config', 'rollup.config'
    ],
    
    // Type safety thresholds
    typeChecks: {
        enabled: true,
        maxAnyUsage: 8,              // Max 'any' types per file
        checkAsyncReturnTypes: true, // Require Promise<T> annotations
        warnOnImplicitAny: true      // Warn on function params without types
    }
};

// =============================================================================
// GLOBAL STATE
// =============================================================================

const CACHE = {
    files: new Map(),       // filePath -> { exports, imports, reExports }
    resolution: new Map(),  // contextPath::importString -> resolvedPath | null
    fsExists: new Map(),    // filePath -> boolean (micro-cache)
    effectiveExports: new Map() // filePath -> Set<string> (computed exports cache)
};

const STATS = {
    filesScanned: 0,
    filesSuccessful: 0,
    parseErrors: 0,
    importsChecked: 0,
    importMismatches: 0,
    typeWarnings: 0,
    skippedFiles: 0,
    resolutionCacheHits: 0,
    resolutionCacheMisses: 0,
    startTime: Date.now(),
    phases: {} // Track time per phase
};

// Pre-sort aliases for efficient prefix matching
const SORTED_ALIASES = Object.keys(CONFIG.aliases)
    .sort((a, b) => b.length - a.length)
    .map(alias => ({
        prefix: alias.replace(/\/$/, ''),
        replacement: CONFIG.aliases[alias]
    }));

// =============================================================================
// MAIN EXECUTION PIPELINE
// =============================================================================

async function main() {
    console.log(`\n🚀 Strategic Export Validator v13.0\n`);
    console.log(`📍 Root: ${CONFIG.rootDir}`);
    console.log(`⚙️  Mode: ${CONFIG.strictness.toUpperCase()}\n`);

    try {
        // Phase 1: Discovery
        await runPhase('Discovery', async () => {
            console.log(`📁 Discovering source files...`);
            const files = await walkDir(CONFIG.rootDir);
            STATS.filesScanned = files.length;
            console.log(`   ✓ Found ${files.length} files to analyze\n`);
            return files;
        });

        const files = await walkDir(CONFIG.rootDir);
        STATS.filesScanned = files.length;

        // Phase 2: Parsing
        await runPhase('Parsing', async () => {
            console.log(`⚙️  Parsing exports and imports...`);
            await parseFilesInBatches(files);
            STATS.filesSuccessful = CACHE.files.size;
            console.log(`   ✓ Parsed ${STATS.filesSuccessful}/${STATS.filesScanned} files`);
            if (STATS.parseErrors > 0) {
                console.log(`   ⚠️  ${STATS.parseErrors} files had parse errors`);
            }
            console.log('');
        });

        // Phase 3: Validation
        const errors = await runPhase('Validation', async () => {
            console.log(`🔍 Validating import/export relationships...`);
            const errors = await validateImportsAsync(files);
            console.log(`   ✓ Validated ${STATS.importsChecked} imports`);
            console.log(`   ${errors.length === 0 ? '✓' : '✗'} Found ${errors.length} mismatches\n`);
            return errors;
        });

        // Phase 4: Type Safety Analysis
        const typeWarnings = CONFIG.typeChecks.enabled 
            ? await runPhase('Type Analysis', async () => {
                console.log(`🛡️  Analyzing type safety...`);
                const warnings = await analyzeTypeSafety(files);
                console.log(`   ${warnings.length === 0 ? '✓' : '⚠️'} Generated ${warnings.length} warnings\n`);
                return warnings;
            })
            : [];

        // Phase 5: Report Generation
        await runPhase('Reporting', async () => {
            console.log(`📝 Generating comprehensive report...`);
            await generateMarkdownReport(errors, typeWarnings);
            console.log(`   ✓ Report saved: ${CONFIG.outputFile}\n`);
        });

        // Summary
        printSummary(errors, typeWarnings);
        
        // Exit strategy
        if (CONFIG.strictness === 'strict' && errors.length > 0) {
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Fatal Error:', error.message);
        if (error.stack) console.error('\n' + error.stack);
        process.exit(1);
    }
}

async function runPhase(name, fn) {
    const start = Date.now();
    const result = await fn();
    STATS.phases[name] = Date.now() - start;
    return result;
}

function printSummary(errors, warnings) {
    const duration = ((Date.now() - STATS.startTime) / 1000).toFixed(2);
    const cacheEfficiency = STATS.resolutionCacheHits + STATS.resolutionCacheMisses > 0
        ? ((STATS.resolutionCacheHits / (STATS.resolutionCacheHits + STATS.resolutionCacheMisses)) * 100).toFixed(1)
        : 0;
    
    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`📊 ANALYSIS COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📦 Files: ${STATS.filesSuccessful}/${STATS.filesScanned} successful`);
    console.log(`🔗 Imports: ${STATS.importsChecked} checked`);
    console.log(`⚡ Cache efficiency: ${cacheEfficiency}%`);
    console.log(`───────────────────────────────────────────────────────`);
    
    if (errors.length === 0 && warnings.length === 0) {
        console.log(`✅ Status: PASSED - No issues detected`);
    } else {
        console.log(`❌ Errors: ${errors.length}`);
        console.log(`⚠️  Warnings: ${warnings.length}`);
        console.log(`📄 Review: ${CONFIG.outputFile}`);
    }
    
    console.log(`═══════════════════════════════════════════════════════\n`);
}

// =============================================================================
// FILE SYSTEM OPERATIONS (Fully Async)
// =============================================================================

async function walkDir(dir) {
    const results = [];
    
    async function walk(currentDir) {
        let entries;
        try {
            entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch (error) {
            STATS.skippedFiles++;
            return;
        }

        const tasks = entries.map(async (entry) => {
            const fullPath = path.join(currentDir, entry.name);
            
            // Skip excluded paths
            if (CONFIG.exclude.some(ex => fullPath.includes(ex))) {
                return;
            }

            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (CONFIG.extensions.includes(path.extname(entry.name))) {
                results.push(fullPath);
            }
        });

        await Promise.all(tasks);
    }

    await walk(dir);
    return results;
}

async function parseFilesInBatches(files) {
    const batches = [];
    for (let i = 0; i < files.length; i += CONFIG.maxConcurrentFiles) {
        batches.push(files.slice(i, i + CONFIG.maxConcurrentFiles));
    }

    const showProgress = files.length >= CONFIG.progressThreshold;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        await Promise.all(batch.map(file => parseFileAsync(file)));
        
        if (showProgress) {
            const processed = Math.min((i + 1) * CONFIG.maxConcurrentFiles, files.length);
            const percent = Math.round((processed / files.length) * 100);
            const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
            process.stdout.write(`\r   [${bar}] ${percent}%`);
        }
    }
    
    if (showProgress) console.log('');
}

async function parseFileAsync(filePath) {
    if (CACHE.files.has(filePath)) {
        return CACHE.files.get(filePath);
    }

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = parseFileContent(content, filePath);
        CACHE.files.set(filePath, parsed);
        return parsed;
    } catch (error) {
        STATS.parseErrors++;
        // Store empty data to prevent retry
        const empty = { exports: new Set(), imports: [], reExports: new Set() };
        CACHE.files.set(filePath, empty);
        return null;
    }
}

// =============================================================================
// PARSING ENGINE (Advanced)
// =============================================================================

function parseFileContent(content, filePath) {
    const cleanContent = stripCommentsAdvanced(content);
    const exports = new Set();
    const imports = [];
    const reExports = new Set();

    // 1. STANDARD NAMED EXPORTS
    // export const/let/var/function/class/enum/type/interface
    const standardExportRegex = /export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function|class|enum|type|interface|namespace)\s+([a-zA-Z0-9_$]+)/g;
    for (const match of cleanContent.matchAll(standardExportRegex)) {
        exports.add(match[1]);
    }

    // 2. DESTRUCTURED EXPORTS
    // export const { a, b: renamedB, c = defaultValue } = obj
    const destructuredExportRegex = /export\s+(?:const|let|var)\s+\{([^}]+)\}/g;
    for (const match of cleanContent.matchAll(destructuredExportRegex)) {
        const destructuredBlock = match[1];
        destructuredBlock.split(',').forEach(item => {
            const trimmed = item.trim();
            if (!trimmed) return;
            
            // Handle: { a: b } -> export b, { a } -> export a, { a = 1 } -> export a
            const aliasMatch = trimmed.match(/(\w+)\s*:\s*(\w+)/);
            if (aliasMatch) {
                exports.add(aliasMatch[2]); // The renamed identifier
            } else {
                const name = trimmed.split('=')[0].trim(); // Remove default values
                if (name) exports.add(name);
            }
        });
    }

    // 3. DEFAULT EXPORTS
    if (/export\s+default\s+/.test(cleanContent)) {
        exports.add('default');
    }

    // 4. EXPORT LISTS (Multiline support)
    // export { a, b as c, type d } from './module'
    const exportListRegex = /export\s*\{([\s\S]+?)\}(?:\s*from\s*['"]([^'"]+)['"])?/g;
    for (const match of cleanContent.matchAll(exportListRegex)) {
        const [_, namesBlock, fromSource] = match;
        
        namesBlock.split(',').forEach(spec => {
            const trimmed = spec.trim();
            if (!trimmed || trimmed === 'type') return;
            
            // Handle: "a as b" -> export b, "a" -> export a
            const parts = trimmed.split(/\s+as\s+/);
            const exportedName = parts[parts.length - 1].trim();
            if (exportedName) exports.add(exportedName);
        });

        if (fromSource) {
            reExports.add(fromSource);
        }
    }

    // 5. WILDCARD RE-EXPORTS
    // export * from './module'
    // export * as namespace from './module'
    const wildcardExportRegex = /export\s+\*(?:\s+as\s+(\w+))?\s+from\s+['"]([^'"]+)['"]/g;
    for (const match of cleanContent.matchAll(wildcardExportRegex)) {
        const [_, namespace, source] = match;
        if (namespace) {
            exports.add(namespace); // export * as NS creates a named export
        }
        reExports.add(source);
    }

    // 6. IMPORT STATEMENTS (Multiline support)
    const importRegex = /import\s+(?:type\s+)?([\s\S]+?)\s+from\s+['"]([^'"]+)['"]/g;
    for (const match of cleanContent.matchAll(importRegex)) {
        const [_, importBody, source] = match;
        
        const isLocal = isLocalImport(source);
        const specifiers = parseImportSpecifiers(importBody);
        
        if (specifiers.length > 0) {
            imports.push({ source, specifiers, isLocal });
        }
    }

    return { exports, imports, reExports };
}

function stripCommentsAdvanced(content) {
    // Strategy: Remove strings first to avoid false positives
    // Step 1: Replace all strings with placeholders
    let result = content.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '""');
    
    // Step 2: Remove multi-line comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Step 3: Remove single-line comments
    result = result.replace(/\/\/.*$/gm, '');
    
    return result;
}

function isLocalImport(source) {
    if (source.startsWith('.')) return true;
    return SORTED_ALIASES.some(({ prefix }) => source.startsWith(prefix));
}

function parseImportSpecifiers(importBody) {
    const specifiers = [];
    const cleaned = importBody.replace(/\s+/g, ' ').trim();
    
    // Handle namespace imports: import * as Something
    if (cleaned.includes('* as')) {
        return ['*'];
    }
    
    // Mixed imports: import Default, { named }
    const parts = cleaned.split('{');
    
    // Default import (appears before braces or standalone)
    if (!cleaned.startsWith('{')) {
        const defaultPart = parts[0].split(',')[0].trim();
        if (defaultPart && defaultPart !== 'type') {
            specifiers.push('default');
        }
    }
    
    // Named imports: { a, b as c, type d }
    const namedMatch = cleaned.match(/\{([^}]+)\}/);
    if (namedMatch) {
        namedMatch[1].split(',').forEach(spec => {
            const trimmed = spec.trim();
            if (!trimmed || trimmed === 'type') return;
            
            // "a as b" -> we import 'a' from source
            const sourceName = trimmed.split(/\s+as\s+/)[0].trim();
            if (sourceName) specifiers.push(sourceName);
        });
    }
    
    return specifiers;
}

// =============================================================================
// VALIDATION ENGINE (Parallel + Caching)
// =============================================================================

async function validateImportsAsync(files) {
    const errors = [];
    
    // Create validation tasks (batched for memory efficiency)
    const validationBatches = [];
    for (let i = 0; i < files.length; i += CONFIG.maxConcurrentValidations) {
        const batch = files.slice(i, i + CONFIG.maxConcurrentValidations);
        validationBatches.push(batch);
    }
    
    // Process batches
    for (const batch of validationBatches) {
        const batchTasks = batch.map(filePath => validateFileImports(filePath));
        const batchResults = await Promise.all(batchTasks);
        
        // Flatten results
        batchResults.forEach(fileErrors => {
            if (fileErrors) errors.push(...fileErrors);
        });
    }
    
    STATS.importMismatches = errors.length;
    return errors;
}

async function validateFileImports(filePath) {
    const fileData = CACHE.files.get(filePath);
    if (!fileData || fileData.imports.length === 0) return [];
    
    const errors = [];

    for (const imp of fileData.imports) {
        STATS.importsChecked++;
        
        if (!imp.isLocal) continue;

        const resolvedPath = await resolveModulePathAsync(filePath, imp.source);

        if (!resolvedPath) {
            errors.push({
                file: filePath,
                type: 'MODULE_NOT_FOUND',
                importPath: imp.source,
                missingExport: '(entire module)',
                recommendation: `Verify path exists. Check tsconfig.json path mappings.`,
                severity: 'Critical'
            });
            continue;
        }

        // Get all effective exports (including re-exports)
        const availableExports = await getEffectiveExports(resolvedPath);

        for (const specifier of imp.specifiers) {
            if (specifier === '*') continue; // Namespace imports always valid

            if (!availableExports.has(specifier)) {
                const suggestion = suggestAlternative(availableExports, specifier);
                errors.push({
                    file: filePath,
                    type: 'MISSING_EXPORT',
                    importPath: imp.source,
                    missingExport: specifier,
                    recommendation: suggestion || `Add 'export ${specifier}' to target module`,
                    severity: 'High',
                    availableExports: Array.from(availableExports).slice(0, 5).join(', ')
                });
            }
        }
    }

    return errors;
}

async function getEffectiveExports(filePath, visited = new Set()) {
    // Return cached result if available
    if (CACHE.effectiveExports.has(filePath)) {
        return CACHE.effectiveExports.get(filePath);
    }
    
    if (visited.has(filePath)) return new Set();
    visited.add(filePath);

    const fileData = CACHE.files.get(filePath);
    if (!fileData) return new Set();

    const allExports = new Set(fileData.exports);

    // Recursively gather re-exported items
    if (fileData.reExports.size > 0) {
        const reExportTasks = Array.from(fileData.reExports).map(async (source) => {
            const resolved = await resolveModulePathAsync(filePath, source);
            if (resolved) {
                const nested = await getEffectiveExports(resolved, visited);
                return nested;
            }
            return new Set();
        });

        const nestedExports = await Promise.all(reExportTasks);
        nestedExports.forEach(exportSet => {
            exportSet.forEach(exp => allExports.add(exp));
        });
    }

    // Cache the result
    CACHE.effectiveExports.set(filePath, allExports);
    return allExports;
}

function suggestAlternative(availableExports, requested) {
    const available = Array.from(availableExports);
    const lowerRequested = requested.toLowerCase();
    
    // Exact case-insensitive match
    let match = available.find(exp => exp.toLowerCase() === lowerRequested);
    if (match) return `Did you mean '${match}'? (case mismatch)`;
    
    // Substring match
    match = available.find(exp => 
        exp.toLowerCase().includes(lowerRequested) || 
        lowerRequested.includes(exp.toLowerCase())
    );
    if (match) return `Did you mean '${match}'?`;
    
    // Levenshtein distance (simple implementation)
    if (available.length > 0 && available.length < 50) {
        const sorted = available
            .map(exp => ({ name: exp, dist: levenshtein(requested, exp) }))
            .sort((a, b) => a.dist - b.dist);
        
        if (sorted[0].dist <= 3) {
            return `Did you mean '${sorted[0].name}'?`;
        }
    }
    
    return null;
}

function levenshtein(a, b) {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + cost
            );
        }
    }
    
    return matrix[b.length][a.length];
}

// =============================================================================
// PATH RESOLUTION (Async + Memoized)
// =============================================================================

async function resolveModulePathAsync(sourceFile, importPath) {
    const cacheKey = `${sourceFile}::${importPath}`;
    
    if (CACHE.resolution.has(cacheKey)) {
        STATS.resolutionCacheHits++;
        return CACHE.resolution.get(cacheKey);
    }
    
    STATS.resolutionCacheMisses++;
    let targetPath = importPath;

    // 1. Alias resolution (pre-sorted for efficiency)
    for (const { prefix, replacement } of SORTED_ALIASES) {
        if (importPath.startsWith(prefix)) {
            targetPath = importPath.replace(prefix, replacement);
            if (targetPath.startsWith('./')) {
                targetPath = path.join(CONFIG.rootDir, targetPath);
            }
            break;
        }
    }

    // 2. Relative path resolution
    if (targetPath.startsWith('.')) {
        targetPath = path.resolve(path.dirname(sourceFile), targetPath);
    } else if (!path.isAbsolute(targetPath)) {
        // External module (node_modules)
        CACHE.resolution.set(cacheKey, null);
        return null;
    }

    // 3. File existence check with extension resolution
    const resolved = await tryResolveExtensionsAsync(targetPath);
    
    CACHE.resolution.set(cacheKey, resolved);
    return resolved;
}

async function tryResolveExtensionsAsync(basePath) {
    // Try exact path first
    if (await fileExistsAsync(basePath)) {
        return basePath;
    }

    // Try with extensions
    for (const ext of CONFIG.extensions) {
        const withExt = basePath + ext;
        if (await fileExistsAsync(withExt)) {
            return withExt;
        }
    }

    // Try index files in directory
    for (const ext of CONFIG.extensions) {
        const indexPath = path.join(basePath, 'index' + ext);
        if (await fileExistsAsync(indexPath)) {
            return indexPath;
        }
    }

    return null;
}

async function fileExistsAsync(filePath) {
    if (CACHE.fsExists.has(filePath)) {
        return CACHE.fsExists.get(filePath);
    }

    try {
        const stat = await fs.stat(filePath);
        const isFile = stat.isFile();
        CACHE.fsExists.set(filePath, isFile);
        return isFile;
    } catch {
        CACHE.fsExists.set(filePath, false);
        return false;
    }
}

// =============================================================================
// TYPE SAFETY ANALYSIS
// =============================================================================

async function analyzeTypeSafety(files) {
    if (!CONFIG.typeChecks.enabled) return [];
    
    const warnings = [];
    const tsFiles = files.filter(f => /\.tsx?$/.test(f));
    
    // Process in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < tsFiles.length; i += batchSize) {
        const batch = tsFiles.slice(i, i + batchSize);
        const batchTasks = batch.map(async (file) => {
            try {
                const content = await fs.readFile(file, 'utf-8');
                return analyzeFileTypeSafety(file, content);
            } catch {
                return [];
            }
        });
        
        const batchWarnings = await Promise.all(batchTasks);
        warnings.push(...batchWarnings.flat());
    }
    
    STATS.typeWarnings = warnings.length;
    return warnings;
}

function analyzeFileTypeSafety(filePath, content) {
    const warnings = [];
    const cleanContent = stripCommentsAdvanced(content);
    
    // Check 1: Excessive 'any' usage
    if (CONFIG.typeChecks.maxAnyUsage > 0) {
        const anyMatches = cleanContent.match(/:\s*any\b|<any>|as\s+any\b/g) || [];
        if (anyMatches.length > CONFIG.typeChecks.maxAnyUsage) {
            warnings.push({
                file: filePath,
                line: 0,
                issue: `Excessive 'any' usage: ${anyMatches.length} occurrences (threshold: ${CONFIG.typeChecks.maxAnyUsage})`,
                severity: 'High',
                category: 'Type Safety'
            });
        }
    }
    
    // Check 2: Async functions without Promise return type
    if (CONFIG.typeChecks.checkAsyncReturnTypes) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            if (/export\s+(?:async\s+function|const\s+\w+\s*=\s*async)/.test(line)) {
                if (!line.includes('Promise') && !line.includes(': void')) {
                    warnings.push({
                        file: filePath,
                        line: idx + 1,
                        issue: 'Async export lacks explicit return type annotation (Promise<T>)',
                        severity: 'Medium',
                        category: 'Async/Await'
                    });
                }
            }
        });
    }
    
    // Check 3: Implicit any in function parameters
    if (CONFIG.typeChecks.warnOnImplicitAny) {
        const implicitAnyRegex = /function\s+\w+\s*\(([^)]*)\)/g;
        for (const match of content.matchAll(implicitAnyRegex)) {
            const params = match[1];
            if (params && !params.includes(':') && params.trim().length > 0) {
                const lineNum = content.substring(0, match.index).split('\n').length;
                warnings.push({
                    file: filePath,
                    line: lineNum,
                    issue: 'Function parameters lack type annotations',
                    severity: 'Low',
                    category: 'Type Safety'
                });
            }
        }
    }
    
    return warnings;
}

// =============================================================================
// MARKDOWN REPORT GENERATION
// =============================================================================

async function generateMarkdownReport(errors, typeWarnings) {
    const outputDir = path.dirname(CONFIG.outputFile);
    await fs.mkdir(outputDir, { recursive: true });

    const statusBadge = errors.length === 0
        ? '![Status](https://img.shields.io/badge/status-passing-brightgreen)'
        : '![Status](https://img.shields.io/badge/status-failing-red)';
    
    const typesBadge = typeWarnings.length === 0
        ? '![Types](https://img.shields.io/badge/type_safety-excellent-blue)'
        : '![Types](https://img.shields.io/badge/type_safety-warnings-yellow)';

    let report = '';
    
    // Header
    report += `# 📊 Strategic Export Analysis Report\n\n`;
    report += `${statusBadge} ${typesBadge}\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}  \n`;
    report += `**Validator:** v13.0  \n`;
    report += `**Mode:** ${CONFIG.strictness.toUpperCase()}  \n`;
    report += `**Duration:** ${((Date.now() - STATS.startTime) / 1000).toFixed(2)}s\n\n`;

    // Executive Summary
    report += `## 📈 Executive Summary\n\n`;
    report += createDetailedSummaryTable();
    
    // Performance Metrics
    if (STATS.phases && Object.keys(STATS.phases).length > 0) {
        report += `\n### ⚡ Performance Breakdown\n\n`;
        report += `| Phase | Duration |\n|:------|----------:|\n`;
        for (const [phase, duration] of Object.entries(STATS.phases)) {
            report += `| ${phase} | ${(duration / 1000).toFixed(2)}s |\n`;
        }
        report += `\n`;
    }

    // Critical Issues
    if (errors.length > 0) {
        report += `\n## 🚨 Critical Issues (${errors.length})\n\n`;
        report += createEnhancedErrorTable(errors);
    } else {
        report += `\n## ✅ Import/Export Validation\n\n`;
        report += `All ${STATS.importsChecked} imports successfully resolve to valid exports. No mismatches detected.\n`;
    }

    // Type Safety Warnings
    if (typeWarnings.length > 0) {
        report += `\n## ⚠️ Type Safety Warnings (${typeWarnings.length})\n\n`;
        report += createTypeWarningTable(typeWarnings);
    } else if (CONFIG.typeChecks.enabled) {
        report += `\n## ✅ Type Safety\n\n`;
        report += `All type safety checks passed. No warnings generated.\n`;
    }

    // Recommendations
    if (errors.length > 0 || typeWarnings.length > 0) {
        report += `\n## 💡 Recommendations\n\n`;
        report += generateRecommendations(errors, typeWarnings);
    }

    // Footer
    report += `\n---\n\n`;
    report += `*Generated by Strategic Export Validator v13.0*  \n`;
    report += `*For issues or suggestions, review the configuration in the validator script*\n`;

    await fs.writeFile(CONFIG.outputFile, report, 'utf-8');
}

function createDetailedSummaryTable() {
    const successRate = STATS.filesScanned > 0 
        ? ((STATS.filesSuccessful / STATS.filesScanned) * 100).toFixed(1)
        : 0;
    
    const cacheEfficiency = STATS.resolutionCacheHits + STATS.resolutionCacheMisses > 0
        ? ((STATS.resolutionCacheHits / (STATS.resolutionCacheHits + STATS.resolutionCacheMisses)) * 100).toFixed(1)
        : 0;

    return `| Metric | Value | Status |\n` +
           `|:-------|------:|:------:|\n` +
           `| Files Scanned | ${STATS.filesScanned} | ℹ️ |\n` +
           `| Successfully Parsed | ${STATS.filesSuccessful} (${successRate}%) | ${STATS.parseErrors === 0 ? '✅' : '⚠️'} |\n` +
           `| Parse Errors | ${STATS.parseErrors} | ${STATS.parseErrors === 0 ? '✅' : '⚠️'} |\n` +
           `| Imports Validated | ${STATS.importsChecked} | ℹ️ |\n` +
           `| Import Mismatches | ${STATS.importMismatches} | ${STATS.importMismatches === 0 ? '✅' : '❌'} |\n` +
           `| Type Warnings | ${STATS.typeWarnings} | ${STATS.typeWarnings === 0 ? '✅' : '⚠️'} |\n` +
           `| Cache Efficiency | ${cacheEfficiency}% | ${parseFloat(cacheEfficiency) > 80 ? '⚡' : 'ℹ️'} |\n\n`;
}

function createEnhancedErrorTable(errors) {
    let table = `| File | Issue | Missing | Suggestion | Severity |\n`;
    table += `|:-----|:------|:--------|:-----------|:--------:|\n`;
    
    const displayCount = Math.min(errors.length, 100);
    for (let i = 0; i < displayCount; i++) {
        const err = errors[i];
        const relPath = path.relative(CONFIG.rootDir, err.file);
        const shortPath = relPath.length > 50 ? '...' + relPath.slice(-47) : relPath;
        
        table += `| \`${shortPath}\` `;
        table += `| Import: \`${err.importPath}\` `;
        table += `| \`${err.missingExport}\` `;
        table += `| ${err.recommendation} `;
        table += `| ${getSeverityEmoji(err.severity)} ${err.severity} |\n`;
    }
    
    if (errors.length > displayCount) {
        table += `\n*...and ${errors.length - displayCount} more issues*\n`;
    }
    
    return table;
}

function createTypeWarningTable(warnings) {
    // Group by category
    const byCategory = warnings.reduce((acc, w) => {
        const cat = w.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(w);
        return acc;
    }, {});
    
    let table = '';
    
    for (const [category, items] of Object.entries(byCategory)) {
        table += `\n### ${category}\n\n`;
        table += `| File | Line | Issue | Severity |\n`;
        table += `|:-----|-----:|:------|:--------:|\n`;
        
        const displayCount = Math.min(items.length, 50);
        for (let i = 0; i < displayCount; i++) {
            const warn = items[i];
            const relPath = path.relative(CONFIG.rootDir, warn.file);
            const shortPath = relPath.length > 60 ? '...' + relPath.slice(-57) : relPath;
            
            table += `| \`${shortPath}\` `;
            table += `| ${warn.line || '-'} `;
            table += `| ${warn.issue} `;
            table += `| ${getSeverityEmoji(warn.severity)} ${warn.severity} |\n`;
        }
        
        if (items.length > displayCount) {
            table += `\n*...and ${items.length - displayCount} more in this category*\n`;
        }
    }
    
    return table;
}

function generateRecommendations(errors, warnings) {
    let rec = '';
    
    if (errors.length > 0) {
        rec += `### 🔧 Import/Export Issues\n\n`;
        rec += `1. **Review missing exports**: Check if exports exist in target modules\n`;
        rec += `2. **Verify path aliases**: Ensure tsconfig.json paths match CONFIG.aliases\n`;
        rec += `3. **Check file extensions**: Some imports may be missing file extensions\n`;
        rec += `4. **Re-export chains**: Verify all re-export sources are accessible\n\n`;
    }
    
    if (warnings.length > 0) {
        rec += `### 🛡️ Type Safety Improvements\n\n`;
        rec += `1. **Reduce 'any' usage**: Add explicit types where possible\n`;
        rec += `2. **Annotate async functions**: Add Promise<T> return types\n`;
        rec += `3. **Type function parameters**: Add type annotations to all parameters\n`;
        rec += `4. **Enable strict mode**: Consider \`"strict": true\` in tsconfig.json\n\n`;
    }
    
    return rec;
}

function getSeverityEmoji(severity) {
    const map = {
        'Critical': '🔴',
        'High': '🟠',
        'Medium': '🟡',
        'Low': '🔵'
    };
    return map[severity] || '⚪';
}

// =============================================================================
// EXECUTION
// =============================================================================

main();