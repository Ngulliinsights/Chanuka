#!/usr/bin/env node
/**
 * tools/find-orphans.cjs
 * 
 * Analyzes the import graph to identify orphaned files in client/src.
 * An "orphan" is a file with zero inbound imports from other source files.
 * 
 * Features:
 * - Resolves relative imports (./foo, ../bar)
 * - Resolves TypeScript path mappings from tsconfig.json
 * - Excludes test files, type definitions, and common auxiliary folders
 * - Treats known entry points as implicitly imported
 * 
 * Usage: node tools/find-orphans.cjs
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  root: process.cwd(),
  clientDir: 'client',
  srcDir: 'src',
  
  // File extensions considered as source code
  sourceExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  
  // Patterns to exclude from analysis
  excludePatterns: [
    /\.d\.ts$/,                          // TypeScript declaration files
    /\.test\.(ts|tsx|js|jsx)$/,          // Test files
    /\.spec\.(ts|tsx|js|jsx)$/,          // Spec files
    /[\\/]__tests__[\\/]/,               // Test directories
    /[\\/]__mocks__[\\/]/,               // Mock directories
  ],
  
  // Folders whose files should not be flagged as orphans
  // even if they have zero imports (they're often imported via other means)
  auxiliaryFolders: [
    'styles',
    'tokens',
    'types',
    'assets',
    'public',
    '__generated__',
  ],
  
  // Known entry point filenames to mark as implicitly imported
  entryPoints: [
    'main.tsx',
    'main.ts',
    'index.ts',
    'index.tsx',
    'App.tsx',
    'app.tsx',
  ],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safely reads and parses a JSON file, returning null on any error.
 * This prevents the script from crashing on malformed config files.
 */
function readJSONSafe(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Recursively walks a directory tree, invoking a callback for each file.
 * Directories are traversed depth-first.
 */
function walkDirectory(dir, callback) {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      walkDirectory(fullPath, callback);
    } else if (entry.isFile()) {
      callback(fullPath);
    }
  }
}

/**
 * Checks if a file should be excluded from analysis based on configured patterns.
 */
