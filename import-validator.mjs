

/**
 * IMPORT VALIDATOR
 * 
 * Validates all imports in your project and generates a comprehensive report.
 * Unlike the resolver, this only validates - it doesn't fix anything.
 * 
 * Features:
 * - Fast parallel processing
 * - Supports JS, TS, JSX, TSX
 * - Detects missing files and exports
 * - Handles path aliases
 * - Clear, actionable reports
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    rootDir: process.cwd(),
    outputFile: 'docs/import-analysis.md',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    exclude: [
        'node_modules', 'dist', 'build', '.git', 'coverage',
        '.next', 'out', '__tests__', 'vendor', 'backup'
    ],
    maxConcurrentFiles: 100
};

const STATS = {
    filesScanned: 0,
    importsChecked: 0,
    brokenImports: 0,
    missingExports: 0,
    startTime: Date.now()
};

const STATE = {
    files: new Map(),
    pathAliases: new Map(),
    issues: []
};

// =============================================================================
// UTILITIES
// =============================================================================

const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️  ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
};

function stripComments(content) {
    return content
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
}

// =============================================================================
// PATH ALIASES
// =============================================================================

async function loadPathAliases() {
    const configs = ['tsconfig.json', 'jsconfig.json'];
    
    for (const configFile of configs) {
        const configPath = path.join(CONFIG.rootDir, configFile);
        if (!fsSync.existsSync(configPath)) continue;
        
        try {
            const content = await fs.readFile(configPath, 'utf-8');
            const pathsMatch = content.match(/"paths"\s*:\s*\{([^}]+)\}/s);
            
            if (pathsMatch) {
                const entries = pathsMatch[1].match(/"([^"]+)"\s*:\s*\["([^"]+)"\]/g) || [];
                
                for (const entry of entries) {
                    const match = entry.match(/"([^"]+)"\s*:\s*\["([^"]+)"\]/);
                    if (match) {
                        const alias = match[1].replace(/\/\*$/, '');
                        const target = match[2].replace(/\/\*$/, '');
                        STATE.pathAliases.set(alias, target);
                    }
                }
            }
        } catch (error) {
            // Ignore parse errors
        }
    }
}

// =============================================================================
// FILE DISCOVERY
// =============================================================================

async function walkDirectory(dir) {
    const files = [];
    
    async function walk(currentDir) {
        let entries;
        try {
            entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch {
            return;
        }
        
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(CONFIG.rootDir, fullPath);
            
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

// =============================================================================
// PARSING
// =============================================================================

async function parseFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const cleanContent = stripComments(content);
        
        const fileData = {
            exports: new Set(),
            imports: []
        };
        
        // Extract exports
        const exportPatterns = [
            /export\s+(?:const|let|var|function|class|enum|type|interface)\s+([a-zA-Z0-9_$]+)/g,
            /export\s*\{([^}]+)\}/g
        ];
        
        for (const pattern of exportPatterns) {
            let match;
            while ((match = pattern.exec(cleanContent)) !== null) {
                if (match[1]) {
                    const names = match[1].split(',')
                        .map(n => n.trim().split(/\s+as\s+/).pop().trim())
                        .filter(n => n && n !== 'default');
                    names.forEach(name => fileData.exports.add(name));
                }
            }
        }
        
        if (/export\s+default\s+/.test(cleanContent)) {
            fileData.exports.add('default');
        }
        
        // Extract imports
        const importRegex = /import\s+(?:type\s+)?([^'"]+?)\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        
        while ((match = importRegex.exec(cleanContent)) !== null) {
            const [, imports, importPath] = match;
            const symbols = [];
            
            // Parse imported symbols
            const namedMatch = imports.match(/\{([^}]+)\}/);
            if (namedMatch) {
                symbols.push(...namedMatch[1].split(',')
                    .map(s => s.trim().split(' as ')[0].trim()));
            }
            
            if (imports.includes('* as') || (!namedMatch && imports.trim() && !imports.includes('{'))) {
                symbols.push('default');
            }
            
            fileData.imports.push({
                path: importPath,
                symbols: symbols.filter(s => s)
            });
        }
        
        // Also catch require()
        const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = requireRegex.exec(cleanContent)) !== null) {
            fileData.imports.push({
                path: match[1],
                symbols: []
            });
        }
        
        STATE.files.set(filePath, fileData);
        STATS.filesScanned++;
        STATS.importsChecked += fileData.imports.length;
        
        return fileData;
        
    } catch (error) {
        return null;
    }
}

async function parseAllFiles(files) {
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
}

// =============================================================================
// VALIDATION
// =============================================================================

function resolveImportPath(sourceFile, importPath) {
    // External package
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        // Check aliases
        for (const [alias, target] of STATE.pathAliases) {
            if (importPath.startsWith(alias)) {
                importPath = importPath.replace(alias, target);
                break;
            }
        }
        
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            return null; // External module
        }
    }
    
    // Resolve path
    let targetPath = importPath.startsWith('.')
        ? path.resolve(path.dirname(sourceFile), importPath)
        : path.join(CONFIG.rootDir, importPath);
    
    // Try with extensions
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
    for (const [sourceFile, fileData] of STATE.files) {
        for (const importInfo of fileData.imports) {
            const resolvedPath = resolveImportPath(sourceFile, importInfo.path);
            
            if (!resolvedPath) {
                STATE.issues.push({
                    file: sourceFile,
                    importPath: importInfo.path,
                    type: 'missing-file',
                    message: 'Import path cannot be resolved'
                });
                STATS.brokenImports++;
            } else if (importInfo.symbols.length > 0) {
                // Check if symbols exist
                const targetFile = STATE.files.get(resolvedPath);
                if (targetFile) {
                    const missingSymbols = importInfo.symbols.filter(symbol =>
                        symbol !== '*' &&
                        symbol !== 'default' &&
                        !targetFile.exports.has(symbol)
                    );
                    
                    if (missingSymbols.length > 0 && targetFile.exports.size > 0) {
                        STATE.issues.push({
                            file: sourceFile,
                            importPath: importInfo.path,
                            type: 'missing-export',
                            message: `Missing exports: ${missingSymbols.join(', ')}`,
                            symbols: missingSymbols
                        });
                        STATS.missingExports++;
                    }
                }
            }
        }
    }
}

// =============================================================================
// REPORTING
// =============================================================================

async function generateReport() {
    await fs.mkdir(path.dirname(CONFIG.outputFile), { recursive: true });
    
    const duration = ((Date.now() - STATS.startTime) / 1000).toFixed(2);
    const isClean = STATE.issues.length === 0;
    
    let report = `# Import Analysis Report\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n`;
    report += `**Analysis Duration:** ${duration}s\n\n`;
    
    // Summary
    report += `## Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|:-------|------:|\n`;
    report += `| Files Analyzed | ${STATS.filesScanned} |\n`;
    report += `| Imports Checked | ${STATS.importsChecked} |\n`;
    report += `| Missing Files | ${STATS.brokenImports} |\n`;
    report += `| Missing Exports | ${STATS.missingExports} |\n`;
    report += `| Total Issues | ${STATE.issues.length} |\n`;
    report += `| Status | ${isClean ? '✅ All Valid' : '❌ Issues Found'} |\n\n`;
    
    if (STATE.issues.length > 0) {
        // Group by file
        const byFile = new Map();
        for (const issue of STATE.issues) {
            const relPath = path.relative(CONFIG.rootDir, issue.file);
            if (!byFile.has(relPath)) {
                byFile.set(relPath, []);
            }
            byFile.get(relPath).push(issue);
        }
        
        report += `## Issues Found (${STATE.issues.length})\n\n`;
        
        for (const [file, issues] of byFile) {
            report += `### \`${file}\`\n\n`;
            
            for (const issue of issues) {
                const icon = issue.type === 'missing-file' ? '❌' : '⚠️';
                report += `${icon} **\`${issue.importPath}\`**\n`;
                report += `   - ${issue.message}\n\n`;
            }
        }
        
        report += `## How to Fix\n\n`;
        report += `### Missing Files\n`;
        report += `- Verify the file exists at the specified path\n`;
        report += `- Check for typos in the import path\n`;
        report += `- Ensure the file wasn't moved or deleted\n`;
        report += `- Update path aliases in tsconfig.json if needed\n\n`;
        
        report += `### Missing Exports\n`;
        report += `- Verify the symbol is exported from the target file\n`;
        report += `- Check for typos in the import statement\n`;
        report += `- Ensure the export wasn't removed or renamed\n`;
        report += `- Use named exports explicitly if importing from a barrel file\n\n`;
        
        report += `### Auto-Fix\n`;
        report += `To automatically fix broken imports:\n`;
        report += `\`\`\`bash\n`;
        report += `node import-resolver.mjs         # Dry run (preview)\n`;
        report += `DRY_RUN=false node import-resolver.mjs  # Apply fixes\n`;
        report += `\`\`\`\n\n`;
    } else {
        report += `## ✅ All Imports Valid\n\n`;
        report += `All ${STATS.importsChecked} imports have been validated successfully!\n\n`;
    }
    
    report += `---\n`;
    report += `*External packages (npm, etc.) are assumed valid if installed.*\n`;
    
    await fs.writeFile(CONFIG.outputFile, report, 'utf-8');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 IMPORT VALIDATOR');
    console.log('='.repeat(80) + '\n');
    
    try {
        log.info('Loading configuration...');
        await loadPathAliases();
        
        log.info('Discovering source files...');
        const files = await walkDirectory(CONFIG.rootDir);
        log.info(`Found ${files.length} files to analyze`);
        
        log.info('Parsing files...');
        await parseAllFiles(files);
        log.success(`Parsed ${STATS.filesScanned} files`);
        
        log.info('Validating imports...');
        validateImports();
        
        if (STATE.issues.length === 0) {
            log.success('All imports are valid!');
        } else {
            log.warning(`Found ${STATE.issues.length} issues`);
        }
        
        log.info('Generating report...');
        await generateReport();
        log.success(`Report saved: ${CONFIG.outputFile}`);
        
        const duration = ((Date.now() - STATS.startTime) / 1000).toFixed(2);
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));
        console.log(`Files analyzed:     ${STATS.filesScanned}`);
        console.log(`Imports checked:    ${STATS.importsChecked}`);
        console.log(`Missing files:      ${STATS.brokenImports}`);
        console.log(`Missing exports:    ${STATS.missingExports}`);
        console.log(`Total issues:       ${STATE.issues.length}`);
        console.log(`Duration:           ${duration}s`);
        console.log('='.repeat(80) + '\n');
        
        if (STATE.issues.length > 0) {
            log.info(`Review the report: ${CONFIG.outputFile}`);
            log.info('To auto-fix: node import-resolver.mjs');
            console.log('');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        process.exit(1);
    }
}

main();
