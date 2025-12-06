#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Metadata Collection Script for Orphaned Files
 * 
 * This script analyzes orphaned files to gather comprehensive metadata that will
 * be used for evaluation. For each file, it collects:
 * - Lines of code (from previous analysis)
 * - Git commit history to understand the file's lifecycle
 * - Exported functions, classes, and types to assess reusability
 * - Associated test files to evaluate code quality
 * - TODO comments to identify incomplete work
 * 
 * The metadata is saved to orphans-metadata.json for use by the evaluation script.
 */

// Configuration for flexible analysis
const CONFIG = {
  testFilePatterns: ['test', 'spec'],
  testDirectories: ['__tests__', '__test__', 'tests'],
  gitHistoryDepth: 5, // Number of commits to retrieve
  supportedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
  encoding: 'utf8'
};

/**
 * Loads the top orphaned files by lines of code from the previous analysis.
 * This gives us the starting point for our metadata collection.
 */
function loadOrphansList() {
  const root = process.cwd();
  const locPath = path.join(root, 'tools', 'top-orphans-loc.json');

  if (!fs.existsSync(locPath)) {
    console.error('Error: top-orphans-loc.json not found in tools/ directory');
    console.error('Please run the LOC analysis script first to generate this file.');
    process.exit(1);
  }

  try {
    const data = JSON.parse(fs.readFileSync(locPath, CONFIG.encoding));
    
    if (!data.top20 || !Array.isArray(data.top20)) {
      throw new Error('Invalid structure: expected { top20: [...] }');
    }
    
    return data.top20;
  } catch (error) {
    console.error(`Failed to parse top-orphans-loc.json: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Retrieves git commit history for a file to understand its lifecycle.
 * This helps us identify if files were intentionally archived or are still
 * actively maintained. We look at multiple commits to get a fuller picture.
 */
function getGitHistory(filePath) {
  try {
    const gitLog = execSync(
      `git log --oneline -${CONFIG.gitHistoryDepth} --follow -- "${filePath}"`,
      { encoding: CONFIG.encoding, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (!gitLog) {
      return ['No commits found'];
    }

    // Split into individual commit messages for easier analysis
    return gitLog.split('\n').map(line => line.trim()).filter(Boolean);
  } catch (error) {
    // This might happen if the file was never committed or git isn't available
    return [`Error retrieving git history: ${error.message}`];
  }
}

/**
 * Extracts all export statements from a JavaScript/TypeScript file.
 * This is crucial for understanding how reusable the code is - more exports
 * typically mean the file provides more utility to other parts of the codebase.
 */
function extractExports(content) {
  const exports = new Set(); // Use Set to avoid duplicates

  // Pattern 1: Direct exports like "export const name = ..."
  // This captures function, class, const, let, var, interface, type declarations
  const directExportPattern = /export\s+(?:const|function|class|let|var|interface|type|enum|async\s+function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let match;
  while ((match = directExportPattern.exec(content)) !== null) {
    exports.add(match[1]);
  }

  // Pattern 2: Named exports like "export { name1, name2 as alias }"
  // These are common when re-exporting or organizing public APIs
  const namedExportPattern = /export\s*{\s*([^}]+)\s*}/g;
  while ((match = namedExportPattern.exec(content)) !== null) {
    const exportList = match[1];
    // Extract individual names, handling aliases with "as"
    const names = exportList.split(',').map(item => {
      const cleaned = item.trim();
      // Handle "name as alias" - we want the original name
      const asIndex = cleaned.indexOf(' as ');
      return asIndex > -1 ? cleaned.substring(0, asIndex).trim() : cleaned;
    }).filter(name => name && name !== 'default');
    
    names.forEach(name => exports.add(name));
  }

  // Pattern 3: Default exports (we'll just note that one exists)
  if (/export\s+default\s+/g.test(content)) {
    exports.add('default');
  }

  return Array.from(exports);
}

/**
 * Searches for TODO comments which indicate incomplete or planned work.
 * Finding TODOs helps us understand if a file was abandoned mid-development
 * or if there are known issues that need addressing before integration.
 */
function extractTodos(content) {
  // Match various TODO formats: TODO, TODO:, TODO -
  const todoPattern = /\/\/\s*TODO[:\s-]*(.+?)$/gim;
  const todos = [];
  let match;

  while ((match = todoPattern.exec(content)) !== null) {
    const todoText = match[1].trim();
    if (todoText) {
      todos.push(todoText);
    }
  }

  // Also check for FIXME comments as they indicate similar issues
  const fixmePattern = /\/\/\s*FIXME[:\s-]*(.+?)$/gim;
  while ((match = fixmePattern.exec(content)) !== null) {
    const fixmeText = match[1].trim();
    if (fixmeText) {
      todos.push(`FIXME: ${fixmeText}`);
    }
  }

  return todos;
}

/**
 * Locates associated test files for a given source file.
 * The presence of tests is a strong indicator of code quality and whether
 * the code was considered important enough to warrant testing.
 */
function findTestFiles(filePath, rootDir) {
  const parsedPath = path.parse(filePath);
  const baseName = parsedPath.name; // filename without extension
  const extension = parsedPath.ext;
  const directory = parsedPath.dir;
  
  const testFiles = [];
  const checkedPaths = new Set(); // Avoid checking the same path twice

  // Generate all possible test file locations
  for (const testPattern of CONFIG.testFilePatterns) {
    const testFileName = `${baseName}.${testPattern}${extension}`;
    
    // Check in the same directory as the source file
    const sameDir = path.join(directory, testFileName);
    if (!checkedPaths.has(sameDir)) {
      checkedPaths.add(sameDir);
      const fullPath = path.join(rootDir, sameDir);
      if (fs.existsSync(fullPath)) {
        testFiles.push(sameDir);
      }
    }

    // Check in common test directories
    for (const testDir of CONFIG.testDirectories) {
      const inTestDir = path.join(directory, testDir, testFileName);
      if (!checkedPaths.has(inTestDir)) {
        checkedPaths.add(inTestDir);
        const fullPath = path.join(rootDir, inTestDir);
        if (fs.existsSync(fullPath)) {
          testFiles.push(inTestDir);
        }
      }
    }
  }

  return testFiles;
}

/**
 * Gathers all metadata for a single file by running all analysis functions.
 * This is the core function that orchestrates the collection process.
 */
function collectFileMetadata(fileItem, rootDir) {
  // Normalize path separators for cross-platform compatibility
  const file = fileItem.file.replace(/\\/g, '/');
  const fullPath = path.join(rootDir, file);

  const meta = {
    file,
    loc: fileItem.loc,
    gitHistory: [],
    exports: [],
    tests: [],
    todos: [],
    fileExists: fs.existsSync(fullPath)
  };

  // Retrieve git history to understand the file's lifecycle
  meta.gitHistory = getGitHistory(file);

  // If the file doesn't exist, we can't analyze its content
  if (!meta.fileExists) {
    console.warn(`  Warning: File not found at ${fullPath}`);
    return meta;
  }

  try {
    const content = fs.readFileSync(fullPath, CONFIG.encoding);

    // Extract exports to understand what the file provides
    meta.exports = extractExports(content);

    // Find TODOs to identify incomplete work
    meta.todos = extractTodos(content);

    // Locate test files to assess quality
    meta.tests = findTestFiles(file, rootDir);

    // Calculate some useful derived metrics
    meta.hasTests = meta.tests.length > 0;
    meta.exportCount = meta.exports.length;
    meta.todoCount = meta.todos.length;

  } catch (error) {
    console.error(`  Error reading file ${file}: ${error.message}`);
    meta.readError = error.message;
  }

  return meta;
}

/**
 * Generates summary statistics about the collected metadata.
 * This provides a quick overview of what was found during analysis.
 */
function generateSummary(metadata) {
  const summary = {
    totalFiles: metadata.length,
    filesWithTests: metadata.filter(m => m.hasTests).length,
    filesWithTodos: metadata.filter(m => m.todoCount > 0).length,
    filesWithExports: metadata.filter(m => m.exportCount > 0).length,
    totalExports: metadata.reduce((sum, m) => sum + m.exportCount, 0),
    totalTodos: metadata.reduce((sum, m) => sum + m.todoCount, 0),
    averageExportsPerFile: 0,
    filesNotFound: metadata.filter(m => !m.fileExists).length
  };

  if (summary.totalFiles > 0) {
    summary.averageExportsPerFile = 
      (summary.totalExports / summary.totalFiles).toFixed(2);
  }

  return summary;
}

/**
 * Main execution function that orchestrates the entire metadata collection process.
 * It processes each file sequentially, collects all metadata, and saves the results.
 */
function main() {
  console.log('Starting metadata collection for orphaned files...\n');

  const root = process.cwd();
  const orphansList = loadOrphansList();
  
  console.log(`Found ${orphansList.length} files to analyze\n`);

  const metadata = [];
  let processedCount = 0;

  // Process each file and collect its metadata
  for (const item of orphansList) {
    processedCount++;
    console.log(`[${processedCount}/${orphansList.length}] Processing ${item.file}...`);
    
    const meta = collectFileMetadata(item, root);
    metadata.push(meta);

    // Show a brief summary of what was found for this file
    console.log(`  └─ Exports: ${meta.exportCount}, Tests: ${meta.tests.length}, TODOs: ${meta.todoCount}`);
  }

  // Generate and display summary statistics
  const summary = generateSummary(metadata);
  
  console.log('\n=== COLLECTION SUMMARY ===');
  console.log(`Total files processed: ${summary.totalFiles}`);
  console.log(`Files with tests: ${summary.filesWithTests}`);
  console.log(`Files with TODOs: ${summary.filesWithTodos}`);
  console.log(`Files with exports: ${summary.filesWithExports}`);
  console.log(`Total exports found: ${summary.totalExports}`);
  console.log(`Average exports per file: ${summary.averageExportsPerFile}`);
  
  if (summary.filesNotFound > 0) {
    console.log(`\nWarning: ${summary.filesNotFound} file(s) not found on disk`);
  }

  // Save metadata to file for use by evaluation script
  const outputPath = path.join(root, 'tools', 'orphans-metadata.json');
  const output = {
    collectedAt: new Date().toISOString(),
    summary,
    metadata
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nMetadata saved to: ${outputPath}`);
  console.log('Ready for evaluation script.');
}

main();.