function shouldExcludeFile(filePath) {
  const ext = path.extname(filePath);
  
  // Must have a recognized source extension
  if (!CONFIG.sourceExtensions.includes(ext)) {
    return true;
  }
  
  // Check against exclusion patterns
  for (const pattern of CONFIG.excludePatterns) {
    if (pattern.test(filePath)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if a file is in an auxiliary folder that should be ignored.
 * Files in these folders are often imported through non-standard means
 * (like CSS imports, webpack loaders, or runtime dynamic imports).
 */
function isInAuxiliaryFolder(filePath, rootPath) {
  const relative = path.relative(rootPath, filePath);
  const parts = relative.split(path.sep);
  
  return CONFIG.auxiliaryFolders.some(folder => 
    parts.includes(folder)
  );
}

// ============================================================================
// TypeScript Path Mapping Resolution
// ============================================================================

/**
 * Loads TypeScript path mappings from tsconfig.json.
 * Path mappings allow imports like '@components/Button' to resolve
 * to actual file paths like 'src/components/Button'.
 */
function loadPathMappings(clientDir) {
  const tsconfigPath = path.join(clientDir, 'tsconfig.json');
  
  if (!fs.existsSync(tsconfigPath)) {
    return { baseUrl: null, mappings: {} };
  }
  
  const config = readJSONSafe(tsconfigPath);
  
  if (!config || !config.compilerOptions) {
    return { baseUrl: null, mappings: {} };
  }
  
  return {
    baseUrl: config.compilerOptions.baseUrl || null,
    mappings: config.compilerOptions.paths || {},
  };
}

/**
 * Resolves a TypeScript path alias to potential file system paths.
 * For example, '@components/Button' might resolve to 'src/components/Button'.
 * 
 * Returns an array of candidate paths (may be empty if no alias matches).
 */
function resolvePathAlias(importSpec, clientDir, pathConfig) {
  const { baseUrl, mappings } = pathConfig;
  const candidates = [];
  
  for (const [aliasPattern, targetPatterns] of Object.entries(mappings)) {
    // Handle wildcard aliases like '@components/*'
    if (aliasPattern.endsWith('/*')) {
      const aliasPrefix = aliasPattern.slice(0, -2);
      
      if (importSpec === aliasPrefix || importSpec.startsWith(aliasPrefix + '/')) {
        // Extract the part after the alias prefix
        const relativePart = importSpec === aliasPrefix 
          ? '' 
          : importSpec.slice(aliasPrefix.length + 1);
        
        // Use the first target pattern (most specific)
        const targetPattern = targetPatterns[0];
        
        if (targetPattern.endsWith('/*')) {
          const targetPrefix = targetPattern.slice(0, -2);
          const resolvedPath = path.resolve(
            clientDir,
            baseUrl || 'src',
            targetPrefix,
            relativePart
          );
          candidates.push(resolvedPath);
        } else {
          const resolvedPath = path.resolve(
            clientDir,
            baseUrl || 'src',
            targetPattern,
            relativePart
          );
          candidates.push(resolvedPath);
        }
      }
    } else {
      // Handle exact aliases like '@components'
      if (importSpec === aliasPattern) {
        const targetPattern = targetPatterns[0];
        const resolvedPath = path.resolve(
          clientDir,
          baseUrl || 'src',
          targetPattern
        );
        candidates.push(resolvedPath);
      }
    }
  }
  
  return candidates;
}

// ============================================================================
// Import Resolution
// ============================================================================

/**
 * Resolves an import specifier to actual file paths on disk.
 * Handles both relative imports and TypeScript path aliases.
 * 
 * For each candidate path, tries common extensions and index files.
 * Returns all successfully resolved file paths.
 */
function resolveImportSpecifier(importSpec, sourceFile, clientDir, pathConfig) {
  if (!importSpec) {
    return [];
  }
  
  const resolvedFiles = [];
  
  // Handle relative imports (./foo, ../bar, /absolute/path)
  if (importSpec.startsWith('.') || importSpec.startsWith('/')) {
    const basePath = path.resolve(path.dirname(sourceFile), importSpec);
    const candidates = generateFileCandidates(basePath);
    
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        resolvedFiles.push(candidate);
      }
    }
    
    return resolvedFiles;
  }
  
  // Handle TypeScript path aliases
  const aliasedPaths = resolvePathAlias(importSpec, clientDir, pathConfig);
  
  for (const aliasedPath of aliasedPaths) {
    const candidates = generateFileCandidates(aliasedPath);
    
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        resolvedFiles.push(candidate);
      }
    }
  }
  
  return resolvedFiles;
}

/**
 * Generates possible file paths for a given base path.
 * Tries direct file matches with different extensions, and index files
 * if the base path is a directory.
 */
function generateFileCandidates(basePath) {
  const candidates = [];
  
  // Try direct file match with each extension
  for (const ext of CONFIG.sourceExtensions) {
    candidates.push(basePath + ext);
  }
  
  // Try index files within directory
  for (const ext of CONFIG.sourceExtensions) {
    candidates.push(path.join(basePath, 'index' + ext));
  }
  
  return candidates;
}

/**
 * Extracts all import specifiers from source code using regex.
 * Matches various import patterns:
 * - import x from 'y'
 * - import('y')
 * - require('y')
 * - export * from 'y'
 */
function extractImportSpecifiers(sourceCode) {
  const importRegex = /(?:import\s+[^'";]+?from\s+['"]([^'"]+)['"])|(?:import\s*\(\s*['"]([^'"]+)['"]\s*\))|(?:require\s*\(\s*['"]([^'"]+)['"]\s*\))|(?:export\s+\*\s+from\s+['"]([^'"]+)['"])/g;
  
  const specifiers = [];
  let match;
  
  while ((match = importRegex.exec(sourceCode)) !== null) {
    // The specifier will be in one of the capture groups
    const specifier = match[1] || match[2] || match[3] || match[4];
    if (specifier) {
      specifiers.push(specifier);
    }
  }
  
  return specifiers;
}

// ============================================================================
// Main Analysis
// ============================================================================

/**
 * Gathers all source files in the src directory that should be analyzed.
 */
function gatherSourceFiles(srcDir) {
  const files = [];
  
  walkDirectory(srcDir, (filePath) => {
    if (!shouldExcludeFile(filePath)) {
      files.push(path.resolve(filePath));
    }
  });
  
  return files;
}

