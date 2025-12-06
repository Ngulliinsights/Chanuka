import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';

interface ScanResult {
  filePath: string;
  lineNumber: number;
  content: string;
}

/**
 * Recursively scans a directory for TypeScript files and processes them.
 * Skips common directories that shouldn't be scanned (node_modules, .git, etc.)
 */
async function scanDirectory(dir: string, results: ScanResult[]): Promise<void> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    // Process all entries in parallel for better performance
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip directories that are irrelevant or would slow down the scan
          if (shouldSkipDirectory(entry.name)) {
            return;
          }
          // Recursively scan subdirectories
          await scanDirectory(fullPath, results);
        } else if (entry.isFile() && isTypeScriptFile(entry.name)) {
          await processFile(fullPath, results);
        }
      })
    );
  } catch (error) {
    // Log errors but continue scanning other directories
    console.error(`Error reading directory ${dir}:`, error);
  }
}

/**
 * Determines if a directory should be skipped during scanning.
 * This helps avoid scanning large dependency folders or hidden directories.
 */
function shouldSkipDirectory(name: string): boolean {
  const skipPatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    'out',
  ];

  return name.startsWith('.') || skipPatterns.includes(name);
}

/**
 * Checks if a file is a TypeScript file based on its extension.
 */
function isTypeScriptFile(filename: string): boolean {
  const ext = extname(filename);
  return ext === '.ts' || ext === '.tsx';
}

/**
 * Processes a single TypeScript file to find instances of the 'any' type.
 * This looks for 'any' as a complete word to avoid false positives in words like 'company'.
 */
async function processFile(filePath: string, results: ScanResult[]): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Match 'any' as a whole word, considering TypeScript contexts
      // This pattern handles: type annotations, generic parameters, arrays, etc.
      if (/\bany\b/.test(line)) {
        results.push({
          filePath,
          lineNumber: index + 1,
          content: line.trim(),
        });
      }
    });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
}

/**
 * Formats and displays the scan results in a readable way.
 * Groups results by file for easier navigation.
 */
function displayResults(results: ScanResult[]): void {
  if (results.length === 0) {
    console.log('✓ No instances of "any" type found in your TypeScript files!');
    return;
  }

  console.log(`Found ${results.length} instance(s) of "any" type:\n`);

  // Group results by file path for cleaner output
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.filePath]) {
      acc[result.filePath] = [];
    }
    acc[result.filePath].push(result);
    return acc;
  }, {} as Record<string, ScanResult[]>);

  // Display results grouped by file
  Object.entries(groupedResults).forEach(([filePath, fileResults]) => {
    console.log(`\n${filePath}:`);
    fileResults.forEach((result) => {
      console.log(`  Line ${result.lineNumber}: ${result.content}`);
    });
  });

  console.log(`\nTotal files with "any": ${Object.keys(groupedResults).length}`);
}

/**
 * Main entry point for the scanner.
 * Scans the current working directory and all subdirectories for TypeScript files.
 */
async function main(): Promise<void> {
  const rootDir = process.cwd();
  const results: ScanResult[] = [];

  console.log(`Scanning TypeScript files in: ${rootDir}\n`);

  const startTime = Date.now();
  await scanDirectory(rootDir, results);
  const duration = Date.now() - startTime;

  displayResults(results);
  console.log(`\nScan completed in ${duration}ms`);
}

main().catch((error) => {
  console.error('Fatal error during scan:', error);
  process.exit(1);
});