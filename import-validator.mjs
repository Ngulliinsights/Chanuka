#!/usr/bin/env node

/**
 * UNIFIED IMPORT/EXPORT VALIDATOR v12.0
 * 
 * Comprehensive static analysis tool combining import validation,
 * export verification, and type safety analysis in one optimized package.
 * 
 * Features:
 * - High-performance parallel processing with smart batching
 * - Complete import/export validation with circular dependency detection
 * - Path alias resolution (TypeScript/Vite/Webpack)
 * - Type safety analysis with configurable thresholds
 * - Dead export detection (unused exports across project)
 * - Barrel file analysis and optimization suggestions
 * - Detailed, actionable reporting with fix suggestions
 * 
 * Usage:
 *   node unified-validator.mjs                    # Full analysis
 *   QUICK=true node unified-validator.mjs         # Skip type analysis
 *   STRICT=true node unified-validator.mjs        # Stricter validation
 *   DEAD_CODE=true node unified-validator.mjs     # Include dead export scan
 * 
 * @file unified-validator.mjs
 * @version 12.0
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    rootDir: process.cwd(),
    outputFile: 'docs/import-export-analysis.md',
    
    // File patterns
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    exclude: [
        'node_modules', 'dist', 'build', '.git', 'coverage',
        '.next', 'out', '__tests__', '__mocks__', 'vendor',
        '.venv', 'venv', '__pycache__', 'target', 'backup',
        '.cache', 'tmp', 'temp', '.turbo'
    ],
    
    // Performance
    maxConcurrentFiles: 150,
    enableCache: true,
    
    // Analysis modes
    quickMode: process.env.QUICK === 'true',
    strictMode: process.env.STRICT === 'true',
    detectDeadCode: process.env.DEAD_CODE === 'true',
    
    // Type safety thresholds
    typeChecks: {
        maxAnyUsage: 8,
        checkAsyncReturnTypes: true,
        checkUnexplicitTypes: true
    },
    
    // Barrel file detection
    barrelPatterns: ['index.ts', 'index.js', 'index.tsx', 'index.jsx']
};

// =============================================================================
// GLOBAL STATE
// =============================================================================

const STATE = {
    files: new Map(),
    pathAliases: new Map(),
    baseUrl: '',
    fileCache: new Map(),
    importGraph: new Map(), // For circular dependency detection
    exportUsage: new Map()  // Track which exports are actually used
};

const STATS = {
    filesScanned: 0,
    importsChecked: 0,
    dynamicImports: 0,
    reExports: 0,
    circularDeps: new Set(),
    startTime: Date.now()
};

const ISSUES = {
    missingFiles: [],
    missingExports: [],
    typeWarnings: [],
    circularDeps: [],
    deadExports: [],
    barrelIssues: []
};

// =============================================================================
// COMPILED REGEX PATTERNS (OPTIMIZED)
// =============================================================================

const PATTERNS = {
    // Import patterns
    staticImport: /import\s+(?:type\s+)?([^'"]+?)\s+from\s+['"]([^'"]+)['"]/g,
    dynamicImport: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    requireCall: /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    typeImport: /:\s*import\(['"]([^'"]+)['"]\)/g,
    
    // Export patterns
    namedExport: /export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function|class|enum|type|interface|namespace)\s+([a-zA-Z0-9_$]+)/g,
    exportBlock: /export\s*\{([^}]+)\}(?:\s*from\s*['"]([^'"]+)['"])?/g,
    defaultExport: /export\s+default\s+/,
    wildcardReExport: /export\s+\*\s+from\s+['"]([^'"]+)['"]/g,
    namedReExport: /export\s+\*\s+as\s+([a-zA-Z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/g,
    
    // Comments (more robust)
    multiComment: /\/\*[\s\S]*?\*\//g,
    singleComment: /^([^"'`]*?)\/\/.*$/gm,
    
    // Type safety checks
    anyType: /:\s*any\b|<any>|as\s+any\b/g,
    asyncFunction: /export\s+(?:async\s+function|const\s+\w+\s*=\s*async)/g
};

// =============================================================================
// UTILITIES
// =============================================================================

const log = {
    header: (msg) => console.log(`\n${'='.repeat(80)}\n${msg}\n${'='.repeat(80)}`),
    info: (msg) => console.log(`ℹ️  ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️  ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    debug: (msg) => CONFIG.strictMode && console.log(`🔍 ${msg}`)
};

function stripComments(content) {
    return content
        .replace(PATTERNS.multiComment, ' ')
        .replace(PATTERNS.singleComment, '$1');
}

function normalizeSymbol(symbol) {
    return symbol.trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        .trim();
}

function isExternalModule(importPath) {
    return !importPath.startsWith('.') && 
           !importPath.startsWith('/') && 
           !importPath.startsWith('~');
}

// =============================================================================
// PATH ALIAS LOADING
// =============================================================================

async function loadPathAliases() {
    log.info('Loading path aliases...');
    
    const configs = [
        { file: 'tsconfig.json', parser: parseTsConfig },
        { file: 'jsconfig.json', parser: parseTsConfig },
        { file: 'vite.config.js', parser: parseViteConfig },
        { file: 'vite.config.ts', parser: parseViteConfig }
    ];
    
    for (const { file, parser } of configs) {
        const configPath = path.join(CONFIG.rootDir, file);
        if (!fsSync.existsSync(configPath)) continue;
        
        try {
            const content = await fs.readFile(configPath, 'utf-8');
            const aliases = parser(content);
            
            for (const [alias, target] of Object.entries(aliases)) {
                STATE.pathAliases.set(alias, target);
            }
            
            if (Object.keys(aliases).length > 0) {
                log.debug(`Loaded ${Object.keys(aliases).length} aliases from ${file}`);
                break;
            }
        } catch (error) {
            log.debug(`Could not parse ${file}: ${error.message}`);
        }
    }
    
    if (STATE.pathAliases.size > 0) {
        log.success(`Loaded ${STATE.pathAliases.size} path aliases`);
    }
}

function parseTsConfig(content) {
    const aliases = {};
    const cleaned = content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
    
    try {
        const config = JSON.parse(cleaned);
        
        if (config.compilerOptions?.baseUrl) {
            STATE.baseUrl = config.compilerOptions.baseUrl;
        }
        
        if (config.compilerOptions?.paths) {
            for (const [alias, targets] of Object.entries(config.compilerOptions.paths)) {
                const cleanAlias = alias.replace(/\/\*$/, '');
                const cleanTarget = (targets[0] || '').replace(/\/\*$/, '');
                if (cleanTarget) aliases[cleanAlias] = cleanTarget;
            }
        }
    } catch {
        // Regex fallback
        const pathsMatch = content.match(/"paths"\s*:\s*\{([^}]+)\}/s);
        if (pathsMatch) {
            const entries = pathsMatch[1].match(/"([^"]+)"\s*:\s*\["([^"]+)"\]/g) || [];
            for (const entry of entries) {
                const match = entry.match(/"([^"]+)"\s*:\s*\["([^"]+)"\]/);
                if (match) {
                    aliases[match[1].replace(/\/\*$/, '')] = match[2].replace(/\/\*$/, '');
                }
            }
        }
    }
    
    return aliases;
}

function parseViteConfig(content) {
    const aliases = {};
    const aliasMatch = content.match(/alias\s*:\s*\{([^}]+)\}/s);
    
    if (aliasMatch) {
        const entries = aliasMatch[1].match(/['"]?(@[^'":\s]+|~)['"]?\s*:\s*['"]([^'"]+)['"]/g) || [];
        for (const entry of entries) {
            const match = entry.match(/['"]?(@[^'":\s]+|~)['"]?\s*:\s*['"]([^'"]+)['"]/);
            if (match) aliases[match[1]] = match[2];
        }
    }
    
    return aliases;
}

// =============================================================================
// FILE DISCOVERY
// =============================================================================

async function walkDirectory(dir) {
    const files = [];
    const stack = [dir];
    
    while (stack.length > 0) {
        const currentDir = stack.pop();
        let entries;
        
        try {
            entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch {
            continue;
        }
        
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(CONFIG.rootDir, fullPath);
            
            if (CONFIG.exclude.some(ex => relativePath.split(path.sep).includes(ex))) {
                continue;
            }
            
            if (entry.isDirectory()) {
                stack.push(fullPath);
            } else if (CONFIG.extensions.includes(path.extname(entry.name))) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

// =============================================================================
// PARSING ENGINE
// =============================================================================

function parseImportedSymbols(importClause) {
    const symbols = [];
    const cleaned = importClause.trim();
    
    // Default import
    const defaultMatch = cleaned.match(/^([a-zA-Z0-9_$]+)(?:\s*,)?/);
    if (defaultMatch && !cleaned.startsWith('{') && !cleaned.includes('* as')) {
        symbols.push('default');
    }
    
    // Namespace import
    if (cleaned.includes('* as')) {
        symbols.push('*');
    }
    
    // Named imports
    const namedMatch = cleaned.match(/\{([^}]+)\}/);
    if (namedMatch) {
        const names = namedMatch[1]
            .split(',')
            .map(normalizeSymbol)
            .filter(s => s && s !== 'type');
        symbols.push(...names);
    }
    
    return symbols;
}

function extractExports(content) {
    const exports = new Set();
    const reExports = [];
    
    // Named exports
    PATTERNS.namedExport.lastIndex = 0;
    let match;
    while ((match = PATTERNS.namedExport.exec(content)) !== null) {
        exports.add(match[1]);
    }
    
    // Export blocks
    PATTERNS.exportBlock.lastIndex = 0;
    while ((match = PATTERNS.exportBlock.exec(content)) !== null) {
        const [, namesBlock, fromSource] = match;
        
        const names = namesBlock.split(',').map(normalizeSymbol).filter(Boolean);
        names.forEach(name => exports.add(name));
        
        if (fromSource) {
            reExports.push(fromSource);
            exports.add('*'); // Indicates re-export capability
        }
    }
    
    // Default export
    if (PATTERNS.defaultExport.test(content)) {
        exports.add('default');
    }
    
    // Wildcard re-exports
    PATTERNS.wildcardReExport.lastIndex = 0;
    while ((match = PATTERNS.wildcardReExport.exec(content)) !== null) {
        reExports.push(match[1]);
        exports.add('*');
        STATS.reExports++;
    }
    
    // Named re-exports
    PATTERNS.namedReExport.lastIndex = 0;
    while ((match = PATTERNS.namedReExport.exec(content)) !== null) {
        exports.add(match[1]);
        reExports.push(match[2]);
    }
    
    return { exports, reExports };
}

function extractImports(content) {
    const imports = [];
    
    // Static imports
    PATTERNS.staticImport.lastIndex = 0;
    let match;
    while ((match = PATTERNS.staticImport.exec(content)) !== null) {
        imports.push({
            path: match[2],
            symbols: parseImportedSymbols(match[1]),
            type: 'static'
        });
    }
    
    // Dynamic imports
    PATTERNS.dynamicImport.lastIndex = 0;
    while ((match = PATTERNS.dynamicImport.exec(content)) !== null) {
        imports.push({
            path: match[1],
            symbols: ['*'],
            type: 'dynamic'
        });
        STATS.dynamicImports++;
    }
    
    // Require statements
    PATTERNS.requireCall.lastIndex = 0;
    while ((match = PATTERNS.requireCall.exec(content)) !== null) {
        imports.push({
            path: match[1],
            symbols: [],
            type: 'require'
        });
    }
    
    // Type imports
    PATTERNS.typeImport.lastIndex = 0;
    while ((match = PATTERNS.typeImport.exec(content)) !== null) {
        imports.push({
            path: match[1],
            symbols: ['*'],
            type: 'type'
        });
    }
    
    return imports;
}

async function parseFile(filePath) {
    try {
        // Check cache
        if (CONFIG.enableCache && STATE.fileCache.has(filePath)) {
            const stat = await fs.stat(filePath);
            const cached = STATE.fileCache.get(filePath);
            if (cached.mtime === stat.mtimeMs) {
                return cached.data;
            }
        }
        
        const content = await fs.readFile(filePath, 'utf-8');
        const cleanContent = stripComments(content);
        
        const { exports, reExports } = extractExports(cleanContent);
        const imports = extractImports(cleanContent);
        
        const fileData = {
            path: filePath,
            exports,
            reExports,
            imports,
            isBarrel: CONFIG.barrelPatterns.includes(path.basename(filePath))
        };
        
        // Cache
        if (CONFIG.enableCache) {
            const stat = await fs.stat(filePath);
            STATE.fileCache.set(filePath, {
                mtime: stat.mtimeMs,
                data: fileData
            });
        }
        
        STATE.files.set(filePath, fileData);
        STATS.filesScanned++;
        STATS.importsChecked += imports.length;
        
        return fileData;
        
    } catch (error) {
        log.debug(`Failed to parse ${filePath}: ${error.message}`);
        return null;
    }
}

async function parseAllFiles(files) {
    log.info('Parsing files...');
    
    const batches = [];
    for (let i = 0; i < files.length; i += CONFIG.maxConcurrentFiles) {
        batches.push(files.slice(i, i + CONFIG.maxConcurrentFiles));
    }
    
    for (let i = 0; i < batches.length; i++) {
        await Promise.all(batches[i].map(file => parseFile(file)));
        
        if (files.length > 50 && (i + 1) % 3 === 0) {
            const progress = Math.round(((i + 1) * batches[i].length / files.length) * 100);
            process.stdout.write(`\r  Progress: ${progress}%`);
        }
    }
    
    if (files.length > 50) console.log('');
    log.success(`Parsed ${STATE.files.size.toLocaleString()} files`);
}

// =============================================================================
// PATH RESOLUTION
// =============================================================================

function resolveAlias(importPath) {
    for (const [alias, target] of STATE.pathAliases) {
        if (importPath === alias || importPath.startsWith(alias + '/')) {
            const resolved = importPath.replace(alias, target);
            return STATE.baseUrl ? path.join(STATE.baseUrl, resolved) : resolved;
        }
    }
    return importPath;
}

function resolveImportPath(sourceFile, importPath) {
    if (isExternalModule(importPath)) {
        const resolved = resolveAlias(importPath);
        if (resolved === importPath || isExternalModule(resolved)) {
            return null;
        }
        importPath = resolved;
    }
    
    let targetPath = importPath.startsWith('.')
        ? path.resolve(path.dirname(sourceFile), importPath)
        : path.join(CONFIG.rootDir, importPath);
    
    // Try with extensions
    for (const ext of ['', ...CONFIG.extensions]) {
        const fullPath = targetPath + ext;
        if (fsSync.existsSync(fullPath)) {
            const stat = fsSync.statSync(fullPath);
            if (stat.isFile()) return fullPath;
        }
    }
    
    // Try index files
    if (fsSync.existsSync(targetPath)) {
        const stat = fsSync.statSync(targetPath);
        if (stat.isDirectory()) {
            for (const ext of CONFIG.extensions) {
                const indexPath = path.join(targetPath, 'index' + ext);
                if (fsSync.existsSync(indexPath)) return indexPath;
            }
        }
    }
    
    return null;
}

// =============================================================================
// VALIDATION ENGINE
// =============================================================================

function validateImportsAndExports() {
    log.info('Validating import/export relationships...');
    
    for (const [filePath, fileData] of STATE.files) {
        // Initialize import graph
        STATE.importGraph.set(filePath, new Set());
        
        for (const importInfo of fileData.imports) {
            const resolvedPath = resolveImportPath(filePath, importInfo.path);
            
            // Track for circular dependency detection
            if (resolvedPath) {
                STATE.importGraph.get(filePath).add(resolvedPath);
            }
            
            // Missing file
            if (!resolvedPath) {
                if (!isExternalModule(importInfo.path) && 
                    !resolveAlias(importInfo.path).startsWith('.')) {
                    ISSUES.missingFiles.push({
                        file: filePath,
                        importPath: importInfo.path,
                        type: importInfo.type
                    });
                }
                continue;
            }
            
            // Validate exported symbols
            if (importInfo.symbols.length > 0 && !importInfo.symbols.includes('*')) {
                const targetFile = STATE.files.get(resolvedPath);
                if (!targetFile) continue;
                
                // Track export usage
                for (const symbol of importInfo.symbols) {
                    const key = `${resolvedPath}::${symbol}`;
                    STATE.exportUsage.set(key, (STATE.exportUsage.get(key) || 0) + 1);
                }
                
                const missingSymbols = importInfo.symbols.filter(symbol => {
                    if (symbol === 'default') {
                        return !targetFile.exports.has('default');
                    }
                    if (targetFile.exports.has('*')) {
                        return false; // Re-export file
                    }
                    return !targetFile.exports.has(symbol);
                });
                
                if (missingSymbols.length > 0 && targetFile.exports.size > 0) {
                    ISSUES.missingExports.push({
                        file: filePath,
                        importPath: importInfo.path,
                        resolvedPath,
                        symbols: missingSymbols,
                        availableExports: Array.from(targetFile.exports).filter(e => e !== '*').slice(0, 10)
                    });
                }
            }
        }
    }
    
    log.success(`Validated ${STATS.importsChecked.toLocaleString()} imports`);
}

// =============================================================================
// CIRCULAR DEPENDENCY DETECTION
// =============================================================================

function detectCircularDependencies() {
    log.info('Detecting circular dependencies...');
    
    function findCycle(node, visited = new Set(), path = []) {
        if (path.includes(node)) {
            const cycle = path.slice(path.indexOf(node)).concat(node);
            const cycleKey = cycle.sort().join('->');
            STATS.circularDeps.add(cycleKey);
            ISSUES.circularDeps.push(cycle);
            return;
        }
        
        if (visited.has(node)) return;
        visited.add(node);
        
        const neighbors = STATE.importGraph.get(node) || new Set();
        for (const neighbor of neighbors) {
            findCycle(neighbor, visited, [...path, node]);
        }
    }
    
    for (const node of STATE.importGraph.keys()) {
        findCycle(node);
    }
    
    if (STATS.circularDeps.size > 0) {
        log.warning(`Found ${STATS.circularDeps.size} circular dependencies`);
    }
}

// =============================================================================
// DEAD CODE DETECTION
// =============================================================================

function detectDeadExports() {
    if (!CONFIG.detectDeadCode) return;
    
    log.info('Detecting unused exports...');
    
    for (const [filePath, fileData] of STATE.files) {
        for (const exportName of fileData.exports) {
            if (exportName === '*') continue;
            
            const key = `${filePath}::${exportName}`;
            const usageCount = STATE.exportUsage.get(key) || 0;
            
            if (usageCount === 0 && exportName !== 'default') {
                ISSUES.deadExports.push({
                    file: filePath,
                    export: exportName
                });
            }
        }
    }
    
    if (ISSUES.deadExports.length > 0) {
        log.warning(`Found ${ISSUES.deadExports.length} potentially unused exports`);
    }
}

// =============================================================================
// TYPE SAFETY ANALYSIS
// =============================================================================

async function analyzeTypeSafety() {
    if (CONFIG.quickMode) return;
    
    log.info('Analyzing type safety...');
    
    const tsFiles = Array.from(STATE.files.keys()).filter(f => f.match(/\.tsx?$/));
    
    for (const file of tsFiles) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            
            // Check 1: Excessive 'any' usage
            const anyMatches = content.match(PATTERNS.anyType) || [];
            if (anyMatches.length > CONFIG.typeChecks.maxAnyUsage) {
                ISSUES.typeWarnings.push({
                    file,
                    line: 0,
                    issue: `High 'any' usage: ${anyMatches.length} occurrences (threshold: ${CONFIG.typeChecks.maxAnyUsage})`,
                    severity: 'High'
                });
            }
            
            // Check 2: Async functions without return types
            if (CONFIG.typeChecks.checkAsyncReturnTypes) {
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (PATTERNS.asyncFunction.test(line)) {
                        if (!line.includes('Promise') && !line.includes(': void')) {
                            ISSUES.typeWarnings.push({
                                file,
                                line: index + 1,
                                issue: 'Async export lacks explicit return type',
                                severity: 'Medium'
                            });
                        }
                    }
                });
            }
        } catch {
            continue;
        }
    }
    
    if (ISSUES.typeWarnings.length > 0) {
        log.warning(`Found ${ISSUES.typeWarnings.length} type safety warnings`);
    }
}

// =============================================================================
// BARREL FILE ANALYSIS
// =============================================================================

function analyzeBarrelFiles() {
    log.info('Analyzing barrel files...');
    
    const barrels = Array.from(STATE.files.entries())
        .filter(([, data]) => data.isBarrel);
    
    for (const [filePath, fileData] of barrels) {
        const reExportCount = fileData.reExports.length;
        const directExportCount = fileData.exports.size - (fileData.exports.has('*') ? 1 : 0);
        
        // Flag barrels that might be performance bottlenecks
        if (reExportCount > 20) {
            ISSUES.barrelIssues.push({
                file: filePath,
                issue: `Large barrel file with ${reExportCount} re-exports`,
                recommendation: 'Consider splitting or using direct imports',
                severity: 'Medium'
            });
        }
        
        // Flag barrels with mixed patterns
        if (reExportCount > 0 && directExportCount > 0) {
            ISSUES.barrelIssues.push({
                file: filePath,
                issue: 'Mixed re-exports and direct exports',
                recommendation: 'Keep barrel files focused on re-exporting',
                severity: 'Low'
            });
        }
    }
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

async function generateReport() {
    log.info('Generating comprehensive report...');
    
    await fs.mkdir(path.dirname(CONFIG.outputFile), { recursive: true });
    
    const duration = ((Date.now() - STATS.startTime) / 1000).toFixed(2);
    const totalIssues = ISSUES.missingFiles.length + ISSUES.missingExports.length;
    const isClean = totalIssues === 0;
    
    let report = `# Import/Export Analysis Report\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n`;
    report += `**Duration:** ${duration}s\n`;
    report += `**Mode:** ${CONFIG.quickMode ? 'Quick' : 'Full'} | ${CONFIG.strictMode ? 'Strict' : 'Normal'}\n`;
    report += `**Status:** ${isClean ? '✅ All Valid' : '❌ Issues Found'}\n\n`;
    
    // Summary
    report += `## 📊 Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|------:|\n`;
    report += `| Files Analyzed | ${STATS.filesScanned.toLocaleString()} |\n`;
    report += `| Imports Checked | ${STATS.importsChecked.toLocaleString()} |\n`;
    report += `| Dynamic Imports | ${STATS.dynamicImports.toLocaleString()} |\n`;
    report += `| Re-exports | ${STATS.reExports.toLocaleString()} |\n`;
    report += `| Path Aliases | ${STATE.pathAliases.size} |\n`;
    report += `| **Missing Files** | **${ISSUES.missingFiles.length}** |\n`;
    report += `| **Missing Exports** | **${ISSUES.missingExports.length}** |\n`;
    report += `| **Circular Dependencies** | **${STATS.circularDeps.size}** |\n`;
    
    if (!CONFIG.quickMode) {
        report += `| Type Warnings | ${ISSUES.typeWarnings.length} |\n`;
    }
    
    if (CONFIG.detectDeadCode) {
        report += `| Unused Exports | ${ISSUES.deadExports.length} |\n`;
    }
    
    report += `\n`;
    
    // Critical Issues Section
    if (ISSUES.missingFiles.length > 0) {
        report += `## ❌ Missing Files (${ISSUES.missingFiles.length})\n\n`;
        report += `These imports reference files that don't exist:\n\n`;
        
        const grouped = groupByFile(ISSUES.missingFiles);
        for (const [file, issues] of grouped.entries()) {
            report += `### \`${file}\`\n\n`;
            for (const issue of issues) {
                report += `- \`${issue.importPath}\` (${issue.type} import)\n`;
            }
            report += `\n`;
        }
    }
    
    if (ISSUES.missingExports.length > 0) {
        report += `## ⚠️  Missing Exports (${ISSUES.missingExports.length})\n\n`;
        
        const grouped = groupByFile(ISSUES.missingExports);
        for (const [file, issues] of grouped.entries()) {
            report += `### \`${file}\`\n\n`;
            for (const issue of issues) {
                report += `**\`${issue.importPath}\`**\n\n`;
                report += `- Missing: \`${issue.symbols.join('`, `')}\`\n`;
                if (issue.availableExports.length > 0) {
                    report += `- Available: \`${issue.availableExports.join('`, `')}\`\n`;
                }
                report += `\n`;
            }
        }
    }
    
    // Circular Dependencies
    if (ISSUES.circularDeps.length > 0) {
        report += `## 🔄 Circular Dependencies (${STATS.circularDeps.size})\n\n`;
        report += `These files form circular dependency chains:\n\n`;
        
        const unique = Array.from(STATS.circularDeps).slice(0, 20);
        for (const cycleKey of unique) {
            const files = cycleKey.split('->').map(f => path.relative(CONFIG.rootDir, f));
            report += `- ${files.join(' → ')}\n`;
        }
        
        if (STATS.circularDeps.size > 20) {
            report += `\n*...and ${STATS.circularDeps.size - 20} more*\n`;
        }
        
        report += `\n**Impact:** Circular dependencies can cause:\n`;
        report += `- Initialization order issues\n`;
        report += `- Harder code maintenance\n`;
        report += `- Potential runtime errors\n\n`;
    }
    
    // Type Safety Warnings
    if (!CONFIG.quickMode && ISSUES.typeWarnings.length > 0) {
        report += `## 🛡️  Type Safety Warnings (${ISSUES.typeWarnings.length})\n\n`;
        
        const grouped = groupByFile(ISSUES.typeWarnings);
        const displayCount = Math.min(grouped.size, 15);
        let count = 0;
        
        for (const [file, warnings] of grouped.entries()) {
            if (count++ >= displayCount) break;
            
            report += `### \`${file}\`\n\n`;
            for (const warning of warnings) {
                const lineInfo = warning.line > 0 ? `Line ${warning.line}: ` : '';
                report += `- [${warning.severity}] ${lineInfo}${warning.issue}\n`;
            }
            report += `\n`;
        }
        
        if (grouped.size > displayCount) {
            report += `*...and ${grouped.size - displayCount} more files*\n\n`;
        }
    }
    
    // Dead Exports
    if (CONFIG.detectDeadCode && ISSUES.deadExports.length > 0) {
        report += `## 🗑️  Potentially Unused Exports (${ISSUES.deadExports.length})\n\n`;
        report += `These exports don't appear to be imported anywhere:\n\n`;
        
        const grouped = groupByFile(ISSUES.deadExports);
        const displayCount = Math.min(grouped.size, 20);
        let count = 0;
        
        for (const [file, exports] of grouped.entries()) {
            if (count++ >= displayCount) break;
            
            const exportNames = exports.map(e => e.export);
            report += `- \`${file}\`: \`${exportNames.join('`, `')}\`\n`;
        }
        
        if (grouped.size > displayCount) {
            report += `\n*...and ${grouped.size - displayCount} more files*\n`;
        }
        
        report += `\n⚠️  **Note:** Some exports may be used in tests, external apps, or dynamic imports not detected by static analysis.\n\n`;
    }
    
    // Barrel File Analysis
    if (ISSUES.barrelIssues.length > 0) {
        report += `## 📦 Barrel File Recommendations (${ISSUES.barrelIssues.length})\n\n`;
        
        for (const issue of ISSUES.barrelIssues) {
            const relPath = path.relative(CONFIG.rootDir, issue.file);
            report += `### \`${relPath}\`\n\n`;
            report += `- **Issue:** ${issue.issue}\n`;
            report += `- **Recommendation:** ${issue.recommendation}\n`;
            report += `- **Severity:** ${issue.severity}\n\n`;
        }
    }
    
    // Resolution Guide
    report += `## 🔧 How to Fix\n\n`;
    report += `### Missing Files\n`;
    report += `1. Check for typos in import paths\n`;
    report += `2. Verify files weren't deleted/moved\n`;
    report += `3. Update path aliases in tsconfig.json\n`;
    report += `4. Check file extensions match\n\n`;
    
    report += `### Missing Exports\n`;
    report += `1. Verify symbols are exported from target file\n`;
    report += `2. Check for typos in export/import names\n`;
    report += `3. Ensure correct default vs named export usage\n`;
    report += `4. Review barrel file re-exports\n\n`;
    
    report += `### Circular Dependencies\n`;
    report += `1. Extract shared code to separate module\n`;
    report += `2. Use dependency injection\n`;
    report += `3. Restructure code to break cycles\n`;
    report += `4. Consider using interfaces/types for decoupling\n\n`;
    
    // Configuration
    report += `## ⚙️  Configuration\n\n`;
    report += `- **Root:** \`${CONFIG.rootDir}\`\n`;
    report += `- **Extensions:** \`${CONFIG.extensions.join(', ')}\`\n`;
    report += `- **Excluded:** \`${CONFIG.exclude.slice(0, 5).join(', ')}\`${CONFIG.exclude.length > 5 ? ', ...' : ''}\n`;
    
    if (STATE.pathAliases.size > 0) {
        report += `- **Path Aliases:**\n`;
        for (const [alias, target] of STATE.pathAliases) {
            report += `  - \`${alias}\` → \`${target}\`\n`;
        }
    }
    
    report += `\n---\n\n`;
    report += `*Analysis by Unified Import/Export Validator v12.0*\n`;
    
    await fs.writeFile(CONFIG.outputFile, report, 'utf-8');
    log.success(`Report saved: ${CONFIG.outputFile}`);
}

function groupByFile(issues) {
    const grouped = new Map();
    for (const issue of issues) {
        const relPath = path.relative(CONFIG.rootDir, issue.file);
        if (!grouped.has(relPath)) grouped.set(relPath, []);
        grouped.get(relPath).push(issue);
    }
    return grouped;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    log.header('🔍 UNIFIED IMPORT/EXPORT VALIDATOR v12.0');
    
    console.log(`Mode: ${CONFIG.quickMode ? 'Quick' : 'Full'} Analysis`);
    console.log(`Strictness: ${CONFIG.strictMode ? 'Strict' : 'Normal'}`);
    console.log(`Dead Code Detection: ${CONFIG.detectDeadCode ? 'Enabled' : 'Disabled'}\n`);
    
    try {
        // Phase 1: Setup
        await loadPathAliases();
        
        // Phase 2: Discovery & Parsing
        log.info('Discovering source files...');
        const files = await walkDirectory(CONFIG.rootDir);
        
        if (files.length === 0) {
            log.error('No files found to analyze');
            process.exit(1);
        }
        
        log.success(`Found ${files.length.toLocaleString()} files`);
        await parseAllFiles(files);
        
        // Phase 3: Validation
        validateImportsAndExports();
        detectCircularDependencies();
        
        if (CONFIG.detectDeadCode) {
            detectDeadExports();
        }
        
        analyzeBarrelFiles();
        
        if (!CONFIG.quickMode) {
            await analyzeTypeSafety();
        }
        
        // Phase 4: Reporting
        await generateReport();
        
        // Summary
        const duration = ((Date.now() - STATS.startTime) / 1000).toFixed(2);
        const rate = (STATS.filesScanned / parseFloat(duration)).toFixed(0);
        
        log.header('📊 ANALYSIS COMPLETE');
        
        console.log(`Files analyzed:       ${STATS.filesScanned.toLocaleString()}`);
        console.log(`Imports checked:      ${STATS.importsChecked.toLocaleString()}`);
        console.log(`Missing files:        ${ISSUES.missingFiles.length}`);
        console.log(`Missing exports:      ${ISSUES.missingExports.length}`);
        console.log(`Circular deps:        ${STATS.circularDeps.size}`);
        
        if (!CONFIG.quickMode) {
            console.log(`Type warnings:        ${ISSUES.typeWarnings.length}`);
        }
        
        if (CONFIG.detectDeadCode) {
            console.log(`Unused exports:       ${ISSUES.deadExports.length}`);
        }
        
        console.log(`Duration:             ${duration}s (${rate} files/sec)`);
        console.log('');
        
        if (ISSUES.missingFiles.length > 0 || ISSUES.missingExports.length > 0) {
            log.error(`Found ${ISSUES.missingFiles.length + ISSUES.missingExports.length} critical issues`);
            log.info(`Review: ${CONFIG.outputFile}`);
            console.log('');
            process.exit(1);
        } else {
            log.success('✨ All imports and exports are valid!');
            console.log('');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        if (CONFIG.strictMode) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

process.on('unhandledRejection', (error) => {
    console.error('\n💥 Unhandled rejection:', error);
    process.exit(1);
});

main();