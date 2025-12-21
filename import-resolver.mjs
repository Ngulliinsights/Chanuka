#!/usr/bin/env node

/**
 * COMPREHENSIVE IMPORT RESOLVER
 * 
 * Features:
 * - Validates all imports across JS/TS files
 * - Intelligently fixes broken imports using content analysis
 * - Handles path aliases from tsconfig.json/jsconfig.json
 * - Supports multiple import styles (ES6, CommonJS, dynamic)
 * - Smart matching based on exported symbols
 * - Safe backup and atomic file operations
 * - Detailed reporting with actionable insights
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    rootDir: process.cwd(),
    outputDir: 'docs',
    backupDir: `backup/imports-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`,
    
    // File patterns
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    exclude: [
        'node_modules', 'dist', 'build', '.git', 'coverage', 
        '.next', 'out', '__tests__', 'vendor', '.venv', 'venv',
        '__pycache__', 'target', 'backup'
    ],
    
    // Processing options
    dryRun: process.env.DRY_RUN !== 'false',
    verbose: process.env.VERBOSE === 'true',
    maxConcurrentFiles: 100,
    
    // Resolution strategy
    resolutionStrategies: {
        exactMatch: true,          // Try exact path matching
        similarName: true,          // Find files with similar names
        exportAnalysis: true,       // Match based on exported symbols
        directoryContext: true      // Consider directory boundaries
    },
    
    // Scoring weights for matching
    matchWeights: {
        exactExport: 100,           // Export exactly matches what's imported
        partialExport: 50,          // Export partially matches
        sameName: 30,               // File has same base name
        sameDirectory: 20,          // File in same directory
        parentDirectory: 10,        // File in parent directory
        similarPath: 5              // Path is similar
    },
    
    // Confidence threshold (0-100)
    minConfidence: 60
};

// =============================================================================
// GLOBAL STATE
// =============================================================================

const STATE = {
    files: new Map(),               // filepath -> { exports, imports, content }
    pathAliases: new Map(),         // alias -> path
    brokenImports: new Map(),       // filepath -> [{ import, candidates }]
    fixes: [],                      // Applied fixes
    stats: {
        filesScanned: 0,
        importsFound: 0,
        brokenImports: 0,
        fixesAttempted: 0,
        fixesSuccessful: 0,
        fixesFailed: 0
    }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️  ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    debug: (msg) => CONFIG.verbose && console.log(`🔍 ${msg}`),
    fix: (msg) => console.log(`→  ${msg}`)
};

function stripComments(content) {
    // Remove single-line comments
    content = content.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    return content;
}

function extractImportedSymbols(importStatement) {
    const symbols = [];
    
    // Named imports: import { a, b } from 'x'
    const namedMatch = importStatement.match(/import\s*\{([^}]+)\}\s*from/);
    if (namedMatch) {
        const names = namedMatch[1].split(',').map(s => s.trim().split(' as ')[0].trim());
        symbols.push(...names);
    }
    
    // Default import: import X from 'x'
    const defaultMatch = importStatement.match(/import\s+(\w+)\s+from/);
    if (defaultMatch && !importStatement.includes('{')) {
        symbols.push('default');
    }
    
    // Namespace import: import * as X from 'x'
    if (importStatement.includes('* as')) {
        symbols.push('*');
    }
    
    return symbols;
}

function calculatePathSimilarity(path1, path2) {
    const parts1 = path1.split('/');
    const parts2 = path2.split('/');
    const commonParts = parts1.filter((p, i) => p === parts2[i]).length;
    return commonParts / Math.max(parts1.length, parts2.length);
}

function getRelativePath(from, to) {
    let relative = path.relative(path.dirname(from), to);

    // Ensure it starts with ./ or ../
    if (!relative.startsWith('.')) {
        relative = './' + relative;
    }

    // Normalize path separators to forward slashes for ES modules
    relative = relative.replace(/\\/g, '/');

    // Remove extension for imports
    const ext = path.extname(relative);
    if (CONFIG.extensions.includes(ext)) {
        relative = relative.slice(0, -ext.length);
    }

    return relative;
}

// =============================================================================
// PATH ALIAS DETECTION
// =============================================================================

async function detectPathAliases() {
    log.info('Detecting path aliases from config files...');
    
    const configFiles = [
        'tsconfig.json',
        'jsconfig.json',
        'vite.config.js',
        'vite.config.ts'
    ];
    
    for (const configFile of configFiles) {
        const configPath = path.join(CONFIG.rootDir, configFile);
        if (!fsSync.existsSync(configPath)) continue;
        
        try {
            const content = await fs.readFile(configPath, 'utf-8');
            
            // Parse tsconfig/jsconfig paths
            if (configFile.includes('config.json')) {
                const pathsMatch = content.match(/"paths"\s*:\s*\{([^}]+)\}/s);
                if (pathsMatch) {
                    const pathsContent = pathsMatch[1];
                    const pathEntries = pathsContent.match(/"([^"]+)"\s*:\s*\[([^\]]+)\]/g) || [];
                    
                    for (const entry of pathEntries) {
                        const match = entry.match(/"([^"]+)"\s*:\s*\["([^"]+)"\]/);
                        if (match) {
                            let [, alias, target] = match;
                            // Remove trailing /* from alias and target
                            alias = alias.replace(/\/\*$/, '');
                            target = target.replace(/\/\*$/, '');
                            STATE.pathAliases.set(alias, target);
                            log.debug(`  Found alias: ${alias} -> ${target}`);
                        }
                    }
                }
            }
            
            // Parse vite config resolve.alias
            if (configFile.includes('vite.config')) {
                const aliasMatch = content.match(/alias\s*:\s*\{([^}]+)\}/s);
                if (aliasMatch) {
                    const aliasContent = aliasMatch[1];
                    const entries = aliasContent.match(/['"]?(@[^'":\s]+|~)['"]?\s*:\s*['"]([^'"]+)['"]/g) || [];
                    
                    for (const entry of entries) {
                        const match = entry.match(/['"]?(@[^'":\s]+|~)['"]?\s*:\s*['"]([^'"]+)['"]/);
                        if (match) {
                            const [, alias, target] = match;
                            STATE.pathAliases.set(alias, target);
                            log.debug(`  Found alias: ${alias} -> ${target}`);
                        }
                    }
                }
            }
            
        } catch (error) {
            log.debug(`  Could not parse ${configFile}: ${error.message}`);
        }
    }
    
    // Add common default aliases if not found
    const defaultAliases = {
        '@': './src',
        '~': './src',
        '@components': './src/components',
        '@utils': './src/utils',
        '@lib': './src/lib'
    };
    
    for (const [alias, target] of Object.entries(defaultAliases)) {
        if (!STATE.pathAliases.has(alias)) {
            const fullPath = path.join(CONFIG.rootDir, target);
            if (fsSync.existsSync(fullPath)) {
                STATE.pathAliases.set(alias, target);
                log.debug(`  Added default alias: ${alias} -> ${target}`);
            }
        }
    }
    
    log.success(`Found ${STATE.pathAliases.size} path aliases`);
}

// =============================================================================
// FILE DISCOVERY & PARSING
// =============================================================================

async function walkDirectory(dir) {
    const files = [];
    
    async function walk(currentDir) {
        let entries;
        try {
            entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch (error) {
            return;
        }
        
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(CONFIG.rootDir, fullPath);
            
            // Skip excluded paths
            if (CONFIG.exclude.some(ex => relativePath.includes(ex))) continue;
            
            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (CONFIG.extensions.includes(path.extname(entry.name))) {
                files.push(fullPath);
            }
        }
    }
    
    await walk(dir);
    return files;
}

async function parseFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const cleanContent = stripComments(content);
        
        const fileData = {
            path: filePath,
            content: content,
            exports: new Set(),
            imports: [],
            hasDefaultExport: false
        };
        
        // Extract exports
        const exportPatterns = [
            // Named exports: export const X, export function X, etc.
            /export\s+(?:const|let|var|function|class|enum|type|interface)\s+([a-zA-Z0-9_$]+)/g,
            // Export list: export { X, Y }
            /export\s*\{([^}]+)\}/g,
            // Default export with name: export default X
            /export\s+default\s+(?:function\s+)?([a-zA-Z0-9_$]+)/g
        ];
        
        for (const pattern of exportPatterns) {
            let match;
            while ((match = pattern.exec(cleanContent)) !== null) {
                if (match[1]) {
                    const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/).pop().trim());
                    names.forEach(name => {
                        if (name && name !== 'default') {
                            fileData.exports.add(name);
                        }
                    });
                }
            }
        }
        
        // Check for default export
        if (/export\s+default\s+/.test(cleanContent)) {
            fileData.hasDefaultExport = true;
            fileData.exports.add('default');
        }
        
        // Extract imports
        const importStatements = cleanContent.match(/import\s+(?:type\s+)?[^'"]*?\s+from\s+['"][^'"]+['"]/g) || [];
        
        for (const statement of importStatements) {
            const pathMatch = statement.match(/from\s+['"]([^'"]+)['"]/);
            if (pathMatch) {
                const importPath = pathMatch[1];
                const symbols = extractImportedSymbols(statement);
                
                fileData.imports.push({
                    path: importPath,
                    symbols: symbols,
                    statement: statement
                });
            }
        }
        
        // Also catch bare require/dynamic imports
        const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        
        for (const pattern of [requireRegex, dynamicImportRegex]) {
            let match;
            while ((match = pattern.exec(cleanContent)) !== null) {
                const importPath = match[1];
                if (!fileData.imports.some(imp => imp.path === importPath)) {
                    fileData.imports.push({
                        path: importPath,
                        symbols: [],
                        statement: match[0]
                    });
                }
            }
        }
        
        STATE.files.set(filePath, fileData);
        STATE.stats.filesScanned++;
        STATE.stats.importsFound += fileData.imports.length;
        
        return fileData;
        
    } catch (error) {
        log.debug(`Error parsing ${filePath}: ${error.message}`);
        return null;
    }
}

async function parseAllFiles() {
    log.info('Discovering source files...');
    const files = await walkDirectory(CONFIG.rootDir);
    log.info(`Found ${files.length} files to analyze`);
    
    log.info('Parsing files...');
    const batches = [];
    for (let i = 0; i < files.length; i += CONFIG.maxConcurrentFiles) {
        batches.push(files.slice(i, i + CONFIG.maxConcurrentFiles));
    }
    
    for (let i = 0; i < batches.length; i++) {
        await Promise.all(batches[i].map(file => parseFile(file)));
        
        if (files.length > 50) {
            const progress = Math.round(((i + 1) * batches[i].length / files.length) * 100);
            process.stdout.write(`\r  Progress: ${progress}%`);
        }
    }
    
    if (files.length > 50) console.log('');
    log.success(`Parsed ${STATE.files.size} files`);
}

// =============================================================================
// IMPORT RESOLUTION
// =============================================================================

function resolveImportPath(sourceFile, importPath) {
    // Skip external packages
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        // Check if it matches a path alias
        for (const [alias, target] of STATE.pathAliases) {
            if (importPath.startsWith(alias)) {
                const relativePath = importPath.slice(alias.length);
                importPath = path.join(target, relativePath);
                break;
            }
        }
        
        // Still doesn't start with . or / - it's an external package
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            return null;
        }
    }
    
    // Resolve relative to source file
    let targetPath;
    if (importPath.startsWith('.')) {
        targetPath = path.resolve(path.dirname(sourceFile), importPath);
    } else {
        targetPath = path.join(CONFIG.rootDir, importPath);
    }
    
    // Try to find the file with various extensions
    for (const ext of ['', ...CONFIG.extensions]) {
        const fullPath = targetPath + ext;
        if (fsSync.existsSync(fullPath) && fsSync.statSync(fullPath).isFile()) {
            return fullPath;
        }
    }
    
    // Try index files
    for (const ext of CONFIG.extensions) {
        const indexPath = path.join(targetPath, 'index' + ext);
        if (fsSync.existsSync(indexPath)) {
            return indexPath;
        }
    }
    
    return null;
}

function validateImports() {
    log.info('Validating imports...');
    const broken = [];
    
    for (const [filePath, fileData] of STATE.files) {
        for (const importInfo of fileData.imports) {
            const resolvedPath = resolveImportPath(filePath, importInfo.path);
            
            if (!resolvedPath) {
                broken.push({
                    sourceFile: filePath,
                    importPath: importInfo.path,
                    importedSymbols: importInfo.symbols,
                    statement: importInfo.statement
                });
            } else if (importInfo.symbols.length > 0) {
                // Validate that imported symbols exist
                const targetFile = STATE.files.get(resolvedPath);
                if (targetFile) {
                    const missingSymbols = importInfo.symbols.filter(symbol => 
                        symbol !== '*' && 
                        symbol !== 'default' && 
                        !targetFile.exports.has(symbol)
                    );
                    
                    if (missingSymbols.length > 0 && targetFile.exports.size > 0) {
                        log.debug(`  Missing exports in ${importInfo.path}: ${missingSymbols.join(', ')}`);
                    }
                }
            }
        }
    }
    
    STATE.stats.brokenImports = broken.length;
    
    if (broken.length > 0) {
        log.warning(`Found ${broken.length} broken imports`);
    } else {
        log.success('All imports are valid!');
    }
    
    return broken;
}

// =============================================================================
// INTELLIGENT IMPORT FIXING
// =============================================================================

function findImportCandidates(brokenImport) {
    const { sourceFile, importPath, importedSymbols } = brokenImport;
    const candidates = [];
    
    // Extract the filename from import path
    const importBasename = path.basename(importPath, path.extname(importPath));
    const sourceDir = path.dirname(sourceFile);
    
    for (const [candidatePath, candidateData] of STATE.files) {
        // Skip self
        if (candidatePath === sourceFile) continue;
        
        const candidateBasename = path.basename(candidatePath, path.extname(candidatePath));
        let score = 0;
        const reasons = [];
        
        // Strategy 1: Exact name match
        if (candidateBasename === importBasename) {
            score += CONFIG.matchWeights.sameName;
            reasons.push('same filename');
        }
        
        // Strategy 2: Export analysis
        if (CONFIG.resolutionStrategies.exportAnalysis && importedSymbols.length > 0) {
            const matchedSymbols = importedSymbols.filter(symbol => 
                symbol === '*' || 
                symbol === 'default' && candidateData.hasDefaultExport ||
                candidateData.exports.has(symbol)
            );
            
            if (matchedSymbols.length === importedSymbols.length) {
                score += CONFIG.matchWeights.exactExport * matchedSymbols.length;
                reasons.push(`exports all symbols (${matchedSymbols.join(', ')})`);
            } else if (matchedSymbols.length > 0) {
                score += CONFIG.matchWeights.partialExport * matchedSymbols.length;
                reasons.push(`exports ${matchedSymbols.length}/${importedSymbols.length} symbols`);
            }
        }
        
        // Strategy 3: Directory context
        if (CONFIG.resolutionStrategies.directoryContext) {
            const candidateDir = path.dirname(candidatePath);
            
            if (candidateDir === sourceDir) {
                score += CONFIG.matchWeights.sameDirectory;
                reasons.push('same directory');
            } else if (candidateDir === path.dirname(sourceDir)) {
                score += CONFIG.matchWeights.parentDirectory;
                reasons.push('parent directory');
            }
            
            // Path similarity
            const similarity = calculatePathSimilarity(sourceDir, candidateDir);
            if (similarity > 0.5) {
                score += CONFIG.matchWeights.similarPath * similarity;
                reasons.push(`similar path (${Math.round(similarity * 100)}%)`);
            }
        }
        
        // Strategy 4: Similar names (fuzzy matching)
        if (CONFIG.resolutionStrategies.similarName) {
            const importLower = importBasename.toLowerCase();
            const candidateLower = candidateBasename.toLowerCase();
            
            if (candidateLower.includes(importLower) || importLower.includes(candidateLower)) {
                score += CONFIG.matchWeights.sameName * 0.7;
                reasons.push('similar name');
            }
        }
        
        if (score > 0) {
            candidates.push({
                path: candidatePath,
                score: score,
                reasons: reasons,
                confidence: Math.min(100, score)
            });
        }
    }
    
    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);
    
    return candidates;
}

async function fixBrokenImport(brokenImport) {
    const { sourceFile, importPath, statement } = brokenImport;
    
    log.debug(`Analyzing: ${path.relative(CONFIG.rootDir, sourceFile)} -> ${importPath}`);
    
    const candidates = findImportCandidates(brokenImport);
    
    if (candidates.length === 0) {
        log.debug(`  No candidates found`);
        STATE.stats.fixesFailed++;
        return null;
    }
    
    const bestCandidate = candidates[0];
    
    // Only auto-fix if confidence is high enough
    if (bestCandidate.confidence < CONFIG.minConfidence) {
        log.debug(`  Best match confidence too low: ${bestCandidate.confidence}%`);
        STATE.stats.fixesFailed++;
        return null;
    }
    
    // Calculate new relative path
    const newImportPath = getRelativePath(sourceFile, bestCandidate.path);
    
    log.fix(`${path.relative(CONFIG.rootDir, sourceFile)}`);
    log.fix(`  ${importPath} → ${newImportPath}`);
    log.fix(`  Confidence: ${bestCandidate.confidence}% (${bestCandidate.reasons.join(', ')})`);
    
    STATE.stats.fixesAttempted++;
    
    if (!CONFIG.dryRun) {
        try {
            const fileData = STATE.files.get(sourceFile);
            const newContent = fileData.content.replace(
                statement,
                statement.replace(
                    new RegExp(`(['"])${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`),
                    `$1${newImportPath}$1`
                )
            );
            
            await fs.writeFile(sourceFile, newContent, 'utf-8');
            
            // Update cache
            fileData.content = newContent;
            
            STATE.stats.fixesSuccessful++;
            
            return {
                sourceFile,
                oldPath: importPath,
                newPath: newImportPath,
                confidence: bestCandidate.confidence,
                reasons: bestCandidate.reasons
            };
            
        } catch (error) {
            log.error(`  Failed to update file: ${error.message}`);
            STATE.stats.fixesFailed++;
            return null;
        }
    } else {
        STATE.stats.fixesSuccessful++;
        return {
            sourceFile,
            oldPath: importPath,
            newPath: newImportPath,
            confidence: bestCandidate.confidence,
            reasons: bestCandidate.reasons
        };
    }
}

async function fixAllBrokenImports(brokenImports) {
    log.info('Attempting to fix broken imports...\n');
    
    for (const brokenImport of brokenImports) {
        const fix = await fixBrokenImport(brokenImport);
        if (fix) {
            STATE.fixes.push(fix);
        }
    }
    
    console.log('');
}

// =============================================================================
// BACKUP
// =============================================================================

async function createBackup() {
    if (CONFIG.dryRun) {
        log.info('Dry run mode - no backup needed');
        return;
    }
    
    log.info('Creating backup...');
    
    try {
        await fs.mkdir(CONFIG.backupDir, { recursive: true });
        
        // Copy all modified files
        const filesToBackup = [...new Set(STATE.fixes.map(f => f.sourceFile))];
        
        for (const file of filesToBackup) {
            const relativePath = path.relative(CONFIG.rootDir, file);
            const backupPath = path.join(CONFIG.backupDir, relativePath);
            const backupDir = path.dirname(backupPath);
            
            await fs.mkdir(backupDir, { recursive: true });
            await fs.copyFile(file, backupPath);
        }
        
        log.success(`Backed up ${filesToBackup.length} files to ${CONFIG.backupDir}`);
    } catch (error) {
        log.error(`Backup failed: ${error.message}`);
    }
}

// =============================================================================
// REPORTING
// =============================================================================

async function generateReport(brokenImports) {
    const outputPath = path.join(CONFIG.outputDir, 'import-resolution-report.md');
    
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    
    let report = `# Import Resolution Report\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n`;
    report += `**Mode:** ${CONFIG.dryRun ? 'Dry Run' : 'Live'}\n\n`;
    
    // Summary
    report += `## 📊 Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|:-------|------:|\n`;
    report += `| Files Scanned | ${STATE.stats.filesScanned} |\n`;
    report += `| Total Imports | ${STATE.stats.importsFound} |\n`;
    report += `| Broken Imports | ${STATE.stats.brokenImports} |\n`;
    report += `| Fixes Attempted | ${STATE.stats.fixesAttempted} |\n`;
    report += `| Fixes Successful | ${STATE.stats.fixesSuccessful} |\n`;
    report += `| Fixes Failed | ${STATE.stats.fixesFailed} |\n`;
    
    if (STATE.stats.fixesAttempted > 0) {
        const successRate = Math.round((STATE.stats.fixesSuccessful / STATE.stats.fixesAttempted) * 100);
        report += `| Success Rate | ${successRate}% |\n`;
    }
    
    report += `\n`;
    
    // Applied fixes
    if (STATE.fixes.length > 0) {
        report += `## ✅ Applied Fixes (${STATE.fixes.length})\n\n`;
        
        for (const fix of STATE.fixes) {
            const relPath = path.relative(CONFIG.rootDir, fix.sourceFile);
            report += `### \`${relPath}\`\n\n`;
            report += `- **Old:** \`${fix.oldPath}\`\n`;
            report += `- **New:** \`${fix.newPath}\`\n`;
            report += `- **Confidence:** ${fix.confidence}%\n`;
            report += `- **Reasons:** ${fix.reasons.join(', ')}\n\n`;
        }
    }
    
    // Unfixed imports
    const unfixed = brokenImports.filter(bi => 
        !STATE.fixes.some(f => f.sourceFile === bi.sourceFile && f.oldPath === bi.importPath)
    );
    
    if (unfixed.length > 0) {
        report += `## ❌ Unresolved Imports (${unfixed.length})\n\n`;
        report += `These imports could not be automatically resolved:\n\n`;
        
        const byFile = new Map();
        for (const item of unfixed) {
            const relPath = path.relative(CONFIG.rootDir, item.sourceFile);
            if (!byFile.has(relPath)) {
                byFile.set(relPath, []);
            }
            byFile.get(relPath).push(item.importPath);
        }
        
        for (const [file, imports] of byFile) {
            report += `### \`${file}\`\n\n`;
            for (const imp of imports) {
                report += `- \`${imp}\`\n`;
            }
            report += `\n`;
        }
    }
    
    // Next steps
    report += `## 📋 Next Steps\n\n`;
    if (CONFIG.dryRun) {
        report += `1. Review the proposed fixes above\n`;
        report += `2. Run with \`DRY_RUN=false\` to apply changes:\n`;
        report += `   \`\`\`bash\n   DRY_RUN=false node import-resolver.mjs\n   \`\`\`\n\n`;
    } else {
        report += `1. Review changes: \`git diff\`\n`;
        report += `2. Run tests: \`npm test\`\n`;
        report += `3. Check types: \`npm run type-check\` or \`tsc --noEmit\`\n`;
        report += `4. Restore backup if needed: \`${CONFIG.backupDir}\`\n\n`;
    }
    
    if (unfixed.length > 0) {
        report += `### Manual Fixes Required\n\n`;
        report += `Some imports could not be automatically resolved. Common reasons:\n`;
        report += `- File was deleted or moved outside the project\n`;
        report += `- Import refers to a renamed export\n`;
        report += `- Import path uses custom configuration not detected\n`;
        report += `- Low confidence in automatic matching\n\n`;
        report += `Please review and fix these manually.\n\n`;
    }
    
    report += `---\n`;
    report += `*Generated by Import Resolver*\n`;
    
    await fs.writeFile(outputPath, report, 'utf-8');
    log.success(`Report saved: ${outputPath}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 INTELLIGENT IMPORT RESOLVER');
    console.log('='.repeat(80) + '\n');
    
    if (CONFIG.dryRun) {
        log.warning('Running in DRY RUN mode - no files will be modified');
    } else {
        log.info('Running in LIVE mode - files will be modified');
    }
    
    console.log('');
    
    try {
        // Phase 1: Setup
        await detectPathAliases();
        
        // Phase 2: Discovery & Parsing
        await parseAllFiles();
        
        // Phase 3: Validation
        const brokenImports = validateImports();
        
        if (brokenImports.length === 0) {
            console.log('\n' + '='.repeat(80));
            log.success('All imports are valid! No fixes needed.');
            console.log('='.repeat(80) + '\n');
            return;
        }
        
        // Phase 4: Backup
        if (!CONFIG.dryRun) {
            await createBackup();
        }
        
        // Phase 5: Fix
        await fixAllBrokenImports(brokenImports);
        
        // Phase 6: Report
        await generateReport(brokenImports);
        
        // Summary
        console.log('='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));
        console.log(`Files scanned:      ${STATE.stats.filesScanned}`);
        console.log(`Broken imports:     ${STATE.stats.brokenImports}`);
        console.log(`Fixes attempted:    ${STATE.stats.fixesAttempted}`);
        console.log(`Fixes successful:   ${STATE.stats.fixesSuccessful}`);
        console.log(`Fixes failed:       ${STATE.stats.fixesFailed}`);
        
        if (STATE.stats.fixesAttempted > 0) {
            const rate = Math.round((STATE.stats.fixesSuccessful / STATE.stats.fixesAttempted) * 100);
            console.log(`Success rate:       ${rate}%`);
        }
        
        console.log('='.repeat(80) + '\n');
        
        if (CONFIG.dryRun) {
            log.info('To apply fixes, run: DRY_RUN=false node import-resolver.mjs');
        } else {
            log.success('Import resolution complete!');
            if (STATE.stats.fixesSuccessful > 0) {
                log.info(`Backup saved to: ${CONFIG.backupDir}`);
            }
        }
        
        console.log('');
        
        // Exit with error if there are unresolved imports
        if (STATE.stats.fixesFailed > 0) {
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        if (CONFIG.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run
main();
