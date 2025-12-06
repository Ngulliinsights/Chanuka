#!/usr/bin/env node
/**
 * tools/analyze-orphans-metadata.cjs
 * 
 * This script performs deep analysis of orphaned files in your codebase by collecting
 * comprehensive metadata including code metrics, git history, test coverage, and more.
 * 
 * Purpose: Help teams understand which orphaned files are worth keeping or removing
 * by providing objective data about each file's size, complexity, and maintenance history.
 * 
 * Output: Both CSV (for spreadsheet analysis) and JSON (for programmatic use)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  root: process.cwd(),
  reportPath: path.join(process.cwd(), 'tools/orphan-report.json'),
  outputDir: path.join(process.cwd(), 'tools'),
  // We limit exports shown to keep CSV readable, but this can be adjusted
  maxExportsShown: 5,
  // Progress updates help with long-running analysis on large codebases
  progressInterval: 100,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Executes a shell command safely, returning empty string on failure rather than crashing.
 * This is crucial for git commands that might fail on files not in git history.
 */
function safeExec(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...opts
    }).trim();
  } catch (error) {
    // Silent failure is intentional here - some files may not be in git
    return '';
  }
}

/**
 * Counts lines of code in a file. This is a simple metric but useful for
 * understanding file complexity at a glance.
 */
function getLOC(filePath) {
  try {
    if (!fs.existsSync(filePath)) return 0;
    const content = fs.readFileSync(filePath, 'utf8');
    // We count all lines including empty ones, as they're part of the file structure
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

/**
 * Retrieves git information for a file: when it was last modified and by whom.
 * This helps identify actively maintained files versus abandoned ones.
 */
function getGitInfo(filePath) {
  const relPath = path.relative(CONFIG.root, filePath);
  // Format: "date|author" - using pipe as delimiter since it's unlikely in names
  const lastCommit = safeExec(`git log -1 --pretty=format:"%ci|%an" -- "${relPath}"`);
  
  if (!lastCommit) {
    return { date: 'unknown', author: 'unknown' };
  }
  
  const [fullDate, author] = lastCommit.split('|');
  // Extract just YYYY-MM-DD from full ISO timestamp for cleaner output
  const date = fullDate ? fullDate.split(' ')[0] : 'unknown';
  
  return { date, author: author || 'unknown' };
}

/**
 * Extracts public exports from a TypeScript/JavaScript file.
 * Understanding what a file exports helps determine if removing it would break other code
 * that might be importing these exports outside the analyzed scope.
 */
function extractExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const exports = new Set(); // Using Set to automatically handle duplicates

    // Pattern 1: Export default with optional name
    // Matches: export default function MyFunc, export default MyComponent, etc.
    const defaultExports = content.matchAll(
      /export\s+default\s+(?:function|const|class|interface)?\s*(\w+)?/g
    );
    for (const match of defaultExports) {
      if (match[1]) exports.add(match[1]);
    }

    // Pattern 2: Named exports with declarations
    // Matches: export const X, export function Y, export class Z
    const namedExports = content.matchAll(
      /export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g
    );
    for (const match of namedExports) {
      if (match[1]) exports.add(match[1]);
    }

    // Pattern 3: Export lists
    // Matches: export { A, B, C }
    const exportLists = content.matchAll(/export\s+\{\s*([^}]+)\s*\}/g);
    for (const match of exportLists) {
      // Split by comma and clean up whitespace
      const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0]);
      names.forEach(name => {
        if (name && /^\w+$/.test(name)) exports.add(name);
      });
    }

    // Convert Set to Array, limit length, and join for display
    const exportArray = Array.from(exports).slice(0, CONFIG.maxExportsShown);
    return exportArray.length > 0 ? exportArray.join(', ') : 'none';
  } catch (error) {
    return 'error';
  }
}

/**
 * Checks if a test file exists for the given source file.
 * Test presence indicates the file was important enough to test, suggesting value.
 */
function hasTests(filePath) {
  const baseName = path.basename(filePath, path.extname(filePath));
  const dir = path.dirname(filePath);
  
  // Common test file naming patterns in the JavaScript ecosystem
  const testPatterns = [
    `${baseName}.test.ts`,
    `${baseName}.test.tsx`,
    `${baseName}.spec.ts`,
    `${baseName}.spec.tsx`,
    `${baseName}.test.js`,
    `${baseName}.test.jsx`,
  ];

  // Check same directory first
  for (const pattern of testPatterns) {
    if (fs.existsSync(path.join(dir, pattern))) {
      return 'yes';
    }
  }

  // Check __tests__ subdirectory (Jest convention)
  const testDir = path.join(dir, '__tests__');
  if (fs.existsSync(testDir)) {
    for (const pattern of testPatterns) {
      if (fs.existsSync(path.join(testDir, pattern))) {
        return 'yes';
      }
    }
  }

  return 'no';
}

/**
 * Scans file content for TODO or FIXME comments.
 * These markers indicate known issues or incomplete work.
 */