/**
 * Builds the import graph by analyzing all source files.
 * Returns a Map where keys are file paths and values are inbound import counts.
 */
function buildImportGraph(files, clientDir, pathConfig) {
  // Initialize all files with zero inbound imports
  const inboundCounts = new Map(files.map(f => [f, 0]));
  
  // Analyze each file's imports
  for (const file of files) {
    let sourceCode;
    try {
      sourceCode = fs.readFileSync(file, 'utf8');
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}`);
      continue;
    }
    
    const importSpecs = extractImportSpecifiers(sourceCode);
    
    // Resolve each import and increment inbound count
    for (const spec of importSpecs) {
      const resolvedFiles = resolveImportSpecifier(spec, file, clientDir, pathConfig);
      
      for (const resolvedFile of resolvedFiles) {
        if (inboundCounts.has(resolvedFile)) {
          inboundCounts.set(resolvedFile, inboundCounts.get(resolvedFile) + 1);
        }
      }
    }
  }
  
  return inboundCounts;
}

/**
 * Marks entry point files as implicitly imported.
 * Entry points like main.tsx or App.tsx are application roots
 * and won't have explicit imports from other source files.
 */
function markEntryPoints(inboundCounts, srcDir) {
  for (const entryFileName of CONFIG.entryPoints) {
    const entryPath = path.resolve(srcDir, entryFileName);
    if (inboundCounts.has(entryPath)) {
      inboundCounts.set(entryPath, inboundCounts.get(entryPath) + 1);
    }
  }
}

/**
 * Identifies orphan files (those with zero inbound imports)
 * excluding files in auxiliary folders.
 */
function findOrphans(inboundCounts, rootPath) {
  const orphans = [];
  
  for (const [filePath, count] of inboundCounts.entries()) {
    if (count === 0 && !isInAuxiliaryFolder(filePath, rootPath)) {
      const relativePath = path.relative(rootPath, filePath);
      orphans.push(relativePath);
    }
  }
  
  return orphans.sort();
}

/**
 * Writes the analysis results to a JSON file for later inspection.
 */
function writeReport(orphans, rootPath) {
  const toolsDir = path.join(rootPath, 'tools');
  
  if (!fs.existsSync(toolsDir)) {
    fs.mkdirSync(toolsDir, { recursive: true });
  }
  
  const reportPath = path.join(toolsDir, 'orphan-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    found: orphans.length,
    files: orphans,
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return reportPath;
}

// ============================================================================
// Entry Point
// ============================================================================

function main() {
  const rootPath = CONFIG.root;
  const clientDir = path.join(rootPath, CONFIG.clientDir);
  const srcDir = path.join(clientDir, CONFIG.srcDir);
  
  // Validate that the source directory exists
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: Source directory not found at ${srcDir}`);
    console.error('Please ensure you are running this script from the project root.');
    process.exit(1);
  }
  
  console.log('Analyzing import graph in', path.relative(rootPath, srcDir));
  console.log('');
  
  // Load TypeScript configuration
  const pathConfig = loadPathMappings(clientDir);
  if (Object.keys(pathConfig.mappings).length > 0) {
    console.log('Loaded', Object.keys(pathConfig.mappings).length, 'path mappings from tsconfig.json');
  }
  
  // Gather all source files
  const sourceFiles = gatherSourceFiles(srcDir);
  console.log('Found', sourceFiles.length, 'source files to analyze');
  console.log('');
  
  // Build the import graph
  const inboundCounts = buildImportGraph(sourceFiles, clientDir, pathConfig);
  
  // Mark entry points as used
  markEntryPoints(inboundCounts, srcDir);
  
  // Find orphaned files
  const orphans = findOrphans(inboundCounts, rootPath);
  
  // Display results
  console.log('Analysis complete!');
  console.log('Found', orphans.length, 'orphan candidates (files with zero inbound imports)');
  
  if (orphans.length > 0) {
    console.log('');
    console.log('--- Orphan Files ---');
    orphans.forEach(file => console.log('  ' + file));
  }
  
  console.log('');
  
  // Write report
  const reportPath = writeReport(orphans, rootPath);
  console.log('Detailed report written to:', path.relative(rootPath, reportPath));
}

// Run the analysis
main();