function hasTodoOrFixme(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Case-insensitive search for common marker patterns
    return /TODO|FIXME|XXX|HACK/i.test(content) ? 'yes' : 'no';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Infers the functional category of a file based on its path.
 * This helps group files by purpose for easier decision-making.
 */
function inferCategory(filePath) {
  const pathLower = filePath.toLowerCase();
  
  // Order matters here - more specific patterns should come first
  // For example, check 'auth/components' before just 'components'
  if (pathLower.includes('auth')) return 'Auth';
  if (pathLower.includes('components')) return 'Component';
  if (pathLower.includes('hooks')) return 'Hook';
  if (pathLower.includes('services')) return 'Service';
  if (pathLower.includes('utils') || pathLower.includes('helpers')) return 'Utility';
  if (pathLower.includes('pages')) return 'Page';
  if (pathLower.includes('layout')) return 'Layout';
  if (pathLower.includes('context') || pathLower.includes('provider')) return 'Context';
  if (pathLower.includes('analytics') || pathLower.includes('tracking')) return 'Analytics';
  if (pathLower.includes('dashboard')) return 'Dashboard';
  if (pathLower.includes('forms')) return 'Form';
  if (pathLower.includes('error')) return 'Error';
  if (pathLower.includes('loading') || pathLower.includes('spinner')) return 'Loading';
  if (pathLower.includes('nav') || pathLower.includes('menu')) return 'Navigation';
  if (pathLower.includes('search')) return 'Search';
  if (pathLower.includes('api') || pathLower.includes('endpoint')) return 'API';
  if (pathLower.includes('model') || pathLower.includes('schema')) return 'Model';
  if (pathLower.includes('config')) return 'Config';
  if (pathLower.includes('constant')) return 'Constants';
  if (pathLower.includes('type')) return 'Types';
  
  return 'Other';
}

/**
 * Gets file size in kilobytes.
 * Combined with LOC, this helps identify files that might be minified or generated.
 */
function getFileSize(filePath) {
  try {
    const stat = fs.statSync(filePath);
    // Round to nearest KB for readability
    return Math.round(stat.size / 1024);
  } catch (error) {
    return 0;
  }
}

/**
 * Counts dependencies and imports in the file.
 * High import counts might indicate coupling that makes the file harder to remove.
 */
function countImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Match both ES6 imports and require statements
    const importMatches = content.match(/^import\s+.*?from\s+['"]/gm) || [];
    const requireMatches = content.match(/require\s*\(['"]/g) || [];
    return importMatches.length + requireMatches.length;
  } catch (error) {
    return 0;
  }
}

// ============================================================================
// Main Analysis Function
// ============================================================================

function main() {
  // Validate that the prerequisite orphan report exists
  if (!fs.existsSync(CONFIG.reportPath)) {
    console.error(`Error: ${CONFIG.reportPath} not found.`);
    console.error('Please run: node tools/find-orphans.cjs first');
    process.exit(1);
  }

  // Load the list of orphaned files from the previous analysis
  const report = JSON.parse(fs.readFileSync(CONFIG.reportPath, 'utf8'));
  const orphans = report.files || [];

  if (orphans.length === 0) {
    console.log('No orphaned files found in report. Exiting.');
    return;
  }

  console.log(`Collecting metadata for ${orphans.length} orphaned files...`);
  console.log('This may take a few minutes for large codebases.\n');

  const metadata = [];
  const stats = {
    totalLOC: 0,
    totalSize: 0,
    totalImports: 0,
    categoryCounts: {},
    testCoverage: { yes: 0, no: 0, unknown: 0 },
    todoCount: 0,
  };

  // Process each orphaned file and collect comprehensive metadata
  for (let i = 0; i < orphans.length; i++) {
    const relPath = orphans[i];
    const filePath = path.join(CONFIG.root, relPath);
    
    // Gather all metrics for this file
    const loc = getLOC(filePath);
    const sizeKB = getFileSize(filePath);
    const imports = countImports(filePath);
    const exports = extractExports(filePath);
    const { date, author } = getGitInfo(filePath);
    const tests = hasTests(filePath);
    const todos = hasTodoOrFixme(filePath);
    const category = inferCategory(relPath);

    // Store individual file metadata
    metadata.push({
      path: relPath.replace(/\\/g, '/'), // Normalize paths for cross-platform compatibility
      category,
      loc,
      size_kb: sizeKB,
      imports,
      exports,
      last_commit: date,
      author,
      has_tests: tests,
      has_todos: todos,
    });

    // Update aggregate statistics
    stats.totalLOC += loc;
    stats.totalSize += sizeKB;
    stats.totalImports += imports;
    stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + 1;
    stats.testCoverage[tests]++;
    if (todos === 'yes') stats.todoCount++;

    // Show progress for long-running operations
    if ((i + 1) % CONFIG.progressInterval === 0) {
      console.log(`Progress: ${i + 1}/${orphans.length} files analyzed`);
    }
  }

  // ========================================================================
  // Generate CSV Output
  // ========================================================================
  // CSV format is ideal for spreadsheet tools like Excel or Google Sheets

  const csvPath = path.join(CONFIG.outputDir, 'orphans-metadata.csv');
  const csvHeader = 'path,category,loc,size_kb,imports,exports,last_commit,author,has_tests,has_todos';
  
  const csvRows = metadata.map((m) => {
    // Wrap fields in quotes to handle commas and special characters properly
    return [
      `"${m.path}"`,
      m.category,
      m.loc,
      m.size_kb,
      m.imports,
      `"${m.exports}"`,
      m.last_commit,
      `"${m.author}"`, // Authors might have commas in names
      m.has_tests,
      m.has_todos,
    ].join(',');
  });

  fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join('\n'), 'utf8');

  // ========================================================================
  // Generate JSON Output
  // ========================================================================
  // JSON format provides structured data for programmatic analysis

  const jsonPath = path.join(CONFIG.outputDir, 'orphans-metadata.json');
  
  const jsonOutput = {
    timestamp: new Date().toISOString(),
    summary: {
      total_orphans: orphans.length,
      total_loc: stats.totalLOC,
      total_size_kb: stats.totalSize,
      total_imports: stats.totalImports,
      avg_loc_per_file: Math.round(stats.totalLOC / orphans.length),
      avg_imports_per_file: Math.round(stats.totalImports / orphans.length),
      category_distribution: stats.categoryCounts,
      test_coverage: {
        with_tests: stats.testCoverage.yes,
        without_tests: stats.testCoverage.no,
        unknown: stats.testCoverage.unknown,
        coverage_pct: Math.round((stats.testCoverage.yes / orphans.length) * 100),
      },
      files_with_todos: stats.todoCount,
      todos_pct: Math.round((stats.todoCount / orphans.length) * 100),
    },
    metadata,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2), 'utf8');

  // ========================================================================
  // Display Summary Report
  // ========================================================================

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📊 ORPHAN ANALYSIS SUMMARY');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Total orphaned files: ${orphans.length}`);
  console.log(`Total LOC: ${stats.totalLOC.toLocaleString()}`);
  console.log(`Total size: ${stats.totalSize.toLocaleString()} KB`);
  console.log(`Avg LOC per file: ${Math.round(stats.totalLOC / orphans.length)}`);
  console.log(`Avg imports per file: ${Math.round(stats.totalImports / orphans.length)}`);
  console.log('');

  console.log('📂 Category Distribution:');
  // Sort categories by count to show most common first
  Object.entries(stats.categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const pct = Math.round((count / orphans.length) * 100);
      console.log(`  ${cat.padEnd(15)} ${count.toString().padStart(4)} files (${pct}%)`);
    });
  console.log('');

  const testPct = Math.round((stats.testCoverage.yes / orphans.length) * 100);
  console.log(`✅ Test Coverage: ${stats.testCoverage.yes} files with tests (${testPct}%)`);
  console.log(`❌ No tests: ${stats.testCoverage.no} files`);
  console.log(`⚠️  Files with TODOs/FIXMEs: ${stats.todoCount} (${Math.round((stats.todoCount / orphans.length) * 100)}%)`);
  console.log('');

  // Show largest files - these might be good candidates for refactoring or removal
  console.log('🔝 Top 10 Largest Files (by LOC):');
  metadata
    .sort((a, b) => b.loc - a.loc)
    .slice(0, 10)
    .forEach((m, i) => {
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${m.path.padEnd(60)} ${m.loc.toString().padStart(5)} LOC  [${m.category}]`
      );
    });
  console.log('');

  // Show most coupled files - high import counts suggest complexity
  console.log('🔗 Top 10 Most Coupled Files (by imports):');
  metadata
    .sort((a, b) => b.imports - a.imports)
    .slice(0, 10)
    .forEach((m, i) => {
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${m.path.padEnd(60)} ${m.imports.toString().padStart(3)} imports  [${m.category}]`
      );
    });
  console.log('');

  // Show recently modified files - might indicate active development
  console.log('📅 Recently Modified Files (last 10):');
  metadata
    .filter(m => m.last_commit !== 'unknown')
    .sort((a, b) => {
      if (a.last_commit === 'unknown') return 1;
      if (b.last_commit === 'unknown') return -1;
      return new Date(b.last_commit) - new Date(a.last_commit);
    })
    .slice(0, 10)
    .forEach((m, i) => {
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${m.path.padEnd(55)} [${m.last_commit}] ${m.author}`
      );
    });
  console.log('');

  console.log('════════════════════════════════════════════════════════════');
  console.log(`📄 CSV Report: ${path.relative(CONFIG.root, csvPath)}`);
  console.log(`📋 JSON Report: ${path.relative(CONFIG.root, jsonPath)}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log('\nNext Steps:');
  console.log('1. Review the CSV in your spreadsheet tool for sorting and filtering');
  console.log('2. Focus on files with: no tests, high LOC, old commit dates');
  console.log('3. Consider keeping files that: have tests, recent commits, many exports');
}

// ============================================================================
// Entry Point
// ============================================================================

main();